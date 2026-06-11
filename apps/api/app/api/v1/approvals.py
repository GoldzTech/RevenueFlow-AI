from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.lead import Lead
from app.models.lead_extraction import LeadExtraction
from app.models.lead_score import LeadScore
from app.models.proposal import Proposal
from app.schemas.approval import ApprovalQueueItemRead

router = APIRouter(prefix="/approvals", tags=["approvals"])


@router.get("", response_model=list[ApprovalQueueItemRead])
def approval_queue(db: Session = Depends(get_db)) -> list[ApprovalQueueItemRead]:
    actionable_statuses = ("pending", "edited", "approved")

    stmt = (
        select(
            Lead.id,
            Lead.status,
            Lead.created_at,
            LeadExtraction.company_name,
            LeadExtraction.segment,
            LeadScore.tier,
            LeadScore.priority,
            Proposal.approval_status,
            Proposal.email_subject,
            Proposal.template_name,
            Proposal.template_version,
        )
        .join(Proposal, Proposal.lead_id == Lead.id)
        .join(LeadExtraction, LeadExtraction.lead_id == Lead.id, isouter=True)
        .join(LeadScore, LeadScore.lead_id == Lead.id, isouter=True)
        .where(Proposal.status == "completed")
        .where(Proposal.approval_status.in_(actionable_statuses))
        .order_by(Lead.created_at.desc(), Lead.id.desc())
    )

    rows = db.execute(stmt).all()

    return [
        ApprovalQueueItemRead(
            lead_id=row[0],
            lead_status=row[1],
            created_at=row[2],
            company_name=row[3],
            segment=row[4],
            tier=row[5],
            priority=row[6],
            approval_status=row[7],
            email_subject=row[8],
            template_name=row[9],
            template_version=row[10],
        )
        for row in rows
    ]