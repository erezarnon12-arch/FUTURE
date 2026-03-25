"""
AI Advisor router — holistic portfolio analysis and prioritized recommendations.

Endpoints:
  GET  /ai-advice/{id}/report        — full AdvisorReport
  GET  /ai-advice/{id}/ring/{ring}   — focused advice for one ring
  GET  /ai-advice/{id}/actions       — top-N prioritized actions
  GET  /ai-advice/{id}/history       — past reports from DB
"""

from __future__ import annotations

from dataclasses import asdict

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from ai.ai_advisor import (
    advise_on_ring,
    generate_full_report,
    get_report_history,
    prioritize_actions,
)

router = APIRouter(prefix="/ai-advice", tags=["advisor"])


@router.get("/{client_id}/report")
def report_endpoint(
    client_id: int,
    persist:   bool = Query(True, description="Save report summary to AIAnalysis history"),
    db: Session = Depends(get_db),
):
    """
    Generate a comprehensive AdvisorReport for the client.

    Runs retirement readiness, rebalancing, fee drag, debt payoff, and
    projection simulations, then calls Claude to synthesize the findings
    into an executive summary, key strengths/concerns, and ranked actions.
    Falls back to rule-based analysis when no API key is configured.
    """
    report = generate_full_report(db, client_id, persist=persist)
    if report.error and not report.client_name:
        raise HTTPException(status_code=404, detail=report.error)

    result = asdict(report)
    # Convert RingAdvice dataclasses inside ring_advice
    result["ring_advice"] = {
        ring: asdict(advice) if hasattr(advice, "__dataclass_fields__") else advice
        for ring, advice in report.ring_advice.items()
    }
    return result


@router.get("/{client_id}/ring/{ring}")
def ring_advice_endpoint(
    client_id: int,
    ring:      str,
    db: Session = Depends(get_db),
):
    """
    Focused advice for a single ring: retirement | security | growth.

    Returns ring score, allocation vs. target, summary, and
    ring-specific recommendations.
    """
    if ring not in ("retirement", "security", "growth"):
        raise HTTPException(status_code=400, detail="ring must be 'retirement', 'security', or 'growth'")
    result = advise_on_ring(db, client_id, ring)
    if "error" in result and len(result) == 1:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.get("/{client_id}/actions")
def actions_endpoint(
    client_id: int,
    top_n:     int = Query(5, ge=1, le=20, description="Number of top actions to return"),
    db: Session = Depends(get_db),
):
    """
    Return the top-N prioritized actions across all categories,
    ranked by urgency and estimated ILS impact.
    """
    actions = prioritize_actions(db, client_id, top_n=top_n)
    return {"client_id": client_id, "actions": actions, "count": len(actions)}


@router.get("/{client_id}/history")
def history_endpoint(
    client_id: int,
    limit:     int = Query(10, ge=1, le=50, description="Number of past reports to return"),
    db: Session = Depends(get_db),
):
    """
    Retrieve past advisor report summaries from the AIAnalysis table.
    Useful for tracking financial health score over time.
    """
    history = get_report_history(db, client_id, limit=limit)
    return {"client_id": client_id, "reports": history, "count": len(history)}
