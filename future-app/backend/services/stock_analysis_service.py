"""
Stock Analysis Engine — fundamental analysis and AI-powered investment thesis generation.

For each stock symbol this service fetches:
  • Current quote and key ratios from yfinance fast_info / info
  • Annual and quarterly income-statement data for growth and margin trends
  • Price momentum vs. 52-week range and sector index

It then computes quantitative metric objects and optionally generates a
Claude-powered investment thesis (falls back to a rule-based thesis when no
API key is configured).

Public interface:
  analyze_stock(symbol)              — full StockAnalysis for one ticker
  analyze_stocks(symbols)            — batch, one-per-thread using ThreadPoolExecutor
  generate_thesis(symbol, context)   — AI investment thesis for a ticker
  get_sector_medians(sector)         — median valuation ratios for a given sector
  invalidate_cache(symbol?)          — clear one ticker or the whole cache
"""

from __future__ import annotations

import logging
import math
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from typing import Any, Optional

logger = logging.getLogger(__name__)

# ── Optional dependency guard ─────────────────────────────────────────────────

try:
    import yfinance as yf
    _YF_OK = True
except ImportError:                                              # pragma: no cover
    _YF_OK = False
    logger.warning(
        "yfinance is not installed — stock analysis will be unavailable. "
        "Add 'yfinance>=0.2.40' to requirements.txt and rebuild."
    )

try:
    import pandas as _pd
    _PD_OK = True
except ImportError:                                              # pragma: no cover
    _PD_OK = False

# ── TTL constants (seconds) ───────────────────────────────────────────────────

ANALYSIS_TTL  =    900    # 15 min  — full fundamental analysis
QUOTE_TTL     =    300    # 5  min  — price / fast_info
THESIS_TTL    =  3_600    # 1  hr   — AI-generated thesis

# ── Sector median P/E reference table ────────────────────────────────────────
# Source: long-run sector averages (approximate, used for relative valuation)

_SECTOR_PE_MEDIANS: dict[str, dict[str, float]] = {
    "Technology":             {"pe": 28.0, "ps": 5.0,  "pb": 6.0, "ev_ebitda": 20.0},
    "Healthcare":             {"pe": 22.0, "ps": 3.5,  "pb": 4.0, "ev_ebitda": 15.0},
    "Financials":             {"pe": 14.0, "ps": 2.5,  "pb": 1.5, "ev_ebitda": 12.0},
    "Consumer Discretionary": {"pe": 20.0, "ps": 1.5,  "pb": 4.5, "ev_ebitda": 14.0},
    "Consumer Staples":       {"pe": 20.0, "ps": 1.2,  "pb": 5.0, "ev_ebitda": 13.0},
    "Industrials":            {"pe": 20.0, "ps": 1.5,  "pb": 3.5, "ev_ebitda": 13.0},
    "Energy":                 {"pe": 12.0, "ps": 1.0,  "pb": 1.8, "ev_ebitda":  8.0},
    "Materials":              {"pe": 16.0, "ps": 1.5,  "pb": 2.5, "ev_ebitda": 10.0},
    "Real Estate":            {"pe": 40.0, "ps": 5.0,  "pb": 2.5, "ev_ebitda": 20.0},
    "Utilities":              {"pe": 18.0, "ps": 2.0,  "pb": 2.0, "ev_ebitda": 11.0},
    "Communication Services": {"pe": 18.0, "ps": 2.5,  "pb": 3.5, "ev_ebitda": 12.0},
    "Unknown":                {"pe": 20.0, "ps": 2.5,  "pb": 3.0, "ev_ebitda": 14.0},
}

# ── In-process TTL cache ──────────────────────────────────────────────────────

_CACHE: dict[str, tuple[Any, float]] = {}


def _cache_get(key: str) -> Optional[Any]:
    entry = _CACHE.get(key)
    if entry is None:
        return None
    value, expires_at = entry
    if time.monotonic() > expires_at:
        del _CACHE[key]
        return None
    return value


def _cache_set(key: str, value: Any, ttl: float) -> None:
    _CACHE[key] = (value, time.monotonic() + ttl)


# ── NaN-safe helpers ──────────────────────────────────────────────────────────

def _safe(obj: Any, attr: str, default: float = 0.0) -> float:
    """Return obj.<attr> as float, or default on missing / NaN / None."""
    val = getattr(obj, attr, None)
    if val is None:
        return default
    try:
        f = float(val)
        return default if math.isnan(f) or math.isinf(f) else f
    except (TypeError, ValueError):
        return default


