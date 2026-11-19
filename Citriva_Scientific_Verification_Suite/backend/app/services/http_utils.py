"""Shared resilience helpers: transient-error detection and the tenacity retry policy."""

import logging

import httpx
from google.genai import errors as genai_errors
from tenacity import (
    before_sleep_log,
    retry,
    retry_if_exception,
    stop_after_attempt,
    wait_exponential_jitter,
)

logger = logging.getLogger("citriva.http")


def _is_transient_status(code: int) -> bool:
    return code == 429 or 500 <= code < 600


def is_transient_error(exc: BaseException) -> bool:
    """True for HTTP 429/5xx, timeouts and low-level transport failures."""
    if isinstance(exc, httpx.HTTPStatusError):
        return _is_transient_status(exc.response.status_code)
    if isinstance(exc, httpx.TransportError):  # includes timeouts and connect errors
        return True
    if isinstance(exc, genai_errors.APIError):
        code = getattr(exc, "code", None)
        return isinstance(code, int) and _is_transient_status(code)
    return isinstance(exc, TimeoutError)


# 3 attempts, exponential backoff ~1s -> 2s (-> 4s cap) with jitter, transient errors only.
retry_transient = retry(
    retry=retry_if_exception(is_transient_error),
    stop=stop_after_attempt(3),
    wait=wait_exponential_jitter(initial=1, max=4, exp_base=2, jitter=0.5),
    before_sleep=before_sleep_log(logger, logging.WARNING),
    reraise=True,
)
