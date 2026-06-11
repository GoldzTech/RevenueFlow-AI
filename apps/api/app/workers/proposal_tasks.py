from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.celery_app import celery
from app.db.session import SessionLocal
from app.models.lead import Lead
from app.models.proposal import Proposal
from app.models.workflow_job import WorkflowJob
from app.schemas.lead_extraction import LeadExtractionRead
from app.schemas.lead_score import LeadScoreRead
from app.services.proposals.service import ProposalGenerationService
from app.services.workflow.tracking import (
    create_workflow_job,
    log_event,
    mark_job_completed,
    mark_job_failed,
    mark_job_retrying,
    mark_job_running,
)


@celery.task(
    name="app.workers.proposal_tasks.process_proposal_generation",
    bind=True,
    max_retries=2,
)
def process_proposal_generation(self, lead_id: int, job_id: int | None = None) -> None:
    db = SessionLocal()
    attempt = self.request.retries + 1

    try:
        job = db.get(WorkflowJob, job_id) if job_id else None
        if job is None:
            job = create_workflow_job(db, lead_id=lead_id, job_type="proposal")
            db.commit()
            db.refresh(job)

        mark_job_running(job, attempt=attempt)
        log_event(
            db,
            lead_id=lead_id,
            event_name="proposal.started",
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

        if not lead.score or lead.score.status != "completed":
            mark_job_failed(job, attempt=attempt, error_message="Scoring not completed")
            db.commit()
            return

        proposal_row = lead.proposal
        if proposal_row is None:
            proposal_row = Proposal(
                lead_id=lead.id,
                status="pending",
                provider="openai",
            )
            db.add(proposal_row)
            db.commit()
            db.refresh(proposal_row)

        extraction_read = LeadExtractionRead.model_validate(lead.extraction)
        score_read = LeadScoreRead.model_validate(lead.score)

        service = ProposalGenerationService()
        result = service.generate(extraction=extraction_read, score=score_read)
        proposal = result["proposal"]

        proposal_row.status = "completed"
        proposal_row.provider = result["provider"]
        proposal_row.template_name = result["template_name"]
        proposal_row.template_version = result["template_version"]
        proposal_row.approval_status = "pending"

        proposal_row.problem_summary = proposal.problem_summary
        proposal_row.proposed_scope = proposal.proposed_scope
        proposal_row.deliverables = proposal.deliverables
        proposal_row.assumptions = proposal.assumptions
        proposal_row.next_steps = proposal.next_steps
        proposal_row.email_subject = proposal.email_subject
        proposal_row.email_body = proposal.email_body
        proposal_row.error_message = None

        lead.status = "approval_pending"

        mark_job_completed(job, attempt=attempt)
        log_event(
            db,
            lead_id=lead.id,
            event_name="proposal.completed",
            payload={"job_id": job.id, "attempt": attempt},
        )
        db.commit()

    except Exception as exc:
        stmt = (
            select(Lead)
            .options(selectinload(Lead.proposal))
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
                    event_name="proposal.retrying",
                    payload={"job_id": job.id if job else None, "attempt": attempt, "error": str(exc)},
                )
            db.commit()
            raise self.retry(exc=exc, countdown=3)

        if lead:
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
            proposal_row.error_message = str(exc)[:4000]

            log_event(
                db,
                lead_id=lead.id,
                event_name="proposal.failed",
                payload={"job_id": job.id if job else None, "attempt": attempt, "error": str(exc)},
            )

        if job:
            mark_job_failed(job, attempt=attempt, error_message=str(exc))

        db.commit()
        raise

    finally:
        db.close()