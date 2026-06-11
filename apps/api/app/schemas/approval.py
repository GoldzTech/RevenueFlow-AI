from datetime import datetime

from pydantic import BaseModel


class ApprovalQueueItemRead(BaseModel):
    lead_id: int
    lead_status: str
    created_at: datetime
    company_name: str | None
    segment: str | None
    tier: str | None
    priority: str | None
    approval_status: str | None
    email_subject: str | None
    template_name: str | None
    template_version: str | None