def _safe_dict(d: dict, key: str, default: float = 0.0) -> float:
    val = d.get(key)
    if val is None:
        return default
    try:
        f = float(val)
        return default if math.isnan(f) or math.isinf(f) else f
    except (TypeError, ValueError):
        return default


def _pct(value: float, total: float) -> float:
    return (value / total * 100.0) if total else 0.0


# ── Dataclasses ───────────────────────────────────────────────────────────────

@dataclass
class FundamentalMetrics:
    """Key fundamental facts about the company."""
    symbol:           str
    name:             str
    sector:           str
    industry:         str
    market_cap:       float          # USD
    currency:         str
    current_price:    float
    fifty_two_week_high: float
    fifty_two_week_low:  float
    price_vs_52w_high_pct: float     # e.g. -15 means 15% below 52-week high
    average_volume:   float
    beta:             float
    description:      str = ""


@dataclass
class GrowthMetrics:
    """Revenue and earnings growth over 1-year and multi-year periods."""
    revenue_yoy_pct:        float    # year-over-year revenue growth %
    revenue_cagr_3y_pct:    float    # 3-year CAGR %
    earnings_yoy_pct:       float    # year-over-year net income growth %
    gross_margin_pct:       float    # current gross margin %
    operating_margin_pct:   float    # current operating margin %
    net_margin_pct:         float    # current net margin %
    gross_margin_trend:     str      # "improving" | "stable" | "declining"
    revenue_trend:          str      # "accelerating" | "stable" | "decelerating"
    quarters_of_data:       int      # how many quarters we have
    annual_revenues:        list[float] = field(default_factory=list)  # newest first


@dataclass
class ValuationMetrics:
    """Price-based valuation multiples."""
    pe_ratio:          float    # trailing P/E
    forward_pe:        float    # forward P/E
    ps_ratio:          float    # price-to-sales
    pb_ratio:          float    # price-to-book
    ev_ebitda:         float    # enterprise value / EBITDA
    peg_ratio:         float    # P/E-to-growth
    dividend_yield:    float    # %
    sector:            str
    pe_vs_sector:      str      # "cheap" | "fair" | "expensive" | "n/a"
    ps_vs_sector:      str
    overall_valuation: str      # "undervalued" | "fairly_valued" | "overvalued" | "n/a"


@dataclass
class SectorComparison:
    """How this stock's metrics compare to its sector median."""
    sector:                 str
    sector_pe_median:       float
    sector_ps_median:       float
    sector_pb_median:       float
    sector_ev_ebitda_median: float
    pe_premium_pct:         float    # (company_pe - median) / median * 100
    ps_premium_pct:         float
    notes:                  list[str] = field(default_factory=list)


@dataclass
class InvestmentThesis:
    """AI or rule-based investment thesis for the stock."""
    symbol:             str
    rating:             str          # "strong_buy" | "buy" | "hold" | "sell" | "strong_sell"
    conviction_score:   int          # 0-100
    time_horizon:       str          # e.g. "12-18 months"
    headline:           str          # one-line thesis
    bull_case:          list[str]    # 2-3 bullet points
    bear_case:          list[str]    # 2-3 bullet points
    key_catalysts:      list[str]
    key_risks:          list[str]
    price_target_note:  str          # qualitative guidance (no specific price target)
    full_analysis:      str          # 2-3 paragraph narrative
    ai_generated:       bool = False


@dataclass
class StockAnalysis:
    """Complete analysis bundle for one ticker."""
    fundamentals:  FundamentalMetrics
    growth:        GrowthMetrics
    valuation:     ValuationMetrics
    sector_cmp:    SectorComparison
    thesis:        InvestmentThesis
    timestamp:     float = field(default_factory=time.time)
    error:         Optional[str] = None


# ── Internal data-fetching helpers ────────────────────────────────────────────

def _fetch_info(symbol: str) -> dict:
    """Return ticker.info dict; empty dict on error."""
    cached = _cache_get(f"info:{symbol}")
    if cached is not None:
        return cached
    if not _YF_OK:
        return {}
    try:
        ticker = yf.Ticker(symbol)
        info   = ticker.info or {}
        _cache_set(f"info:{symbol}", info, ANALYSIS_TTL)
        return info
    except Exception as exc:
        logger.warning("yfinance info error for %s: %s", symbol, exc)
        return {}


