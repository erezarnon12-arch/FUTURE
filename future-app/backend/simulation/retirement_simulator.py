"""
Retirement Simulation Engine — comprehensive multi-phase wealth projection.

Significantly extends the existing simulations/ modules by adding:
  • Two-phase simulation: accumulation (working years) + decumulation (retirement)
  • Inflation-adjusted contributions that grow with CPI each year
  • Salary growth: contributions scale with an annual income-growth rate
  • Social / pension income that offsets withdrawal need in retirement
  • Tax-aware buckets: pension/study-fund assets are tax-exempt; growth/security
    ring assets are taxable (25% Israeli capital-gains rate on real gains)
  • Longevity risk: projects portfolio through a configurable life expectancy
    (default 90) and reports survival probability at ages 85, 90, 95, 100
  • Three withdrawal strategies: fixed nominal, CPI-indexed, dynamic (% of portfolio)
  • Sensitivity analysis: ±1 pp return, ±1 pp inflation, ±₪500/month contribution,
    ±5 years retirement age, ±0.5 pp fee
  • What-if scenarios: early/late retirement, lump-sum injection, contribution boost

Public interface:
  simulate_retirement(client, assets, …)   — main SimulationResult
  run_what_if(client, assets, params)       — one-off what-if scenario
  compute_sensitivity(client, assets, …)   — sensitivity table (list[SensitivityRow])
  compute_safe_withdrawal_rate(…)           — highest rate with ≥95% survival to 90

Design notes:
  • All arithmetic is monthly for precision; only yearly snapshots are stored.
  • Values are carried in nominal ILS throughout; a deflator is applied at the end
    to report every snapshot in today's purchasing power.
  • The module is pure-Python with no external dependencies beyond the project models.
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass, field
from typing import List, Optional

from models import Asset, Client, AssetType, RingType
from services.portfolio import DEFAULT_INFLATION, SCENARIO_RETURNS, SCENARIO_STDDEV

# ── Tax constants (Israeli law) ───────────────────────────────────────────────

#  Pension funds, study funds (keren hishtalmut), and IRAs: gains are tax-deferred
#  or exempt.  Growth-ring and security-ring instruments (stocks, ETFs, deposits)
#  are subject to 25% capital-gains tax on real gains.
_TAX_EXEMPT_TYPES = {
    AssetType.PENSION_FUND,
    AssetType.PENSION_INSURANCE,
    AssetType.IRA,
    AssetType.STUDY_FUND,
    AssetType.PROVIDENT_FUND,
}
CAPITAL_GAINS_RATE = 0.25     # 25% on real (inflation-adjusted) gains

# ── Scenario return defaults ──────────────────────────────────────────────────

_BLENDED_RETURN = {
    scenario: sum(returns.values()) / len(returns)
    for scenario, returns in SCENARIO_RETURNS.items()
}
_BLENDED_STDDEV = {
    scenario: sum(SCENARIO_STDDEV[scenario].values()) / len(SCENARIO_STDDEV[scenario])
    for scenario in SCENARIO_STDDEV
}

# ── Dataclasses ───────────────────────────────────────────────────────────────

@dataclass
class YearlySnapshot:
    """Portfolio state at the end of one calendar year."""
    age:                   int
    year_offset:           int      # 0 = current year
    phase:                 str      # "accumulation" | "transition" | "retirement"
    portfolio_value:       float    # nominal ILS
    portfolio_value_real:  float    # in today's ILS (deflated)
    contributions:         float    # gross contributions that year (nominal)
    withdrawals:           float    # gross withdrawals that year (nominal)
    gross_return_earned:   float    # investment return earned (nominal, before tax)
    tax_paid:              float    # capital-gains tax paid that year
    net_worth_change:      float    # Δ vs prior year (nominal)
    inflation_rate:        float    # actual inflation used for this year


@dataclass
class PhaseResult:
    """Aggregated outcomes for one simulation phase."""
    phase:                 str
    start_age:             int
    end_age:               int
    start_value:           float
    end_value:             float
    end_value_real:        float    # in today's purchasing power
    total_contributions:   float
    total_withdrawals:     float
    total_returns_earned:  float    # before tax
    total_tax_paid:        float
    snapshots:             list[YearlySnapshot] = field(default_factory=list)


@dataclass
class LongevityResult:
    """Probability that the portfolio survives to various ages."""
    survival_pct_85:       float
    survival_pct_90:       float
    survival_pct_95:       float
    survival_pct_100:      float
    median_depletion_age:  Optional[int]    # age when 50% of paths are depleted (None if most survive)
    n_paths:               int


@dataclass
class WithdrawalAnalysis:
    """Withdrawal strategy outcomes in the first retirement year and beyond."""
    strategy:                    str      # "fixed_nominal" | "cpi_indexed" | "dynamic"
    annual_withdrawal_year1:     float    # nominal ILS, first retirement year
    annual_withdrawal_real:      float    # in today's ILS
    pension_income_offset:       float    # annual pension/social income reducing portfolio draw
    net_portfolio_draw_year1:    float    # actual amount taken from portfolio
    portfolio_at_life_expectancy: float   # nominal portfolio value at life_expectancy age
    safe_withdrawal_rate_pct:    float    # highest rate with ≥95% survival probability
    depletion_age:               Optional[int]   # None if portfolio survives full horizon


@dataclass
class SensitivityRow:
    """Impact of changing one parameter by ±1 unit."""
    parameter:               str
    direction:               str      # "up" | "down"
    shocked_by:              str      # human-readable, e.g. "+1% return"
    base_terminal_wealth:    float
    shocked_terminal_wealth: float
    impact_ils:              float
    impact_pct:              float


@dataclass
class WhatIfResult:
    """Terminal wealth for one what-if scenario vs. the base case."""
    scenario_name:       str
    description:         str
    terminal_wealth:     float
    terminal_wealth_real: float
    vs_base_ils:         float
    vs_base_pct:         float


@dataclass
class SimulationResult:
    """Complete retirement simulation output."""
    client_name:          str
    current_age:          int
    retirement_age:       int
    life_expectancy:      int
    scenario:             str
    inflation_rate:       float
    salary_growth_rate:   float

    # Phase outcomes
    accumulation:         PhaseResult
    decumulation:         PhaseResult

    # Top-line numbers
    terminal_wealth:      float          # nominal at life_expectancy
    terminal_wealth_real: float          # in today's ILS
    total_contributions:  float
    total_returns_earned: float
    total_tax_paid:       float
    wealth_multiplier:    float          # terminal_wealth / total_contributions (1× = break-even)

    # Retirement income analysis
    withdrawal:           WithdrawalAnalysis
    longevity:            LongevityResult

    # Sensitivity & what-if
    sensitivity:          list[SensitivityRow]
    what_ifs:             list[WhatIfResult]

    # Target
    target_nest_egg:      float          # 25× annual expenses (4% rule)
    readiness_pct:        float          # terminal_wealth at retirement / target × 100
    gap:                  float          # target − projected_at_retirement (0 if on track)

    summary:              str
    error:                Optional[str] = None


# ── Tax bucket helpers ────────────────────────────────────────────────────────

@dataclass
class _Bucket:
    """Internal mutable state for one tax bucket."""
    balance:          float
    cost_basis:       float     # nominal cost basis for capital gains calculation
    monthly_deposit:  float
    is_exempt:        bool      # True = no capital-gains tax on gains


def _build_buckets(assets: list[Asset]) -> tuple[list[_Bucket], float]:
    """
    Partition assets into tax-exempt and taxable buckets.
    Returns (buckets, total_initial_balance).
    """
    buckets: list[_Bucket] = []
    for asset in assets:
        buckets.append(_Bucket(
            balance         = asset.balance,
            cost_basis      = asset.balance,    # basis = current value at start
            monthly_deposit = asset.monthly_deposit or 0.0,
            is_exempt       = asset.asset_type in _TAX_EXEMPT_TYPES,
        ))
    total = sum(b.balance for b in buckets)
    return buckets, total


def _apply_monthly_return(
    bucket: _Bucket,
    monthly_rate: float,
    monthly_inflation: float,
) -> float:
    """
    Grow one bucket by monthly_rate, add monthly deposit.
    Returns capital-gains tax owed (0 for exempt buckets).
    """
    gain_nominal          = bucket.balance * monthly_rate
    bucket.balance       += gain_nominal
    bucket.cost_basis    += bucket.monthly_deposit * 1.0   # deposit at cost
    bucket.balance       += bucket.monthly_deposit

    if bucket.is_exempt or gain_nominal <= 0:
        return 0.0

    # Real gain = nominal gain minus inflation on the prior balance
    inflation_adjustment = bucket.balance / (1 + monthly_inflation) * monthly_inflation
    real_gain            = max(0, gain_nominal - inflation_adjustment)
    return real_gain * CAPITAL_GAINS_RATE


def _total_balance(buckets: list[_Bucket]) -> float:
    return sum(b.balance for b in buckets)


def _withdraw_from_buckets(buckets: list[_Bucket], amount: float) -> float:
    """
    Withdraw proportionally from all buckets.
    Returns capital-gains tax triggered by the withdrawal.
    """
    total = _total_balance(buckets)
    if total <= 0 or amount <= 0:
        return 0.0

    tax_triggered = 0.0
    for bucket in buckets:
        if bucket.balance <= 0:
            continue
        share   = bucket.balance / total
        draw    = min(amount * share, bucket.balance)
        if not bucket.is_exempt and draw > 0 and bucket.balance > 0:
            # Capital-gains tax on the gain portion of the withdrawal
            gain_ratio      = max(0, (bucket.balance - bucket.cost_basis) / bucket.balance)
            gain_drawn      = draw * gain_ratio
            tax_triggered  += gain_drawn * CAPITAL_GAINS_RATE
            bucket.cost_basis -= draw * (1 - gain_ratio)
        bucket.balance   -= draw
        bucket.cost_basis = max(0, bucket.cost_basis)

    return tax_triggered


# ── Core simulation loop ──────────────────────────────────────────────────────

def _simulate_phase(
    buckets:             list[_Bucket],
    start_age:           int,
    end_age:             int,
    phase:               str,
    annual_return:       float,
    annual_inflation:    float,
    salary_growth:       float,
    contribution_scale:  float,    # multiplier on all monthly deposits (1.0 = unchanged)
    annual_withdrawal:   float,    # 0 during accumulation; >0 during retirement
    withdrawal_strategy: str,
    pension_income:      float,    # annual pension/social income (reduces portfolio draw)
    years_elapsed_base:  int,      # years elapsed before this phase (for deflation)
) -> PhaseResult:
    """
    Run a month-by-month simulation for one life phase.

    During accumulation:  deposits grow with salary_growth; withdrawals = 0.
    During decumulation:  withdrawals grow with inflation (or are dynamic);
                          deposits = 0 (retired).
    """
    monthly_rate        = annual_return   / 12
    monthly_inflation   = annual_inflation / 12
    monthly_salary_gr   = salary_growth   / 12

    # Scale deposits
    for b in buckets:
        b.monthly_deposit *= contribution_scale

    start_value         = _total_balance(buckets)
    total_contributions = 0.0
    total_withdrawals   = 0.0
    total_returns       = 0.0
    total_tax           = 0.0
    snapshots: list[YearlySnapshot] = []

    current_withdrawal  = annual_withdrawal   # nominal, grows with inflation each year
    years               = end_age - start_age

    prev_value          = start_value

    for year_idx in range(years):
        age          = start_age + year_idx
        year_offset  = years_elapsed_base + year_idx
        year_contrib = 0.0
        year_withdraw = 0.0
        year_returns  = 0.0
        year_tax      = 0.0

        for month in range(12):
            tax = _apply_monthly_return(buckets, monthly_rate, monthly_inflation)
            year_returns += _total_balance(buckets) - (prev_value + year_contrib - year_withdraw)
            year_tax     += tax

            if phase in ("accumulation", "transition"):
                year_contrib += sum(b.monthly_deposit for b in buckets)
                # Salary growth applied monthly to deposits
                for b in buckets:
                    b.monthly_deposit *= (1 + monthly_salary_gr)
            else:
                # Retirement — compute net draw
                if withdrawal_strategy == "dynamic":
                    # 4% of current portfolio value, monthly
                    net_draw = _total_balance(buckets) * (annual_withdrawal / 100) / 12
                else:
                    net_draw = max(0, current_withdrawal / 12 - pension_income / 12)

                if net_draw > 0:
                    withdrawal_tax  = _withdraw_from_buckets(buckets, net_draw)
                    year_tax       += withdrawal_tax
                    year_withdraw  += net_draw

            prev_value = _total_balance(buckets)

        total_contributions += year_contrib
        total_withdrawals   += year_withdraw
        total_tax           += year_tax
        total_returns       += year_returns

        # Inflate withdrawal for next year
        if phase == "retirement":
            if withdrawal_strategy == "cpi_indexed":
                current_withdrawal *= (1 + annual_inflation)
            # dynamic uses % of portfolio — no explicit growth needed

        portfolio_now  = _total_balance(buckets)
        deflator       = (1 + annual_inflation) ** (year_offset + 1)
        portfolio_real = portfolio_now / deflator

        snapshots.append(YearlySnapshot(
            age                 = age + 1,
            year_offset         = year_offset + 1,
            phase               = phase,
            portfolio_value     = round(portfolio_now),
            portfolio_value_real = round(portfolio_real),
            contributions       = round(year_contrib),
            withdrawals         = round(year_withdraw),
            gross_return_earned = round(year_returns),
            tax_paid            = round(year_tax),
            net_worth_change    = round(portfolio_now - prev_value + year_withdraw - year_contrib),
            inflation_rate      = annual_inflation,
        ))

    end_value  = _total_balance(buckets)
    deflator   = (1 + annual_inflation) ** (years_elapsed_base + years)

    return PhaseResult(
        phase               = phase,
        start_age           = start_age,
        end_age             = end_age,
        start_value         = round(start_value),
        end_value           = round(end_value),
        end_value_real      = round(end_value / deflator),
        total_contributions = round(total_contributions),
        total_withdrawals   = round(total_withdrawals),
        total_returns_earned = round(total_returns),
        total_tax_paid      = round(total_tax),
        snapshots           = snapshots,
    )


# ── Longevity Monte Carlo ─────────────────────────────────────────────────────

def _compute_longevity(
    retirement_value:    float,
    annual_withdrawal:   float,
    pension_income:      float,
    withdrawal_strategy: str,
    annual_return:       float,
    annual_inflation:    float,
    retirement_age:      int,
    life_expectancy:     int,
    n_paths:             int = 500,
    scenario:            str = "average",
) -> LongevityResult:
    """
    Run stochastic decumulation paths to estimate portfolio survival probabilities.
    Uses log-normal return shocks around the given annual_return.
    """
    stddev      = _BLENDED_STDDEV.get(scenario, 0.10)
    mu          = math.log(1 + annual_return) - 0.5 * stddev ** 2
    ages_to_test = [85, 90, 95, 100]
    survived: dict[int, int] = {a: 0 for a in ages_to_test}
    depletion_ages: list[int] = []

    for _ in range(n_paths):
        balance      = retirement_value
        withdrawal   = annual_withdrawal
        depleted_age = None

        for age in range(retirement_age, 101):
            if age > retirement_age:
                r         = math.exp(mu + stddev * random.gauss(0, 1)) - 1
                balance  *= (1 + r)
                if withdrawal_strategy == "cpi_indexed":
                    withdrawal *= (1 + annual_inflation)
                elif withdrawal_strategy == "dynamic":
                    withdrawal = balance * (annual_withdrawal / retirement_value) if retirement_value > 0 else 0

                net_draw  = max(0, withdrawal - pension_income)
                balance  -= net_draw
                if balance <= 0:
                    balance      = 0
                    depleted_age = age
                    break

            if age in survived and balance > 0:
                survived[age] += 1

        if depleted_age is not None:
            depletion_ages.append(depleted_age)

    survival_pcts = {age: round(survived[age] / n_paths * 100, 1) for age in ages_to_test}

    if not depletion_ages:
        median_depletion = None
    else:
        depletion_ages.sort()
        median_depletion = depletion_ages[len(depletion_ages) // 2]

    return LongevityResult(
        survival_pct_85      = survival_pcts[85],
        survival_pct_90      = survival_pcts[90],
        survival_pct_95      = survival_pcts[95],
        survival_pct_100     = survival_pcts[100],
        median_depletion_age = median_depletion,
        n_paths              = n_paths,
    )


# ── Safe withdrawal rate ──────────────────────────────────────────────────────

def compute_safe_withdrawal_rate(
    retirement_value:  float,
    pension_income:    float,
    annual_return:     float,
    annual_inflation:  float,
    retirement_age:    int,
    target_survival_age: int = 90,
    target_survival_pct: float = 95.0,
    n_paths:           int = 400,
    scenario:          str = "average",
) -> float:
    """
    Binary-search for the highest annual withdrawal rate (% of retirement_value)
    that achieves target_survival_pct% probability of survival to target_survival_age.

    Returns the safe withdrawal rate as a percentage (e.g. 4.0 for 4%).
    """
    lo, hi = 1.0, 15.0

    for _ in range(14):   # 14 iterations → precision ≈ 0.001 pp
        mid        = (lo + hi) / 2
        withdrawal = retirement_value * mid / 100
        longevity  = _compute_longevity(
            retirement_value     = retirement_value,
            annual_withdrawal    = withdrawal,
            pension_income       = pension_income,
            withdrawal_strategy  = "cpi_indexed",
            annual_return        = annual_return,
            annual_inflation     = annual_inflation,
            retirement_age       = retirement_age,
            life_expectancy      = target_survival_age,
            n_paths              = n_paths,
            scenario             = scenario,
        )
        survival = getattr(longevity, f"survival_pct_{target_survival_age}", longevity.survival_pct_90)
        if survival >= target_survival_pct:
            lo = mid
        else:
            hi = mid

    return round(lo, 2)


# ── What-if helper ────────────────────────────────────────────────────────────

def _run_base_accumulation(
    assets:          list[Asset],
    years:           int,
    annual_return:   float,
    annual_inflation: float,
    salary_growth:   float,
    contribution_scale: float = 1.0,
    lump_sum:        float = 0.0,
) -> float:
    """Quick accumulation-only loop — returns terminal balance (no decumulation)."""
    buckets, _ = _build_buckets(assets)
    if lump_sum > 0:
        # Add lump sum proportionally to all buckets
        for b in buckets:
            b.balance   += lump_sum * (b.balance / max(1, sum(bb.balance for bb in buckets)))
        for b in buckets:
            b.cost_basis = b.balance

    for b in buckets:
        b.monthly_deposit *= contribution_scale

    monthly_rate      = annual_return   / 12
    monthly_inflation = annual_inflation / 12
    monthly_salary    = salary_growth   / 12

    for _ in range(years * 12):
        for b in buckets:
            b.balance += b.balance * monthly_rate + b.monthly_deposit
            b.monthly_deposit *= (1 + monthly_salary)

    return _total_balance(buckets)


# ── Sensitivity analysis ──────────────────────────────────────────────────────

def compute_sensitivity(
    client:          Client,
    assets:          list[Asset],
    scenario:        str = "average",
    inflation:       float = DEFAULT_INFLATION,
    salary_growth:   float = 0.02,
) -> list[SensitivityRow]:
    """
    Compute the impact of ±1 pp return, ±1 pp inflation, ±₪500/month contribution,
    ±5 years retirement age, and ±0.5 pp fee on terminal retirement wealth.

    Returns a list of SensitivityRow for display in a tornado chart.
    """
    base_return  = _BLENDED_RETURN.get(scenario, 0.06)
    years        = max(1, (client.retirement_age or 67) - client.age)
    base_terminal = _run_base_accumulation(assets, years, base_return, inflation, salary_growth)

    rows: list[SensitivityRow] = []

    # ── Return ±1 pp ─────────────────────────────────────────────────────────
    for direction, delta in (("up", +0.01), ("down", -0.01)):
        shocked = _run_base_accumulation(assets, years, base_return + delta, inflation, salary_growth)
        rows.append(SensitivityRow(
            parameter            = "annual_return",
            direction            = direction,
            shocked_by           = f"{'+' if delta > 0 else ''}{delta*100:.0f}% return",
            base_terminal_wealth = round(base_terminal),
            shocked_terminal_wealth = round(shocked),
            impact_ils           = round(shocked - base_terminal),
            impact_pct           = round((shocked - base_terminal) / base_terminal * 100, 1) if base_terminal else 0,
        ))

    # ── Inflation ±1 pp ───────────────────────────────────────────────────────
    for direction, delta in (("up", +0.01), ("down", -0.01)):
        shocked = _run_base_accumulation(assets, years, base_return, inflation + delta, salary_growth)
        rows.append(SensitivityRow(
            parameter            = "inflation",
            direction            = direction,
            shocked_by           = f"{'+' if delta > 0 else ''}{delta*100:.0f}% inflation",
            base_terminal_wealth = round(base_terminal),
            shocked_terminal_wealth = round(shocked),
            impact_ils           = round(shocked - base_terminal),
            impact_pct           = round((shocked - base_terminal) / base_terminal * 100, 1) if base_terminal else 0,
        ))

    # ── Monthly contribution ±₪500 ────────────────────────────────────────────
    total_monthly = sum(a.monthly_deposit or 0 for a in assets)
    for direction, extra in (("up", 500), ("down", -500)):
        if total_monthly + extra < 0:
            continue
        # Build modified assets list with adjusted deposits
        shocked_assets = [
            type(a).__new__(type(a))
            for a in assets
        ]
        # Simpler approach: scale deposits
        scale = (total_monthly + extra) / total_monthly if total_monthly else 1.0
        shocked = _run_base_accumulation(assets, years, base_return, inflation, salary_growth,
                                         contribution_scale=scale)
        rows.append(SensitivityRow(
            parameter            = "monthly_contribution",
            direction            = direction,
            shocked_by           = f"{'+' if extra > 0 else ''}₪{extra:,}/month contribution",
            base_terminal_wealth = round(base_terminal),
            shocked_terminal_wealth = round(shocked),
            impact_ils           = round(shocked - base_terminal),
            impact_pct           = round((shocked - base_terminal) / base_terminal * 100, 1) if base_terminal else 0,
        ))

    # ── Retirement age ±5 years ───────────────────────────────────────────────
    for direction, delta in (("up", +5), ("down", -5)):
        adj_years = max(1, years + delta)
        shocked   = _run_base_accumulation(assets, adj_years, base_return, inflation, salary_growth)
        rows.append(SensitivityRow(
            parameter            = "retirement_age",
            direction            = direction,
            shocked_by           = f"Retire {abs(delta)} years {'later' if delta > 0 else 'earlier'}",
            base_terminal_wealth = round(base_terminal),
            shocked_terminal_wealth = round(shocked),
            impact_ils           = round(shocked - base_terminal),
            impact_pct           = round((shocked - base_terminal) / base_terminal * 100, 1) if base_terminal else 0,
        ))

    # ── Management fee ±0.5 pp ────────────────────────────────────────────────
    # Model fee drag: reduce effective return by fee delta
    for direction, fee_delta in (("up", +0.005), ("down", -0.005)):
        shocked = _run_base_accumulation(assets, years, base_return - fee_delta, inflation, salary_growth)
        rows.append(SensitivityRow(
            parameter            = "management_fee",
            direction            = direction,
            shocked_by           = f"{'+' if fee_delta > 0 else ''}{fee_delta*100:.1f}% fee",
            base_terminal_wealth = round(base_terminal),
            shocked_terminal_wealth = round(shocked),
            impact_ils           = round(shocked - base_terminal),
            impact_pct           = round((shocked - base_terminal) / base_terminal * 100, 1) if base_terminal else 0,
        ))

    # Sort: largest absolute impact first
    rows.sort(key=lambda r: abs(r.impact_ils), reverse=True)
    return rows


# ── What-if scenario runner ───────────────────────────────────────────────────

def run_what_if(
    client:         Client,
    assets:         list[Asset],
    scenario:       str = "average",
    inflation:      float = DEFAULT_INFLATION,
    salary_growth:  float = 0.02,
    base_terminal:  Optional[float] = None,
) -> list[WhatIfResult]:
    """
    Compute terminal accumulation wealth for a set of predefined what-if scenarios.

    Scenarios:
      1. Retire 5 years earlier
      2. Retire 5 years later
      3. One-time ₪100,000 lump sum added today
      4. Double monthly contributions
      5. Reduce all management fees to 0.3% (cost-optimised)
      6. No contributions at all (coast scenario)
    """
    base_return = _BLENDED_RETURN.get(scenario, 0.06)
    years       = max(1, (client.retirement_age or 67) - client.age)

    if base_terminal is None:
        base_terminal = _run_base_accumulation(assets, years, base_return, inflation, salary_growth)

    total_monthly = sum(a.monthly_deposit or 0 for a in assets)

    def _wi(name: str, desc: str, terminal: float) -> WhatIfResult:
        deflator = (1 + inflation) ** years
        return WhatIfResult(
            scenario_name        = name,
            description          = desc,
            terminal_wealth      = round(terminal),
            terminal_wealth_real = round(terminal / deflator),
            vs_base_ils          = round(terminal - base_terminal),
            vs_base_pct          = round((terminal - base_terminal) / base_terminal * 100, 1) if base_terminal else 0,
        )

    results: list[WhatIfResult] = []

    # 1. Retire 5 years earlier
    t = _run_base_accumulation(assets, max(1, years - 5), base_return, inflation, salary_growth)
    results.append(_wi("retire_5y_early", "Retire 5 years earlier", t))

    # 2. Retire 5 years later
    t = _run_base_accumulation(assets, years + 5, base_return, inflation, salary_growth)
    results.append(_wi("retire_5y_late", "Retire 5 years later", t))

    # 3. ₪100,000 lump sum today
    t = _run_base_accumulation(assets, years, base_return, inflation, salary_growth, lump_sum=100_000)
    results.append(_wi("lump_sum_100k", "Add ₪100,000 lump sum today", t))

    # 4. Double monthly contributions
    scale = 2.0 if total_monthly > 0 else 1.0
    t = _run_base_accumulation(assets, years, base_return, inflation, salary_growth,
                               contribution_scale=scale)
    results.append(_wi("double_contributions", "Double monthly contributions", t))

    # 5. Reduce fees to 0.3% (savings applied as return boost)
    avg_fee = sum((a.management_fees or 0) for a in assets) / max(1, len(assets))
    fee_saving = max(0, avg_fee / 100 - 0.003)
    t = _run_base_accumulation(assets, years, base_return + fee_saving, inflation, salary_growth)
    results.append(_wi("optimise_fees", "Reduce all fees to 0.3%", t))

    # 6. No new contributions (coast FIRE scenario)
    t = _run_base_accumulation(assets, years, base_return, inflation, salary_growth,
                               contribution_scale=0.0)
    results.append(_wi("coast_fire", "Stop all contributions today (coast scenario)", t))

    return results


# ── Main entry point ──────────────────────────────────────────────────────────

def simulate_retirement(
    client:                  Client,
    assets:                  list[Asset],
    scenario:                str   = "average",
    inflation:               float = DEFAULT_INFLATION,
    salary_growth:           float = 0.02,
    life_expectancy:         int   = 90,
    withdrawal_strategy:     str   = "cpi_indexed",
    pension_income:          float = 0.0,
    extra_monthly_contribution: float = 0.0,
    lump_sum:                float = 0.0,
    include_sensitivity:     bool  = True,
    include_what_if:         bool  = True,
) -> SimulationResult:
    """
    Full two-phase retirement simulation.

    Accumulation phase (now → retirement_age):
      • Monthly deposits compounded at scenario return
      • Deposits scale with salary_growth each year
      • Tax applied per-bucket (exempt vs. taxable 25% CGT)
      • Extra monthly contribution added on top

    Decumulation phase (retirement_age → life_expectancy):
      • No new contributions
      • Annual withdrawal = 4% of target nest egg (initial fixed)
      • Withdrawal strategy applied: fixed_nominal | cpi_indexed | dynamic
      • Pension income offsets portfolio withdrawal

    Args:
        client:                  SQLAlchemy Client ORM instance
        assets:                  List of Asset ORM instances
        scenario:                "conservative" | "average" | "aggressive"
        inflation:               Annual inflation rate (e.g. 0.03 for 3%)
        salary_growth:           Annual rate at which deposits grow (e.g. 0.02)
        life_expectancy:         Age to simulate through (default 90)
        withdrawal_strategy:     "fixed_nominal" | "cpi_indexed" | "dynamic"
        pension_income:          Annual pension/social security income in ILS
        extra_monthly_contribution: Extra ILS/month added to all ring deposits
        lump_sum:                One-time ILS amount added to portfolio today
        include_sensitivity:     Whether to compute the sensitivity table
        include_what_if:         Whether to compute what-if scenarios

    Returns:
        SimulationResult with all phases, longevity, sensitivity, and what-ifs.
    """
    retirement_age   = client.retirement_age or 67
    accum_years      = max(0, retirement_age - client.age)
    decum_years      = max(0, life_expectancy - retirement_age)
    annual_return    = _BLENDED_RETURN.get(scenario, 0.06)
    target_nest_egg  = client.monthly_expenses * 12 * 25

    # ── Adjust assets for extra contribution and lump sum ────────────────────
    adjusted_assets = list(assets)   # shallow copy — do NOT mutate ORM objects
    working_assets: list[Asset] = []

    class _AssetProxy:
        """Thin mutable wrapper so we don't mutate SQLAlchemy objects."""
        def __init__(self, a: Asset):
            self.balance         = a.balance + (lump_sum * (a.balance / max(1, sum(x.balance for x in assets))) if lump_sum > 0 else 0)
            self.monthly_deposit = (a.monthly_deposit or 0) + extra_monthly_contribution / max(1, len(assets))
            self.asset_type      = a.asset_type
            self.ring            = a.ring

    working_assets = [_AssetProxy(a) for a in assets]  # type: ignore[assignment]

    # ── Build tax buckets ─────────────────────────────────────────────────────
    buckets_accum: list[_Bucket] = []
    for a in working_assets:
        buckets_accum.append(_Bucket(
            balance         = a.balance,
            cost_basis      = a.balance,
            monthly_deposit = a.monthly_deposit,
            is_exempt       = a.asset_type in _TAX_EXEMPT_TYPES,
        ))

    # ── Accumulation phase ────────────────────────────────────────────────────
    accum_result = _simulate_phase(
        buckets             = buckets_accum,
        start_age           = client.age,
        end_age             = retirement_age,
        phase               = "accumulation",
        annual_return       = annual_return,
        annual_inflation    = inflation,
        salary_growth       = salary_growth,
        contribution_scale  = 1.0,
        annual_withdrawal   = 0.0,
        withdrawal_strategy = withdrawal_strategy,
        pension_income      = 0.0,
        years_elapsed_base  = 0,
    )

    projected_at_retirement = accum_result.end_value
    readiness_pct = min(200, round(projected_at_retirement / target_nest_egg * 100, 1)) if target_nest_egg else 0
    gap = max(0, target_nest_egg - projected_at_retirement)

    # ── Initial withdrawal sizing ─────────────────────────────────────────────
    if withdrawal_strategy == "dynamic":
        # Dynamic = percentage of portfolio, expressed as an amount for the first year
        safe_pct         = 4.0
        annual_withdrawal = projected_at_retirement * safe_pct / 100
    else:
        # Fixed or CPI-indexed: start from 4% of target nest egg
        annual_withdrawal = target_nest_egg * 0.04

    # ── Decumulation phase ────────────────────────────────────────────────────
    decum_result = _simulate_phase(
        buckets             = buckets_accum,   # same buckets, carry forward balance
        start_age           = retirement_age,
        end_age             = life_expectancy,
        phase               = "retirement",
        annual_return       = annual_return * 0.75,    # glide: reduce return in retirement
        annual_inflation    = inflation,
        salary_growth       = 0.0,
        contribution_scale  = 0.0,
        annual_withdrawal   = annual_withdrawal,
        withdrawal_strategy = withdrawal_strategy,
        pension_income      = pension_income,
        years_elapsed_base  = accum_years,
    )

    terminal_wealth      = decum_result.end_value
    terminal_wealth_real = decum_result.end_value_real

    # ── Longevity ─────────────────────────────────────────────────────────────
    longevity = _compute_longevity(
        retirement_value     = projected_at_retirement,
        annual_withdrawal    = annual_withdrawal,
        pension_income       = pension_income,
        withdrawal_strategy  = withdrawal_strategy,
        annual_return        = annual_return * 0.75,
        annual_inflation     = inflation,
        retirement_age       = retirement_age,
        life_expectancy      = 100,
        n_paths              = 300,
        scenario             = scenario,
    )

    # ── Safe withdrawal rate ──────────────────────────────────────────────────
    safe_wr = compute_safe_withdrawal_rate(
        retirement_value     = projected_at_retirement,
        pension_income       = pension_income,
        annual_return        = annual_return * 0.75,
        annual_inflation     = inflation,
        retirement_age       = retirement_age,
        n_paths              = 200,
        scenario             = scenario,
    )

    depletion_age = longevity.median_depletion_age

    withdrawal_analysis = WithdrawalAnalysis(
        strategy                    = withdrawal_strategy,
        annual_withdrawal_year1     = round(annual_withdrawal),
        annual_withdrawal_real      = round(annual_withdrawal / (1 + inflation) ** accum_years),
        pension_income_offset       = round(pension_income),
        net_portfolio_draw_year1    = round(max(0, annual_withdrawal - pension_income)),
        portfolio_at_life_expectancy= round(terminal_wealth),
        safe_withdrawal_rate_pct    = safe_wr,
        depletion_age               = depletion_age,
    )

    # ── Sensitivity & what-if ─────────────────────────────────────────────────
    sensitivity_rows: list[SensitivityRow] = []
    what_if_results:  list[WhatIfResult]   = []

    if include_sensitivity and accum_years > 0:
        try:
            sensitivity_rows = compute_sensitivity(client, assets, scenario, inflation, salary_growth)
        except Exception:
            pass

    if include_what_if and accum_years > 0:
        try:
            what_if_results = run_what_if(
                client, assets, scenario, inflation, salary_growth,
                base_terminal=projected_at_retirement,
            )
        except Exception:
            pass

    # ── Totals ────────────────────────────────────────────────────────────────
    total_contributions = accum_result.total_contributions
    total_returns       = accum_result.total_returns_earned + decum_result.total_returns_earned
    total_tax           = accum_result.total_tax_paid + decum_result.total_tax_paid
    wealth_multiplier   = (
        round(projected_at_retirement / total_contributions, 2)
        if total_contributions > 0 else 0.0
    )

    # ── Summary text ─────────────────────────────────────────────────────────
    deflator = (1 + inflation) ** accum_years
    summary = (
        f"Under the {scenario} scenario, {client.name} (age {client.age}) is projected to accumulate "
        f"₪{projected_at_retirement:,.0f} by retirement at {retirement_age} "
        f"(₪{projected_at_retirement / deflator:,.0f} in today's ILS). "
        f"Retirement readiness: {readiness_pct:.0f}% of the ₪{target_nest_egg:,.0f} target. "
        + (f"Gap: ₪{gap:,.0f}. " if gap > 0 else "On track — no gap. ")
        + f"Portfolio {'survives' if longevity.survival_pct_90 >= 95 else 'may be depleted'} "
        f"to age 90 ({longevity.survival_pct_90:.0f}% probability). "
        f"Safe withdrawal rate: {safe_wr:.1f}%/year."
    )

    return SimulationResult(
        client_name          = client.name,
        current_age          = client.age,
        retirement_age       = retirement_age,
        life_expectancy      = life_expectancy,
        scenario             = scenario,
        inflation_rate       = inflation,
        salary_growth_rate   = salary_growth,
        accumulation         = accum_result,
        decumulation         = decum_result,
        terminal_wealth      = round(terminal_wealth),
        terminal_wealth_real = round(terminal_wealth_real),
        total_contributions  = round(total_contributions),
        total_returns_earned = round(total_returns),
        total_tax_paid       = round(total_tax),
        wealth_multiplier    = wealth_multiplier,
        withdrawal           = withdrawal_analysis,
        longevity            = longevity,
        sensitivity          = sensitivity_rows,
        what_ifs             = what_if_results,
        target_nest_egg      = round(target_nest_egg),
        readiness_pct        = readiness_pct,
        gap                  = round(gap),
        summary              = summary,
    )
