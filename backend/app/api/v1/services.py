import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.db.session import get_db

from app.schemas.service import (
    ServiceCreate,
    ServiceUpdate,
    ServiceResponse
)

from app.services import service as service_service


router = APIRouter(
    prefix="/services",
    tags=["Services"]
)


@router.post(
    "/",
    response_model=ServiceResponse,
    status_code=status.HTTP_201_CREATED
)
def create_new_service(
    data: ServiceCreate,
    db: Session = Depends(get_db)
):

    try:
        return service_service.create_service(db, data)

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=409,
            detail="A service with this name already exists"
        )


@router.get(
    "/",
    response_model=list[ServiceResponse]
)
def get_services(db: Session = Depends(get_db)):

    return service_service.get_all_services(db)


@router.get(
    "/{service_id}",
    response_model=ServiceResponse
)
def get_service(
    service_id: uuid.UUID,
    db: Session = Depends(get_db)
):

    service = service_service.get_service_by_id(db, service_id)

    if not service:
        raise HTTPException(
            status_code=404,
            detail="Service not found"
        )

    return service


@router.patch(
    "/{service_id}",
    response_model=ServiceResponse
)
def update_existing_service(
    service_id: uuid.UUID,
    data: ServiceUpdate,
    db: Session = Depends(get_db)
):

    service = service_service.get_service_by_id(db, service_id)

    if not service:
        raise HTTPException(
            status_code=404,
            detail="Service not found"
        )

    try:
        return service_service.update_service(db, service, data)

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=409,
            detail="A service with this name already exists"
        )


@router.delete(
    "/{service_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
def delete_existing_service(
    service_id: uuid.UUID,
    db: Session = Depends(get_db)
):

    service = service_service.get_service_by_id(db, service_id)

    if not service:
        raise HTTPException(
            status_code=404,
            detail="Service not found"
        )

    service_service.delete_service(db, service)

    return None