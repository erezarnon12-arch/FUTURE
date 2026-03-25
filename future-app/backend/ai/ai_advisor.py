"""
AI Financial Advisor — holistic portfolio analysis and prioritized recommendations.

This module is the top-level orchestration layer that:
  1. Loads a client's full financial picture from the database
  2. Runs every computation module (portfolio, retirement, rebalancing,
     fee drag, debt payoff, projections, goals)
  3. Assembles a structured AdvisorReport with typed recommendations,
     estimated monetary impact, effort labels, and time horizons
  4. Uses Claude to generate the narrative and rank recommendations (falls
     back to a rule-based engine when no API key is configured)
  5. Persists each report to the AIAnalysis table for history

Public interface:
  generate_full_report(db, client_id)              — comprehensive AdvisorReport
  advise_on_ring(db, client_id, ring)              — focused advice for one ring
  prioritize_actions(db, client_id, top_n)         — top-N cross-domain actions
  get_report_history(db, client_id, limit)         — past reports from DB

Difference from ai/analysis.py:
  analysis.py  — narrow health-score tool, takes pre-computed FinancialSummary
  ai_advisor   — full orchestration: queries DB, runs all simulations, produces
                 deeply typed AdvisorReport with per-recommendation ILS impact
"""

from __future__ import annotations

import json
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy.orm import Session

from models import AIAnalysis, Asset, Client, Goal, Liability, RingType
from services.portfolio import (
    compute_allocation_pct,
    compute_fee_drag,
    compute_rebalancing,
    compute_summary,
)
from simulations.projections import project_wealth
from simulations.retirement import compute_retirement_readiness
from simulations.debt_payoff import compute_debt_payoff
from ai.client import MODEL, api_key_valid, get_sync_client


# ── Dataclasses ───────────────────────────────────────────────────────────────

@dataclass
class Recommendation:
    """A single actionable recommendation with impact metadata."""
    id:           str          # unique slug, e.g. "increase-retirement-deposit"
    category:     str          # "retirement" | "fees" | "rebalancing" | "debt" | "goals" | "emergency" | "growth"
    priority:     int          # 1 (most urgent) to 5
    status:       str          # "urgent" | "recommended" | "optional"
    action:       str          # imperative sentence, e.g. "Increase monthly pension contribution"
    rationale:    str          # why this matters for this specific client
    impact_ils:   float        # estimated ILS impact (positive = gain or cost saved)
    time_horizon: str          # "immediate" | "1-3 months" | "3-6 months" | "1 year" | "5+ years"
    effort:       str          # "low" | "medium" | "high"


@dataclass
class RingAdvice:
    """Advisory summary for one portfolio ring."""
    ring:            str
    score:           int        # 0-100
    status:          str        # "excellent" | "good" | "needs_attention" | "critical"
    balance:         float
    allocation_pct:  float
    target_pct:      float
    summary:         str
    recommendations: list[Recommendation] = field(default_factory=list)


@dataclass
class AdvisorReport:
    """Complete advisory report for a client."""
    client_id:          int
    client_name:        str
    generated_at:       float          # Unix timestamp
    overall_score:      int            # 0-100 composite financial health
    score_label:        str            # "Excellent" | "Good" | "Needs Work" | "At Risk" | "Critical"
    executive_summary:  str
    key_strengths:      list[str]
    key_concerns:       list[str]
    top_actions:        list[Recommendation]    # top 3 highest-priority cross-domain
    all_recommendations: list[Recommendation]   # full ranked list
    ring_advice:        dict[str, RingAdvice]   # "retirement" | "security" | "growth"
    retirement_outlook: dict
    rebalancing:        dict
    fee_analysis:       dict
    debt_analysis:      Optional[dict]
    goal_summary:       list[dict]
    projections:        dict            # conservative / average / aggressive total wealth
    net_worth:          float
    monthly_surplus:    float
    safety_months:      float
    ai_generated:       bool = False
    model_used:         Optional[str] = None
    error:              Optional[str] = None


# ── DB helpers ────────────────────────────────────────────────────────────────

def _load_client_data(db: Session, client_id: int) -> tuple[Client, list[Asset], list[Liability], list[Goal]]:
    client      = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise ValueError(f"Client {client_id} not found")
    assets      = db.query(Asset).filter(Asset.client_id == client_id).all()
    liabilities = db.query(Liability).filter(Liability.client_id == client_id).all()
    goals       = db.query(Goal).filter(Goal.client_id == client_id).all()
    return client, assets, liabilities, goals


