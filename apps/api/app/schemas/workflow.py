from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class WorkflowJobRead(BaseModel):
    id: int
    lead_id: int
    job_type: str
    status: str
    attempts: int
    error_message: str | None
    started_at: datetime | None
    finished_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WorkflowEventRead(BaseModel):
    id: int
    lead_id: int
    event_name: str
    payload: dict[str, Any] | None = Field(default=None)
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)