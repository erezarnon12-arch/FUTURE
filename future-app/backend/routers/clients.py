from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import Client
import schemas

router = APIRouter(prefix="/clients", tags=["clients"])


def _get_or_404(db: Session, client_id: int) -> Client:
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


@router.get("", response_model=List[schemas.ClientOut])
def list_clients(db: Session = Depends(get_db)):
    return db.query(Client).filter(Client.is_demo == True).order_by(Client.created_at.desc()).all()


@router.post("", response_model=schemas.ClientOut, status_code=201)
def create_client(data: schemas.ClientCreate, db: Session = Depends(get_db)):
    client = Client(**data.model_dump())
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


@router.get("/{client_id}", response_model=schemas.ClientOut)
def get_client(client_id: int, db: Session = Depends(get_db)):
    return _get_or_404(db, client_id)


@router.put("/{client_id}", response_model=schemas.ClientOut)
def update_client(client_id: int, data: schemas.ClientCreate, db: Session = Depends(get_db)):
    client = _get_or_404(db, client_id)
    for k, v in data.model_dump().items():
        setattr(client, k, v)
    db.commit()
    db.refresh(client)
    return client


@router.patch("/{client_id}", response_model=schemas.ClientOut)
def patch_client(client_id: int, data: schemas.ClientPatch, db: Session = Depends(get_db)):
    client = _get_or_404(db, client_id)
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(client, k, v)
    db.commit()
    db.refresh(client)
    return client


@router.delete("/{client_id}", status_code=204)
def delete_client(client_id: int, db: Session = Depends(get_db)):
    client = _get_or_404(db, client_id)
    db.delete(client)
    db.commit()
