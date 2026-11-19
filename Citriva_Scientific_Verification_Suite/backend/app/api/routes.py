"""Public REST endpoints."""

import logging
import random
import re
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, Response, UploadFile
from fastapi.concurrency import run_in_threadpool
from pydantic import ValidationError
from redis.exceptions import RedisError

from app.api.dependencies import enforce_upload_rate_limit, get_client_ip, read_validated_pdf
from app.core.config import get_settings
from app.core.redis_client import get_async_redis, job_key, pdf_key
from app.models.schemas import (
    AuthProfileResponse,
    JobResponse,
    LoginRequest,
    RegisterRequest,
    UploadResponse,
    VerificationReport,
    VerifyCodeRequest,
    utc_now,
)
from app.services.report_exporter import render_json, render_markdown
from app.worker.celery_app import QUEUE_NAME, VERIFY_TASK_NAME, celery_app

logger = logging.getLogger("citriva.api")

router = APIRouter(prefix="/api/v1")

_JOB_ID_RE = re.compile(r"^[0-9a-f]{32}$")


def _validate_job_id(job_id: str) -> str:
    if not _JOB_ID_RE.match(job_id):
        raise HTTPException(status_code=404, detail="Job not found")
    return job_id


def _safe_filename(name: str | None) -> str | None:
    if not name:
        return None
    cleaned = re.sub(r"[^\w.\- ]", "_", name.rsplit("/", 1)[-1].rsplit("\\", 1)[-1]).strip()
    return cleaned[:120] or None


@router.post("/upload", response_model=UploadResponse, status_code=202)
async def upload_pdf(
    request: Request,
    file: UploadFile = File(...),
    _rate_limit: None = Depends(enforce_upload_rate_limit),
) -> UploadResponse:
    settings = get_settings()
    pdf_bytes = await read_validated_pdf(file)

    job_id = uuid.uuid4().hex
    state = get_async_redis()
    binary = get_async_redis(binary=True)
    now = utc_now().isoformat()
    try:
        await binary.set(pdf_key(job_id), pdf_bytes, ex=settings.pdf_ttl_seconds)
        pipe = state.pipeline(transaction=True)
        pipe.hset(
            job_key(job_id),
            mapping={
                "status": "queued",
                "progress": 0,
                "stage": "",
                "error": "",
                "report": "",
                "created_at": now,
                "updated_at": now,
            },
        )
        pipe.expire(job_key(job_id), settings.job_ttl_seconds)
        await pipe.execute()
        await run_in_threadpool(
            celery_app.send_task,
            VERIFY_TASK_NAME,
            args=[job_id, _safe_filename(file.filename)],
            queue=QUEUE_NAME,
        )
    except Exception as exc:
        logger.exception("Failed to enqueue job %s", job_id)
        try:
            await binary.delete(pdf_key(job_id))
            await state.delete(job_key(job_id))
        except RedisError:
            pass
        raise HTTPException(status_code=503, detail="Could not queue the job; please retry") from exc

    logger.info("Accepted job %s from %s (%d bytes)", job_id, get_client_ip(request), len(pdf_bytes))
    return UploadResponse(job_id=job_id, status="queued")


async def _load_job(job_id: str) -> dict[str, str]:
    raw = await get_async_redis().hgetall(job_key(_validate_job_id(job_id)))
    if not raw:
        raise HTTPException(status_code=404, detail="Job not found")
    return raw


def _parse_report(raw: dict[str, str]) -> VerificationReport | None:
    payload = raw.get("report") or ""
    if not payload:
        return None
    try:
        return VerificationReport.model_validate_json(payload)
    except ValidationError:
        logger.exception("Stored report failed validation")
        return None


@router.get("/jobs/{job_id}", response_model=JobResponse)
async def get_job(job_id: str) -> JobResponse:
    raw = await _load_job(job_id)
    status = raw.get("status", "queued")
    return JobResponse(
        job_id=job_id,
        status=status,  # type: ignore[arg-type]
        stage=raw.get("stage") or None,  # type: ignore[arg-type]
        progress=int(raw.get("progress") or 0),
        error=(raw.get("error") or None) if status == "failed" else None,
        report=_parse_report(raw) if status == "completed" else None,
    )


@router.get("/jobs/{job_id}/export")
async def export_report(
    job_id: str,
    format: str = Query("json", pattern="^(json|md)$"),
) -> Response:
    raw = await _load_job(job_id)
    if raw.get("status") != "completed":
        raise HTTPException(status_code=409, detail="Report is not ready yet")
    report = _parse_report(raw)
    if report is None:
        raise HTTPException(status_code=500, detail="Stored report is unavailable")

    if format == "md":
        body, media_type, ext = render_markdown(report), "text/markdown; charset=utf-8", "md"
    else:
        body, media_type, ext = render_json(report), "application/json", "json"
    return Response(
        content=body,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="citriva-report-{job_id}.{ext}"'},
    )


# --------------------------------------------------------------------------------------
# Authentication & Strict Verification Endpoints
# --------------------------------------------------------------------------------------
@router.post("/auth/register")
async def register_profile(req: RegisterRequest) -> dict:
    state = get_async_redis()
    key = f"citriva:user:{req.memory_address.lower()}"
    existing = await state.hget(key, "verified")
    if existing:
        raise HTTPException(status_code=400, detail="Memory address already registered")

    code = f"{random.randint(100000, 999999)}"
    await state.hset(
        key,
        mapping={
            "full_name": req.full_name,
            "memory_address": req.memory_address,
            "memory_type": req.memory_type,
            "institution": req.institution,
            "role": req.role,
            "domain": req.domain,
            "password": req.password,
            "verified": "0",
            "pending_code": code,
        },
    )
    return {
        "status": "pending_verification",
        "memory_address": req.memory_address,
        "message": "Verification code dispatched to memory address",
        "mock_code": code,
    }


@router.post("/auth/login")
async def login_profile(req: LoginRequest) -> dict:
    state = get_async_redis()
    key = f"citriva:user:{req.memory_address.lower()}"
    stored = await state.hgetall(key)
    if not stored:
        raise HTTPException(status_code=404, detail="Memory address not found")
    if stored.get("password") != req.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    code = f"{random.randint(100000, 999999)}"
    await state.hset(key, "pending_code", code)
    return {
        "status": "pending_verification",
        "memory_address": req.memory_address,
        "mock_code": code,
    }


@router.post("/auth/verify-code", response_model=AuthProfileResponse)
async def verify_code(req: VerifyCodeRequest) -> AuthProfileResponse:
    state = get_async_redis()
    key = f"citriva:user:{req.memory_address.lower()}"
    stored = await state.hgetall(key)
    if not stored:
        raise HTTPException(status_code=404, detail="Memory address not found")

    expected = stored.get("pending_code")
    if not expected or expected != req.code:
        raise HTTPException(status_code=400, detail="Strict verification code mismatch")

    token = uuid.uuid4().hex
    await state.hset(key, mapping={"verified": "1", "session_token": token, "pending_code": ""})
    return AuthProfileResponse(
        id=uuid.uuid4().hex[:12],
        full_name=stored.get("full_name", "Academic Researcher"),
        memory_address=stored.get("memory_address", req.memory_address),
        memory_type=stored.get("memory_type", "email"),
        institution=stored.get("institution", "University Research Lab"),
        role=stored.get("role", "Peer Review Auditor"),
        domain=stored.get("domain", "Scientific Document Intelligence"),
        verified=True,
        session_token=token,
    )
