from datetime import datetime

from pydantic import BaseModel


class MetricBucketRead(BaseModel):
    label: str
    value: int


class DashboardCardsRead(BaseModel):
    leads_received: int
    leads_processed: int
    hot_leads: int
    warm_leads: int
    cold_leads: int
    proposals_generated: int
    pending_approvals: int
    average_processing_time_seconds: float
    estimated_cost_per_execution: float
    total_estimated_ai_cost: float


class DashboardRecentLeadRead(BaseModel):
    lead_id: int
    source: str
    status: str
    created_at: datetime
    company_name: str | None
    tier: str | None
    priority: str | None
    approval_status: str | None


class DashboardSummaryRead(BaseModel):
    cards: DashboardCardsRead
    tier_distribution: list[MetricBucketRead]
    approval_distribution: list[MetricBucketRead]
    recent_leads: list[DashboardRecentLeadRead]