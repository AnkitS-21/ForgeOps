import time

import httpx
from sqlalchemy.orm import Session

from app.models.service import Service, ServiceStatus
from app.models.health_check import HealthCheck

from app.services.incident_manager import process_incident


def check_service_health(db: Session, service: Service):

    if not service.endpoint_url:
        raise ValueError("Service does not have a health-check endpoint")

    start_time = time.perf_counter()

    status = "unhealthy"
    status_code = None
    error_message = None

    try:
        response = httpx.get(
            service.endpoint_url,
            timeout=5.0,
            follow_redirects=True
        )

        status_code = response.status_code

        if 200 <= status_code < 400:
            status = "healthy"
        else:
            error_message = f"HTTP {status_code}"

    except httpx.TimeoutException:
        error_message = "Health check timed out"

    except httpx.RequestError as error:
        error_message = str(error)

    response_time = round(
        (time.perf_counter() - start_time) * 1000,
        2
    )

    health_record = HealthCheck(
        service_id=service.id,
        status=status,
        response_time_ms=response_time,
        status_code=status_code,
        error_message=error_message
    )

    db.add(health_record)

    if status == "healthy":
        service.status = ServiceStatus.ACTIVE
    else:
        service.status = ServiceStatus.DEGRADED

    process_incident(
        db=db,
        service=service,
        health_status=status,
        status_code=status_code,
        error_message=error_message
    )

    db.commit()
    db.refresh(health_record)

    return health_record