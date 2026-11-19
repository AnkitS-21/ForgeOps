import uuid

from datetime import datetime
from pydantic import BaseModel, ConfigDict


class IncidentResponse(BaseModel):
    id: uuid.UUID
    service_id: uuid.UUID
    title: str
    description: str | None
    severity: str
    status: str
    occurrence_count: int
    started_at: datetime
    last_seen_at: datetime
    resolved_at: datetime | None

    model_config = ConfigDict(from_attributes=True)