def _persist_report(db: Session, client_id: int, report: AdvisorReport) -> None:
    """Save a summary of the report to AIAnalysis for history retrieval."""
    try:
        entry = AIAnalysis(
            client_id     = client_id,
            analysis_type = "full_advisor_report",
            summary       = report.executive_summary,
            findings      = json.dumps(report.key_concerns),
            recommendations = json.dumps([
                {"action": r.action, "priority": r.priority, "impact_ils": r.impact_ils}
                for r in report.top_actions
            ]),
            score = float(report.overall_score),
        )
        db.add(entry)
        db.commit()
    except Exception:
        db.rollback()   # non-fatal — report is returned regardless


def get_report_history(db: Session, client_id: int, limit: int = 10) -> list[dict]:
    """Return past advisor reports from the AIAnalysis table."""
    rows = (
        db.query(AIAnalysis)
        .filter(
            AIAnalysis.client_id     == client_id,
            AIAnalysis.analysis_type == "full_advisor_report",
        )
        .order_by(AIAnalysis.created_at.desc())
        .limit(limit)
        .all()
    )
    results = []
    for r in rows:
        results.append({
            "id":          r.id,
            "score":       r.score,
            "summary":     r.summary,
            "concerns":    json.loads(r.findings or "[]"),
            "top_actions": json.loads(r.recommendations or "[]"),
            "created_at":  r.created_at.isoformat() if r.created_at else None,
        })
    return results


# ── Data assembly ─────────────────────────────────────────────────────────────

def _assemble_context(
    client: Client,
    assets: list[Asset],
    liabilities: list[Liability],
    goals: list[Goal],
) -> dict:
    """Run all computation modules and return a single context dict."""
    summary    = compute_summary(client, assets, liabilities)
    allocation = compute_allocation_pct(summary.rings)
    readiness  = compute_retirement_readiness(client, assets)
    rebalance  = compute_rebalancing(client, assets)
    fee_drag   = compute_fee_drag(assets, horizon_years=30)

    debt_payoff = None
    if liabilities:
        try:
            debt_payoff = compute_debt_payoff(liabilities, extra_monthly=0)
        except Exception:
            pass

    projections = {}
    for scenario in ("conservative", "average", "aggressive"):
        try:
            proj = project_wealth(client, assets, scenario)
            projections[scenario] = {
                "total_projected_wealth":  proj["total_projected_wealth"],
                "years_to_retirement":     proj["years_to_retirement"],
            }
        except Exception:
            projections[scenario] = {"total_projected_wealth": 0, "years_to_retirement": 0}

    goal_summary = []
    for g in goals:
        pct = (g.current_amount / g.target_amount * 100) if g.target_amount else 0
        goal_summary.append({
            "id":          g.id,
            "title":       g.title,
            "goal_type":   g.goal_type.value,
            "status":      g.status.value,
            "progress_pct": round(min(100, pct), 1),
            "current":     g.current_amount,
            "target":      g.target_amount,
            "monthly_contribution": g.monthly_contribution or 0,
        })

    return {
        "summary":     summary,
        "allocation":  allocation,
        "readiness":   readiness,
        "rebalance":   rebalance,
        "fee_drag":    fee_drag,
        "debt_payoff": debt_payoff,
        "projections": projections,
        "goal_summary": goal_summary,
    }


# ── Rule-based recommendation engine ─────────────────────────────────────────

