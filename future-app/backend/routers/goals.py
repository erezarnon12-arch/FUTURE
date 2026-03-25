from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import Goal, Client
import schemas

router = APIRouter(tags=["goals"])


def _get_client_or_404(db: Session, client_id: int) -> Client:
    c = db.query(Client).filter(Client.id == client_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Client not found")
    return c


def _get_goal_or_404(db: Session, goal_id: int) -> Goal:
    g = db.query(Goal).filter(Goal.id == goal_id).first()
    if not g:
        raise HTTPException(status_code=404, detail="Goal not found")
    return g


@router.get("/clients/{client_id}/goals", response_model=List[schemas.GoalOut])
def list_goals(client_id: int, db: Session = Depends(get_db)):
    _get_client_or_404(db, client_id)
    goals = db.query(Goal).filter(Goal.client_id == client_id).order_by(Goal.created_at.desc()).all()
    return [schemas.GoalOut.from_orm_with_progress(g) for g in goals]


@router.post("/clients/{client_id}/goals", response_model=schemas.GoalOut, status_code=201)
def create_goal(client_id: int, data: schemas.GoalCreate, db: Session = Depends(get_db)):
    _get_client_or_404(db, client_id)
    goal = Goal(client_id=client_id, **data.model_dump())
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return schemas.GoalOut.from_orm_with_progress(goal)


@router.get("/goals/{goal_id}", response_model=schemas.GoalOut)
def get_goal(goal_id: int, db: Session = Depends(get_db)):
    return schemas.GoalOut.from_orm_with_progress(_get_goal_or_404(db, goal_id))


@router.put("/goals/{goal_id}", response_model=schemas.GoalOut)
def update_goal(goal_id: int, data: schemas.GoalCreate, db: Session = Depends(get_db)):
    goal = _get_goal_or_404(db, goal_id)
    for k, v in data.model_dump().items():
        setattr(goal, k, v)
    db.commit()
    db.refresh(goal)
    return schemas.GoalOut.from_orm_with_progress(goal)


@router.patch("/goals/{goal_id}", response_model=schemas.GoalOut)
def patch_goal(goal_id: int, data: schemas.GoalPatch, db: Session = Depends(get_db)):
    goal = _get_goal_or_404(db, goal_id)
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(goal, k, v)
    db.commit()
    db.refresh(goal)
    return schemas.GoalOut.from_orm_with_progress(goal)


@router.delete("/goals/{goal_id}", status_code=204)
def delete_goal(goal_id: int, db: Session = Depends(get_db)):
    goal = _get_goal_or_404(db, goal_id)
    db.delete(goal)
    db.commit()
