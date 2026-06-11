from collections import Counter
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.lead import Lead
from app.models.lead_score import LeadScore
from app.models.proposal import Proposal
from app.schemas.dashboard import (
    DashboardCardsRead,
    DashboardRecentLeadRead,
    DashboardSummaryRead,
    MetricBucketRead,
)

# Estimated AI cost per stage (simple demo-friendly approximation)
EXTRACTION_COST_ESTIMATE = 0.010
SCORING_COST_ESTIMATE = 0.006
PROPOSAL_COST_ESTIMATE = 0.014


def _start_of_day(value: date) -> datetime:
    return datetime.combine(value, time.min, tzinfo=timezone.utc)


def _exclusive_end_of_day(value: date) -> datetime:
    return datetime.combine(value + timedelta(days=1), time.min, tzinfo=timezone.utc)


def build_dashboard_summary(
    db: Session,
    *,
    date_from: date | None = None,
    date_to: date | None = None,
    tier: str | None = None,
    approval_status: str | None = None,
    source: str | None = None,
) -> DashboardSummaryRead:
    stmt = (
        select(Lead)
        .options(
            selectinload(Lead.extraction),
            selectinload(Lead.score),
            selectinload(Lead.proposal),
            selectinload(Lead.workflow_events),
        )
        .order_by(Lead.created_at.desc(), Lead.id.desc())
    )

    if date_from:
        stmt = stmt.where(Lead.created_at >= _start_of_day(date_from))

    if date_to:
        stmt = stmt.where(Lead.created_at < _exclusive_end_of_day(date_to))

    if source:
        stmt = stmt.where(Lead.source == source)

    if tier:
        stmt = stmt.join(LeadScore, LeadScore.lead_id == Lead.id).where(LeadScore.tier == tier)

    if approval_status:
        stmt = stmt.join(Proposal, Proposal.lead_id == Lead.id).where(
            Proposal.approval_status == approval_status
        )

    leads = db.execute(stmt).scalars().unique().all()

    leads_received = len(leads)

    leads_processed = sum(
        1
        for lead in leads
        if lead.extraction is not None and lead.extraction.status == "completed"
    )

    proposals_generated = sum(
        1
        for lead in leads
        if lead.proposal is not None and lead.proposal.status == "completed"
    )

    pending_approvals = sum(
        1
        for lead in leads
        if lead.proposal is not None
        and lead.proposal.status == "completed"
        and (lead.proposal.approval_status in {"pending", "edited"})
    )

    scoring_completed = sum(
        1
        for lead in leads
        if lead.score is not None and lead.score.status == "completed"
    )

    tier_counter = Counter(
        lead.score.tier
        for lead in leads
        if lead.score is not None and lead.score.status == "completed" and lead.score.tier
    )

    hot_leads = tier_counter.get("hot", 0)
    warm_leads = tier_counter.get("warm", 0)
    cold_leads = tier_counter.get("cold", 0)

    approval_counter = Counter(
        lead.proposal.approval_status
        for lead in leads
        if lead.proposal is not None
        and lead.proposal.status == "completed"
        and lead.proposal.approval_status
    )

    total_estimated_ai_cost = (
        leads_processed * EXTRACTION_COST_ESTIMATE
        + scoring_completed * SCORING_COST_ESTIMATE
        + proposals_generated * PROPOSAL_COST_ESTIMATE
    )

    executed_leads = sum(
        1
        for lead in leads
        if (
            (lead.extraction is not None and lead.extraction.status == "completed")
            or (lead.score is not None and lead.score.status == "completed")
            or (lead.proposal is not None and lead.proposal.status == "completed")
        )
    )

    estimated_cost_per_execution = (
        total_estimated_ai_cost / executed_leads if executed_leads > 0 else 0.0
    )

    processing_durations: list[float] = []
    for lead in leads:
        if not lead.proposal or lead.proposal.status != "completed":
            continue

        completion_events = [
            event.created_at
            for event in lead.workflow_events
            if event.event_name == "proposal.completed"
        ]

        if completion_events:
            end_at = max(completion_events)
        else:
            end_at = lead.proposal.updated_at

        if end_at and lead.created_at:
            processing_durations.append((end_at - lead.created_at).total_seconds())

    average_processing_time_seconds = (
        sum(processing_durations) / len(processing_durations)
        if processing_durations
        else 0.0
    )

    tier_distribution = [
        MetricBucketRead(label="hot", value=hot_leads),
        MetricBucketRead(label="warm", value=warm_leads),
        MetricBucketRead(label="cold", value=cold_leads),
    ]

    approval_distribution = [
        MetricBucketRead(label="pending", value=approval_counter.get("pending", 0)),
        MetricBucketRead(label="edited", value=approval_counter.get("edited", 0)),
        MetricBucketRead(label="approved", value=approval_counter.get("approved", 0)),
        MetricBucketRead(label="rejected", value=approval_counter.get("rejected", 0)),
        MetricBucketRead(label="sent", value=approval_counter.get("sent", 0)),
    ]

    recent_leads = [
        DashboardRecentLeadRead(
            lead_id=lead.id,
            source=lead.source,
            status=lead.status,
            created_at=lead.created_at,
            company_name=lead.extraction.company_name if lead.extraction else None,
            tier=lead.score.tier if lead.score else None,
            priority=lead.score.priority if lead.score else None,
            approval_status=lead.proposal.approval_status if lead.proposal else None,
        )
        for lead in leads[:10]
    ]

    cards = DashboardCardsRead(
        leads_received=leads_received,
        leads_processed=leads_processed,
        hot_leads=hot_leads,
        warm_leads=warm_leads,
        cold_leads=cold_leads,
        proposals_generated=proposals_generated,
        pending_approvals=pending_approvals,
        average_processing_time_seconds=average_processing_time_seconds,
        estimated_cost_per_execution=estimated_cost_per_execution,
        total_estimated_ai_cost=total_estimated_ai_cost,
    )

    return DashboardSummaryRead(
        cards=cards,
        tier_distribution=tier_distribution,
        approval_distribution=approval_distribution,
        recent_leads=recent_leads,
    )