def _fetch_financials(symbol: str) -> tuple[Any, Any]:
    """Return (annual_financials_df, quarterly_financials_df) or (None, None)."""
    cached = _cache_get(f"fin:{symbol}")
    if cached is not None:
        return cached
    if not _YF_OK or not _PD_OK:
        return None, None
    try:
        ticker  = yf.Ticker(symbol)
        annual  = ticker.financials        # columns = annual periods, newest first
        qtrly   = ticker.quarterly_financials
        result  = (annual, qtrly)
        _cache_set(f"fin:{symbol}", result, ANALYSIS_TTL)
        return result
    except Exception as exc:
        logger.warning("yfinance financials error for %s: %s", symbol, exc)
        return None, None


def _build_fundamentals(symbol: str, info: dict) -> FundamentalMetrics:
    price      = _safe_dict(info, "currentPrice") or _safe_dict(info, "regularMarketPrice")
    high52     = _safe_dict(info, "fiftyTwoWeekHigh")
    low52      = _safe_dict(info, "fiftyTwoWeekLow")
    vs_high    = _pct(price - high52, high52) if high52 else 0.0

    return FundamentalMetrics(
        symbol               = symbol.upper(),
        name                 = info.get("longName") or info.get("shortName") or symbol,
        sector               = info.get("sector") or "Unknown",
        industry             = info.get("industry") or "Unknown",
        market_cap           = _safe_dict(info, "marketCap"),
        currency             = info.get("currency") or "USD",
        current_price        = price,
        fifty_two_week_high  = high52,
        fifty_two_week_low   = low52,
        price_vs_52w_high_pct= round(vs_high, 2),
        average_volume       = _safe_dict(info, "averageVolume"),
        beta                 = _safe_dict(info, "beta", default=1.0),
        description          = (info.get("longBusinessSummary") or "")[:500],
    )


def _build_growth(symbol: str, info: dict, annual_df: Any, qtrly_df: Any) -> GrowthMetrics:
    # Fallback to info-level metrics when dataframes are unavailable
    rev_growth_yoy  = _safe_dict(info, "revenueGrowth") * 100   # yfinance stores as fraction
    earnings_growth = _safe_dict(info, "earningsGrowth") * 100
    gross_margin    = _safe_dict(info, "grossMargins")   * 100
    op_margin       = _safe_dict(info, "operatingMargins") * 100
    net_margin      = _safe_dict(info, "profitMargins")  * 100

    annual_revenues: list[float] = []
    rev_cagr_3y     = 0.0
    gross_trend     = "stable"
    rev_trend       = "stable"
    quarters        = 0

    if _PD_OK and annual_df is not None and not annual_df.empty:
        try:
            # Row label varies between yfinance versions; try both
            rev_row = None
            for label in ("Total Revenue", "Revenue"):
                if label in annual_df.index:
                    rev_row = annual_df.loc[label]
                    break
            if rev_row is not None:
                annual_revenues = [float(v) for v in rev_row.values if v and not math.isnan(float(v))]
                if len(annual_revenues) >= 2:
                    rev_growth_yoy = _pct(annual_revenues[0] - annual_revenues[1], annual_revenues[1])
                if len(annual_revenues) >= 4:
                    # CAGR over 3 years: (newest / oldest) ^ (1/3) - 1
                    rev_cagr_3y = (pow(annual_revenues[0] / annual_revenues[3], 1/3) - 1) * 100 \
                        if annual_revenues[3] > 0 else 0.0

            # Gross margin trend from quarterly
            if qtrly_df is not None and not qtrly_df.empty:
                quarters = qtrly_df.shape[1]
                gross_rev_q = None
                cogs_row    = None
                for label in ("Total Revenue", "Revenue"):
                    if label in qtrly_df.index:
                        gross_rev_q = qtrly_df.loc[label].values
                        break
                for label in ("Cost Of Revenue", "Cost of Revenue"):
                    if label in qtrly_df.index:
                        cogs_row = qtrly_df.loc[label].values
                        break
                if gross_rev_q is not None and cogs_row is not None and len(gross_rev_q) >= 4:
                    def _gm(rev, cost):
                        return _pct(float(rev) - float(cost), float(rev)) if float(rev) else 0.0
                    recent = _gm(gross_rev_q[0], cogs_row[0])
                    older  = _gm(gross_rev_q[3], cogs_row[3])
                    if   recent > older + 1:  gross_trend = "improving"
                    elif recent < older - 1:  gross_trend = "declining"

            # Revenue trend (last 2 vs prior 2 quarters)
            if qtrly_df is not None and gross_rev_q is not None and len(gross_rev_q) >= 4:
                recent_rev = float(gross_rev_q[0]) + float(gross_rev_q[1])
                older_rev  = float(gross_rev_q[2]) + float(gross_rev_q[3])
                delta      = _pct(recent_rev - older_rev, older_rev) if older_rev else 0
                if   delta >  5: rev_trend = "accelerating"
                elif delta < -5: rev_trend = "decelerating"

        except Exception as exc:
            logger.debug("growth metrics parse error for %s: %s", symbol, exc)

    return GrowthMetrics(
        revenue_yoy_pct       = round(rev_growth_yoy,  2),
        revenue_cagr_3y_pct   = round(rev_cagr_3y,     2),
        earnings_yoy_pct      = round(earnings_growth, 2),
        gross_margin_pct      = round(gross_margin,    2),
        operating_margin_pct  = round(op_margin,       2),
        net_margin_pct        = round(net_margin,      2),
        gross_margin_trend    = gross_trend,
        revenue_trend         = rev_trend,
        quarters_of_data      = quarters,
        annual_revenues       = annual_revenues[:5],   # keep last 5 years max
    )


