from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.models.workflow_event import WorkflowEvent
from app.models.workflow_job import WorkflowJob


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def trim_error(message: str | Exception, limit: int = 4000) -> str:
    text = str(message)
    return text[:limit]


def create_workflow_job(
    db: Session,
    *,
    lead_id: int,
    job_type: str,
    status: str = "queued",
) -> WorkflowJob:
    job = WorkflowJob(
        lead_id=lead_id,
        job_type=job_type,
        status=status,
        attempts=0,
    )
    db.add(job)
    db.flush()
    return job


def log_event(
    db: Session,
    *,
    lead_id: int,
    event_name: str,
    payload: dict[str, Any] | None = None,
) -> WorkflowEvent:
    event = WorkflowEvent(
        lead_id=lead_id,
        event_name=event_name,
        payload=payload,
    )
    db.add(event)
    db.flush()
    return event


def mark_job_running(job: WorkflowJob, *, attempt: int) -> None:
    job.status = "running"
    job.attempts = attempt
    job.error_message = None
    if job.started_at is None:
        job.started_at = utcnow()


def mark_job_retrying(job: WorkflowJob, *, attempt: int, error_message: str) -> None:
    job.status = "retrying"
    job.attempts = attempt
    job.error_message = trim_error(error_message)


def mark_job_completed(job: WorkflowJob, *, attempt: int) -> None:
    job.status = "completed"
    job.attempts = attempt
    job.error_message = None
    job.finished_at = utcnow()


def mark_job_failed(job: WorkflowJob, *, attempt: int, error_message: str) -> None:
    job.status = "failed"
    job.attempts = attempt
    job.error_message = trim_error(error_message)
    job.finished_at = utcnow()