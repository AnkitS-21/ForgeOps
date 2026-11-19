import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.incident import Incident
from app.schemas.incident import IncidentResponse


router = APIRouter(
    prefix="/incidents",
    tags=["Incident Management"]
)


@router.get("/", response_model=list[IncidentResponse])
def get_all_incidents(
    status: str | None = None,
    db: Session = Depends(get_db)
):
    statement = select(Incident).order_by(
        Incident.started_at.desc()
    )

    if status:
        if status not in ["open", "resolved"]:
            raise HTTPException(
                status_code=400,
                detail="Status must be open or resolved"
            )

        statement = statement.where(
            Incident.status == status
        )

    return db.scalars(statement).all()


@router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident(
    incident_id: uuid.UUID,
    db: Session = Depends(get_db)
):
    incident = db.get(Incident, incident_id)

    if not incident:
        raise HTTPException(
            status_code=404,
            detail="Incident not found"
        )

    return incident