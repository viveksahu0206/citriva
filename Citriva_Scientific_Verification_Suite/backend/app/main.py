"""FastAPI application factory."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.api.routes import router
from app.core.config import get_settings
from app.core.redis_client import close_async_redis, get_async_redis
from app.models.schemas import HealthResponse

settings = get_settings()
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("citriva")

UPLOAD_PATH = "/api/v1/upload"
MULTIPART_OVERHEAD_BYTES = 1024 * 1024


class _BodyTooLarge(Exception):
    pass


class MaxBodySizeMiddleware:
    """Reject oversized upload bodies while they stream in (before they are fully buffered)."""

    def __init__(self, app: ASGIApp, max_body_bytes: int, path: str) -> None:
        self.app = app
        self.max_body_bytes = max_body_bytes
        self.path = path

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or scope["method"] != "POST" or scope["path"] != self.path:
            await self.app(scope, receive, send)
            return

        declared = dict(scope["headers"]).get(b"content-length")
        if declared and declared.isdigit() and int(declared) > self.max_body_bytes:
            await self._reject(scope, receive, send)
            return

        received = 0
        started = False

        async def limited_receive() -> Message:
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > self.max_body_bytes:
                    raise _BodyTooLarge()
            return message

        async def tracking_send(message: Message) -> None:
            nonlocal started
            if message["type"] == "http.response.start":
                started = True
            await send(message)

        try:
            await self.app(scope, limited_receive, tracking_send)
        except _BodyTooLarge:
            if not started:
                await self._reject(scope, receive, send)

    @staticmethod
    async def _reject(scope: Scope, receive: Receive, send: Send) -> None:
        response = JSONResponse({"detail": "Request body too large"}, status_code=413)
        await response(scope, receive, send)


@asynccontextmanager
async def lifespan(_: FastAPI):
    logger.info("Citriva API starting")
    yield
    await close_async_redis()


app = FastAPI(
    title="Citriva",
    description="Academic citation verification engine",
    version="1.0.0",
    lifespan=lifespan,
)

# Order matters: the last middleware added is the outermost, so CORS headers reach 413 responses.
app.add_middleware(
    MaxBodySizeMiddleware,
    max_body_bytes=settings.max_upload_bytes + MULTIPART_OVERHEAD_BYTES,
    path=UPLOAD_PATH,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    expose_headers=["Retry-After", "Content-Disposition"],
)

app.include_router(router)


@app.get("/health", response_model=HealthResponse)
async def health() -> JSONResponse:
    try:
        await get_async_redis().ping()
    except Exception:
        logger.exception("Health check: Redis unreachable")
        return JSONResponse(
            HealthResponse(status="unhealthy", redis="down").model_dump(), status_code=503
        )
    return JSONResponse(HealthResponse(status="ok", redis="up").model_dump())
