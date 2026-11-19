"""Centralised, typed configuration loaded from environment variables / .env."""

from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore", case_sensitive=False
    )

    # --- General -----------------------------------------------------------------
    app_name: str = "Citriva"
    log_level: str = "INFO"

    # --- Infrastructure ----------------------------------------------------------
    redis_url: str = "redis://localhost:6379/0"
    cors_origins: str = "http://localhost:3000"
    # Number of reverse proxies in front of the API that append to X-Forwarded-For.
    # The client IP is taken from the entry that many positions from the right.
    # 0 = trust the left-most entry (spoofable; only use if you fully trust your edge).
    trusted_proxy_count: int = 1

    # --- Upload / rate limiting --------------------------------------------------
    max_upload_bytes: int = 15 * 1024 * 1024
    upload_rate_limit: int = 5
    upload_rate_window_seconds: int = 3600
    pdf_ttl_seconds: int = 3600
    job_ttl_seconds: int = 24 * 3600

    # --- Gemini ------------------------------------------------------------------
    gemini_api_key: str = ""
    gemini_fast_model: str = "gemini-2.5-flash"
    gemini_judge_model: str = "gemini-2.5-flash"
    gemini_timeout_seconds: int = 90
    gemini_judge_thinking_budget: int = 1024

    # --- Parsing -----------------------------------------------------------------
    grobid_url: str | None = None
    grobid_read_timeout_seconds: float = 60.0

    # --- Retrieval ---------------------------------------------------------------
    unpaywall_email: str | None = None
    openalex_mailto: str | None = None
    semantic_scholar_api_key: str | None = None
    http_connect_timeout: float = 5.0
    http_read_timeout: float = 15.0
    pdf_download_max_bytes: int = 30 * 1024 * 1024
    pdf_download_deadline_seconds: float = 30.0
    source_max_pages: int = 60
    source_max_chars: int = 400_000

    # --- Pipeline ----------------------------------------------------------------
    worker_threads: int = 4
    max_citations: int = 200
    chunk_size: int = 1200
    chunk_overlap: int = 200
    top_k_passages: int = 5
    task_soft_time_limit_seconds: int = 600
    task_time_limit_seconds: int = 660

    @field_validator(
        "grobid_url",
        "unpaywall_email",
        "openalex_mailto",
        "semantic_scholar_api_key",
        mode="before",
    )
    @classmethod
    def _blank_to_none(cls, value: object) -> object:
        if isinstance(value, str):
            value = value.strip()
            return value or None
        return value

    @field_validator("grobid_url", mode="after")
    @classmethod
    def _strip_trailing_slash(cls, value: str | None) -> str | None:
        return value.rstrip("/") if value else value

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
