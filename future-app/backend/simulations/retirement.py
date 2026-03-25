"""
Retirement Readiness — on-track scoring and monthly savings gap analysis.

Rule-of-thumb: 25× annual expenses at retirement (4% withdrawal rule).
Projects wealth under the "average" scenario and compares to that target.
"""

from __future__ import annotations

from typing import List

from models import Asset, Client, RingType
from services.portfolio import SCENARIO_RETURNS
from simulations.projections import project_wealth


def compute_retirement_readiness(client: Client, assets: List[Asset]) -> dict:
    annual_expenses = client.monthly_expenses * 12
    target_nest_egg = annual_expenses * 25

    projection  = project_wealth(client, assets, "average")
    projected   = projection["total_projected_wealth"]
    years_left  = projection["years_to_retirement"]

    readiness_pct = (
        min(200, round(projected / target_nest_egg * 100, 1)) if target_nest_egg else 0
    )

    ret_balance = sum(a.balance for a in assets if a.ring == RingType.RETIREMENT)

    avg_return = SCENARIO_RETURNS["average"][RingType.RETIREMENT]
    monthly_r  = avg_return / 12
    n_months   = years_left * 12
    gap        = max(0, target_nest_egg - projected)

    if gap > 0 and n_months > 0 and monthly_r > 0:
        additional_needed = gap * monthly_r / ((1 + monthly_r) ** n_months - 1)
    else:
        additional_needed = 0

    current_ret_deposit = sum(
        a.monthly_deposit or 0 for a in assets if a.ring == RingType.RETIREMENT
    )

    if readiness_pct >= 100:
        status = "on_track"
    elif readiness_pct >= 75:
        status = "slightly_behind"
    elif readiness_pct >= 50:
        status = "behind"
    else:
        status = "significantly_behind"

    return {
        "target_nest_egg":              round(target_nest_egg),
        "projected_at_retirement":      projected,
        "readiness_pct":                readiness_pct,
        "status":                       status,
        "years_to_retirement":          years_left,
        "annual_expenses":              round(annual_expenses),
        "current_retirement_balance":   round(ret_balance),
        "current_monthly_contribution": round(current_ret_deposit),
        "additional_monthly_needed":    round(additional_needed),
        "gap":                          round(gap),
        "summary":                      _readiness_summary(status, readiness_pct, round(additional_needed)),
    }


def _readiness_summary(status: str, pct: float, additional: float) -> str:
    if status == "on_track":
        return f"On track for retirement — projected at {pct:.0f}% of the target nest egg."
    if status == "slightly_behind":
        return (
            f"Slightly behind target ({pct:.0f}%). "
            f"An extra ₪{additional:,}/month to the retirement ring would close the gap."
        )
    if status == "behind":
        return (
            f"Behind target ({pct:.0f}%). "
            f"Increase retirement contributions by ₪{additional:,}/month and consider a growth track."
        )
    return (
        f"Significantly behind target ({pct:.0f}%). "
        f"Urgent: contribute ₪{additional:,}/month more and review investment strategy."
    )
