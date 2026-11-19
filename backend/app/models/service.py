import uuid

from datetime import datetime, timezone

from sqlalchemy import (
    String,
    Text,
    DateTime,
    Enum,
    func
)

from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

import enum


class ServiceEnvironment(str, enum.Enum):
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"


class ServiceStatus(str, enum.Enum):
    ACTIVE = "active"
    DEGRADED = "degraded"
    MAINTENANCE = "maintenance"
    INACTIVE = "inactive"


class Service(Base):

    __tablename__ = "services"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    name: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
        index=True
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    owner_team: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    environment: Mapped[ServiceEnvironment] = mapped_column(
        Enum(ServiceEnvironment, name="service_environment"),
        nullable=False
    )

    status: Mapped[ServiceStatus] = mapped_column(
        Enum(ServiceStatus, name="service_status"),
        default=ServiceStatus.ACTIVE,
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    endpoint_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True
    )