def _build_valuation(info: dict, sector: str) -> tuple[ValuationMetrics, SectorComparison]:
    pe      = _safe_dict(info, "trailingPE")
    fpe     = _safe_dict(info, "forwardPE")
    ps      = _safe_dict(info, "priceToSalesTrailing12Months")
    pb      = _safe_dict(info, "priceToBook")
    ev_eb   = _safe_dict(info, "enterpriseToEbitda")
    peg     = _safe_dict(info, "pegRatio")
    div_yld = _safe_dict(info, "dividendYield") * 100

    medians = _SECTOR_PE_MEDIANS.get(sector, _SECTOR_PE_MEDIANS["Unknown"])
    med_pe  = medians["pe"]
    med_ps  = medians["ps"]
    med_pb  = medians["pb"]
    med_ev  = medians["ev_ebitda"]

    pe_vs_sector  = _compare_to_median(pe,    med_pe,  "pe")
    ps_vs_sector  = _compare_to_median(ps,    med_ps,  "ps")
    pe_premium    = _pct(pe - med_pe, med_pe)  if pe and med_pe else 0.0
    ps_premium    = _pct(ps - med_ps, med_ps)  if ps and med_ps else 0.0

    # Overall valuation: majority vote across 3 metrics
    votes = [pe_vs_sector, ps_vs_sector, _compare_to_median(pb, med_pb, "pb")]
    cheap_count     = votes.count("cheap")
    expensive_count = votes.count("expensive")
    na_count        = votes.count("n/a")
    if na_count >= 2:
        overall = "n/a"
    elif cheap_count >= 2:
        overall = "undervalued"
    elif expensive_count >= 2:
        overall = "overvalued"
    else:
        overall = "fairly_valued"

    notes = []
    if pe and pe > med_pe * 2:
        notes.append(f"P/E of {pe:.1f}x is more than double sector median ({med_pe:.1f}x)")
    if ps and ps > med_ps * 2:
        notes.append(f"P/S of {ps:.1f}x is more than double sector median ({med_ps:.1f}x)")
    if pe and pe < med_pe * 0.5:
        notes.append(f"P/E of {pe:.1f}x is less than half sector median — potential value")
    if peg and 0 < peg < 1:
        notes.append(f"PEG ratio of {peg:.2f} suggests growth at a reasonable price")

    val = ValuationMetrics(
        pe_ratio          = round(pe,      2),
        forward_pe        = round(fpe,     2),
        ps_ratio          = round(ps,      2),
        pb_ratio          = round(pb,      2),
        ev_ebitda         = round(ev_eb,   2),
        peg_ratio         = round(peg,     2),
        dividend_yield    = round(div_yld, 2),
        sector            = sector,
        pe_vs_sector      = pe_vs_sector,
        ps_vs_sector      = ps_vs_sector,
        overall_valuation = overall,
    )
    cmp = SectorComparison(
        sector                  = sector,
        sector_pe_median        = med_pe,
        sector_ps_median        = med_ps,
        sector_pb_median        = med_pb,
        sector_ev_ebitda_median = med_ev,
        pe_premium_pct          = round(pe_premium, 1),
        ps_premium_pct          = round(ps_premium, 1),
        notes                   = notes,
    )
    return val, cmp


def _compare_to_median(value: float, median: float, metric: str) -> str:
    if not value or not median:
        return "n/a"
    ratio = value / median
    if ratio < 0.75:
        return "cheap"
    if ratio > 1.40:
        return "expensive"
    return "fair"


# ── Rule-based thesis generation ──────────────────────────────────────────────

