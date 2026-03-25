"""
Retirement Simulation router — multi-phase wealth projection with longevity
and sensitivity analysis.

Endpoints:
  GET  /retirement-simulation/{id}/simulate          — full SimulationResult
  GET  /retirement-simulation/{id}/sensitivity       — tornado-chart sensitivity table
  GET  /retirement-simulation/{id}/what-if           — what-if scenario comparison
  GET  /retirement-simulation/{id}/safe-withdrawal   — safe withdrawal rate search
"""

from __future__ import annotations

from dataclasses import asdict

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models import Asset, Client
from services.portfolio import DEFAULT_INFLATION
from simulation.retirement_simulator import (
    SimulationResult,
    compute_safe_withdrawal_rate,
    compute_sensitivity,
    run_what_if,
    simulate_retirement,
    _BLENDED_RETURN,
)

router = APIRouter(prefix="/retirement-simulation", tags=["retirement-simulation"])

_VALID_SCENARIOS   = ("conservative", "average", "aggressive")
_VALID_WITHDRAWALS = ("fixed_nominal", "cpi_indexed", "dynamic")


def _get_client_and_assets(db: Session, client_id: int) -> tuple[Client, list[Asset]]:
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail=f"Client {client_id} not found")
    assets = db.query(Asset).filter(Asset.client_id == client_id).all()
    return client, assets


@router.get("/{client_id}/simulate")
def simulate_endpoint(
    client_id:                int,
    scenario:                 str   = Query("average",    description="conservative | average | aggressive"),
    inflation:                float = Query(DEFAULT_INFLATION, description="Annual inflation rate, e.g. 0.03"),
    salary_growth:            float = Query(0.02,         description="Annual deposit growth rate, e.g. 0.02"),
    life_expectancy:          int   = Query(90,           ge=60, le=110, description="Age to simulate through"),
    withdrawal_strategy:      str   = Query("cpi_indexed", description="fixed_nominal | cpi_indexed | dynamic"),
    pension_income:           float = Query(0.0,          ge=0, description="Annual pension/social income in ILS"),
    extra_monthly:            float = Query(0.0,          ge=0, description="Extra monthly contribution in ILS"),
    lump_sum:                 float = Query(0.0,          ge=0, description="One-time lump sum added today in ILS"),
    include_sensitivity:      bool  = Query(True,         description="Include sensitivity analysis"),
    include_what_if:          bool  = Query(True,         description="Include what-if scenarios"),
    db: Session = Depends(get_db),
):
    """
    Full two-phase retirement simulation.

    Phase 1 — Accumulation (now → retirement_age):
      Computes year-by-year portfolio growth with inflation-adjusted contributions,
      salary growth, and tax-aware buckets (pension/IRA = exempt, stocks/ETFs = 25% CGT).

    Phase 2 — Decumulation (retirement_age → life_expectancy):
      Projects portfolio drawdown under the chosen withdrawal strategy
      with pension income offsetting portfolio withdrawals.

    Also returns: longevity survival probabilities, sensitivity tornado table,
    what-if scenarios, and a safe withdrawal rate estimate.
    """
    if scenario not in _VALID_SCENARIOS:
        raise HTTPException(status_code=400, detail=f"scenario must be one of {_VALID_SCENARIOS}")
    if withdrawal_strategy not in _VALID_WITHDRAWALS:
        raise HTTPException(status_code=400, detail=f"withdrawal_strategy must be one of {_VALID_WITHDRAWALS}")

    client, assets = _get_client_and_assets(db, client_id)

    result = simulate_retirement(
        client                     = client,
        assets                     = assets,
        scenario                   = scenario,
        inflation                  = inflation,
        salary_growth              = salary_growth,
        life_expectancy            = life_expectancy,
        withdrawal_strategy        = withdrawal_strategy,
        pension_income             = pension_income,
        extra_monthly_contribution = extra_monthly,
        lump_sum                   = lump_sum,
        include_sensitivity        = include_sensitivity,
        include_what_if            = include_what_if,
    )

    if result.error:
        raise HTTPException(status_code=500, detail=result.error)

    return asdict(result)