def _rule_based_recommendations(
    client: Client,
    ctx: dict,
) -> tuple[int, list[str], list[str], list[Recommendation]]:
    """
    Generate prioritized recommendations without AI.

    Returns:
        (overall_score, key_strengths, key_concerns, recommendations)
    """
    summary    = ctx["summary"]
    allocation = ctx["allocation"]
    readiness  = ctx["readiness"]
    rebalance  = ctx["rebalance"]
    fee_drag   = ctx["fee_drag"]
    debt_payoff = ctx["debt_payoff"]

    score = 70
    strengths: list[str] = []
    concerns:  list[str] = []
    recs:      list[Recommendation] = []

    # ── Emergency fund ────────────────────────────────────────────────────────
    safety = summary.safety_months
    if safety < 3:
        score -= 20
        shortfall = (6 - safety) * client.monthly_expenses
        concerns.append(f"Emergency fund covers only {safety:.1f} months — severe risk")
        recs.append(Recommendation(
            id="build-emergency-fund",
            category="emergency",
            priority=1,
            status="urgent",
            action=f"Build emergency fund to at least 6 months (₪{shortfall:,.0f} needed)",
            rationale=(
                f"Your security ring covers only {safety:.1f} months of expenses. "
                "One unexpected event could force you to liquidate growth investments at a loss."
            ),
            impact_ils=shortfall,
            time_horizon="1-3 months",
            effort="medium",
        ))
    elif safety < 6:
        score -= 8
        shortfall = (6 - safety) * client.monthly_expenses
        concerns.append(f"Emergency fund at {safety:.1f} months — below the 6-month minimum")
        recs.append(Recommendation(
            id="top-up-emergency-fund",
            category="emergency",
            priority=2,
            status="recommended",
            action=f"השלם את קרן החירום ב-₪{shortfall:,.0f} כדי להגיע לכיסוי של 6 חודשים",
            rationale=f"כיסוי נוכחי של {safety:.1f} חודשים נמוך מהמלצת 6–12 חודשים.",
            impact_ils=shortfall,
            time_horizon="3-6 months",
            effort="low",
        ))
    else:
        score += 5
        strengths.append(f"קרן חירום מכסה {safety:.1f} חודשים — מצוינת")

    # ── Cash flow ─────────────────────────────────────────────────────────────
    surplus = summary.monthly_surplus
    if surplus < 0:
        score -= 15
        concerns.append(f"תזרים חודשי שלילי: ₪{surplus:,.0f} לחודש")
        recs.append(Recommendation(
            id="fix-cash-flow",
            category="emergency",
            priority=1,
            status="urgent",
            action="הפחת הוצאות חודשיות או הגדל הכנסות לסגירת גירעון התקציב",
            rationale=(
                f"גירעון חודשי של ₪{abs(surplus):,.0f} מצטבר ל-₪{abs(surplus) * 12:,.0f} בשנה "
                "כחוב חדש, ופוגע בכל מאמצי צבירת העושר."
            ),
            impact_ils=abs(surplus) * 12,
            time_horizon="immediate",
            effort="high",
        ))
    elif surplus > 0:
        score += 3
        strengths.append(f"עודף חודשי חיובי: ₪{surplus:,.0f} זמינים להשקעה")

    # ── Net worth ─────────────────────────────────────────────────────────────
    if summary.net_worth < 0:
        score -= 10
        concerns.append(f"שווי נטו שלילי: ₪{summary.net_worth:,.0f}")
    elif summary.net_worth > client.monthly_expenses * 24:
        score += 5
        strengths.append(f"שווי נטו של ₪{summary.net_worth:,.0f} מייצג {summary.net_worth / (client.monthly_expenses * 12):.1f} שנות הוצאות")

    # ── Retirement ────────────────────────────────────────────────────────────
    r_pct  = readiness["readiness_pct"]
    gap    = readiness["gap"]
    add_mo = readiness["additional_monthly_needed"]

    if r_pct >= 100:
        score += 8
        strengths.append(f"פנסיה במסלול טוב — תחזית {r_pct:.0f}% מהיעד")
    elif r_pct >= 75:
        score -= 5
        concerns.append(f"הפנסיה מעט מאחור: {r_pct:.0f}% מיעד ₪{readiness['target_nest_egg']:,.0f}")
        recs.append(Recommendation(
            id="boost-retirement-contributions",
            category="retirement",
            priority=2,
            status="recommended",
            action=f"הוסף ₪{add_mo:,.0f} לחודש לטבעת הפרישה לסגירת הפער",
            rationale=f"חסר משוער של ₪{gap:,.0f}. תוספת של ₪{add_mo:,.0f} לחודש מצטברת על פני {readiness['years_to_retirement']} שנים לסגירת הפער.",
            impact_ils=gap,
            time_horizon="1 year",
            effort="low",
        ))
    elif r_pct >= 50:
        score -= 12
        concerns.append(f"הפנסיה מאחור: {r_pct:.0f}% מהיעד — חסר משוער ₪{gap:,.0f}")
        recs.append(Recommendation(
            id="boost-retirement-contributions",
            category="retirement",
            priority=1,
            status="urgent",
            action=f"הגדל הפרשות פנסיה ב-₪{add_mo:,.0f} לחודש ועבור למסלול צמיחה",
            rationale=f"בהמשך המסלול הנוכחי תגיע לפנסיה עם חסר של ₪{gap:,.0f}. פעולה מוקדמת יעילה הרבה יותר מתיקון מאוחר.",
            impact_ils=gap,
            time_horizon="immediate",
            effort="medium",
        ))
    else:
        score -= 20
        concerns.append(f"הפנסיה מאחור משמעותית: רק {r_pct:.0f}% מהיעד")
        recs.append(Recommendation(
            id="urgent-retirement-overhaul",
            category="retirement",
            priority=1,
            status="urgent",
            action=f"דחוף: הגדל הפרשות פנסיה ב-₪{add_mo:,.0f} לחודש ובצע בדיקת אסטרטגיית השקעה",
            rationale=f"פער משוער של ₪{gap:,.0f}. נדרשת פעולה מיידית ומתמשכת למניעת עבודה מעבר לגיל הפרישה.",
            impact_ils=gap,
            time_horizon="immediate",
            effort="high",
        ))

    # ── Fees ─────────────────────────────────────────────────────────────────
    total_drag = fee_drag.get("total_drag", 0)
    high_fee_items = [i for i in fee_drag.get("items", []) if i.get("fee_pct", 0) > 1.0]

    if high_fee_items:
        score -= min(10, len(high_fee_items) * 3)
        concerns.append(f"{len(high_fee_items)} נכסים בדמי ניהול גבוהים — עלות של ₪{total_drag:,.0f} על פני 30 שנה")
        worst = high_fee_items[0]
        recs.append(Recommendation(
            id="reduce-management-fees",
            category="fees",
            priority=3,
            status="recommended",
            action=f"נהל משא ומתן או עבור ל-'{worst['asset_name']}' (כיום {worst['fee_pct']:.2f}%) לחלופה בעלות נמוכה יותר",
            rationale=f"דמי ניהול גבוהים מצטברים ל-₪{total_drag:,.0f} של פגיעה בעושר על פני 30 שנה. אפילו הפחתה של 0.5% משמעותית.",
            impact_ils=total_drag,
            time_horizon="3-6 months",
            effort="medium",
        ))
    elif summary.total_assets > 0:
        strengths.append(f"דמי הניהול בטווח סביר")

    # ── Rebalancing ───────────────────────────────────────────────────────────
    rebalance_needed = not rebalance.get("in_balance", True)
    drift_items = [i for i in rebalance.get("items", []) if i.get("action") != "hold"]
    if rebalance_needed and drift_items:
        score -= 5
        largest_drift = max(drift_items, key=lambda x: abs(x.get("delta", 0)))
        concerns.append(f"התיק סטה מהקצאת היעד המתאימה לגיל ({len(drift_items)} טבעות חורגות)")
        recs.append(Recommendation(
            id="rebalance-portfolio",
            category="rebalancing",
            priority=3,
            status="recommended",
            action=f"איזון מחדש: {largest_drift['action']} בטבעת {largest_drift['ring']} ב-₪{abs(largest_drift.get('delta', 0)):,.0f}",
            rationale=(
                f"הקצאתך הנוכחית חורגת מהיעד המתאים לגיל {client.age}. "
                "איזון מחדש מפחית סיכון ומיישר את התיק עם אופק ההשקעה שלך."
            ),
            impact_ils=abs(largest_drift.get("delta", 0)) * 0.02,  # conservative: 2% improvement on re-rated capital
            time_horizon="1-3 months",
            effort="low",
        ))
    else:
        strengths.append("הקצאת התיק בטווחי היעד המתאימים לגיל")

    # ── Debt ─────────────────────────────────────────────────────────────────
    if debt_payoff:
        avalanche = debt_payoff.get("avalanche", {})
        snowball  = debt_payoff.get("snowball", {})
        av_interest = avalanche.get("total_interest_paid", 0)
        sw_interest = snowball.get("total_interest_paid", 0)
        interest_savings = abs(sw_interest - av_interest)

        if av_interest > 0:
            recs.append(Recommendation(
                id="use-avalanche-debt-strategy",
                category="debt",
                priority=4,
                status="recommended",
                action="השתמש באסטרטגיית המפולת (תחילה בריבית הגבוהה ביותר) לפירעון חובות",
                rationale=(
                    f"האסטרטגיה חוסכת ₪{interest_savings:,.0f} בריבית לעומת שיטת כדור השלג "
                    f"ומסיימת את החוב {abs(avalanche.get('total_months', 0) - snowball.get('total_months', 0))} חודשים מוקדם יותר."
                    if interest_savings > 0
                    else f"סך ריבית בשיטת המפולת: ₪{av_interest:,.0f}."
                ),
                impact_ils=max(0, interest_savings),
                time_horizon="5+ years",
                effort="low",
            ))

    # ── Growth ring ───────────────────────────────────────────────────────────
    growth_pct = allocation.get("growth", 0)
    ret_pct    = allocation.get("retirement", 0)

    if ret_pct == 0:
        score -= 15
        concerns.append("לא זוהו נכסי פנסיה — פער קריטי")
        recs.append(Recommendation(
            id="open-retirement-account",
            category="retirement",
            priority=1,
            status="urgent",
            action="פתח קרן פנסיה או קופת גמל מיידית",
            rationale="ללא נכסי פנסיה אין צמיחת ריבית דריבית עם הטבות מס. התחלה היום לעומת המתנה של 5 שנים יכולה להכפיל את חיסכון הפרישה.",
            impact_ils=client.monthly_income * 12 * 0.07 * max(0, client.retirement_age - client.age),
            time_horizon="immediate",
            effort="medium",
        ))

    if client.age < 45 and growth_pct < 10 and surplus > 1000:
        recs.append(Recommendation(
            id="grow-growth-ring",
            category="growth",
            priority=4,
            status="optional",
            action=f"העבר ₪{min(surplus * 0.3, 2000):,.0f} לחודש מהעודף להשקעה בטבעת הצמיחה (תעודות סל / מניות)",
            rationale=(
                f"בגיל {client.age} יש לך זמן לצמיחת ריבית דריבית במניות. "
                f"השקעה של ₪{surplus * 0.3:.0f} לחודש בתשואה של 9% בשנה תצמח ל-"
                f"₪{surplus * 0.3 * 12 * (pow(1.09, client.retirement_age - client.age) - 1) / 0.09:,.0f} עד הפרישה."
            ),
            impact_ils=surplus * 0.3 * 12 * (pow(1.09, max(1, client.retirement_age - client.age)) - 1) / 0.09,
            time_horizon="3-6 months",
            effort="low",
        ))

    # ── Goals ─────────────────────────────────────────────────────────────────
    active_goals = [g for g in ctx["goal_summary"] if g["status"] == "active"]
    behind_goals = [g for g in active_goals if g["progress_pct"] < 25]
    if behind_goals:
        score -= min(8, len(behind_goals) * 2)
        concerns.append(f"{len(behind_goals)} יעד/ות פעיל/ים ממומן/ים בפחות מ-25%")

    # ── Portfolio flags from the summary ─────────────────────────────────────
    for flag in summary.flags:
        if flag not in [c[:len(flag)] for c in concerns]:
            concerns.append(flag)
            score -= 3

    # Clamp score
    score = max(0, min(100, score))

    # Sort by priority, then by impact_ils descending
    recs.sort(key=lambda r: (r.priority, -r.impact_ils))

    return score, strengths, concerns, recs