_RATINGS = ["strong_sell", "sell", "hold", "buy", "strong_buy"]


def _rule_based_thesis(
    symbol: str,
    fund: FundamentalMetrics,
    growth: GrowthMetrics,
    val: ValuationMetrics,
    cmp: SectorComparison,
) -> InvestmentThesis:
    score = 50  # start neutral
    bull: list[str] = []
    bear: list[str] = []
    catalysts: list[str] = []
    risks:     list[str] = []

    # ── Growth signals ────────────────────────────────────────────────────────
    if growth.revenue_yoy_pct > 20:
        score += 12
        bull.append(f"Strong revenue growth of {growth.revenue_yoy_pct:.1f}% YoY")
        catalysts.append("Sustained top-line momentum")
    elif growth.revenue_yoy_pct > 8:
        score += 5
        bull.append(f"Healthy revenue growth of {growth.revenue_yoy_pct:.1f}% YoY")
    elif growth.revenue_yoy_pct < -5:
        score -= 12
        bear.append(f"Revenue declining {abs(growth.revenue_yoy_pct):.1f}% YoY")
        risks.append("Revenue contraction suggests weakening demand")

    if growth.revenue_trend == "accelerating":
        score += 8
        bull.append("Quarterly revenue momentum is accelerating")
        catalysts.append("Acceleration in quarterly growth rate")
    elif growth.revenue_trend == "decelerating":
        score -= 6
        bear.append("Quarterly revenue growth is decelerating")

    if growth.gross_margin_trend == "improving":
        score += 6
        bull.append(f"Gross margins expanding (currently {growth.gross_margin_pct:.1f}%)")
        catalysts.append("Improving operational leverage")
    elif growth.gross_margin_trend == "declining":
        score -= 6
        bear.append(f"Gross margins under pressure ({growth.gross_margin_pct:.1f}% and declining)")
        risks.append("Margin compression reducing earnings power")

    if growth.net_margin_pct > 15:
        score += 5
        bull.append(f"High net margin of {growth.net_margin_pct:.1f}%")
    elif growth.net_margin_pct < 0:
        score -= 8
        bear.append(f"Company is unprofitable (net margin {growth.net_margin_pct:.1f}%)")
        risks.append("Path to profitability unclear")

    # ── Valuation signals ─────────────────────────────────────────────────────
    if val.overall_valuation == "undervalued":
        score += 8
        bull.append(f"Trading at a discount vs. sector ({val.pe_vs_sector} P/E, {val.ps_vs_sector} P/S)")
        catalysts.append("Valuation re-rating potential")
    elif val.overall_valuation == "overvalued":
        score -= 8
        bear.append(f"Premium valuation (P/E {val.pe_ratio:.1f}x) leaves limited margin of safety")
        risks.append("High multiple vulnerable to multiple compression on any earnings miss")

    if val.peg_ratio and 0 < val.peg_ratio < 1:
        score += 5
        bull.append(f"Attractive PEG ratio of {val.peg_ratio:.2f} (growth at a reasonable price)")

    if val.dividend_yield > 2.5:
        score += 4
        bull.append(f"Dividend yield of {val.dividend_yield:.1f}% provides income cushion")
        catalysts.append("Dividend sustainability supports downside")

    # ── Momentum signals ──────────────────────────────────────────────────────
    vs_high = fund.price_vs_52w_high_pct
    if vs_high < -30:
        score += 4   # deep discount from high — potential value entry
        bull.append(f"Stock is {abs(vs_high):.0f}% below 52-week high — possible re-rating entry")
        catalysts.append("Mean-reversion from oversold levels")
    elif vs_high > -5:
        score += 2   # near 52-week high — momentum confirmation
        bull.append("Trading near 52-week highs — strong price momentum")

    # ── Beta / risk ───────────────────────────────────────────────────────────
    if fund.beta > 1.8:
        risks.append(f"High beta ({fund.beta:.1f}) amplifies market volatility")
        score -= 3
    elif fund.beta < 0.6:
        bull.append(f"Low beta ({fund.beta:.1f}) offers defensive characteristics")
        score += 2

    # ── Market cap risk ───────────────────────────────────────────────────────
    if fund.market_cap > 0 and fund.market_cap < 500_000_000:
        risks.append("Small/micro-cap — higher liquidity risk and volatility")
        bear.append("Small-cap size increases liquidity and concentration risk")
        score -= 4

    # ── Clamp and derive rating ───────────────────────────────────────────────
    score = max(0, min(100, score))
    if score >= 75:   rating = "strong_buy"
    elif score >= 60: rating = "buy"
    elif score >= 40: rating = "hold"
    elif score >= 25: rating = "sell"
    else:             rating = "strong_sell"

    # Ensure at least one entry in each list
    if not bull:       bull       = ["Monitor for improving fundamentals"]
    if not bear:       bear       = ["No major near-term concerns identified"]
    if not catalysts:  catalysts  = ["Continued execution on core business"]
    if not risks:      risks      = ["General market and macro risk"]

    # Time horizon driven by growth and valuation
    if growth.revenue_cagr_3y_pct > 15 and val.overall_valuation != "overvalued":
        horizon = "12–24 months (growth compounding)"
    elif val.overall_valuation == "undervalued":
        horizon = "6–18 months (re-rating catalyst)"
    else:
        horizon = "12–18 months"

    headline = (
        f"{fund.name} ({symbol.upper()}) — {rating.replace('_', ' ').title()} | "
        f"Revenue {growth.revenue_yoy_pct:+.1f}% YoY | "
        f"{val.overall_valuation.replace('_', ' ').title()} vs. {fund.sector}"
    )

    narrative_lines = [
        f"{fund.name} operates in the {fund.sector} sector ({fund.industry}) "
        f"with a market cap of ${fund.market_cap / 1e9:.1f}B USD. "
        f"Revenue grew {growth.revenue_yoy_pct:.1f}% year-over-year "
        f"with a {growth.revenue_trend} quarterly trend. "
        f"Gross margin stands at {growth.gross_margin_pct:.1f}% ({growth.gross_margin_trend}) "
        f"and net margin is {growth.net_margin_pct:.1f}%.",

        f"On valuation, the stock trades at {val.pe_ratio:.1f}x trailing P/E and "
        f"{val.ps_ratio:.1f}x P/S versus sector medians of "
        f"{cmp.sector_pe_median:.1f}x and {cmp.sector_ps_median:.1f}x respectively, "
        f"implying a {cmp.pe_premium_pct:+.1f}% PE premium. "
        f"Overall valuation is assessed as {val.overall_valuation.replace('_', ' ')}.",

        f"The stock's beta of {fund.beta:.2f} and its position "
        f"{abs(fund.price_vs_52w_high_pct):.0f}% {'below' if fund.price_vs_52w_high_pct < 0 else 'above'} "
        f"its 52-week high reflect its current risk-reward profile. "
        f"Rule-based conviction score: {score}/100 → {rating.replace('_', ' ').upper()}. "
        f"Configure ANTHROPIC_API_KEY for an AI-powered thesis with deeper qualitative insight.",
    ]

    return InvestmentThesis(
        symbol           = symbol.upper(),
        rating           = rating,
        conviction_score = score,
        time_horizon     = horizon,
        headline         = headline,
        bull_case        = bull[:3],
        bear_case        = bear[:3],
        key_catalysts    = catalysts[:4],
        key_risks        = risks[:4],
        price_target_note= "No specific price target — see conviction score and time horizon.",
        full_analysis    = "\n\n".join(narrative_lines),
        ai_generated     = False,
    )


