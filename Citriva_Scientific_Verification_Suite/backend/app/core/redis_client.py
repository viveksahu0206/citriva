"""Redis connection helpers and key builders (sync for Celery, async for FastAPI)."""

import redis
import redis.asyncio as aioredis

from app.core.config import get_settings

_async_clients: dict[bool, aioredis.Redis] = {}
_sync_clients: dict[bool, redis.Redis] = {}


def pdf_key(job_id: str) -> str:
    return f"citriva:pdf:{job_id}"


def job_key(job_id: str) -> str:
    return f"citriva:job:{job_id}"


def rate_limit_key(client_ip: str) -> str:
    return f"citriva:ratelimit:upload:{client_ip}"


def get_async_redis(binary: bool = False) -> aioredis.Redis:
    """Return a cached async client. ``binary=True`` disables response decoding (PDF bytes)."""
    client = _async_clients.get(binary)
    if client is None:
        client = aioredis.from_url(
            get_settings().redis_url,
            decode_responses=not binary,
            health_check_interval=30,
            socket_connect_timeout=5,
        )
        _async_clients[binary] = client
    return client


def get_sync_redis(binary: bool = False) -> redis.Redis:
    """Return a cached sync client. ``binary=True`` disables response decoding (PDF bytes)."""
    client = _sync_clients.get(binary)
    if client is None:
        client = redis.Redis.from_url(
            get_settings().redis_url,
            decode_responses=not binary,
            health_check_interval=30,
            socket_connect_timeout=5,
        )
        _sync_clients[binary] = client
    return client


async def close_async_redis() -> None:
    for client in list(_async_clients.values()):
        await client.aclose()
    _async_clients.clear()
