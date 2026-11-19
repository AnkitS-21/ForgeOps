import uuid

from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

from app.models.service import ServiceEnvironment, ServiceStatus


class ServiceCreate(BaseModel):

    name: str = Field(min_length=3, max_length=100)

    description: str | None = None

    owner_team: str = Field(min_length=2, max_length=100)

    environment: ServiceEnvironment

    endpoint_url: str | None = None


class ServiceUpdate(BaseModel):

    name: str | None = Field(default=None, min_length=3, max_length=100)

    description: str | None = None

    owner_team: str | None = Field(default=None, min_length=2, max_length=100)

    environment: ServiceEnvironment | None = None

    status: ServiceStatus | None = None

    endpoint_url: str | None = None


class ServiceResponse(BaseModel):

    id: uuid.UUID

    name: str

    description: str | None

    owner_team: str

    environment: ServiceEnvironment

    status: ServiceStatus

    created_at: datetime

    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    endpoint_url: str | None