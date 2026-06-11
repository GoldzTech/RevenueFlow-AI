from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.celery_app import celery
from app.db.session import SessionLocal
from app.models.lead import Lead
from app.models.lead_score import LeadScore
from app.models.proposal import Proposal
from app.models.workflow_job import WorkflowJob
from app.schemas.lead_extraction import LeadExtractionRead
from app.services.scoring.service import LeadScoringService
from app.services.workflow.tracking import (
    create_workflow_job,
    log_event,
    mark_job_completed,
    mark_job_failed,
    mark_job_retrying,
    mark_job_running,
)
from app.workers.proposal_tasks import process_proposal_generation


@celery.task(
    name="app.workers.scoring_tasks.process_lead_scoring",
    bind=True,
    max_retries=2,
)
def process_lead_scoring(self, lead_id: int, job_id: int | None = None) -> None:
    db = SessionLocal()
    attempt = self.request.retries + 1

    try:
        job = db.get(WorkflowJob, job_id) if job_id else None
        if job is None:
            job = create_workflow_job(db, lead_id=lead_id, job_type="scoring")
            db.commit()
            db.refresh(job)

        mark_job_running(job, attempt=attempt)
        log_event(
            db,
            lead_id=lead_id,
            event_name="scoring.started",
            payload={"job_id": job.id, "attempt": attempt},
        )
        db.commit()

        stmt = (
            select(Lead)
            .options(
                selectinload(Lead.extraction),
                selectinload(Lead.score),
                selectinload(Lead.proposal),
            )
            .where(Lead.id == lead_id)
        )
        lead = db.execute(stmt).scalar_one_or_none()
        if not lead:
            mark_job_failed(job, attempt=attempt, error_message="Lead not found")
            db.commit()
            return

        if not lead.extraction or lead.extraction.status != "completed":
            mark_job_failed(job, attempt=attempt, error_message="Extraction not completed")
            db.commit()
            return

        score_row = lead.score
        if score_row is None:
            score_row = LeadScore(lead_id=lead.id, status="pending", provider="mixed")
            db.add(score_row)
            db.commit()
            db.refresh(score_row)

        extraction_read = LeadExtractionRead.model_validate(lead.extraction)

        service = LeadScoringService()
        scoring = service.score(extraction_read)

        final = scoring["final"]
        score_row.status = "completed"
        score_row.provider = "mixed" if scoring.get("ai") else "heuristic"
        score_row.tier = final["tier"]
        score_row.priority = final["priority"]
        score_row.confidence = float(final["confidence"])
        score_row.rationale = final["rationale"]

        score_row.heuristic_score = int(scoring["heuristic_score"])
        score_row.heuristic_details = scoring["heuristic_details"]
        score_row.ai_details = scoring.get("ai")
        score_row.error_message = None

        if lead.proposal is not None:
            db.delete(lead.proposal)

        lead.status = "proposal_pending"

        mark_job_completed(job, attempt=attempt)
        log_event(
            db,
            lead_id=lead.id,
            event_name="scoring.completed",
            payload={"job_id": job.id, "attempt": attempt},
        )

        next_job = create_workflow_job(db, lead_id=lead.id, job_type="proposal")
        log_event(
            db,
            lead_id=lead.id,
            event_name="proposal.queued",
            payload={"job_id": next_job.id},
        )
        db.commit()

        try:
            process_proposal_generation.delay(lead.id, next_job.id)
        except Exception as exc:
            lead.status = "proposal_failed"
            proposal_row = lead.proposal
            if proposal_row is None:
                proposal_row = Proposal(
                    lead_id=lead.id,
                    status="failed",
                    provider="openai",
                )
                db.add(proposal_row)

            proposal_row.status = "failed"
            proposal_row.error_message = f"Failed to enqueue proposal generation: {exc}"

            mark_job_failed(next_job, attempt=0, error_message=str(exc))
            log_event(
                db,
                lead_id=lead.id,
                event_name="proposal.enqueue_failed",
                payload={"job_id": next_job.id, "error": str(exc)},
            )
            db.commit()

    except Exception as exc:
        stmt = (
            select(Lead)
            .options(selectinload(Lead.score))
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
                    event_name="scoring.retrying",
                    payload={"job_id": job.id if job else None, "attempt": attempt, "error": str(exc)},
                )
            db.commit()
            raise self.retry(exc=exc, countdown=3)

        if lead:
            lead.status = "scoring_failed"
            score_row = lead.score
            if score_row is None:
                score_row = LeadScore(lead_id=lead.id, status="failed", provider="mixed")
                db.add(score_row)

            score_row.status = "failed"
            score_row.error_message = str(exc)[:4000]

            log_event(
                db,
                lead_id=lead.id,
                event_name="scoring.failed",
                payload={"job_id": job.id if job else None, "attempt": attempt, "error": str(exc)},
            )

        if job:
            mark_job_failed(job, attempt=attempt, error_message=str(exc))

        db.commit()
        raise

    finally:
        db.close()