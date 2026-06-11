from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.lead_extraction import LeadExtractionRead
from app.schemas.lead_score import LeadScoreMiniRead, LeadScoreRead
from app.schemas.proposal import ProposalRead
from app.schemas.workflow import WorkflowEventRead, WorkflowJobRead


class LeadCreate(BaseModel):
    source: str = Field(default="manual", min_length=1, max_length=50)
    raw_content: str = Field(..., min_length=1)


class LeadListRead(BaseModel):
    id: int
    source: str
    raw_content: str
    status: str
    created_at: datetime
    score: LeadScoreMiniRead | None = None

    model_config = ConfigDict(from_attributes=True)


class LeadDetailRead(BaseModel):
    id: int
    source: str
    raw_content: str
    status: str
    created_at: datetime
    extraction: LeadExtractionRead | None = None
    score: LeadScoreRead | None = None
    proposal: ProposalRead | None = None
    workflow_jobs: list[WorkflowJobRead] = Field(default_factory=list)
    workflow_events: list[WorkflowEventRead] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)