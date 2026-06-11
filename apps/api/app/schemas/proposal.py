from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ProposalLLMOutput(BaseModel):
    problem_summary: str = Field(..., min_length=1)
    proposed_scope: str = Field(..., min_length=1)
    deliverables: list[str] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)
    next_steps: list[str] = Field(default_factory=list)
    email_subject: str = Field(..., min_length=1, max_length=255)
    email_body: str = Field(..., min_length=1)


class ProposalUpdate(BaseModel):
    problem_summary: str | None = None
    proposed_scope: str | None = None
    deliverables: list[str] | None = None
    assumptions: list[str] | None = None
    next_steps: list[str] | None = None
    email_subject: str | None = None
    email_body: str | None = None
    review_notes: str | None = None


class ProposalActionRequest(BaseModel):
    review_notes: str | None = None


class ProposalRead(BaseModel):
    id: int
    lead_id: int
    status: str
    provider: str
    template_name: str
    template_version: str
    approval_status: str | None
    review_notes: str | None
    problem_summary: str | None
    proposed_scope: str | None
    deliverables: list[str] | None
    assumptions: list[str] | None
    next_steps: list[str] | None
    email_subject: str | None
    email_body: str | None
    error_message: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)