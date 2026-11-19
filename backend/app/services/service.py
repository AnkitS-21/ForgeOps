import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.service import Service
from app.schemas.service import ServiceCreate, ServiceUpdate


def create_service(db: Session, data: ServiceCreate):

    service = Service(**data.model_dump())

    db.add(service)
    db.commit()
    db.refresh(service)

    return service


def get_all_services(db: Session):

    statement = select(Service).order_by(Service.created_at.desc())

    return db.scalars(statement).all()


def get_service_by_id(db: Session, service_id: uuid.UUID):

    statement = select(Service).where(Service.id == service_id)

    return db.scalar(statement)


def update_service(
    db: Session,
    service: Service,
    data: ServiceUpdate
):

    update_data = data.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(service, key, value)

    db.commit()
    db.refresh(service)

    return service


def delete_service(db: Session, service: Service):

    db.delete(service)
    db.commit()