def _score_label(score: int) -> str:
    if score >= 85: return "מצוין"
    if score >= 70: return "טוב"
    if score >= 55: return "דורש שיפור"
    if score >= 40: return "בסיכון"
    return "קריטי"


def _build_ring_advice(
    client: Client,
    ctx: dict,
    ring_recs: dict[str, list[Recommendation]],
) -> dict[str, RingAdvice]:
    summary    = ctx["summary"]
    allocation = ctx["allocation"]
    rebalance  = ctx["rebalance"]

    # Build target pct map from rebalance items
    target_map = {i["ring"]: i.get("target_pct", 0) for i in rebalance.get("items", [])}

    ring_advice: dict[str, RingAdvice] = {}
    for ring_name in ("retirement", "security", "growth"):
        ring_metrics = summary.rings.get(ring_name)
        if ring_metrics is None:
            continue

        balance     = ring_metrics.total_balance
        current_pct = allocation.get(ring_name, 0)
        target_pct  = target_map.get(ring_name, 0)
        drift       = current_pct - target_pct

        # Ring score based on balance, fees, and alignment
        ring_score = 60
        if abs(drift) < 5:     ring_score += 15
        elif abs(drift) < 15:  ring_score += 5
        else:                  ring_score -= 10

        if ring_metrics.avg_management_fee < 0.5:   ring_score += 10
        elif ring_metrics.avg_management_fee < 1.0: ring_score += 5
        else:                                        ring_score -= 8

        if ring_name == "retirement":
            r_pct = ctx["readiness"]["readiness_pct"]
            if r_pct >= 100:   ring_score += 15
            elif r_pct >= 75:  ring_score += 5
            elif r_pct >= 50:  ring_score -= 5
            else:              ring_score -= 15

        if ring_name == "security" and ring_metrics.total_balance > 0:
            ring_score += 5

        ring_score = max(0, min(100, ring_score))

        if ring_score >= 80:   ring_status = "excellent"
        elif ring_score >= 65: ring_status = "good"
        elif ring_score >= 45: ring_status = "needs_attention"
        else:                  ring_status = "critical"

        # Build ring summary
        if ring_name == "retirement":
            r = ctx["readiness"]
            ring_summary = (
                f"Balance ₪{balance:,.0f} ({current_pct:.1f}% of portfolio). "
                f"Retirement readiness: {r['readiness_pct']}% of ₪{r['target_nest_egg']:,.0f} target. "
                f"{r['summary']}"
            )
        elif ring_name == "security":
            ring_summary = (
                f"Balance ₪{balance:,.0f} ({current_pct:.1f}% of portfolio). "
                f"Emergency coverage: {ctx['summary'].safety_months:.1f} months "
                f"({ctx['summary'].safety_status})."
            )
        else:
            ring_summary = (
                f"Balance ₪{balance:,.0f} ({current_pct:.1f}% of portfolio, target {target_pct:.1f}%). "
                f"Avg return: {ring_metrics.avg_historical_return:.1f}%, avg fee: {ring_metrics.avg_management_fee:.2f}%."
            )

        ring_advice[ring_name] = RingAdvice(
            ring            = ring_name,
            score           = ring_score,
            status          = ring_status,
            balance         = balance,
            allocation_pct  = round(current_pct, 2),
            target_pct      = round(target_pct, 2),
            summary         = ring_summary,
            recommendations = ring_recs.get(ring_name, []),
        )

    return ring_advice


