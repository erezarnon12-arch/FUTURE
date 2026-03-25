"""
Market Data Service — real-time and historical financial market data.

Data sources:
  Primary:   Yahoo Finance via yfinance (no API key required).
             Covers stocks, ETFs, indices, crypto, and forex pairs globally,
             including Tel Aviv 35 and USD/ILS.
  Secondary: FRED (Federal Reserve Economic Data) for US macro series.
             Requires FRED_API_KEY env var; gracefully omits those indicators
             when the key is absent.
  Tertiary:  Bank of Israel public REST API for the key interest rate.
             No API key required; skipped silently on network failure.

Public interface:
  get_quote(symbol)           — single asset quote (price, change, volume)
  get_quotes(symbols)         — batch quotes, one HTTP round-trip
  get_index_snapshots()       — major equity, volatility, and bond-proxy indices
  get_forex_rates()           — ILS-centric and major forex pairs
  get_crypto_prices()         — BTC / ETH spot prices in USD and ILS
  get_macro_indicators()      — interest rates, CPI, unemployment, bond yields
  get_historical_ohlcv(...)   — daily / weekly OHLCV bars for charting
  get_market_context()        — full snapshot dict ready for AI system-prompt injection

Caching:
  All results are TTL-cached in-process to avoid hammering upstream APIs.
  Quotes / indices / forex / crypto : QUOTE_TTL  =   5 minutes
  Macro indicators                  : MACRO_TTL  =  24 hours
  Historical OHLCV                  : HISTORY_TTL =  1 hour
"""

from __future__ import annotations

import logging
import math
import os
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Optional

logger = logging.getLogger(__name__)

# ── Optional dependency guard ─────────────────────────────────────────────────

try:
    import yfinance as yf
    _YF_OK = True
except ImportError:                                              # pragma: no cover
    _YF_OK = False
    logger.warning(
        "yfinance is not installed — market data will be unavailable. "
        "Add 'yfinance>=0.2.40' to requirements.txt and rebuild."
    )

try:
    import requests as _requests
    _REQUESTS_OK = True
except ImportError:                                              # pragma: no cover
    _REQUESTS_OK = False

# ── TTL constants (seconds) ───────────────────────────────────────────────────

QUOTE_TTL   =     300   # 5 min  — intraday prices
HISTORY_TTL =   3_600   # 1 hr   — OHLCV series
MACRO_TTL   =  86_400   # 24 hr  — central bank rates, CPI, yields

# ── Ticker catalogs ───────────────────────────────────────────────────────────

#  key → (yfinance_ticker, display_name)
INDICES: dict[str, tuple[str, str]] = {
    "sp500":       ("^GSPC",  "S&P 500"),
    "nasdaq100":   ("^NDX",   "Nasdaq 100"),
    "ta35":        ("^TA35",  "Tel Aviv 35"),
    "russell2000": ("^RUT",   "Russell 2000"),
    "vix":         ("^VIX",   "VIX Volatility Index"),
    "us10y":       ("^TNX",   "US 10-Year Treasury Yield"),
    "us30y":       ("^TYX",   "US 30-Year Treasury Yield"),
}

#  pair_label → (yfinance_ticker, display_name)
FOREX_PAIRS: dict[str, tuple[str, str]] = {
    "USD/ILS": ("ILS=X",    "US Dollar / Israeli Shekel"),
    "EUR/ILS": ("EURILS=X", "Euro / Israeli Shekel"),
    "GBP/ILS": ("GBPILS=X", "British Pound / Israeli Shekel"),
    "EUR/USD": ("EURUSD=X", "Euro / US Dollar"),
}

#  key → yfinance_ticker
CRYPTO_TICKERS: dict[str, str] = {
    "bitcoin":  "BTC-USD",
    "ethereum": "ETH-USD",
}

# FRED macro series (requires FRED_API_KEY)
_FRED_BASE = "https://api.stlouisfed.org/fred/series/observations"
_FRED_SERIES: dict[str, tuple[str, str, str]] = {
    # key: (series_id, display_name, unit)
    "fed_funds_rate": ("FEDFUNDS",  "Federal Funds Rate",     "%"),
    "us_cpi_yoy":     ("CPIAUCSL",  "US CPI (Year-over-Year)","% YoY"),
    "us_unemployment":("UNRATE",    "US Unemployment Rate",   "%"),
}

