"""
Market Data router — exposes the market data service over HTTP.

Endpoints:
  GET  /market/quote/{symbol}          — single asset quote
  POST /market/quotes                  — batch quotes (JSON body: {"symbols": [...]})
  GET  /market/indices                 — major index snapshots
  GET  /market/forex                   — ILS-centric forex rates
  GET  /market/crypto                  — BTC / ETH spot prices
  GET  /market/macro                   — macroeconomic indicators
  GET  /market/context                 — full AI-ready market snapshot
  GET  /market/history/{symbol}        — OHLCV bars
  DELETE /market/cache                 — invalidate in-process cache (admin)
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from services.market_data_service import (
    OHLCVBar,
    get_crypto_prices,
    get_forex_rates,
    get_historical_ohlcv,
    get_index_snapshots,
    get_macro_indicators,
    get_market_context,
    get_quote,
    get_quotes,
    invalidate_cache,
)

router = APIRouter(prefix="/market-data", tags=["market-data"])


# ── Request / response shims ──────────────────────────────────────────────────

class BatchQuoteRequest(BaseModel):
    symbols: list[str]


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/quote/{symbol}")
def quote_endpoint(symbol: str, name: str = Query("", description="Optional display name")):
    """Real-time quote for any Yahoo Finance ticker (e.g. AAPL, BTC-USD, ^GSPC)."""
    result = get_quote(symbol.upper(), name)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Symbol '{symbol}' not found or unavailable")
    return result


@router.post("/quotes")
def batch_quotes_endpoint(body: BatchQuoteRequest):
    """
    Batch real-time quotes in a single round-trip.
    Unrecognised or failed symbols are returned as null in the dict.
    """
    if not body.symbols:
        raise HTTPException(status_code=400, detail="symbols list must not be empty")
    if len(body.symbols) > 50:
        raise HTTPException(status_code=400, detail="Maximum 50 symbols per request")
    return get_quotes([s.upper() for s in body.symbols])


@router.get("/indices")
def indices_endpoint():
    """Current values for S&P 500, Nasdaq 100, Tel Aviv 35, Russell 2000, VIX, and US Treasury yields."""
    return get_index_snapshots()


@router.get("/forex")
def forex_endpoint():
    """Exchange rates for USD/ILS, EUR/ILS, GBP/ILS, and EUR/USD."""
    return get_forex_rates()


@router.get("/crypto")
def crypto_endpoint():
    """Bitcoin and Ethereum spot prices in USD."""
    return get_crypto_prices()


@router.get("/macro")
def macro_endpoint():
    """
    Macroeconomic indicators:
    - US Treasury yields (always available via yfinance)
    - Fed Funds Rate, CPI, Unemployment (requires FRED_API_KEY)
    - Bank of Israel key interest rate (public REST, no key needed)
    """
    return get_macro_indicators()


@router.get("/context")
def context_endpoint():
    """
    Full market snapshot combining indices, forex, crypto, and macro data,
    plus a pre-formatted `summary_text` string ready for AI system-prompt injection.
    """
    ctx = get_market_context()
    return {
        "as_of":         ctx.as_of,
        "market_regime": ctx.market_regime,
        "indices":       ctx.indices,
        "forex":         ctx.forex,
        "crypto":        ctx.crypto,
        "macro":         ctx.macro,
        "summary_text":  ctx.summary_text,
    }


@router.get("/history/{symbol}", response_model=list[OHLCVBar])
def history_endpoint(
    symbol: str,
    period:   str = Query("1y",  description="yfinance period: 1d 5d 1mo 3mo 6mo 1y 2y 5y ytd max"),
    interval: str = Query("1d",  description="bar size: 1d 1wk 1mo — use 1h only for period ≤ 2y"),
):
    """
    OHLCV bars for any Yahoo Finance ticker — stocks, ETFs, indices, crypto.

    Useful period/interval combinations:
      - Intraday chart:  period=1d,  interval=5m
      - 3-month daily:   period=3mo, interval=1d
      - 5-year weekly:   period=5y,  interval=1wk
    """
    bars = get_historical_ohlcv(symbol.upper(), period, interval)
    if not bars:
        raise HTTPException(
            status_code=404,
            detail=f"No data returned for '{symbol}' with period='{period}' interval='{interval}'",
        )
    return bars


@router.delete("/cache", status_code=200)
def clear_cache_endpoint(prefix: str = Query("", description="Key prefix to clear; empty = clear all")):
    """
    Invalidate cached market data so the next request re-fetches live data.
    Use prefix='macro:' to target only macro indicators, etc.
    """
    count = invalidate_cache(prefix)
    return {"cleared": count, "prefix": prefix or "(all)"}
