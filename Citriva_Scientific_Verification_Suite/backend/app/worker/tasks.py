"""Celery task entry points."""

from app.worker.celery_app import VERIFY_TASK_NAME, celery_app
from app.worker.pipeline import run_pipeline


@celery_app.task(name=VERIFY_TASK_NAME, bind=True)
def verify_document(self, job_id: str, filename: str | None = None) -> str:  # noqa: ANN001
    """Run the full verification pipeline for an uploaded PDF."""
    run_pipeline(job_id, filename)
    return job_id
