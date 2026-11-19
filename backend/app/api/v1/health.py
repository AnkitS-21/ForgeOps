import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.service import Service
from app.models.health_check import HealthCheck
from app.schemas.health_check import HealthCheckResponse
from app.services.health_monitor import check_service_health


router = APIRouter(
    prefix="/services",
    tags=["Health Monitoring"]
)


@router.post(
    "/{service_id}/health-check",
    response_model=HealthCheckResponse
)
def run_health_check(
    service_id: uuid.UUID,
    db: Session = Depends(get_db)
):

    service = db.get(Service, service_id)

    if not service:
        raise HTTPException(
            status_code=404,
            detail="Service not found"
        )

    if not service.endpoint_url:
        raise HTTPException(
            status_code=400,
            detail="Service endpoint URL is not configured"
        )

    return check_service_health(db, service)


@router.get(
    "/{service_id}/health-history",
    response_model=list[HealthCheckResponse]
)
def get_health_history(
    service_id: uuid.UUID,
    db: Session = Depends(get_db)
):

    service = db.get(Service, service_id)

    if not service:
        raise HTTPException(
            status_code=404,
            detail="Service not found"
        )

    statement = (
        select(HealthCheck)
        .where(HealthCheck.service_id == service_id)
        .order_by(HealthCheck.checked_at.desc())
        .limit(50)
    )

    return db.scalars(statement).all()