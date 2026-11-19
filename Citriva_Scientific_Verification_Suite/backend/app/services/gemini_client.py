"""Thin, resilient wrapper around the google-genai SDK for schema-constrained generation."""

import logging
import re
import threading
from typing import TypeVar

from google import genai
from google.genai import types
from pydantic import BaseModel

from app.core.config import get_settings
from app.services.http_utils import retry_transient

logger = logging.getLogger("citriva.gemini")

T = TypeVar("T", bound=BaseModel)

_client: genai.Client | None = None
_client_lock = threading.Lock()


class GeminiConfigurationError(RuntimeError):
    pass


class StructuredOutputError(RuntimeError):
    pass


def get_client() -> genai.Client:
    global _client
    if _client is None:
        with _client_lock:
            if _client is None:
                settings = get_settings()
                if not settings.gemini_api_key:
                    raise GeminiConfigurationError("GEMINI_API_KEY is not configured")
                _client = genai.Client(
                    api_key=settings.gemini_api_key,
                    http_options=types.HttpOptions(timeout=settings.gemini_timeout_seconds * 1000),
                )
    return _client


_FENCE_RE = re.compile(r"^\s*```(?:json)?\s*|\s*```\s*$", re.IGNORECASE)


@retry_transient
def generate_structured(
    *,
    model: str,
    system_instruction: str,
    contents: str,
    schema: type[T],
    temperature: float = 0.0,
    max_output_tokens: int = 8192,
    thinking_budget: int | None = None,
) -> T:
    """Call Gemini with a strict Pydantic ``response_schema`` and return a validated instance."""
    client = get_client()
    config_kwargs: dict = {
        "system_instruction": system_instruction,
        "temperature": temperature,
        "response_mime_type": "application/json",
        "response_schema": schema,
        "max_output_tokens": max_output_tokens,
    }
    # Thinking budgets apply to 2.5 Flash family; 2.5 Pro cannot disable thinking.
    if thinking_budget is not None and "pro" not in model:
        config_kwargs["thinking_config"] = types.ThinkingConfig(thinking_budget=thinking_budget)

    response = client.models.generate_content(
        model=model,
        contents=contents,
        config=types.GenerateContentConfig(**config_kwargs),
    )

    parsed = getattr(response, "parsed", None)
    if isinstance(parsed, schema):
        return parsed

    text = (response.text or "").strip()
    if not text:
        raise StructuredOutputError("Gemini returned an empty response")
    text = _FENCE_RE.sub("", text).strip()
    try:
        return schema.model_validate_json(text)
    except Exception as exc:  # pydantic.ValidationError or malformed JSON
        raise StructuredOutputError(f"Gemini returned invalid structured output: {exc}") from exc
