from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import Liability, Client
import schemas

router = APIRouter(tags=["liabilities"])


def _get_client_or_404(db: Session, client_id: int) -> Client:
    c = db.query(Client).filter(Client.id == client_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Client not found")
    return c


def _get_liability_or_404(db: Session, liability_id: int) -> Liability:
    l = db.query(Liability).filter(Liability.id == liability_id).first()
    if not l:
        raise HTTPException(status_code=404, detail="Liability not found")
    return l


@router.get("/clients/{client_id}/liabilities", response_model=List[schemas.LiabilityOut])
def list_liabilities(client_id: int, db: Session = Depends(get_db)):
    _get_client_or_404(db, client_id)
    return db.query(Liability).filter(Liability.client_id == client_id).all()


@router.post("/clients/{client_id}/liabilities", response_model=schemas.LiabilityOut, status_code=201)
def create_liability(client_id: int, data: schemas.LiabilityCreate, db: Session = Depends(get_db)):
    _get_client_or_404(db, client_id)
    liability = Liability(client_id=client_id, **data.model_dump())
    db.add(liability)
    db.commit()
    db.refresh(liability)
    return liability


@router.get("/liabilities/{liability_id}", response_model=schemas.LiabilityOut)
def get_liability(liability_id: int, db: Session = Depends(get_db)):
    return _get_liability_or_404(db, liability_id)


@router.put("/liabilities/{liability_id}", response_model=schemas.LiabilityOut)
def update_liability(liability_id: int, data: schemas.LiabilityCreate, db: Session = Depends(get_db)):
    liability = _get_liability_or_404(db, liability_id)
    for k, v in data.model_dump().items():
        setattr(liability, k, v)
    db.commit()
    db.refresh(liability)
    return liability


@router.patch("/liabilities/{liability_id}", response_model=schemas.LiabilityOut)
def patch_liability(liability_id: int, data: schemas.LiabilityPatch, db: Session = Depends(get_db)):
    liability = _get_liability_or_404(db, liability_id)
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(liability, k, v)
    db.commit()
    db.refresh(liability)
    return liability


@router.delete("/liabilities/{liability_id}", status_code=204)
def delete_liability(liability_id: int, db: Session = Depends(get_db)):
    liability = _get_liability_or_404(db, liability_id)
    db.delete(liability)
    db.commit()
