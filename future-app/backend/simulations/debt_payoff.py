"""
Debt Payoff Optimizer — avalanche and snowball strategies.

Avalanche: highest interest rate first — minimises total interest paid.
Snowball:  smallest balance first — provides psychological quick wins.

Both plans are computed and returned together for comparison.
"""

from __future__ import annotations

from typing import List

from models import Liability


def compute_debt_payoff(
    liabilities: List[Liability],
    extra_monthly: float = 0,
) -> dict:
    """
    Build full payoff schedules for both avalanche and snowball strategies.
    Returns both plans and the interest saving of avalanche over snowball.
    """
    if not liabilities:
        return {
            "avalanche":   _empty_plan("avalanche"),
            "snowball":    _empty_plan("snowball"),
            "interest_saved_avalanche_vs_snowball": 0,
            "recommendation": "No liabilities to pay off.",
        }

    plans = {
        strat: _run_payoff_plan(liabilities, extra_monthly, strat)
        for strat in ("avalanche", "snowball")
    }

    interest_saved = (
        plans["avalanche"]["total_interest_paid"] - plans["snowball"]["total_interest_paid"]
    )
    plans["interest_saved_avalanche_vs_snowball"] = round(interest_saved)
    plans["recommendation"] = (
        "Avalanche saves ₪{:,} in interest over snowball.".format(abs(round(interest_saved)))
        if interest_saved < 0
        else "Snowball and avalanche result in similar total cost for this debt profile."
    )

    return plans


# ── Internal helpers ──────────────────────────────────────────────────────────

def _run_payoff_plan(
    liabilities: List[Liability],
    extra_monthly: float,
    strategy: str,
) -> dict:
    debts = [
        {
            "name":        l.name,
            "balance":     l.remaining_balance,
            "rate":        l.interest_rate / 100 / 12,   # monthly rate
            "min_payment": l.monthly_payment,
        }
        for l in liabilities
    ]

    if strategy == "avalanche":
        debts.sort(key=lambda d: d["rate"], reverse=True)
    else:
        debts.sort(key=lambda d: d["balance"])

    payoff_order:    List[str]  = []
    total_interest               = 0.0
    total_paid                   = 0.0
    month                        = 0
    monthly_summary: List[dict] = []
    baseline_interest            = _minimum_only_interest(debts)

    while any(d["balance"] > 0 for d in debts):
        month += 1
        if month > 600:          # 50-year safety cap
            break

        available_extra = extra_monthly
        month_interest  = 0.0
        month_paid      = 0.0

        for debt in debts:
            if debt["balance"] <= 0:
                continue
            interest         = debt["balance"] * debt["rate"]
            month_interest  += interest
            debt["balance"] += interest

            payment          = min(debt["min_payment"], debt["balance"])
            debt["balance"] -= payment
            month_paid      += payment
            total_interest  += interest
            total_paid      += payment

            if debt["balance"] <= 0 and debt["name"] not in payoff_order:
                payoff_order.append(debt["name"])
                available_extra += debt["min_payment"]   # freed minimum rolls forward

        # Apply any extra to the first non-zero-balance debt
        for debt in debts:
            if debt["balance"] > 0:
                extra_applied    = min(available_extra, debt["balance"])
                debt["balance"] -= extra_applied
                total_paid      += extra_applied
                month_paid      += extra_applied
                if debt["balance"] <= 0 and debt["name"] not in payoff_order:
                    payoff_order.append(debt["name"])
                break

        # Store first 5 years monthly, then yearly
        if month <= 60 or month % 12 == 0:
            monthly_summary.append({
                "month":           month,
                "total_remaining": round(sum(d["balance"] for d in debts)),
                "interest_paid":   round(month_interest),
                "total_paid":      round(month_paid),
            })

    return {
        "strategy":            strategy,
        "total_months":        month,
        "total_interest_paid": round(total_interest),
        "total_paid":          round(total_paid),
        "payoff_order":        payoff_order,
        "monthly_schedule":    monthly_summary,
        "savings_vs_minimum":  round(max(0, baseline_interest - total_interest)),
    }


def _minimum_only_interest(debts_snapshot: list) -> float:
    """Total interest when only minimum payments are made (no extra)."""
    debts = [dict(d) for d in debts_snapshot]
    total_interest = 0.0
    for _ in range(600):
        if not any(d["balance"] > 0 for d in debts):
            break
        for debt in debts:
            if debt["balance"] <= 0:
                continue
            interest        = debt["balance"] * debt["rate"]
            total_interest += interest
            debt["balance"] += interest
            payment          = min(debt["min_payment"], debt["balance"])
            debt["balance"] -= payment
    return total_interest


def _empty_plan(strategy: str) -> dict:
    return {
        "strategy": strategy, "total_months": 0, "total_interest_paid": 0,
        "total_paid": 0, "payoff_order": [], "monthly_schedule": [],
        "savings_vs_minimum": 0,
    }