# ── AI-powered report generation ──────────────────────────────────────────────

_ADVISOR_SYSTEM = """You are FUTURE, a senior AI financial advisor.

You will receive a structured financial snapshot of a client. Your task is to:
1. Assess the overall financial health (score 0-100)
2. Identify 2-4 key strengths
3. Identify 2-4 key concerns
4. Produce a short executive summary (3-5 sentences)
5. Rank the top 3 actions by priority and monetary impact

Respond ONLY with valid JSON matching this exact schema — no markdown, no commentary:
{
  "overall_score": <integer 0-100>,
  "executive_summary": "<3-5 sentences>",
  "key_strengths": ["<strength 1>", "<strength 2>"],
  "key_concerns":  ["<concern 1>",  "<concern 2>"],
  "top_actions": [
    {
      "id":           "<kebab-slug>",
      "category":     "<retirement|fees|rebalancing|debt|goals|emergency|growth>",
      "priority":     <1-5>,
      "status":       "<urgent|recommended|optional>",
      "action":       "<imperative sentence>",
      "rationale":    "<why this matters for this specific client>",
      "impact_ils":   <estimated ILS impact as a number>,
      "time_horizon": "<immediate|1-3 months|3-6 months|1 year|5+ years>",
      "effort":       "<low|medium|high>"
    }
  ]
}"""