# Bank of Israel key interest rate (public REST, no key)
_BOI_RATE_URL = (
    "https://edge.boi.org.il/FusionEdgeServer/sdmx/v2/data/dataflow/"
    "BOI.STATISTICS/DSD_INTEREST_RATES_KEY/1.0/IR01"
)


# ── Dataclasses ───────────────────────────────────────────────────────────────

@dataclass
class MarketQuote:
    symbol:     str
    name:       str
    price:      float
    prev_close: float
    change:     float           # absolute change from previous close
    change_pct: float           # % change from previous close
    day_high:   float
    day_low:    float
    volume:     Optional[int]
    currency:   str
    as_of:      datetime


@dataclass
class IndexSnapshot:
    key:        str             # "sp500", "vix", …
    name:       str
    value:      float
    change:     float
    change_pct: float
    ytd_return: Optional[float] # % year-to-date (None when unavailable)
    as_of:      datetime


@dataclass
class ForexRate:
    pair:       str             # "USD/ILS"
    name:       str
    rate:       float
    change_pct: float
    as_of:      datetime


@dataclass
class MacroIndicator:
    key:    str                 # "fed_funds_rate", "boi_rate", …
    name:   str
    value:  float
    unit:   str                 # "%", "% YoY", "index"
    period: str                 # "2025-02", "latest"
    source: str                 # "FRED", "BOI", "yfinance"
    as_of:  datetime


@dataclass
class OHLCVBar:
    date:   str                 # ISO date "YYYY-MM-DD"
    open:   float
    high:   float
    low:    float
    close:  float
    volume: Optional[int]


@dataclass
class MarketContext:
    """Full market snapshot ready to be injected into an AI system prompt."""
    as_of:          datetime
    market_regime:  str             # "risk_on" | "neutral" | "risk_off"
    indices:        list[IndexSnapshot]
    forex:          list[ForexRate]
    crypto:         dict[str, MarketQuote]
    macro:          list[MacroIndicator]
    summary_text:   str             # pre-formatted narrative for Claude


# ── In-process TTL cache ──────────────────────────────────────────────────────

_CACHE: dict[str, tuple[Any, float]] = {}   # key → (value, expiry_epoch)


def _cache_get(key: str) -> Any:
    entry = _CACHE.get(key)
    if entry and time.monotonic() < entry[1]:
        return entry[0]
    return None


def _cache_set(key: str, value: Any, ttl: int) -> None:
    _CACHE[key] = (value, time.monotonic() + ttl)


def invalidate_cache(prefix: str = "") -> int:
    """Remove all cached entries whose key starts with `prefix` (or all if empty)."""
    keys = [k for k in list(_CACHE) if k.startswith(prefix)]
    for k in keys:
        del _CACHE[k]
    return len(keys)


# ── yfinance helpers ──────────────────────────────────────────────────────────

def _safe(obj: Any, attr: str, default: Any = None) -> Any:
    """Attribute access that returns `default` on AttributeError or NaN."""
    try:
        val = getattr(obj, attr)
        if val is None:
            return default
        if isinstance(val, float) and math.isnan(val):
            return default
        return val
    except Exception:
        return default


def _yf_tickers(symbols: list[str]) -> dict[str, Any]:
    """
    Fetch fast_info for a list of symbols using a single yf.Tickers batch call.
    Returns {symbol: fast_info} for symbols that succeeded.
    """
    if not _YF_OK or not symbols:
        return {}
    try:
        batch = yf.Tickers(" ".join(symbols))
        result: dict[str, Any] = {}
        for sym in symbols:
            ticker = batch.tickers.get(sym)
            if ticker is not None:
                result[sym] = ticker.fast_info
        return result
    except Exception as exc:
        logger.warning("yfinance batch fetch error: %s", exc)
        return {}


