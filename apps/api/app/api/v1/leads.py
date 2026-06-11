from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.db.session import get_db
from app.models.lead import Lead
from app.models.lead_extraction import LeadExtraction
from app.models.lead_score import LeadScore
from app.models.proposal import Proposal
from app.schemas.lead import LeadCreate, LeadDetailRead, LeadListRead
from app.schemas.proposal import ProposalActionRequest, ProposalUpdate
from app.services.workflow.tracking import create_workflow_job, log_event, mark_job_failed
from app.workers.extraction_tasks import process_lead_extraction
from app.workers.scoring_tasks import process_lead_scoring

router = APIRouter(prefix="/leads", tags=["leads"])


def get_lead_with_relations(db: Session, lead_id: int) -> Lead | None:
    stmt = (
        select(Lead)
        .options(
            selectinload(Lead.extraction),
            selectinload(Lead.score),
            selectinload(Lead.proposal),
            selectinload(Lead.workflow_jobs),
            selectinload(Lead.workflow_events),
        )
        .where(Lead.id == lead_id)
    )
    return db.execute(stmt).scalar_one_or_none()


@router.post("", response_model=LeadListRead, status_code=status.HTTP_201_CREATED)
def create_lead(payload: LeadCreate, db: Session = Depends(get_db)) -> Lead:
    lead = Lead(
        source=payload.source,
        raw_content=payload.raw_content,
        status="extraction_pending",
    )
    db.add(lead)
    db.flush()

    extraction = LeadExtraction(
        lead_id=lead.id,
        status="pending",
        provider=settings.extraction_provider,
    )
    db.add(extraction)
    db.commit()
    db.refresh(lead)

    job = create_workflow_job(db, lead_id=lead.id, job_type="extraction")
    log_event(
        db,
        lead_id=lead.id,
        event_name="lead.created",
        payload={"source": lead.source},
    )
    log_event(
        db,
        lead_id=lead.id,
        event_name="extraction.queued",
        payload={"job_id": job.id},
    )
    db.commit()

    try:
        process_lead_extraction.delay(lead.id, job.id)
    except Exception as exc:
        lead.status = "extraction_failed"
        extraction.status = "failed"
        extraction.error_message = f"Failed to enqueue extraction task: {exc}"
        mark_job_failed(job, attempt=0, error_message=str(exc))
        log_event(
            db,
            lead_id=lead.id,
            event_name="extraction.enqueue_failed",
            payload={"job_id": job.id, "error": str(exc)},
        )
        db.commit()
        db.refresh(lead)

    return lead


