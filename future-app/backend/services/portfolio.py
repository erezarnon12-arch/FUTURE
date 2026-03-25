"""
Portfolio Service — pure financial logic, no AI or I/O.

Responsibilities:
  • Shared constants (scenario returns, age-target allocations, thresholds)
  • Core dataclasses (RingMetrics, FinancialSummary, RebalanceItem, …)
  • Ring aggregation  — compute_ring_metrics, compute_summary, compute_allocation_pct
  • Flag detection    — rule-based portfolio warnings
  • Rebalancing       — age-appropriate target vs current allocation
  • Fee drag          — cost of high-fee funds over a time horizon
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List

from models import Asset, Client, Liability, RingType, RiskLevel


# ── Scenario return assumptions (annual) ─────────────────────────────────────
# Shared by this module, simulations.projections, and simulations.monte_carlo.

SCENARIO_RETURNS = {
    "conservative": {RingType.RETIREMENT: 0.04, RingType.SECURITY: 0.02,  RingType.GROWTH: 0.05},
    "average":      {RingType.RETIREMENT: 0.06, RingType.SECURITY: 0.03,  RingType.GROWTH: 0.09},
    "aggressive":   {RingType.RETIREMENT: 0.08, RingType.SECURITY: 0.035, RingType.GROWTH: 0.14},
}

# Per-ring annual standard deviations for Monte Carlo paths
SCENARIO_STDDEV = {
    "conservative": {RingType.RETIREMENT: 0.05, RingType.SECURITY: 0.01,  RingType.GROWTH: 0.08},
    "average":      {RingType.RETIREMENT: 0.08, RingType.SECURITY: 0.02,  RingType.GROWTH: 0.15},
    "aggressive":   {RingType.RETIREMENT: 0.10, RingType.SECURITY: 0.025, RingType.GROWTH: 0.22},
}

# Age-band target allocations: retirement / security / growth (%)
AGE_TARGET_ALLOCATIONS: dict[tuple[int, int], dict[str, int]] = {
    (18, 30): {"retirement": 30, "security": 15, "growth": 55},
    (31, 40): {"retirement": 40, "security": 20, "growth": 40},
    (41, 50): {"retirement": 50, "security": 25, "growth": 25},
    (51, 60): {"retirement": 60, "security": 30, "growth": 10},
    (61, 99): {"retirement": 65, "security": 30, "growth":  5},
}

HIGH_FEE_THRESHOLD         = 1.0   # % per year — flag if above
RECOMMENDED_SAFETY_MONTHS_MIN = 6
RECOMMENDED_SAFETY_MONTHS_MAX = 12
DEFAULT_INFLATION          = 0.03  # 3 % annual
MONTE_CARLO_PATHS          = 1_000
MONTE_CARLO_PERCENTILES    = [10, 25, 50, 75, 90]


# ── Dataclasses ───────────────────────────────────────────────────────────────

@dataclass
class RingMetrics:
    ring: str
    total_balance: float
    total_monthly_deposit: float
    avg_management_fee: float
    avg_historical_return: float
    asset_count: int
    assets: List[dict] = field(default_factory=list)


@dataclass
class FinancialSummary:
    client_name: str
    age: int
    net_worth: float
    total_assets: float
    total_liabilities: float
    monthly_surplus: float
    rings: dict                    # ring.value → RingMetrics
    safety_months: float
    safety_status: str             # critical | low | good | excellent
    flags: List[str] = field(default_factory=list)


@dataclass
class RebalanceItem:
    ring: str
    current_pct: float
    target_pct: float
    current_amount: float
    target_amount: float
    delta: float                   # positive = buy, negative = sell
    action: str                    # "increase" | "decrease" | "hold"


@dataclass
class DebtPayoffStep:
    month: int
    liability_name: str
    payment: float
    interest_paid: float
    principal_paid: float
    remaining_balance: float


@dataclass
class DebtPayoffPlan:
    strategy: str                  # "avalanche" | "snowball"
    total_months: int
    total_interest_paid: float
    total_paid: float
    payoff_order: List[str]        # liability names in payoff order
    monthly_schedule: List[dict]   # summarised monthly totals
    savings_vs_minimum: float      # interest saved vs minimum-only payments


# ── Ring aggregation ──────────────────────────────────────────────────────────

def compute_ring_metrics(assets: List[Asset], ring: RingType) -> RingMetrics:
    ring_assets = [a for a in assets if a.ring == ring]
    if not ring_assets:
        return RingMetrics(
            ring=ring.value, total_balance=0, total_monthly_deposit=0,
            avg_management_fee=0, avg_historical_return=0, asset_count=0, assets=[],
        )

    total_balance = sum(a.balance for a in ring_assets)
    total_monthly = sum(a.monthly_deposit or 0 for a in ring_assets)
    fee_assets    = [a for a in ring_assets if a.management_fees is not None]
    avg_fee       = (sum(a.management_fees for a in fee_assets) / len(fee_assets)) if fee_assets else 0
    ret_assets    = [a for a in ring_assets if a.historical_return is not None]
    avg_return    = (sum(a.historical_return for a in ret_assets) / len(ret_assets)) if ret_assets else 0

    asset_dicts = [
        {
            "id":               a.id,
            "name":             a.name,
            "asset_type":       a.asset_type.value,
            "provider":         a.provider,
            "balance":          a.balance,
            "monthly_deposit":  a.monthly_deposit,
            "investment_track": a.investment_track,
            "management_fees":  a.management_fees,
            "historical_return":a.historical_return,
            "risk_level":       a.risk_level.value,
            "liquidity_level":  a.liquidity_level.value,
        }
        for a in ring_assets
    ]

    return RingMetrics(
        ring=ring.value,
        total_balance=total_balance,
        total_monthly_deposit=total_monthly,
        avg_management_fee=avg_fee,
        avg_historical_return=avg_return,
        asset_count=len(ring_assets),
        assets=asset_dicts,
    )


def compute_summary(
    client: Client,
    assets: List[Asset],
    liabilities: List[Liability],
) -> FinancialSummary:
    total_assets      = sum(a.balance for a in assets)
    total_liabilities = sum(l.remaining_balance for l in liabilities)
    net_worth         = total_assets - total_liabilities
    total_debt_pmts   = sum(l.monthly_payment for l in liabilities)
    monthly_surplus   = client.monthly_income - client.monthly_expenses - total_debt_pmts

    rings = {ring.value: compute_ring_metrics(assets, ring) for ring in RingType}

    security_balance = rings[RingType.SECURITY.value].total_balance
    safety_months    = (security_balance / client.monthly_expenses) if client.monthly_expenses > 0 else 0

    if safety_months < 3:
        safety_status = "critical"
    elif safety_months < RECOMMENDED_SAFETY_MONTHS_MIN:
        safety_status = "low"
    elif safety_months <= RECOMMENDED_SAFETY_MONTHS_MAX:
        safety_status = "good"
    else:
        safety_status = "excellent"

    flags = _detect_flags(client, assets, liabilities, safety_months, rings)

    return FinancialSummary(
        client_name=client.name,
        age=client.age,
        net_worth=net_worth,
        total_assets=total_assets,
        total_liabilities=total_liabilities,
        monthly_surplus=monthly_surplus,
        rings=rings,
        safety_months=round(safety_months, 1),
        safety_status=safety_status,
        flags=flags,
    )


def compute_allocation_pct(rings: dict) -> dict:
    total = sum(r.total_balance for r in rings.values())
    if total == 0:
        return {k: 0.0 for k in rings}
    return {k: round(v.total_balance / total * 100, 1) for k, v in rings.items()}


# ── Flag detection ────────────────────────────────────────────────────────────

def _detect_flags(client, assets, liabilities, safety_months, rings) -> List[str]:
    flags: List[str] = []

    # Safety cushion
    if safety_months < 3:
        flags.append(
            f"דחוף: טבעת הביטחון מכסה רק {safety_months:.1f} חודשי הוצאות. יעד מומלץ: 6–12 חודשים."
        )
    elif safety_months < RECOMMENDED_SAFETY_MONTHS_MIN:
        flags.append(f"קרן החירום מכסה {safety_months:.1f} חודשים. מומלץ להגיע לכיסוי של לפחות 6 חודשים.")

    # Retirement track vs age
    years_to_retire = max(0, (client.retirement_age or 67) - client.age)
    for asset in [a for a in assets if a.ring == RingType.RETIREMENT]:
        if asset.risk_level:
            if years_to_retire > 20 and asset.risk_level in [RiskLevel.VERY_LOW, RiskLevel.LOW]:
                flags.append(
                    f"'{asset.name}': מסלול שמרני בגיל {client.age} עם "
                    f"{years_to_retire} שנים עד פרישה. שקול מעבר למסלול צמיחה."
                )
            elif years_to_retire < 10 and asset.risk_level in [RiskLevel.VERY_HIGH, RiskLevel.HIGH]:
                flags.append(
                    f"'{asset.name}': מסלול בסיכון גבוה עם רק {years_to_retire} שנים עד פרישה. "
                    f"מומלץ לעבור למסלול שמרני יותר."
                )

    # High management fees
    for asset in assets:
        if (asset.management_fees or 0) > HIGH_FEE_THRESHOLD:
            flags.append(
                f"'{asset.name}': דמי ניהול {asset.management_fees:.2f}% חורגים מ-1%. "
                f"מומלץ לעבור לקרן בעלות נמוכה יותר."
            )

    # Empty retirement ring
    if rings[RingType.RETIREMENT.value].total_balance == 0 and client.age > 25:
        flags.append("לא זוהו נכסי פנסיה. מומלץ להתחיל לחסוך לפנסיה בהקדם האפשרי.")

    # Growth ring vs age
    total = sum(r.total_balance for r in rings.values())
    if total > 0:
        growth_pct = rings[RingType.GROWTH.value].total_balance / total * 100
        if client.age < 40 and growth_pct < 10:
            flags.append(
                f"טבעת הצמיחה מהווה רק {growth_pct:.0f}% מהתיק. "
                f"בגיל {client.age} מומלץ להגדיל את החשיפה לצמיחה."
            )
        elif client.age > 55 and growth_pct > 40:
            flags.append(
                f"טבעת הצמיחה עומדת על {growth_pct:.0f}% בגיל {client.age}. "
                f"מומלץ להפחית את החשיפה לסיכון גבוה."
            )

    # Debt service ratio
    total_debt_pmts = sum(l.monthly_payment for l in liabilities)
    if client.monthly_income > 0:
        dsr = total_debt_pmts / client.monthly_income * 100
        if dsr > 40:
            flags.append(f"יחס שירות החוב עומד על {dsr:.0f}% מההכנסה. היעד המומלץ הוא עד 35%.")

    # Negative cash flow
    monthly_surplus = client.monthly_income - client.monthly_expenses - total_debt_pmts
    if monthly_surplus < 0:
        flags.append(f"תזרים מזומנים חודשי שלילי (₪{monthly_surplus:,.0f}). ההוצאות עולות על ההכנסות.")

    return flags


# ── Rebalancing ───────────────────────────────────────────────────────────────

def _get_target_allocation(age: int) -> dict:
    for (min_age, max_age), targets in AGE_TARGET_ALLOCATIONS.items():
        if min_age <= age <= max_age:
            return targets
    return AGE_TARGET_ALLOCATIONS[(61, 99)]


def compute_rebalancing(client: Client, assets: List[Asset]) -> dict:
    """
    Compare current ring allocation to the age-appropriate target.
    Returns recommended trades with amounts.
    """
    rings      = {ring.value: compute_ring_metrics(assets, ring) for ring in RingType}
    allocation = compute_allocation_pct(rings)
    targets    = _get_target_allocation(client.age)
    total      = sum(r.total_balance for r in rings.values())

    items: List[dict] = []
    for ring_name, target_pct in targets.items():
        current_pct    = allocation.get(ring_name, 0)
        current_amount = rings[ring_name].total_balance
        target_amount  = total * target_pct / 100
        delta          = target_amount - current_amount

        action = "hold" if abs(delta) < 1_000 else ("increase" if delta > 0 else "decrease")

        items.append({
            "ring":           ring_name,
            "current_pct":    round(current_pct, 1),
            "target_pct":     target_pct,
            "current_amount": round(current_amount),
            "target_amount":  round(target_amount),
            "delta":          round(delta),
            "action":         action,
        })

    in_balance = all(i["action"] == "hold" for i in items)

    return {
        "client_age":   client.age,
        "total_assets": round(total),
        "targets":      targets,
        "items":        items,
        "in_balance":   in_balance,
        "summary": (
            "Portfolio allocation is within target ranges." if in_balance
            else f"Rebalancing recommended — "
                 f"{sum(1 for i in items if i['action'] != 'hold')} ring(s) out of target."
        ),
    }


# ── Fee drag ──────────────────────────────────────────────────────────────────

def compute_fee_drag(assets: List[Asset], years: int = 30) -> dict:
    """
    Calculate how much high fees cost vs a 0.1% index-fund baseline.
    Returns per-asset and aggregate drag figures.
    """
    BASELINE_FEE = 0.001   # 0.1% — typical passive index fund
    BASE_RETURN  = 0.07    # assumed gross annual return before fees

    items      = []
    total_drag = 0.0

    for asset in assets:
        fee = (asset.management_fees or 0) / 100
        if fee <= 0:
            continue

        balance         = asset.balance
        monthly_deposit = asset.monthly_deposit or 0
        r_actual        = BASE_RETURN - fee
        r_baseline      = BASE_RETURN - BASELINE_FEE

        fv_actual   = _fv(balance, r_actual   / 12, monthly_deposit, years * 12)
        fv_baseline = _fv(balance, r_baseline / 12, monthly_deposit, years * 12)
        drag        = fv_baseline - fv_actual
        total_drag += drag

        if drag > 0:
            items.append({
                "asset_id":    asset.id,
                "asset_name":  asset.name,
                "provider":    asset.provider,
                "fee_pct":     round(fee * 100, 2),
                "balance":     balance,
                "fv_actual":   round(fv_actual),
                "fv_baseline": round(fv_baseline),
                "drag":        round(drag),
                "drag_pct":    round(drag / fv_baseline * 100, 1) if fv_baseline else 0,
            })

    items.sort(key=lambda x: x["drag"], reverse=True)

    return {
        "horizon_years":            years,
        "baseline_fee_pct":         BASELINE_FEE * 100,
        "assumed_gross_return_pct": BASE_RETURN * 100,
        "total_fee_drag":           round(total_drag),
        "items":                    items,
        "summary": (
            f"Over {years} years, high management fees could cost you ₪{total_drag:,.0f} "
            f"compared to low-cost index funds."
            if total_drag > 0
            else "All management fees are at or near the low-cost baseline."
        ),
    }


def _fv(pv: float, monthly_rate: float, monthly_payment: float, months: int) -> float:
    """Standard future-value of a lump sum + regular contributions."""
    if monthly_rate == 0:
        return pv + monthly_payment * months
    factor = (1 + monthly_rate) ** months
    return pv * factor + monthly_payment * (factor - 1) / monthly_rate
