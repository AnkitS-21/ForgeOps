from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.incident import Incident


def process_incident(
    db: Session,
    service,
    health_status: str,
    status_code: int | None,
    error_message: str | None
):
    statement = (
        select(Incident)
        .where(
            Incident.service_id == service.id,
            Incident.status == "open"
        )
        .order_by(Incident.started_at.desc())
    )

    incident = db.scalar(statement)

    # Case 1: Service is unhealthy
    if health_status == "unhealthy":

        # Existing incident: update it
        if incident:
            incident.occurrence_count += 1
            incident.last_seen_at = datetime.now(timezone.utc)
            incident.description = error_message

        # No open incident: create one
        else:
            severity = (
                "high"
                if status_code is None or status_code >= 500
                else "medium"
            )

            incident = Incident(
                service_id=service.id,
                title=f"{service.name} is unhealthy",
                description=error_message,
                severity=severity,
                status="open",
                occurrence_count=1
            )

            db.add(incident)

    # Case 2: Service has recovered
    elif health_status == "healthy" and incident:

        incident.status = "resolved"
        incident.resolved_at = datetime.now(timezone.utc)