# ── AI thesis generation ───────────────────────────────────────────────────────

_THESIS_SYSTEM = """You are an expert equity analyst. Given fundamental data for a stock,
produce a structured investment thesis in JSON.

Respond ONLY with valid JSON matching this schema:
{
  "rating": "strong_buy|buy|hold|sell|strong_sell",
  "conviction_score": <integer 0-100>,
  "time_horizon": "<string, e.g. '12-18 months'>",
  "headline": "<one-line thesis>",
  "bull_case": ["<point 1>", "<point 2>", "<point 3>"],
  "bear_case": ["<point 1>", "<point 2>", "<point 3>"],
  "key_catalysts": ["<catalyst 1>", "<catalyst 2>"],
  "key_risks": ["<risk 1>", "<risk 2>"],
  "price_target_note": "<qualitative price-target commentary>",
  "full_analysis": "<2-3 paragraph narrative analysis>"
}"""


def _ai_thesis(
    symbol: str,
    fund: FundamentalMetrics,
    growth: GrowthMetrics,
    val: ValuationMetrics,
    cmp: SectorComparison,
    market_context: Optional[str] = None,
) -> InvestmentThesis:
    import json
    from ai.client import MODEL, api_key_valid, get_sync_client

    fallback = _rule_based_thesis(symbol, fund, growth, val, cmp)

    if not api_key_valid():
        return fallback

    cached = _cache_get(f"thesis:{symbol}")
    if cached is not None:
        return cached

    prompt_parts = [
        f"Analyze the following stock and generate an investment thesis.\n",
        f"TICKER: {symbol.upper()} — {fund.name}",
        f"Sector: {fund.sector} | Industry: {fund.industry}",
        f"Market Cap: ${fund.market_cap / 1e9:.1f}B | Beta: {fund.beta:.2f}",
        f"Current Price: {fund.current_price:.2f} {fund.currency} "
        f"({fund.price_vs_52w_high_pct:+.1f}% vs 52-week high)",
        f"\nGROWTH:",
        f"  Revenue YoY: {growth.revenue_yoy_pct:.1f}% | 3Y CAGR: {growth.revenue_cagr_3y_pct:.1f}%",
        f"  Quarterly revenue trend: {growth.revenue_trend}",
        f"  Gross margin: {growth.gross_margin_pct:.1f}% ({growth.gross_margin_trend})",
        f"  Operating margin: {growth.operating_margin_pct:.1f}% | Net margin: {growth.net_margin_pct:.1f}%",
        f"  Earnings YoY: {growth.earnings_yoy_pct:.1f}%",
        f"\nVALUATION:",
        f"  Trailing P/E: {val.pe_ratio:.1f}x (sector median: {cmp.sector_pe_median:.1f}x) → {val.pe_vs_sector}",
        f"  P/S: {val.ps_ratio:.1f}x (sector median: {cmp.sector_ps_median:.1f}x) → {val.ps_vs_sector}",
        f"  P/B: {val.pb_ratio:.1f}x | EV/EBITDA: {val.ev_ebitda:.1f}x | PEG: {val.peg_ratio:.2f}",
        f"  Dividend yield: {val.dividend_yield:.1f}%",
        f"  Overall valuation vs sector: {val.overall_valuation}",
        f"\nSECTOR COMPARISON NOTES:",
    ]
    for note in cmp.notes:
        prompt_parts.append(f"  - {note}")
    if market_context:
        prompt_parts.append(f"\nMARKET CONTEXT:\n{market_context}")
    if fund.description:
        prompt_parts.append(f"\nBUSINESS DESCRIPTION:\n{fund.description}")

    prompt = "\n".join(prompt_parts)

    try:
        message = get_sync_client().messages.create(
            model=MODEL,
            max_tokens=1500,
            system=_THESIS_SYSTEM,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = message.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        data = json.loads(raw)

        thesis = InvestmentThesis(
            symbol           = symbol.upper(),
            rating           = data.get("rating", "hold"),
            conviction_score = int(data.get("conviction_score", 50)),
            time_horizon     = data.get("time_horizon", "12-18 months"),
            headline         = data.get("headline", fund.name),
            bull_case        = data.get("bull_case", [])[:3],
            bear_case        = data.get("bear_case", [])[:3],
            key_catalysts    = data.get("key_catalysts", [])[:4],
            key_risks        = data.get("key_risks", [])[:4],
            price_target_note= data.get("price_target_note", ""),
            full_analysis    = data.get("full_analysis", ""),
            ai_generated     = True,
        )
        _cache_set(f"thesis:{symbol}", thesis, THESIS_TTL)
        return thesis

    except Exception as exc:
        logger.warning("AI thesis generation failed for %s: %s", symbol, exc)
        return fallback


# ── Public interface ──────────────────────────────────────────────────────────

def analyze_stock(
    symbol: str,
    market_context: Optional[str] = None,
    use_ai: bool = True,
) -> StockAnalysis:
    """
    Perform a full fundamental + AI analysis of one stock.

    Args:
        symbol:         Ticker symbol (e.g. "AAPL", "TSLA", "TM.TA")
        market_context: Optional AI-injectable market summary string
        use_ai:         Whether to call Claude for the thesis (True by default)

    Returns:
        StockAnalysis dataclass with all metrics and thesis populated.
        On data-fetch failure the `error` field is set and metrics contain zeros.
    """
    cached = _cache_get(f"analysis:{symbol}")
    if cached is not None:
        return cached

    if not _YF_OK:
        return _empty_analysis(symbol, error="yfinance not installed")

    try:
        info        = _fetch_info(symbol)
        if not info:
            return _empty_analysis(symbol, error=f"No data returned for {symbol}")

        annual, qtrly = _fetch_financials(symbol)
        fund          = _build_fundamentals(symbol, info)
        growth        = _build_growth(symbol, info, annual, qtrly)
        val, cmp      = _build_valuation(info, fund.sector)

        if use_ai:
            thesis = _ai_thesis(symbol, fund, growth, val, cmp, market_context)
        else:
            thesis = _rule_based_thesis(symbol, fund, growth, val, cmp)

        result = StockAnalysis(
            fundamentals = fund,
            growth       = growth,
            valuation    = val,
            sector_cmp   = cmp,
            thesis       = thesis,
        )
        _cache_set(f"analysis:{symbol}", result, ANALYSIS_TTL)
        return result

    except Exception as exc:
        logger.error("analyze_stock(%s) failed: %s", symbol, exc)
        return _empty_analysis(symbol, error=str(exc))


def analyze_stocks(
    symbols: list[str],
    market_context: Optional[str] = None,
    use_ai: bool = True,
    max_workers: int = 5,
) -> dict[str, StockAnalysis]:
    """
    Analyze multiple tickers in parallel.

    Returns a dict mapping symbol → StockAnalysis.
    Errors per-symbol are captured in StockAnalysis.error rather than raised.
    """
    results: dict[str, StockAnalysis] = {}
    with ThreadPoolExecutor(max_workers=min(max_workers, len(symbols))) as pool:
        future_map = {
            pool.submit(analyze_stock, sym, market_context, use_ai): sym
            for sym in symbols
        }
        for future in as_completed(future_map):
            sym = future_map[future]
            try:
                results[sym] = future.result()
            except Exception as exc:
                results[sym] = _empty_analysis(sym, error=str(exc))
    return results


def generate_thesis(
    symbol: str,
    market_context: Optional[str] = None,
) -> InvestmentThesis:
    """
    Generate (or retrieve cached) investment thesis for a single ticker.
    Faster than analyze_stock when you only need the thesis.
    """
    cached = _cache_get(f"thesis:{symbol}")
    if cached is not None:
        return cached

    analysis = analyze_stock(symbol, market_context=market_context, use_ai=True)
    return analysis.thesis


def get_sector_medians(sector: str) -> dict[str, float]:
    """Return the sector median valuation ratios for the given sector name."""
    return dict(_SECTOR_PE_MEDIANS.get(sector, _SECTOR_PE_MEDIANS["Unknown"]))


def invalidate_cache(symbol: Optional[str] = None) -> int:
    """
    Remove cached entries.

    Args:
        symbol: If provided, removes only entries for that ticker.
                If None, clears the entire cache.
    Returns:
        Number of entries removed.
    """
    global _CACHE
    if symbol is None:
        count = len(_CACHE)
        _CACHE.clear()
        return count
    keys = [k for k in _CACHE if k.endswith(f":{symbol}") or k.endswith(f":{symbol.upper()}")]
    for k in keys:
        del _CACHE[k]
    return len(keys)


# ── Empty/error placeholder ───────────────────────────────────────────────────

def _empty_analysis(symbol: str, error: str = "") -> StockAnalysis:
    fund = FundamentalMetrics(
        symbol=symbol.upper(), name=symbol, sector="Unknown", industry="Unknown",
        market_cap=0, currency="USD", current_price=0,
        fifty_two_week_high=0, fifty_two_week_low=0,
        price_vs_52w_high_pct=0, average_volume=0, beta=1.0,
    )
    growth = GrowthMetrics(
        revenue_yoy_pct=0, revenue_cagr_3y_pct=0, earnings_yoy_pct=0,
        gross_margin_pct=0, operating_margin_pct=0, net_margin_pct=0,
        gross_margin_trend="stable", revenue_trend="stable", quarters_of_data=0,
    )
    val = ValuationMetrics(
        pe_ratio=0, forward_pe=0, ps_ratio=0, pb_ratio=0,
        ev_ebitda=0, peg_ratio=0, dividend_yield=0,
        sector="Unknown", pe_vs_sector="n/a", ps_vs_sector="n/a",
        overall_valuation="n/a",
    )
    cmp = SectorComparison(
        sector="Unknown", sector_pe_median=20, sector_ps_median=2.5,
        sector_pb_median=3, sector_ev_ebitda_median=14,
        pe_premium_pct=0, ps_premium_pct=0,
    )
    thesis = InvestmentThesis(
        symbol=symbol.upper(), rating="hold", conviction_score=50,
        time_horizon="n/a", headline=f"Data unavailable for {symbol}",
        bull_case=[], bear_case=[], key_catalysts=[], key_risks=[],
        price_target_note="", full_analysis=error or "No data available.",
    )
    return StockAnalysis(
        fundamentals=fund, growth=growth, valuation=val,
        sector_cmp=cmp, thesis=thesis, error=error,
    )