def _build_quote(symbol: str, name: str, fi: Any) -> Optional[MarketQuote]:
    """Construct a MarketQuote from a yfinance fast_info object."""
    price = _safe(fi, "last_price")
    prev  = _safe(fi, "previous_close")
    if price is None:
        return None
    prev      = prev or price
    change    = price - prev
    chg_pct   = (change / prev * 100) if prev else 0.0
    day_high  = _safe(fi, "day_high")  or price
    day_low   = _safe(fi, "day_low")   or price
    volume    = _safe(fi, "volume")
    currency  = _safe(fi, "currency")  or "USD"
    return MarketQuote(
        symbol=symbol, name=name,
        price=round(price, 6), prev_close=round(prev, 6),
        change=round(change, 6), change_pct=round(chg_pct, 2),
        day_high=round(day_high, 6), day_low=round(day_low, 6),
        volume=int(volume) if volume else None,
        currency=currency,
        as_of=datetime.now(timezone.utc),
    )


# ── Public: single / batch quotes ────────────────────────────────────────────

def get_quote(symbol: str, name: str = "") -> Optional[MarketQuote]:
    """
    Fetch a real-time quote for any Yahoo Finance ticker symbol.
    Returns None if the symbol is unknown or the fetch fails.
    """
    cache_key = f"quote:{symbol}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    infos = _yf_tickers([symbol])
    fi    = infos.get(symbol)
    if fi is None:
        return None

    quote = _build_quote(symbol, name or symbol, fi)
    if quote:
        _cache_set(cache_key, quote, QUOTE_TTL)
    return quote


def get_quotes(symbols: list[str]) -> dict[str, Optional[MarketQuote]]:
    """
    Batch-fetch real-time quotes.
    Returns a dict keyed by the original symbol; value is None on failure.
    """
    result:   dict[str, Optional[MarketQuote]] = {}
    to_fetch: list[str] = []

    for sym in symbols:
        cached = _cache_get(f"quote:{sym}")
        if cached is not None:
            result[sym] = cached
        else:
            to_fetch.append(sym)

    if to_fetch:
        infos = _yf_tickers(to_fetch)
        for sym in to_fetch:
            fi    = infos.get(sym)
            quote = _build_quote(sym, sym, fi) if fi else None
            result[sym] = quote
            if quote:
                _cache_set(f"quote:{sym}", quote, QUOTE_TTL)

    return result


# ── Public: index snapshots ───────────────────────────────────────────────────

def get_index_snapshots() -> list[IndexSnapshot]:
    """
    Current values for the major equity, volatility, and bond-proxy indices
    defined in the INDICES catalog.
    """
    cache_key = "indices:all"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    tickers_needed = [v[0] for v in INDICES.values()]
    infos = _yf_tickers(tickers_needed)

    snapshots: list[IndexSnapshot] = []
    for key, (ticker, display) in INDICES.items():
        fi = infos.get(ticker)
        if fi is None:
            continue
        price = _safe(fi, "last_price")
        prev  = _safe(fi, "previous_close")
        if price is None:
            continue
        prev    = prev or price
        change  = price - prev
        chg_pct = (change / prev * 100) if prev else 0.0

        # YTD return: year_change_percent if available, else None
        ytd = _safe(fi, "year_change_percent")
        if ytd is not None:
            ytd = round(ytd * 100, 2)   # yfinance returns fraction (0.07 = 7%)

        snapshots.append(IndexSnapshot(
            key=key, name=display,
            value=round(price, 4),
            change=round(change, 4),
            change_pct=round(chg_pct, 2),
            ytd_return=ytd,
            as_of=datetime.now(timezone.utc),
        ))

    _cache_set(cache_key, snapshots, QUOTE_TTL)
    return snapshots


# ── Public: forex rates ───────────────────────────────────────────────────────