@router.get("", response_model=list[LeadListRead])
def list_leads(
    tier: str | None = Query(default=None),
    priority: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[Lead]:
    stmt = (
        select(Lead)
        .options(selectinload(Lead.score))
        .order_by(Lead.created_at.desc(), Lead.id.desc())
    )

    if tier or priority:
        stmt = stmt.join(LeadScore, LeadScore.lead_id == Lead.id)
        if tier:
            stmt = stmt.where(LeadScore.tier == tier)
        if priority:
            stmt = stmt.where(LeadScore.priority == priority)

    leads = db.execute(stmt).scalars().all()
    return list(leads)


@router.get("/{lead_id}", response_model=LeadDetailRead)
def get_lead(lead_id: int, db: Session = Depends(get_db)) -> Lead:
    lead = get_lead_with_relations(db, lead_id)

    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    return lead


@router.post("/{lead_id}/retry-extraction", response_model=LeadDetailRead)
def retry_extraction(lead_id: int, db: Session = Depends(get_db)) -> Lead:
    lead = get_lead_with_relations(db, lead_id)

    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    if lead.extraction is None:
        lead.extraction = LeadExtraction(
            lead_id=lead.id,
            status="pending",
            provider=settings.extraction_provider,
        )
    else:
        lead.extraction.status = "pending"
        lead.extraction.provider = settings.extraction_provider
        lead.extraction.company_name = None
        lead.extraction.contact_name = None
        lead.extraction.segment = None
        lead.extraction.need_summary = None
        lead.extraction.urgency = None
        lead.extraction.budget_signal = None
        lead.extraction.lead_quality_signals = None
        lead.extraction.confidence = None
        lead.extraction.error_message = None

    if lead.score is not None:
        db.delete(lead.score)

    if lead.proposal is not None:
        db.delete(lead.proposal)

    lead.status = "extraction_pending"

    job = create_workflow_job(db, lead_id=lead.id, job_type="extraction")
    log_event(
        db,
        lead_id=lead.id,
        event_name="extraction.retry_requested",
        payload={"job_id": job.id},
    )
    db.commit()

    try:
        process_lead_extraction.delay(lead.id, job.id)
    except Exception as exc:
        lead.status = "extraction_failed"
        if lead.extraction:
            lead.extraction.status = "failed"
            lead.extraction.error_message = f"Failed to enqueue extraction retry: {exc}"
        mark_job_failed(job, attempt=0, error_message=str(exc))
        log_event(
            db,
            lead_id=lead.id,
            event_name="extraction.retry_enqueue_failed",
            payload={"job_id": job.id, "error": str(exc)},
        )
        db.commit()

    refreshed = get_lead_with_relations(db, lead.id)
    assert refreshed is not None
    return refreshed


@router.post("/{lead_id}/retry-scoring", response_model=LeadDetailRead)
def retry_scoring(lead_id: int, db: Session = Depends(get_db)) -> Lead:
    lead = get_lead_with_relations(db, lead_id)

    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    if lead.extraction is None or lead.extraction.status != "completed":
        raise HTTPException(
            status_code=400,
            detail="Scoring retry requires a completed extraction",
        )

    if lead.score is None:
        lead.score = LeadScore(
            lead_id=lead.id,
            status="pending",
            provider="mixed",
        )
    else:
        lead.score.status = "pending"
        lead.score.provider = "mixed"
        lead.score.tier = None
        lead.score.priority = None
        lead.score.confidence = None
        lead.score.rationale = None
        lead.score.heuristic_score = None
        lead.score.heuristic_details = None
        lead.score.ai_details = None
        lead.score.error_message = None

    if lead.proposal is not None:
        db.delete(lead.proposal)

    lead.status = "scoring_pending"

    job = create_workflow_job(db, lead_id=lead.id, job_type="scoring")
    log_event(
        db,
        lead_id=lead.id,
        event_name="scoring.retry_requested",
        payload={"job_id": job.id},
    )
    db.commit()

    try:
        process_lead_scoring.delay(lead.id, job.id)
    except Exception as exc:
        lead.status = "scoring_failed"
        if lead.score:
            lead.score.status = "failed"
            lead.score.error_message = f"Failed to enqueue scoring retry: {exc}"
        mark_job_failed(job, attempt=0, error_message=str(exc))
        log_event(
            db,
            lead_id=lead.id,
            event_name="scoring.retry_enqueue_failed",
            payload={"job_id": job.id, "error": str(exc)},
        )
        db.commit()

    refreshed = get_lead_with_relations(db, lead.id)
    assert refreshed is not None
    return refreshed


@router.put("/{lead_id}/proposal", response_model=LeadDetailRead)
def update_proposal(
    lead_id: int,
    payload: ProposalUpdate,
    db: Session = Depends(get_db),
) -> Lead:
    lead = get_lead_with_relations(db, lead_id)

    if not lead or not lead.proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    proposal = lead.proposal
    if proposal.status != "completed":
        raise HTTPException(status_code=400, detail="Proposal is not ready for editing")

    if payload.problem_summary is not None:
        proposal.problem_summary = payload.problem_summary
    if payload.proposed_scope is not None:
        proposal.proposed_scope = payload.proposed_scope
    if payload.deliverables is not None:
        proposal.deliverables = payload.deliverables
    if payload.assumptions is not None:
        proposal.assumptions = payload.assumptions
    if payload.next_steps is not None:
        proposal.next_steps = payload.next_steps
    if payload.email_subject is not None:
        proposal.email_subject = payload.email_subject
    if payload.email_body is not None:
        proposal.email_body = payload.email_body
    if payload.review_notes is not None:
        proposal.review_notes = payload.review_notes

    proposal.approval_status = "edited"
    lead.status = "approval_pending"

    log_event(
        db,
        lead_id=lead.id,
        event_name="proposal.edited",
        payload={"approval_status": proposal.approval_status},
    )
    db.commit()

    refreshed = get_lead_with_relations(db, lead.id)
    assert refreshed is not None
    return refreshed


@router.post("/{lead_id}/proposal/approve", response_model=LeadDetailRead)
def approve_proposal(
    lead_id: int,
    payload: ProposalActionRequest,
    db: Session = Depends(get_db),
) -> Lead:
    lead = get_lead_with_relations(db, lead_id)

    if not lead or not lead.proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    proposal = lead.proposal
    if proposal.status != "completed":
        raise HTTPException(status_code=400, detail="Proposal is not ready for approval")

    proposal.approval_status = "approved"
    proposal.review_notes = payload.review_notes
    lead.status = "approved"

    log_event(
        db,
        lead_id=lead.id,
        event_name="proposal.approved",
        payload={"approval_status": proposal.approval_status},
    )
    db.commit()

    refreshed = get_lead_with_relations(db, lead.id)
    assert refreshed is not None
    return refreshed


@router.post("/{lead_id}/proposal/reject", response_model=LeadDetailRead)
def reject_proposal(
    lead_id: int,
    payload: ProposalActionRequest,
    db: Session = Depends(get_db),
) -> Lead:
    lead = get_lead_with_relations(db, lead_id)

    if not lead or not lead.proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    proposal = lead.proposal
    if proposal.status != "completed":
        raise HTTPException(status_code=400, detail="Proposal is not ready for rejection")

    proposal.approval_status = "rejected"
    proposal.review_notes = payload.review_notes
    lead.status = "rejected"

    log_event(
        db,
        lead_id=lead.id,
        event_name="proposal.rejected",
        payload={"approval_status": proposal.approval_status},
    )
    db.commit()

    refreshed = get_lead_with_relations(db, lead.id)
    assert refreshed is not None
    return refreshed


@router.post("/{lead_id}/proposal/send", response_model=LeadDetailRead)
def send_proposal(
    lead_id: int,
    payload: ProposalActionRequest,
    db: Session = Depends(get_db),
) -> Lead:
    lead = get_lead_with_relations(db, lead_id)

    if not lead or not lead.proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    proposal = lead.proposal
    if proposal.status != "completed":
        raise HTTPException(status_code=400, detail="Proposal is not ready to send")

    if proposal.approval_status not in {"approved", "edited"}:
        raise HTTPException(
            status_code=400,
            detail="Proposal must be approved or edited before sending",
        )

    proposal.approval_status = "sent"
    proposal.review_notes = payload.review_notes
    lead.status = "sent"

    log_event(
        db,
        lead_id=lead.id,
        event_name="proposal.sent",
        payload={"approval_status": proposal.approval_status},
    )
    db.commit()

    refreshed = get_lead_with_relations(db, lead.id)
    assert refreshed is not None
    return refreshed


@router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lead(lead_id: int, db: Session = Depends(get_db)) -> Response:
    lead = db.get(Lead, lead_id)

    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    db.delete(lead)
    db.commit()

    return Response(status_code=status.HTTP_204_NO_CONTENT)