def _build_ai_prompt(client: Client, ctx: dict, rule_recs: list[Recommendation]) -> str:
    summary    = ctx["summary"]
    allocation = ctx["allocation"]
    readiness  = ctx["readiness"]
    fee_drag   = ctx["fee_drag"]
    projections = ctx["projections"]

    lines = [
        f"CLIENT: {client.name}, age {client.age}",
        f"Monthly income: ₪{client.monthly_income:,.0f} | expenses: ₪{client.monthly_expenses:,.0f} | surplus: ₪{summary.monthly_surplus:,.0f}",
        f"Net worth: ₪{summary.net_worth:,.0f} | total assets: ₪{summary.total_assets:,.0f} | liabilities: ₪{summary.total_liabilities:,.0f}",
        f"Risk tolerance: {client.risk_tolerance.value} | retirement age: {client.retirement_age}",
        f"Safety cushion: {summary.safety_months:.1f} months ({summary.safety_status})",
        f"",
        f"PORTFOLIO RINGS:",
    ]

    for ring_name, metrics in summary.rings.items():
        lines.append(
            f"  {ring_name.upper()}: ₪{metrics.total_balance:,.0f} "
            f"({allocation.get(ring_name, 0):.1f}%) | "
            f"fee {metrics.avg_management_fee:.2f}% | "
            f"return {metrics.avg_historical_return:.1f}% | "
            f"{metrics.asset_count} assets"
        )

    lines += [
        f"",
        f"RETIREMENT READINESS:",
        f"  Status: {readiness['status']} | readiness: {readiness['readiness_pct']}%",
        f"  Target: ₪{readiness['target_nest_egg']:,.0f} | projected: ₪{readiness['projected_at_retirement']:,.0f}",
        f"  Gap: ₪{readiness['gap']:,.0f} | extra needed/month: ₪{readiness['additional_monthly_needed']:,.0f}",
        f"",
        f"FEE DRAG (30 years): ₪{fee_drag.get('total_drag', 0):,.0f} total",
    ]
    for item in fee_drag.get("items", [])[:3]:
        lines.append(f"  - {item['asset_name']}: {item['fee_pct']:.2f}% fee → ₪{item['drag']:,.0f} drag")

    lines += [
        f"",
        f"WEALTH PROJECTIONS (years to retirement: {readiness['years_to_retirement']}):",
        f"  Conservative: ₪{projections.get('conservative', {}).get('total_projected_wealth', 0):,.0f}",
        f"  Average:      ₪{projections.get('average', {}).get('total_projected_wealth', 0):,.0f}",
        f"  Aggressive:   ₪{projections.get('aggressive', {}).get('total_projected_wealth', 0):,.0f}",
        f"",
        f"ACTIVE ALERTS: {', '.join(summary.flags) if summary.flags else 'None'}",
        f"",
        f"GOALS ({len(ctx['goal_summary'])} total):",
    ]
    for g in ctx["goal_summary"][:5]:
        lines.append(f"  - {g['title']}: {g['progress_pct']:.0f}% toward ₪{g['target']:,.0f} ({g['status']})")

    lines += [
        f"",
        f"RULE-BASED RECOMMENDATIONS (refine and re-rank these):",
    ]
    for rec in rule_recs[:6]:
        lines.append(
            f"  [{rec.priority}] {rec.category.upper()}: {rec.action} "
            f"(impact: ₪{rec.impact_ils:,.0f}, effort: {rec.effort})"
        )

    return "\n".join(lines)