def get_forex_rates() -> list[ForexRate]:
    """
    Current exchange rates for ILS-centric and major forex pairs.
    Rates are expressed as "units of quote currency per 1 base currency"
    (e.g. USD/ILS: how many shekels per dollar).
    """
    cache_key = "forex:all"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    tickers_needed = [v[0] for v in FOREX_PAIRS.values()]
    infos = _yf_tickers(tickers_needed)

    rates: list[ForexRate] = []
    for pair, (ticker, display) in FOREX_PAIRS.items():
        fi = infos.get(ticker)
        if fi is None:
            continue
        price = _safe(fi, "last_price")
        prev  = _safe(fi, "previous_close")
        if price is None:
            continue
        prev    = prev or price
        chg_pct = ((price - prev) / prev * 100) if prev else 0.0
        rates.append(ForexRate(
            pair=pair, name=display,
            rate=round(price, 6),
            change_pct=round(chg_pct, 2),
            as_of=datetime.now(timezone.utc),
        ))

    _cache_set(cache_key, rates, QUOTE_TTL)
    return rates


# ── Public: crypto prices ─────────────────────────────────────────────────────

def get_crypto_prices() -> dict[str, MarketQuote]:
    """
    Spot prices for BTC and ETH in USD.
    The MarketQuote.currency field is always "USD" for these symbols.
    Multiply by the USD/ILS rate from get_forex_rates() to get ILS price.
    """
    cache_key = "crypto:all"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    symbols_needed = list(CRYPTO_TICKERS.values())
    infos = _yf_tickers(symbols_needed)

    result: dict[str, MarketQuote] = {}
    for name, ticker in CRYPTO_TICKERS.items():
        fi    = infos.get(ticker)
        quote = _build_quote(ticker, name.capitalize(), fi) if fi else None
        if quote:
            result[name] = quote

    _cache_set(cache_key, result, QUOTE_TTL)
    return result


# ── Public: macro indicators ──────────────────────────────────────────────────

def get_macro_indicators() -> list[MacroIndicator]:
    """
    Macroeconomic indicators from multiple sources:
      • Always:   US 10Y & 30Y Treasury yields (yfinance proxies)
      • If FRED_API_KEY set: Fed Funds Rate, US CPI YoY, Unemployment Rate
      • Always:   Bank of Israel key interest rate (public REST)
    """
    cache_key = "macro:all"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    indicators: list[MacroIndicator] = []

    # ── US Treasury yields via yfinance ──────────────────────────────────────
    yield_tickers = {"us_10y_yield": ("^TNX", "US 10-Year Treasury Yield", "%"),
                     "us_30y_yield": ("^TYX", "US 30-Year Treasury Yield", "%"),
                     "us_2y_yield":  ("^IRX", "US 13-Week T-Bill Rate",    "%")}

    infos = _yf_tickers([t[0] for t in yield_tickers.values()])
    now   = datetime.now(timezone.utc)
    for key, (ticker, display, unit) in yield_tickers.items():
        fi    = infos.get(ticker)
        price = _safe(fi, "last_price") if fi else None
        if price is not None:
            indicators.append(MacroIndicator(
                key=key, name=display, value=round(price, 3),
                unit=unit, period="latest", source="yfinance", as_of=now,
            ))

    # ── FRED macro series (optional) ─────────────────────────────────────────
    fred_key = os.getenv("FRED_API_KEY", "").strip()
    if fred_key:
        for key, (series_id, display, unit) in _FRED_SERIES.items():
            value, period = _fetch_fred_series(series_id, fred_key)
            if value is not None:
                indicators.append(MacroIndicator(
                    key=key, name=display, value=round(value, 3),
                    unit=unit, period=period, source="FRED", as_of=now,
                ))

    # ── Bank of Israel key rate (public) ─────────────────────────────────────
    boi_rate, boi_period = _fetch_boi_rate()
    if boi_rate is not None:
        indicators.append(MacroIndicator(
            key="boi_rate", name="Bank of Israel Key Interest Rate",
            value=round(boi_rate, 2), unit="%",
            period=boi_period or "latest", source="BOI", as_of=now,
        ))

    _cache_set(cache_key, indicators, MACRO_TTL)
    return indicators


# ── Public: historical OHLCV ──────────────────────────────────────────────────

