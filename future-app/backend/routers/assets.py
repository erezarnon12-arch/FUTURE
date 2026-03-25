from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
from models import Asset, Client
import schemas

router = APIRouter(tags=["assets"])


def _get_client_or_404(db: Session, client_id: int) -> Client:
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


def _get_asset_or_404(db: Session, asset_id: int) -> Asset:
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset


# ── Per-client routes ─────────────────────────────────────────────────────────

@router.get("/clients/{client_id}/assets", response_model=List[schemas.AssetOut])
def list_assets(
    client_id: int,
    ring: Optional[str] = None,
    db: Session = Depends(get_db),
):
    _get_client_or_404(db, client_id)
    q = db.query(Asset).filter(Asset.client_id == client_id)
    if ring:
        q = q.filter(Asset.ring == ring)
    return q.order_by(Asset.ring, Asset.balance.desc()).all()


@router.post("/clients/{client_id}/assets", response_model=schemas.AssetOut, status_code=201)
def create_asset(client_id: int, data: schemas.AssetCreate, db: Session = Depends(get_db)):
    _get_client_or_404(db, client_id)
    asset = Asset(client_id=client_id, **data.model_dump())
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


@router.post("/clients/{client_id}/assets/bulk", response_model=schemas.BulkAssetOut, status_code=201)
def bulk_create_assets(client_id: int, data: schemas.BulkAssetCreate, db: Session = Depends(get_db)):
    _get_client_or_404(db, client_id)
    created = []
    for item in data.assets:
        asset = Asset(client_id=client_id, **item.model_dump())
        db.add(asset)
        created.append(asset)
    db.commit()
    for a in created:
        db.refresh(a)
    return {"created": len(created), "assets": created}


# ── Single-asset routes ───────────────────────────────────────────────────────

@router.get("/assets/{asset_id}", response_model=schemas.AssetOut)
def get_asset(asset_id: int, db: Session = Depends(get_db)):
    return _get_asset_or_404(db, asset_id)


@router.put("/assets/{asset_id}", response_model=schemas.AssetOut)
def update_asset(asset_id: int, data: schemas.AssetCreate, db: Session = Depends(get_db)):
    asset = _get_asset_or_404(db, asset_id)
    for k, v in data.model_dump().items():
        setattr(asset, k, v)
    db.commit()
    db.refresh(asset)
    return asset


@router.patch("/assets/{asset_id}", response_model=schemas.AssetOut)
def patch_asset(asset_id: int, data: schemas.AssetPatch, db: Session = Depends(get_db)):
    asset = _get_asset_or_404(db, asset_id)
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(asset, k, v)
    db.commit()
    db.refresh(asset)
    return asset


@router.delete("/assets/{asset_id}", status_code=204)
def delete_asset(asset_id: int, db: Session = Depends(get_db)):
    asset = _get_asset_or_404(db, asset_id)
    db.delete(asset)
    db.commit()
