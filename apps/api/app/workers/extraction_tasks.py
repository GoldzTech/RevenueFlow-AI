from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.celery_app import celery
from app.core.config import settings
from app.db.session import SessionLocal
from app.models.lead import Lead
from app.models.lead_extraction import LeadExtraction
from app.models.workflow_job import WorkflowJob
from app.services.extraction.service import LeadExtractionService
from app.services.workflow.tracking import (
    create_workflow_job,
    log_event,
    mark_job_completed,
    mark_job_failed,
    mark_job_retrying,
    mark_job_running,
)
from app.workers.scoring_tasks import process_lead_scoring


@celery.task(
    name="app.workers.extraction_tasks.process_lead_extraction",
    bind=True,
    max_retries=2,
)
def process_lead_extraction(self, lead_id: int, job_id: int | None = None) -> None:
    db = SessionLocal()
    attempt = self.request.retries + 1

    try:
        job = db.get(WorkflowJob, job_id) if job_id else None
        if job is None:
            job = create_workflow_job(db, lead_id=lead_id, job_type="extraction")
            db.commit()
            db.refresh(job)

        mark_job_running(job, attempt=attempt)
        log_event(
            db,
            lead_id=lead_id,
            event_name="extraction.started",
            payload={"job_id": job.id, "attempt": attempt},
        )
        db.commit()

        stmt = (
            select(Lead)
            .options(selectinload(Lead.extraction))
            .where(Lead.id == lead_id)
        )
        lead = db.execute(stmt).scalar_one_or_none()
        if not lead:
            mark_job_failed(job, attempt=attempt, error_message="Lead not found")
            db.commit()
            return

        extraction = lead.extraction
        if extraction is None:
            extraction = LeadExtraction(
                lead_id=lead.id,
                status="pending",
                provider=settings.extraction_provider,
            )
            db.add(extraction)
            db.commit()
            db.refresh(extraction)

        service = LeadExtractionService()
        result = service.extract(lead.raw_content)

        extraction.status = "completed"
        extraction.provider = settings.extraction_provider
        extraction.company_name = result.company_name
        extraction.contact_name = result.contact_name
        extraction.segment = result.segment
        extraction.need_summary = result.need_summary
        extraction.urgency = result.urgency
        extraction.budget_signal = result.budget_signal
        extraction.lead_quality_signals = result.lead_quality_signals
        extraction.confidence = result.confidence
        extraction.error_message = None

        lead.status = "scoring_pending"

        mark_job_completed(job, attempt=attempt)
        log_event(
            db,
            lead_id=lead.id,
            event_name="extraction.completed",
            payload={"job_id": job.id, "attempt": attempt},
        )

        next_job = create_workflow_job(db, lead_id=lead.id, job_type="scoring")
        log_event(
            db,
            lead_id=lead.id,
            event_name="scoring.queued",
            payload={"job_id": next_job.id},
        )
        db.commit()

        try:
            process_lead_scoring.delay(lead.id, next_job.id)
        except Exception as exc:
            lead.status = "scoring_failed"
            mark_job_failed(
                next_job,
                attempt=0,
                error_message=f"Failed to enqueue scoring task: {exc}",
            )
            log_event(
                db,
                lead_id=lead.id,
                event_name="scoring.enqueue_failed",
                payload={"job_id": next_job.id, "error": str(exc)},
            )
            db.commit()

    except Exception as exc:
        stmt = (
            select(Lead)
            .options(selectinload(Lead.extraction))
            .where(Lead.id == lead_id)
        )
        lead = db.execute(stmt).scalar_one_or_none()

        job = db.get(WorkflowJob, job_id) if job_id else None

        if self.request.retries < self.max_retries:
            if job:
                mark_job_retrying(job, attempt=attempt, error_message=str(exc))
            if lead:
                log_event(
                    db,
                    lead_id=lead.id,
                    event_name="extraction.retrying",
                    payload={"job_id": job.id if job else None, "attempt": attempt, "error": str(exc)},
                )
            db.commit()
            raise self.retry(exc=exc, countdown=3)

        if lead:
            lead.status = "extraction_failed"
            if lead.extraction is None:
                lead.extraction = LeadExtraction(
                    lead_id=lead.id,
                    status="failed",
                    provider=settings.extraction_provider,
                )
            else:
                lead.extraction.status = "failed"

            lead.extraction.error_message = str(exc)[:4000]

            log_event(
                db,
                lead_id=lead.id,
                event_name="extraction.failed",
                payload={"job_id": job.id if job else None, "attempt": attempt, "error": str(exc)},
            )

        if job:
            mark_job_failed(job, attempt=attempt, error_message=str(exc))

        db.commit()
        raise

    finally:
        db.close()