@router.get("/{client_id}/sensitivity")
def sensitivity_endpoint(
    client_id:     int,
    scenario:      str   = Query("average"),
    inflation:     float = Query(DEFAULT_INFLATION),
    salary_growth: float = Query(0.02),
    db: Session = Depends(get_db),
):
    """
    Sensitivity analysis (tornado chart data).

    Returns the impact of ±1 pp return, ±1 pp inflation, ±₪500/month contribution,
    ±5 years retirement age, and ±0.5 pp management fee on terminal wealth.
    Sorted by absolute ILS impact (largest first).
    """
    if scenario not in _VALID_SCENARIOS:
        raise HTTPException(status_code=400, detail=f"scenario must be one of {_VALID_SCENARIOS}")

    client, assets = _get_client_and_assets(db, client_id)
    rows = compute_sensitivity(client, assets, scenario, inflation, salary_growth)
    return {"client_id": client_id, "scenario": scenario, "rows": [asdict(r) for r in rows]}


@router.get("/{client_id}/what-if")
def what_if_endpoint(
    client_id:     int,
    scenario:      str   = Query("average"),
    inflation:     float = Query(DEFAULT_INFLATION),
    salary_growth: float = Query(0.02),
    db: Session = Depends(get_db),
):
    """
    What-if scenario comparison.

    Returns terminal wealth under 6 scenarios vs. the base case:
      1. Retire 5 years earlier
      2. Retire 5 years later
      3. Add ₪100,000 lump sum today
      4. Double monthly contributions
      5. Reduce all fees to 0.3%
      6. Stop contributions today (coast FIRE)
    """
    if scenario not in _VALID_SCENARIOS:
        raise HTTPException(status_code=400, detail=f"scenario must be one of {_VALID_SCENARIOS}")

    client, assets = _get_client_and_assets(db, client_id)
    results = run_what_if(client, assets, scenario, inflation, salary_growth)
    return {
        "client_id": client_id,
        "scenario":  scenario,
        "scenarios": [asdict(r) for r in results],
    }


@router.get("/{client_id}/safe-withdrawal")
def safe_withdrawal_endpoint(
    client_id:           int,
    scenario:            str   = Query("average"),
    inflation:           float = Query(DEFAULT_INFLATION),
    pension_income:      float = Query(0.0, ge=0),
    target_survival_age: int   = Query(90,  ge=75, le=100),
    target_survival_pct: float = Query(95.0, ge=50.0, le=100.0),
    db: Session = Depends(get_db),
):
    """
    Binary-search for the safe withdrawal rate (% of portfolio at retirement)
    that achieves target_survival_pct% probability of the portfolio surviving
    to target_survival_age.

    Uses stochastic decumulation (500 paths) with log-normal return shocks.
    Typical result for a 30-year horizon at average returns: ~3.5–4.5%.
    """
    if scenario not in _VALID_SCENARIOS:
        raise HTTPException(status_code=400, detail=f"scenario must be one of {_VALID_SCENARIOS}")

    client, assets = _get_client_and_assets(db, client_id)

    from simulation.retirement_simulator import _run_base_accumulation
    annual_return    = _BLENDED_RETURN.get(scenario, 0.06)
    years            = max(1, (client.retirement_age or 67) - client.age)
    retirement_value = _run_base_accumulation(assets, years, annual_return, inflation, 0.02)

    safe_rate = compute_safe_withdrawal_rate(
        retirement_value     = retirement_value,
        pension_income       = pension_income,
        annual_return        = annual_return * 0.75,
        annual_inflation     = inflation,
        retirement_age       = client.retirement_age or 67,
        target_survival_age  = target_survival_age,
        target_survival_pct  = target_survival_pct,
        n_paths              = 400,
        scenario             = scenario,
    )

    return {
        "client_id":               client_id,
        "scenario":                scenario,
        "projected_at_retirement": round(retirement_value),
        "safe_withdrawal_rate_pct": safe_rate,
        "annual_safe_withdrawal":  round(retirement_value * safe_rate / 100),
        "monthly_safe_withdrawal": round(retirement_value * safe_rate / 100 / 12),
        "target_survival_age":    target_survival_age,
        "target_survival_pct":    target_survival_pct,
    }
