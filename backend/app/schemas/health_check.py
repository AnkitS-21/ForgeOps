import uuid

from datetime import datetime
from pydantic import BaseModel, ConfigDict


class HealthCheckResponse(BaseModel):
    id: uuid.UUID
    service_id: uuid.UUID
    status: str
    response_time_ms: float | None
    status_code: int | None
    error_message: str | None
    checked_at: datetime

    model_config = ConfigDict(from_attributes=True)