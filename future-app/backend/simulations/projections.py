"""
Projections — deterministic compound-growth wealth scenarios.

Functions:
    project_wealth                  — nominal value per ring per year
    project_wealth_inflation_adjusted — real purchasing-power projection
"""

from __future__ import annotations

from typing import List

from models import Asset, Client, RingType
from services.portfolio import DEFAULT_INFLATION, SCENARIO_RETURNS


def project_wealth(
    client: Client,
    assets: List[Asset],
    scenario: str = "average",
) -> dict:
    """
    Compound-growth projection with monthly deposits.
    Returns yearly snapshots for each ring plus a total.
    """
    returns = SCENARIO_RETURNS[scenario]
    years   = max(0, (client.retirement_age or 67) - client.age)

    projections_by_ring: dict = {}
    total_final = 0.0

    for ring in RingType:
        ring_assets   = [a for a in assets if a.ring == ring]
        monthly_rate  = returns[ring] / 12
        balance       = sum(a.balance for a in ring_assets)
        contributions = sum(a.monthly_deposit or 0 for a in ring_assets)
        current       = balance
        yearly        = []

        for year in range(int(years) + 1):
            yearly.append({"year": client.age + year, "value": round(current)})
            for _ in range(12):
                current = current * (1 + monthly_rate) + contributions

        total_final += current
        projections_by_ring[ring.value] = {"final_value": round(current), "yearly": yearly}

    return {
        "scenario":               scenario,
        "years_to_retirement":    years,
        "retirement_age":         client.retirement_age,
        "projections_by_ring":    projections_by_ring,
        "total_projected_wealth": round(total_final),
    }


def project_wealth_inflation_adjusted(
    client: Client,
    assets: List[Asset],
    scenario: str = "average",
    inflation: float = DEFAULT_INFLATION,
) -> dict:
    """
    Same projection as project_wealth but all values expressed in today's
    purchasing power (real terms).
    """
    raw      = project_wealth(client, assets, scenario)
    years    = raw["years_to_retirement"]
    deflator = (1 + inflation) ** years

    adjusted: dict = {}
    for ring, data in raw["projections_by_ring"].items():
        adjusted[ring] = {
            "final_value_nominal": data["final_value"],
            "final_value_real":    round(data["final_value"] / deflator),
            "yearly": [
                {
                    "year":    pt["year"],
                    "nominal": pt["value"],
                    "real":    round(pt["value"] / ((1 + inflation) ** (pt["year"] - client.age))),
                }
                for pt in data["yearly"]
            ],
        }

    total_nominal = raw["total_projected_wealth"]
    return {
        "scenario":               scenario,
        "inflation_rate":         inflation,
        "years_to_retirement":    years,
        "total_projected_nominal": total_nominal,
        "total_projected_real":    round(total_nominal / deflator),
        "projections_by_ring":    adjusted,
    }
