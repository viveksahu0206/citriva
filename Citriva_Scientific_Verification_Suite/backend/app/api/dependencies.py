"""API dependencies: client-IP resolution, Redis sliding-window rate limiter, upload validation."""

import logging
import math
import time
import uuid

from fastapi import HTTPException, Request, UploadFile
from redis.exceptions import RedisError

from app.core.config import get_settings
from app.core.redis_client import get_async_redis, rate_limit_key

logger = logging.getLogger("citriva.api")

PDF_MAGIC = b"%PDF-"
_READ_CHUNK = 1024 * 1024

# Atomic sliding window: returns {allowed(0/1), retry_after_ms}
_SLIDING_WINDOW_LUA = """
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local member = ARGV[4]
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
local count = redis.call('ZCARD', key)
if count >= limit then
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local retry = window - (now - tonumber(oldest[2]))
  if retry < 1 then retry = 1 end
  return {0, math.ceil(retry)}
end
redis.call('ZADD', key, now, member)
redis.call('PEXPIRE', key, window)
return {1, 0}
"""


def get_client_ip(request: Request) -> str:
    """Resolve the client IP, honouring X-Forwarded-For per ``TRUSTED_PROXY_COUNT``."""
    settings = get_settings()
    forwarded = request.headers.get("x-forwarded-for", "")
    hops = [h.strip() for h in forwarded.split(",") if h.strip()]
    if hops:
        if settings.trusted_proxy_count <= 0:
            return hops[0]
        index = max(0, len(hops) - settings.trusted_proxy_count)
        return hops[index]
    return request.client.host if request.client else "unknown"


async def enforce_upload_rate_limit(request: Request) -> None:
    """Allow ``UPLOAD_RATE_LIMIT`` uploads per client IP per window; otherwise HTTP 429."""
    settings = get_settings()
    client_ip = get_client_ip(request)
    now_ms = int(time.time() * 1000)
    window_ms = settings.upload_rate_window_seconds * 1000
    try:
        result = await get_async_redis().eval(
            _SLIDING_WINDOW_LUA,
            1,
            rate_limit_key(client_ip),
            now_ms,
            window_ms,
            settings.upload_rate_limit,
            f"{now_ms}:{uuid.uuid4().hex}",
        )
    except RedisError as exc:
        logger.error("Rate limiter unavailable: %s", exc)
        raise HTTPException(status_code=503, detail="Service temporarily unavailable") from exc

    allowed, retry_ms = int(result[0]), int(result[1])
    if not allowed:
        retry_after = max(1, math.ceil(retry_ms / 1000))
        raise HTTPException(
            status_code=429,
            detail=f"Upload limit reached ({settings.upload_rate_limit} per hour). Try again later.",
            headers={"Retry-After": str(retry_after)},
        )


async def read_validated_pdf(file: UploadFile) -> bytes:
    """Validate content type, stream-check size (<=15 MB) and verify the %PDF- magic bytes."""
    settings = get_settings()
    content_type = (file.content_type or "").split(";")[0].strip().lower()
    if content_type != "application/pdf":
        raise HTTPException(status_code=415, detail="Only application/pdf uploads are accepted")

    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = await file.read(_READ_CHUNK)
        if not chunk:
            break
        total += len(chunk)
        if total > settings.max_upload_bytes:
            raise HTTPException(
                status_code=413,
                detail=f"File exceeds the {settings.max_upload_bytes // (1024 * 1024)} MB limit",
            )
        chunks.append(chunk)

    data = b"".join(chunks)
    if not data:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    if not data.startswith(PDF_MAGIC):
        raise HTTPException(status_code=400, detail="File is not a valid PDF (bad magic bytes)")
    return data
