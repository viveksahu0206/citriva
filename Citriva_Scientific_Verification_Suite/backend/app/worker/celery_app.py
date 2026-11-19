"""Celery application (Redis broker + result backend)."""

import logging
import ssl

from celery import Celery
from celery.signals import setup_logging

from app.core.config import get_settings

settings = get_settings()

VERIFY_TASK_NAME = "citriva.verify_document"
QUEUE_NAME = "citriva"

celery_app = Celery(
    "citriva",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.worker.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_default_queue=QUEUE_NAME,
    task_track_started=True,
    task_acks_late=False,
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=50,
    broker_connection_retry_on_startup=True,
    broker_transport_options={"visibility_timeout": 3600},
    result_expires=3600,
    task_soft_time_limit=settings.task_soft_time_limit_seconds,
    task_time_limit=settings.task_time_limit_seconds,
)

if settings.redis_url.startswith("rediss://"):
    _ssl = {"ssl_cert_reqs": ssl.CERT_REQUIRED}
    celery_app.conf.broker_use_ssl = _ssl
    celery_app.conf.redis_backend_use_ssl = _ssl


@setup_logging.connect
def _configure_logging(**_: object) -> None:
    logging.basicConfig(
        level=getattr(logging, settings.log_level.upper(), logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