def get_historical_ohlcv(
    symbol: str,
    period: str   = "1y",
    interval: str = "1d",
) -> list[OHLCVBar]:
    """
    OHLCV bars for any Yahoo Finance ticker.

    period   — yfinance period string: 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max
    interval — bar size:               1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo
    """
    cache_key = f"history:{symbol}:{period}:{interval}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    if not _YF_OK:
        return []

    bars: list[OHLCVBar] = []
    try:
        ticker = yf.Ticker(symbol)
        df     = ticker.history(period=period, interval=interval, auto_adjust=True)
        df.dropna(subset=["Close"], inplace=True)

        for ts, row in df.iterrows():
            date_str = ts.strftime("%Y-%m-%d") if hasattr(ts, "strftime") else str(ts)[:10]
            volume   = int(row["Volume"]) if row["Volume"] and not math.isnan(float(row["Volume"])) else None
            bars.append(OHLCVBar(
                date=date_str,
                open=round(float(row["Open"]),  6),
                high=round(float(row["High"]),  6),
                low=round(float(row["Low"]),   6),
                close=round(float(row["Close"]), 6),
                volume=volume,
            ))
    except Exception as exc:
        logger.warning("historical fetch failed for %s: %s", symbol, exc)

    _cache_set(cache_key, bars, HISTORY_TTL)
    return bars


# ── Public: full market context (for AI injection) ────────────────────────────

def get_market_context() -> MarketContext:
    """
    Assemble a full market snapshot and return a MarketContext that includes
    a pre-formatted `summary_text` ready for injection into an AI system prompt.

    The snapshot is cached as a unit for QUOTE_TTL so repeated calls within
    5 minutes return the identical object without re-fetching.
    """
    cache_key = "context:full"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    indices = get_index_snapshots()
    forex   = get_forex_rates()
    crypto  = get_crypto_prices()
    macro   = get_macro_indicators()
    regime  = _determine_market_regime(indices, macro)
    now     = datetime.now(timezone.utc)

    # Compute ILS prices for crypto using the USD/ILS rate
    usd_ils_rate: Optional[float] = None
    for f in forex:
        if f.pair == "USD/ILS":
            usd_ils_rate = f.rate
            break

    context = MarketContext(
        as_of=now,
        market_regime=regime,
        indices=indices,
        forex=forex,
        crypto=crypto,
        macro=macro,
        summary_text="",   # filled below
    )
    context.summary_text = _build_summary_text(context, usd_ils_rate)

    _cache_set(cache_key, context, QUOTE_TTL)
    return context


# ── FRED REST helper ──────────────────────────────────────────────────────────

def _fetch_fred_series(series_id: str, api_key: str) -> tuple[Optional[float], str]:
    """
    Fetch the most recent observation from FRED.
    For CPI, fetches 14 observations to compute a YoY % change.
    Returns (value, period_label).
    """
    if not _REQUESTS_OK:
        return None, ""
    limit    = 14 if series_id == "CPIAUCSL" else 1
    try:
        resp = _requests.get(
            _FRED_BASE,
            params={
                "series_id":  series_id,
                "api_key":    api_key,
                "sort_order": "desc",
                "limit":      limit,
                "file_type":  "json",
            },
            timeout=6,
        )
        resp.raise_for_status()
        obs = [o for o in resp.json().get("observations", []) if o.get("value") != "."]
        if not obs:
            return None, ""

        latest_val    = float(obs[0]["value"])
        latest_period = obs[0].get("date", "")[:7]   # "YYYY-MM"

        if series_id == "CPIAUCSL" and len(obs) >= 13:
            # Year-over-year % change
            year_ago = float(obs[12]["value"])
            if year_ago:
                return round((latest_val - year_ago) / year_ago * 100, 2), latest_period
            return None, ""

        return latest_val, latest_period

    except Exception as exc:
        logger.debug("FRED %s fetch error: %s", series_id, exc)
        return None, ""


# ── Bank of Israel REST helper ────────────────────────────────────────────────

