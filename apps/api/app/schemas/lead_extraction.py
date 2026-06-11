from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class LeadExtractionLLMOutput(BaseModel):
    company_name: str | None = None
    contact_name: str | None = None
    segment: str | None = None
    need_summary: str = Field(..., min_length=1)
    urgency: Literal["low", "medium", "high", "unknown"]
    budget_signal: Literal["low", "medium", "high", "unknown"]
    lead_quality_signals: list[str] = Field(default_factory=list)
    confidence: float = Field(..., ge=0, le=1)


class LeadExtractionRead(BaseModel):
    id: int
    lead_id: int
    status: str
    provider: str
    company_name: str | None
    contact_name: str | None
    segment: str | None
    need_summary: str | None
    urgency: str | None
    budget_signal: str | None
    lead_quality_signals: list[str] | None
    confidence: float | None
    error_message: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)