def _ai_report(
    client: Client,
    ctx: dict,
    rule_score: int,
    rule_strengths: list[str],
    rule_concerns: list[str],
    rule_recs: list[Recommendation],
) -> tuple[int, str, list[str], list[str], list[Recommendation], bool]:
    """
    Call Claude to refine the rule-based analysis.

    Returns:
        (score, executive_summary, strengths, concerns, top_actions, ai_generated)
    """
    if not api_key_valid():
        return rule_score, _rule_based_summary(client, ctx, rule_score), rule_strengths, rule_concerns, rule_recs[:3], False

    prompt = _build_ai_prompt(client, ctx, rule_recs)

    try:
        message = get_sync_client().messages.create(
            model=MODEL,
            max_tokens=2048,
            system=_ADVISOR_SYSTEM,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = message.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]

        data = json.loads(raw)

        top_actions = []
        for item in data.get("top_actions", [])[:3]:
            top_actions.append(Recommendation(
                id           = item.get("id", "ai-action"),
                category     = item.get("category", "general"),
                priority     = int(item.get("priority", 3)),
                status       = item.get("status", "recommended"),
                action       = item.get("action", ""),
                rationale    = item.get("rationale", ""),
                impact_ils   = float(item.get("impact_ils", 0)),
                time_horizon = item.get("time_horizon", "1 year"),
                effort       = item.get("effort", "medium"),
            ))

        return (
            int(data.get("overall_score", rule_score)),
            data.get("executive_summary", ""),
            data.get("key_strengths", rule_strengths),
            data.get("key_concerns", rule_concerns),
            top_actions or rule_recs[:3],
            True,
        )

    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning("AI advisor call failed: %s", exc)
        return rule_score, _rule_based_summary(client, ctx, rule_score), rule_strengths, rule_concerns, rule_recs[:3], False


def _rule_based_summary(client: Client, ctx: dict, score: int) -> str:
    summary   = ctx["summary"]
    readiness = ctx["readiness"]
    return (
        f"{client.name}'s financial health score is {score}/100. "
        f"Net worth stands at ₪{summary.net_worth:,.0f} with a monthly surplus of ₪{summary.monthly_surplus:,.0f}. "
        f"Retirement readiness is at {readiness['readiness_pct']}% of the target nest egg "
        f"with {readiness['years_to_retirement']} years to go. "
        + (f"Emergency fund covers {summary.safety_months:.1f} months of expenses. " if summary.safety_months > 0 else "")
        + ("Configure ANTHROPIC_API_KEY for an AI-generated narrative with deeper insights." if not api_key_valid() else "")
    )


# ── Public interface ──────────────────────────────────────────────────────────

