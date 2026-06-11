from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


Tier = Literal["hot", "warm", "cold"]
Priority = Literal["high", "medium", "low"]


class LeadScoreLLMOutput(BaseModel):
    tier: Tier
    priority: Priority
    confidence: float = Field(..., ge=0, le=1)
    rationale: str = Field(..., min_length=1, max_length=240)


class LeadScoreMiniRead(BaseModel):
    tier: str | None
    priority: str | None
    confidence: float | None

    model_config = ConfigDict(from_attributes=True)


class LeadScoreRead(BaseModel):
    id: int
    lead_id: int
    status: str
    provider: str
    tier: str | None
    priority: str | None
    confidence: float | None
    rationale: str | None
    heuristic_score: int | None
    error_message: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)