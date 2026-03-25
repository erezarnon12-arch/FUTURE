"""
Monte Carlo Simulation — 1 000-path log-normal stochastic wealth projection.

Returns percentile bands across years and a probability-of-success score
(likelihood of reaching the 4% withdrawal-rule target nest egg).
"""

from __future__ import annotations

import math
import random
from typing import List

from models import Asset, Client, RingType
from services.portfolio import (
    MONTE_CARLO_PATHS,
    MONTE_CARLO_PERCENTILES,
    SCENARIO_RETURNS,
    SCENARIO_STDDEV,
)


def compute_monte_carlo(
    client: Client,
    assets: List[Asset],
    scenario: str = "average",
    n_paths: int = MONTE_CARLO_PATHS,
) -> dict:
    """
    Simulate n_paths random wealth trajectories using log-normal annual returns
    parameterised per ring by the chosen scenario.

    Returns:
        scenario, n_paths, years, percentile_finals, probability_of_success,
        target_nest_egg, yearly_bands (p10/p25/p50/p75/p90 per year), summary.
    """
    years        = max(1, (client.retirement_age or 67) - client.age)
    mean_returns = SCENARIO_RETURNS[scenario]
    std_devs     = SCENARIO_STDDEV[scenario]

    # Initial state per ring
    ring_init: dict = {}
    for ring in RingType:
        ring_assets = [a for a in assets if a.ring == ring]
        ring_init[ring] = {
            "balance":              sum(a.balance for a in ring_assets),
            "annual_contribution":  sum(a.monthly_deposit or 0 for a in ring_assets) * 12,
        }

    # ── Full-path simulation (n_paths) for terminal percentiles ───────────────
    path_finals: List[float] = []
    for _ in range(n_paths):
        total = 0.0
        for ring in RingType:
            mu     = math.log(1 + mean_returns[ring]) - 0.5 * std_devs[ring] ** 2
            sigma  = std_devs[ring]
            bal    = ring_init[ring]["balance"]
            contrib = ring_init[ring]["annual_contribution"]
            for _ in range(years):
                bal = bal * (1 + math.exp(mu + sigma * random.gauss(0, 1)) - 1) + contrib
            total += max(0, bal)
        path_finals.append(total)

    path_finals.sort()

    # ── Yearly percentile bands (200 paths — sufficient for charting) ─────────
    yearly_series: dict = {p: [] for p in MONTE_CARLO_PERCENTILES}
    sample_paths: List[List[float]] = []

    for _ in range(200):
        path: List[float] = []
        for ring in RingType:
            mu      = math.log(1 + mean_returns[ring]) - 0.5 * std_devs[ring] ** 2
            sigma   = std_devs[ring]
            bal     = ring_init[ring]["balance"]
            contrib = ring_init[ring]["annual_contribution"]
            ring_path: List[float] = [bal]
            for _ in range(years):
                bal = bal * (1 + math.exp(mu + sigma * random.gauss(0, 1)) - 1) + contrib
                ring_path.append(max(0, bal))
            path = ring_path[:] if not path else [path[i] + ring_path[i] for i in range(len(path))]
        sample_paths.append(path)

    n_sample = len(sample_paths)
    for year_idx in range(years + 1):
        vals = sorted(
            p[year_idx] if year_idx < len(p) else p[-1]
            for p in sample_paths
        )
        for pct in MONTE_CARLO_PERCENTILES:
            idx = max(0, min(n_sample - 1, int(pct / 100 * n_sample)))
            yearly_series[pct].append({"year": client.age + year_idx, "value": round(vals[idx])})

    # ── Terminal percentile finals ─────────────────────────────────────────────
    n = len(path_finals)
    percentile_finals = {
        pct: round(path_finals[max(0, min(n - 1, int(pct / 100 * n)))])
        for pct in MONTE_CARLO_PERCENTILES
    }

    # ── Probability of success ─────────────────────────────────────────────────
    target_nest_egg = client.monthly_expenses * 12 * 25
    prob_success = (
        round(sum(1 for v in path_finals if v >= target_nest_egg) / n * 100, 1)
        if target_nest_egg > 0 else 0.0
    )

    return {
        "scenario":               scenario,
        "n_paths":                n_paths,
        "years":                  years,
        "percentile_finals":      percentile_finals,
        "probability_of_success": prob_success,
        "target_nest_egg":        round(target_nest_egg),
        "yearly_bands":           {str(k): v for k, v in yearly_series.items()},
        "summary": (
            f"Based on {n_paths:,} simulations, there is a {prob_success:.0f}% probability "
            f"of reaching the ₪{target_nest_egg:,.0f} retirement target."
        ),
    }
