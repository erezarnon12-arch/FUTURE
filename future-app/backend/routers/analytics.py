"""
Analytics router — dashboard, AI analysis, projections, fees, rebalancing,
retirement readiness, debt payoff, Monte Carlo, snapshots, and AI chat.
"""

from __future__ import annotations

import json
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database import get_db
from models import (
    AIAnalysis, Asset, Client, InvestmentThesis,
    Liability, NetWorthSnapshot,
)
from services.portfolio import compute_allocation_pct, compute_fee_drag, compute_rebalancing, compute_summary
from simulations.projections import project_wealth, project_wealth_inflation_adjusted
from simulations.retirement import compute_retirement_readiness
from simulations.debt_payoff import compute_debt_payoff
from simulations.monte_carlo import compute_monte_carlo
from ai.analysis import analyze_investment_thesis, run_ai_analysis
import ai.chat as chat_module
import schemas

router = APIRouter(tags=["analytics"])


# ── Data loaders ──────────────────────────────────────────────────────────────

def _load_client(db: Session, client_id: int) -> Client:
    c = db.query(Client).filter(Client.id == client_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Client not found")
    return c


def _load_assets(db: Session, client_id: int) -> List[Asset]:
    return db.query(Asset).filter(Asset.client_id == client_id).all()


def _load_liabilities(db: Session, client_id: int) -> List[Liability]:
    return db.query(Liability).filter(Liability.client_id == client_id).all()


# ── Dashboard ─────────────────────────────────────────────────────────────────

@router.get("/clients/{client_id}/dashboard")
def get_dashboard(client_id: int, db: Session = Depends(get_db)):
    client      = _load_client(db, client_id)
    assets      = _load_assets(db, client_id)
    liabilities = _load_liabilities(db, client_id)

    summary    = compute_summary(client, assets, liabilities)
    allocation = compute_allocation_pct(summary.rings)
    projections = {s: project_wealth(client, assets, s) for s in ("conservative", "average", "aggressive")}

    return {
        "client": {
            "id": client.id, "name": client.name, "age": client.age,
            "monthly_income":  client.monthly_income,
            "monthly_expenses": client.monthly_expenses,
            "risk_tolerance":  client.risk_tolerance,
            "retirement_age":  client.retirement_age,
        },
        "net_worth":         summary.net_worth,
        "total_assets":      summary.total_assets,
        "total_liabilities": summary.total_liabilities,
        "monthly_surplus":   summary.monthly_surplus,
        "safety_months":     summary.safety_months,
        "safety_status":     summary.safety_status,
        "flags":             summary.flags,
        "rings": {
            name: {
                "total_balance":         m.total_balance,
                "total_monthly_deposit": m.total_monthly_deposit,
                "avg_management_fee":    m.avg_management_fee,
                "avg_historical_return": m.avg_historical_return,
                "asset_count":           m.asset_count,
                "allocation_pct":        allocation.get(name, 0),
                "assets":                m.assets,
            }
            for name, m in summary.rings.items()
        },
        "projections": projections,
        "liabilities": [
            {
                "id":                l.id,
                "name":              l.name,
                "liability_type":    l.liability_type.value,
                "lender":            l.lender,
                "remaining_balance": l.remaining_balance,
                "original_amount":   l.original_amount,
                "interest_rate":     l.interest_rate,
                "monthly_payment":   l.monthly_payment,
                "remaining_months":  l.remaining_months,
            }
            for l in liabilities
        ],
    }


# ── AI full analysis ──────────────────────────────────────────────────────────

@router.post("/clients/{client_id}/analyze")
def run_analysis(client_id: int, db: Session = Depends(get_db)):
    client      = _load_client(db, client_id)
    assets      = _load_assets(db, client_id)
    liabilities = _load_liabilities(db, client_id)

    summary    = compute_summary(client, assets, liabilities)
    allocation = compute_allocation_pct(summary.rings)
    result     = run_ai_analysis(summary, allocation)

    record = AIAnalysis(
        client_id=client_id,
        analysis_type="full",
        summary=result.get("summary", ""),
        findings=json.dumps(result.get("findings", [])),
        recommendations=json.dumps(result.get("recommendations", [])),
        score=result.get("financial_health_score"),
    )
    db.add(record)
    db.commit()
    return result


@router.get("/clients/{client_id}/analyses")
def list_analyses(
    client_id: int,
    limit: int = Query(10, le=50),
    db: Session = Depends(get_db),
):
    _load_client(db, client_id)
    rows = (
        db.query(AIAnalysis)
        .filter(AIAnalysis.client_id == client_id)
        .order_by(AIAnalysis.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id":              r.id,
            "analysis_type":   r.analysis_type,
            "summary":         r.summary,
            "findings":        json.loads(r.findings) if r.findings else [],
            "recommendations": json.loads(r.recommendations) if r.recommendations else [],
            "score":           r.score,
            "created_at":      r.created_at,
        }
        for r in rows
    ]


# ── Investment theses ─────────────────────────────────────────────────────────

@router.get("/clients/{client_id}/theses", response_model=List[schemas.ThesisOut])
def list_theses(client_id: int, db: Session = Depends(get_db)):
    _load_client(db, client_id)
    return db.query(InvestmentThesis).filter(InvestmentThesis.client_id == client_id).all()


@router.post("/clients/{client_id}/theses", response_model=schemas.ThesisOut, status_code=201)
def create_thesis(client_id: int, data: schemas.ThesisCreate, db: Session = Depends(get_db)):
    _load_client(db, client_id)
    thesis = InvestmentThesis(client_id=client_id, **data.model_dump())
    db.add(thesis); db.commit(); db.refresh(thesis)
    return thesis


@router.put("/clients/{client_id}/theses/{thesis_id}", response_model=schemas.ThesisOut)
def update_thesis(
    client_id: int, thesis_id: int,
    data: schemas.ThesisCreate,
    db: Session = Depends(get_db),
):
    thesis = db.query(InvestmentThesis).filter(
        InvestmentThesis.id == thesis_id, InvestmentThesis.client_id == client_id,
    ).first()
    if not thesis:
        raise HTTPException(status_code=404, detail="Thesis not found")
    for k, v in data.model_dump().items():
        setattr(thesis, k, v)
    db.commit(); db.refresh(thesis)
    return thesis


@router.patch("/clients/{client_id}/theses/{thesis_id}", response_model=schemas.ThesisOut)
def patch_thesis(
    client_id: int, thesis_id: int,
    data: schemas.ThesisPatch,
    db: Session = Depends(get_db),
):
    thesis = db.query(InvestmentThesis).filter(
        InvestmentThesis.id == thesis_id, InvestmentThesis.client_id == client_id,
    ).first()
    if not thesis:
        raise HTTPException(status_code=404, detail="Thesis not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(thesis, k, v)
    db.commit(); db.refresh(thesis)
    return thesis


@router.delete("/clients/{client_id}/theses/{thesis_id}", status_code=204)
def delete_thesis(client_id: int, thesis_id: int, db: Session = Depends(get_db)):
    thesis = db.query(InvestmentThesis).filter(
        InvestmentThesis.id == thesis_id, InvestmentThesis.client_id == client_id,
    ).first()
    if not thesis:
        raise HTTPException(status_code=404, detail="Thesis not found")
    db.delete(thesis); db.commit()


@router.post("/clients/{client_id}/theses/{thesis_id}/analyze")
def analyze_thesis_endpoint(client_id: int, thesis_id: int, db: Session = Depends(get_db)):
    thesis = db.query(InvestmentThesis).filter(
        InvestmentThesis.id == thesis_id, InvestmentThesis.client_id == client_id,
    ).first()
    if not thesis:
        raise HTTPException(status_code=404, detail="Thesis not found")
    return analyze_investment_thesis({
        "title":              thesis.title,
        "macro_environment":  thesis.macro_environment,
        "sectors":            thesis.sectors,
        "advantages":         thesis.advantages,
        "risks":              thesis.risks,
        "historical_examples": thesis.historical_examples,
    })


# ── Projections ───────────────────────────────────────────────────────────────

@router.get("/clients/{client_id}/projections")
def get_projections(
    client_id: int,
    scenario: str = Query("average", pattern="^(conservative|average|aggressive)$"),
    db: Session = Depends(get_db),
):
    client = _load_client(db, client_id)
    assets = _load_assets(db, client_id)
    return project_wealth(client, assets, scenario)


@router.get("/clients/{client_id}/projections/inflation-adjusted")
def get_inflation_adjusted_projections(
    client_id: int,
    scenario: str  = Query("average", pattern="^(conservative|average|aggressive)$"),
    inflation: float = Query(0.03, ge=0, le=0.2),
    db: Session = Depends(get_db),
):
    client = _load_client(db, client_id)
    assets = _load_assets(db, client_id)
    return project_wealth_inflation_adjusted(client, assets, scenario, inflation)


# ── Specialised analytics ─────────────────────────────────────────────────────

@router.get("/clients/{client_id}/fees-report")
def get_fees_report(
    client_id: int,
    years: int = Query(30, ge=5, le=40),
    db: Session = Depends(get_db),
):
    _load_client(db, client_id)
    assets = _load_assets(db, client_id)
    return compute_fee_drag(assets, years)


@router.get("/clients/{client_id}/rebalance")
def get_rebalancing(client_id: int, db: Session = Depends(get_db)):
    client = _load_client(db, client_id)
    assets = _load_assets(db, client_id)
    return compute_rebalancing(client, assets)


@router.get("/clients/{client_id}/retirement-readiness")
def get_retirement_readiness(client_id: int, db: Session = Depends(get_db)):
    client = _load_client(db, client_id)
    assets = _load_assets(db, client_id)
    return compute_retirement_readiness(client, assets)


@router.get("/clients/{client_id}/debt-payoff")
def get_debt_payoff(
    client_id: int,
    extra_monthly: float = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    _load_client(db, client_id)
    liabilities = _load_liabilities(db, client_id)
    return compute_debt_payoff(liabilities, extra_monthly)


@router.get("/clients/{client_id}/monte-carlo")
def get_monte_carlo(
    client_id: int,
    scenario: str = Query("average", pattern="^(conservative|average|aggressive)$"),
    n_paths: int  = Query(1000, ge=100, le=5000),
    db: Session = Depends(get_db),
):
    client = _load_client(db, client_id)
    assets = _load_assets(db, client_id)
    return compute_monte_carlo(client, assets, scenario, n_paths)


# ── Net Worth Snapshots ───────────────────────────────────────────────────────

@router.post("/clients/{client_id}/snapshots", response_model=schemas.SnapshotOut, status_code=201)
def create_snapshot(client_id: int, data: schemas.SnapshotCreate, db: Session = Depends(get_db)):
    from models import RingType as RT
    client      = _load_client(db, client_id)
    assets      = _load_assets(db, client_id)
    liabilities = _load_liabilities(db, client_id)

    ret_bal  = sum(a.balance for a in assets if a.ring == RT.RETIREMENT)
    sec_bal  = sum(a.balance for a in assets if a.ring == RT.SECURITY)
    grow_bal = sum(a.balance for a in assets if a.ring == RT.GROWTH)
    total    = ret_bal + sec_bal + grow_bal
    total_l  = sum(l.remaining_balance for l in liabilities)

    snap = NetWorthSnapshot(
        client_id=client_id,
        total_assets=total,
        total_liabilities=total_l,
        net_worth=total - total_l,
        retirement_balance=ret_bal,
        security_balance=sec_bal,
        growth_balance=grow_bal,
        notes=data.notes,
    )
    db.add(snap); db.commit(); db.refresh(snap)
    return snap


@router.get("/clients/{client_id}/snapshots", response_model=List[schemas.SnapshotOut])
def list_snapshots(
    client_id: int,
    limit: int = Query(24, le=120),
    db: Session = Depends(get_db),
):
    _load_client(db, client_id)
    return (
        db.query(NetWorthSnapshot)
        .filter(NetWorthSnapshot.client_id == client_id)
        .order_by(NetWorthSnapshot.snapshot_date.desc())
        .limit(limit)
        .all()
    )


# ── AI Chat ───────────────────────────────────────────────────────────────────

@router.post("/clients/{client_id}/chat", response_model=schemas.ChatResponse)
def chat_endpoint(client_id: int, data: schemas.ChatRequest, db: Session = Depends(get_db)):
    client      = _load_client(db, client_id)
    assets      = _load_assets(db, client_id)
    liabilities = _load_liabilities(db, client_id)

    response_text = chat_module.chat(
        db=db, client=client, assets=assets, liabilities=liabilities,
        user_message=data.message, include_history=data.include_history,
    )
    return {"response": response_text, "role": "assistant"}


@router.post("/clients/{client_id}/chat/stream")
def chat_stream_endpoint(client_id: int, data: schemas.ChatRequest, db: Session = Depends(get_db)):
    client      = _load_client(db, client_id)
    assets      = _load_assets(db, client_id)
    liabilities = _load_liabilities(db, client_id)

    async def event_generator():
        async for chunk in chat_module.chat_stream(
            db=db, client=client, assets=assets, liabilities=liabilities,
            user_message=data.message, include_history=data.include_history,
        ):
            yield chunk

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/clients/{client_id}/chat/history")
def get_chat_history(
    client_id: int,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
):
    from models import ChatMessage
    _load_client(db, client_id)
    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.client_id == client_id)
        .order_by(ChatMessage.created_at.asc())
        .limit(limit)
        .all()
    )
    return [{"id": m.id, "role": m.role, "content": m.content, "created_at": m.created_at} for m in messages]


@router.delete("/clients/{client_id}/chat/history", status_code=204)
def clear_chat_history(client_id: int, db: Session = Depends(get_db)):
    _load_client(db, client_id)
    chat_module.clear_history(db, client_id)