def generate_full_report(
    db: Session,
    client_id: int,
    persist: bool = True,
) -> AdvisorReport:
    """
    Generate a complete AdvisorReport for a client.

    Runs all computation modules, produces prioritized recommendations,
    calls Claude for narrative and re-ranking (falls back to rule-based),
    and optionally persists a summary to AIAnalysis.

    Args:
        db:         Active SQLAlchemy session.
        client_id:  ID of the client to analyze.
        persist:    Whether to save a report summary to the AIAnalysis table.

    Returns:
        AdvisorReport dataclass. On data error, report.error is set.
    """
    try:
        client, assets, liabilities, goals = _load_client_data(db, client_id)
    except ValueError as exc:
        return _empty_report(client_id, str(exc))

    try:
        ctx = _assemble_context(client, assets, liabilities, goals)
    except Exception as exc:
        return _empty_report(client_id, f"Context assembly failed: {exc}")

    try:
        rule_score, strengths, concerns, all_recs = _rule_based_recommendations(client, ctx)

        # Group recs by ring category for ring_advice attachment
        ring_recs: dict[str, list[Recommendation]] = {"retirement": [], "security": [], "growth": []}
        for rec in all_recs:
            if rec.category in ring_recs:
                ring_recs[rec.category].append(rec)

        ring_advice = _build_ring_advice(client, ctx, ring_recs)

        final_score, exec_summary, final_strengths, final_concerns, top_actions, ai_gen = _ai_report(
            client, ctx, rule_score, strengths, concerns, all_recs
        )

        report = AdvisorReport(
            client_id         = client_id,
            client_name       = client.name,
            generated_at      = time.time(),
            overall_score     = final_score,
            score_label       = _score_label(final_score),
            executive_summary = exec_summary,
            key_strengths     = final_strengths,
            key_concerns      = final_concerns,
            top_actions       = top_actions,
            all_recommendations = all_recs,
            ring_advice       = ring_advice,
            retirement_outlook = ctx["readiness"],
            rebalancing       = ctx["rebalance"],
            fee_analysis      = ctx["fee_drag"],
            debt_analysis     = ctx["debt_payoff"],
            goal_summary      = ctx["goal_summary"],
            projections       = ctx["projections"],
            net_worth         = ctx["summary"].net_worth,
            monthly_surplus   = ctx["summary"].monthly_surplus,
            safety_months     = ctx["summary"].safety_months,
            ai_generated      = ai_gen,
            model_used        = MODEL if ai_gen else None,
        )

        if persist:
            _persist_report(db, client_id, report)

        return report

    except Exception as exc:
        return _empty_report(client_id, f"Report generation failed: {exc}")


def advise_on_ring(db: Session, client_id: int, ring: str) -> dict:
    """
    Return focused advice for a single ring (retirement | security | growth).

    Cheaper than generate_full_report when only one ring is needed.
    """
    report = generate_full_report(db, client_id, persist=False)
    if report.error:
        return {"error": report.error}

    advice = report.ring_advice.get(ring)
    if not advice:
        return {"error": f"Ring '{ring}' not found"}

    return {
        "ring":            advice.ring,
        "score":           advice.score,
        "status":          advice.status,
        "balance":         advice.balance,
        "allocation_pct":  advice.allocation_pct,
        "target_pct":      advice.target_pct,
        "summary":         advice.summary,
        "recommendations": [asdict(r) for r in advice.recommendations],
        "retirement_outlook": (report.retirement_outlook if ring == "retirement" else None),
    }


def prioritize_actions(db: Session, client_id: int, top_n: int = 5) -> list[dict]:
    """
    Return the top N recommendations ranked by priority + impact.

    Useful for a quick-action widget on the dashboard.
    """
    report = generate_full_report(db, client_id, persist=False)
    if report.error:
        return []
    ranked = sorted(
        report.all_recommendations,
        key=lambda r: (r.priority, -r.impact_ils),
    )
    return [asdict(r) for r in ranked[:top_n]]


# ── Empty / error placeholder ─────────────────────────────────────────────────

def _empty_report(client_id: int, error: str) -> AdvisorReport:
    return AdvisorReport(
        client_id          = client_id,
        client_name        = f"Client {client_id}",
        generated_at       = time.time(),
        overall_score      = 0,
        score_label        = "Unknown",
        executive_summary  = error,
        key_strengths      = [],
        key_concerns       = [],
        top_actions        = [],
        all_recommendations = [],
        ring_advice        = {},
        retirement_outlook = {},
        rebalancing        = {},
        fee_analysis       = {},
        debt_analysis      = None,
        goal_summary       = [],
        projections        = {},
        net_worth          = 0,
        monthly_surplus    = 0,
        safety_months      = 0,
        error              = error,
    )
