"""
Owner-protected routes for real (non-demo) clients.
Requires X-Owner-Key header matching OWNER_KEY env variable.
"""
import os
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import Client
import schemas

OWNER_KEY = os.getenv("OWNER_KEY", "")

router = APIRouter(prefix="/owner", tags=["owner"])


def verify_owner(x_owner_key: str = Header(..., alias="X-Owner-Key")):
    if not OWNER_KEY:
        raise HTTPException(status_code=503, detail="Owner key not configured on server")
    if x_owner_key != OWNER_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")


def _get_or_404(db: Session, client_id: int) -> Client:
    client = db.query(Client).filter(Client.id == client_id, Client.is_demo == False).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


@router.get("/clients", response_model=List[schemas.ClientOut])
def list_owner_clients(db: Session = Depends(get_db), _: None = Depends(verify_owner)):
    return db.query(Client).filter(Client.is_demo == False).order_by(Client.created_at.desc()).all()


@router.post("/clients", response_model=schemas.ClientOut, status_code=201)
def create_owner_client(data: schemas.ClientCreate, db: Session = Depends(get_db), _: None = Depends(verify_owner)):
    client = Client(**data.model_dump(), is_demo=False)
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


@router.get("/clients/{client_id}", response_model=schemas.ClientOut)
def get_owner_client(client_id: int, db: Session = Depends(get_db), _: None = Depends(verify_owner)):
    return _get_or_404(db, client_id)


@router.patch("/clients/{client_id}", response_model=schemas.ClientOut)
def patch_owner_client(client_id: int, data: schemas.ClientPatch, db: Session = Depends(get_db), _: None = Depends(verify_owner)):
    client = _get_or_404(db, client_id)
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(client, k, v)
    db.commit()
    db.refresh(client)
    return client


@router.delete("/clients/{client_id}", status_code=204)
def delete_owner_client(client_id: int, db: Session = Depends(get_db), _: None = Depends(verify_owner)):
    client = _get_or_404(db, client_id)
    db.delete(client)
    db.commit()
