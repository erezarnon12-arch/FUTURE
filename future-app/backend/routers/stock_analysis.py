"""
Stock Analysis router — exposes the stock analysis engine over HTTP.

Endpoints:
  GET  /stocks/analyze/{symbol}       — full analysis for one ticker
  POST /stocks/analyze                — batch analysis (JSON body: {"symbols": [...]})
  GET  /stocks/thesis/{symbol}        — investment thesis only (cached / AI-generated)
  GET  /stocks/sector-medians         — sector P/E, P/S, P/B, EV/EBITDA medians
  DELETE /stocks/cache                — invalidate in-process cache (admin)
"""

from __future__ import annotations

from dataclasses import asdict
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from services.stock_analysis_service import (
    analyze_stock,
    analyze_stocks,
    generate_thesis,
    get_sector_medians,
    invalidate_cache,
)

router = APIRouter(prefix="/stock-analysis", tags=["stock-analysis"])


# ── Request models ─────────────────────────────────────────────────────────────

class BatchAnalysisRequest(BaseModel):
    symbols:        list[str]
    use_ai:         bool = True
    market_context: Optional[str] = None


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/analyze/{symbol}")
def analyze_endpoint(
    symbol:         str,
    use_ai:         bool          = Query(True,  description="Generate AI thesis via Claude"),
    market_context: Optional[str] = Query(None,  description="Optional market summary injected into AI prompt"),
):
    """
    Full fundamental analysis + investment thesis for a single ticker.

    Returns FundamentalMetrics, GrowthMetrics, ValuationMetrics,
    SectorComparison, and InvestmentThesis in one payload.
    """
    result = analyze_stock(symbol.upper(), market_context=market_context, use_ai=use_ai)
    if result.error and not result.fundamentals.name:
        raise HTTPException(status_code=404, detail=result.error)
    return asdict(result)


@router.post("/analyze")
def batch_analyze_endpoint(body: BatchAnalysisRequest):
    """
    Analyze multiple tickers in parallel (up to 20).
    Results are keyed by symbol; errors are captured in the `error` field.
    """
    if not body.symbols:
        raise HTTPException(status_code=400, detail="symbols list must not be empty")
    if len(body.symbols) > 20:
        raise HTTPException(status_code=400, detail="Maximum 20 symbols per batch request")
    results = analyze_stocks(
        [s.upper() for s in body.symbols],
        market_context=body.market_context,
        use_ai=body.use_ai,
    )
    return {sym: asdict(analysis) for sym, analysis in results.items()}


@router.get("/thesis/{symbol}")
def thesis_endpoint(
    symbol:         str,
    market_context: Optional[str] = Query(None, description="Optional market context for AI"),
):
    """
    Investment thesis only (faster than full analysis when you only need the rating
    and narrative). Returns from cache if available.
    """
    thesis = generate_thesis(symbol.upper(), market_context=market_context)
    return asdict(thesis)


@router.get("/sector-medians")
def sector_medians_endpoint(sector: str = Query("Technology", description="Sector name")):
    """
    Return the reference P/E, P/S, P/B, and EV/EBITDA medians for the given sector.
    Useful for building custom relative-valuation screens on the frontend.
    """
    return {"sector": sector, "medians": get_sector_medians(sector)}


@router.delete("/cache", status_code=200)
def clear_cache_endpoint(
    symbol: Optional[str] = Query(None, description="Clear only this ticker; omit to clear all"),
):
    """Invalidate cached analysis data so the next request re-fetches live data."""
    count = invalidate_cache(symbol.upper() if symbol else None)
    return {"cleared": count, "symbol": symbol or "(all)"}