def _fetch_boi_rate() -> tuple[Optional[float], str]:
    """
    Fetch the Bank of Israel key interest rate from the public SDMX-JSON API.
    Returns (rate_pct, period_label) or (None, "") on any failure.
    """
    if not _REQUESTS_OK:
        return None, ""
    try:
        resp = _requests.get(
            _BOI_RATE_URL,
            params={"format": "json", "lastNObservations": 2},
            timeout=8,
        )
        resp.raise_for_status()
        data    = resp.json()
        # Navigate SDMX-JSON envelope: data → dataSets[0] → series → first entry
        datasets = data.get("data", data).get("dataSets", [])
        if not datasets:
            return None, ""
        series = datasets[0].get("series", {})
        if not series:
            return None, ""
        first_series = next(iter(series.values()))
        observations = first_series.get("observations", {})
        if not observations:
            return None, ""
        # Keys are string indices; take the highest (most recent)
        latest_key = str(max(int(k) for k in observations.keys()))
        rate = float(observations[latest_key][0])

        # Extract period from the structure dimension (time period)
        try:
            structure   = data.get("data", data).get("structure", {})
            dimensions  = structure.get("dimensions", {}).get("observation", [])
            time_dim    = next((d for d in dimensions if d.get("role") == "time"), None)
            period_vals = time_dim.get("values", []) if time_dim else []
            period_label = period_vals[int(latest_key)].get("id", "latest") if period_vals else "latest"
        except Exception:
            period_label = "latest"

        return rate, period_label

    except Exception as exc:
        logger.debug("BOI rate fetch error: %s", exc)
        return None, ""


# ── Market regime classification ──────────────────────────────────────────────

def _determine_market_regime(
    indices: list[IndexSnapshot],
    macro:   list[MacroIndicator],
) -> str:
    """
    Classify the current macro environment based on VIX level.

    VIX < 15  → risk_on   (low fear, equity-friendly)
    VIX 15-25 → neutral
    VIX > 25  → risk_off  (elevated fear, defensive positioning)
    """
    vix_snap = next((s for s in indices if s.key == "vix"), None)
    if vix_snap is None:
        return "neutral"
    if vix_snap.value < 15:
        return "risk_on"
    if vix_snap.value > 25:
        return "risk_off"
    return "neutral"


# ── AI-ready summary text builder ─────────────────────────────────────────────

def _build_summary_text(
    ctx: MarketContext,
    usd_ils_rate: Optional[float],
) -> str:
    """
    Build a concise, structured market narrative for injection into AI prompts.
    Formatted as plain text with clear section headers.
    """
    ts     = ctx.as_of.strftime("%Y-%m-%d %H:%M UTC")
    regime = ctx.market_regime.replace("_", "-").upper()

    lines: list[str] = [
        "═" * 50,
        f"MARKET CONDITIONS  (as of {ts})",
        f"Market Regime: {regime}",
        "═" * 50,
    ]

    # Indices
    if ctx.indices:
        lines.append("\nMAJOR INDICES")
        for s in ctx.indices:
            sign   = "+" if s.change_pct >= 0 else ""
            ytd    = f"  YTD {'+' if (s.ytd_return or 0) >= 0 else ''}{s.ytd_return:.1f}%" if s.ytd_return is not None else ""
            lines.append(
                f"  {s.name:<32} {s.value:>10,.2f}  "
                f"({sign}{s.change_pct:.2f}% today{ytd})"
            )

    # Forex
    if ctx.forex:
        lines.append("\nFOREX")
        for f in ctx.forex:
            sign = "+" if f.change_pct >= 0 else ""
            lines.append(
                f"  {f.pair:<12}  {f.rate:.4f}  ({sign}{f.change_pct:.2f}%)"
            )

    # Crypto
    if ctx.crypto:
        lines.append("\nCRYPTO (USD)")
        for name, q in ctx.crypto.items():
            sign   = "+" if q.change_pct >= 0 else ""
            ils    = ""
            if usd_ils_rate and q.price:
                ils = f"  ≈ ₪{q.price * usd_ils_rate:,.0f}"
            lines.append(
                f"  {name.capitalize():<12}  ${q.price:>12,.2f}  "
                f"({sign}{q.change_pct:.2f}%){ils}"
            )

    # Macro
    if ctx.macro:
        lines.append("\nMACROECONOMIC INDICATORS")
        for m in ctx.macro:
            lines.append(
                f"  {m.name:<38}  {m.value:.2f}{m.unit}  [{m.source}]"
            )

    lines.append("═" * 50)
    return "\n".join(lines)
