"""
AI Analysis — financial health scoring and investment thesis evaluation.

Functions:
    run_ai_analysis          — full portfolio health score via Claude (falls back
                               to rule-based analysis when no API key is set)
    analyze_investment_thesis — evaluates a specific investment thesis via Claude
"""

from __future__ import annotations

import json
from typing import Optional

from ai.client import MODEL, api_key_valid, get_sync_client
from services.portfolio import FinancialSummary


# ── System prompt ─────────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """You are FUTURE, an expert AI financial advisor specializing in personal financial planning.
You analyze portfolios across three financial rings:
1. RETIREMENT RING — long-term pension assets (pension funds, IRA, study funds)
2. SECURITY RING   — financial safety net (money market, bank deposits, liquid instruments)
3. GROWTH RING     — high-risk growth investments (stocks, ETFs, crypto)

Your analysis must be:
- Precise and data-driven
- Written in plain language (avoid jargon)
- Actionable — always include specific next steps
- Structured with clear sections

Always respond in JSON with this exact schema:
{
  "summary": "1-2 sentence executive summary",
  "financial_health_score": <integer 0-100>,
  "findings": [
    {"category": "string", "severity": "critical|warning|info|positive", "message": "string"}
  ],
  "recommendations": [
    {"priority": 1, "action": "string", "rationale": "string", "impact": "string"}
  ],
  "ring_analysis": {
    "retirement": {"assessment": "string", "score": <0-100>},
    "security":   {"assessment": "string", "score": <0-100>},
    "growth":     {"assessment": "string", "score": <0-100>}
  }
}"""


def _build_prompt(summary: FinancialSummary, allocation_pct: dict) -> str:
    rings_text = ""
    for ring_name, metrics in summary.rings.items():
        rings_text += (
            f"\n  {ring_name.upper()} RING:"
            f"\n    Balance: {metrics.total_balance:,.0f} ILS ({allocation_pct.get(ring_name, 0):.1f}% of portfolio)"
            f"\n    Monthly deposits: {metrics.total_monthly_deposit:,.0f} ILS"
            f"\n    Avg management fee: {metrics.avg_management_fee:.2f}%"
            f"\n    Avg historical return: {metrics.avg_historical_return:.2f}%"
            f"\n    Number of assets: {metrics.asset_count}\n"
        )

    flags_text = "\n".join(f"  - {f}" for f in summary.flags) if summary.flags else "  None detected"

    return (
        f"Analyze the financial profile below and provide insights.\n\n"
        f"CLIENT PROFILE:\n"
        f"  Name: {summary.client_name}\n"
        f"  Age: {summary.age}\n"
        f"  Net Worth: {summary.net_worth:,.0f} ILS\n"
        f"  Total Assets: {summary.total_assets:,.0f} ILS\n"
        f"  Total Liabilities: {summary.total_liabilities:,.0f} ILS\n"
        f"  Monthly Surplus: {summary.monthly_surplus:,.0f} ILS\n"
        f"  Safety Cushion: {summary.safety_months} months ({summary.safety_status})\n\n"
        f"PORTFOLIO RINGS:\n{rings_text}\n"
        f"PRE-DETECTED FLAGS:\n{flags_text}\n\n"
        f"Provide a comprehensive financial analysis following the JSON schema specified."
    )


# ── Public interface ──────────────────────────────────────────────────────────

def run_ai_analysis(summary: FinancialSummary, allocation_pct: dict) -> dict:
    """
    Run a full portfolio analysis via Claude.
    Falls back to rule-based scoring when the API key is not configured.
    """
    if not api_key_valid():
        return _rule_based_fallback(summary, allocation_pct)

    prompt = _build_prompt(summary, allocation_pct)

    try:
        message = get_sync_client().messages.create(
            model=MODEL,
            max_tokens=2048,
            system=_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = message.content[0].text.strip()

        # Strip markdown code fences if the model wraps its JSON
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]

        return json.loads(raw)

    except Exception as e:
        print(f"[ai.analysis] error: {e}")
        return _rule_based_fallback(summary, allocation_pct)


def analyze_investment_thesis(
    thesis: dict,
    market_context: Optional[str] = None,
) -> dict:
    """Evaluate a specific investment thesis via Claude."""
    if not api_key_valid():
        return {
            "analysis": "AI analysis requires an API key. Please configure ANTHROPIC_API_KEY.",
            "conviction_score": 50,
        }

    prompt = (
        f"Analyze this investment thesis:\n\n"
        f"Title: {thesis.get('title')}\n"
        f"Macro Environment: {thesis.get('macro_environment')}\n"
        f"Sectors: {thesis.get('sectors')}\n"
        f"Advantages: {thesis.get('advantages')}\n"
        f"Risks: {thesis.get('risks')}\n"
        f"Historical Examples: {thesis.get('historical_examples')}\n"
        + (f"Market Context: {market_context}\n" if market_context else "")
        + "\nProvide a JSON response with:\n"
          "{\n"
          '  "conviction_score": <0-100>,\n'
          '  "time_horizon": "string",\n'
          '  "key_drivers": ["string"],\n'
          '  "key_risks": ["string"],\n'
          '  "suggested_allocation": "string",\n'
          '  "analysis": "2-3 paragraph analysis"\n'
          "}"
    )

    try:
        message = get_sync_client().messages.create(
            model=MODEL,
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = message.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return json.loads(raw)
    except Exception as e:
        return {"analysis": str(e), "conviction_score": 50}


# ── Rule-based fallback ───────────────────────────────────────────────────────

def _rule_based_fallback(summary: FinancialSummary, allocation_pct: dict) -> dict:
    """Heuristic scoring when no API key is configured."""
    score = 70
    findings:        list = []
    recommendations: list = []

    # Safety ring
    if summary.safety_months < 3:
        score -= 20
        findings.append({
            "category": "Security Ring", "severity": "critical",
            "message": f"Emergency fund covers only {summary.safety_months:.1f} months. Immediate action required.",
        })
        recommendations.append({
            "priority": 1, "action": "Build emergency fund to 6 months of expenses",
            "rationale": "Financial security requires a buffer against unexpected events.",
            "impact": "Eliminates the need to liquidate investments during emergencies.",
        })
    elif summary.safety_months < 6:
        score -= 10
        findings.append({
            "category": "Security Ring", "severity": "warning",
            "message": f"Emergency fund covers {summary.safety_months:.1f} months. Target is 6–12 months.",
        })
    else:
        findings.append({
            "category": "Security Ring", "severity": "positive",
            "message": f"Emergency fund covers {summary.safety_months:.1f} months. Well-funded.",
        })

    # Retirement ring
    ret_pct = allocation_pct.get("retirement", 0)
    if ret_pct == 0:
        score -= 15
        findings.append({
            "category": "Retirement Ring", "severity": "critical",
            "message": "No retirement assets detected.",
        })
        recommendations.append({
            "priority": 2, "action": "Open a pension fund or IRA immediately",
            "rationale": "Compound growth over decades is the most powerful wealth-building tool.",
            "impact": "Starting today at 30 vs 40 can double retirement wealth.",
        })
    elif ret_pct < 30:
        findings.append({
            "category": "Retirement Ring", "severity": "warning",
            "message": f"Retirement assets are only {ret_pct:.0f}% of portfolio.",
        })
    else:
        score += 5
        findings.append({
            "category": "Retirement Ring", "severity": "positive",
            "message": f"Retirement allocation at {ret_pct:.0f}% looks healthy.",
        })

    # Growth ring
    growth_pct = allocation_pct.get("growth", 0)
    if growth_pct < 10 and summary.age < 45:
        findings.append({
            "category": "Growth Ring", "severity": "info",
            "message": f"Growth ring is {growth_pct:.0f}%. Consider increasing for long-term wealth building.",
        })

    # Net worth
    if summary.net_worth < 0:
        score -= 15
        findings.append({
            "category": "Balance Sheet", "severity": "critical",
            "message": f"Negative net worth: {summary.net_worth:,.0f} ILS. Liabilities exceed assets.",
        })
    else:
        findings.append({
            "category": "Balance Sheet", "severity": "positive",
            "message": f"Positive net worth of {summary.net_worth:,.0f} ILS.",
        })

    # Cash flow
    if summary.monthly_surplus < 0:
        score -= 10
        findings.append({
            "category": "Cash Flow", "severity": "critical",
            "message": "Monthly expenses exceed income. Immediate budget review required.",
        })
        recommendations.append({
            "priority": 1, "action": "Create a budget to eliminate monthly deficit",
            "rationale": "Negative cash flow erodes savings and leads to increased debt.",
            "impact": "Stopping the debt spiral is the highest-priority financial action.",
        })

    for flag in summary.flags:
        findings.append({"category": "Portfolio Flags", "severity": "warning", "message": flag})

    score = max(0, min(100, score))

    ring_scores = {
        ring_name: {
            "assessment": (
                f"Balance: {summary.rings[ring_name].total_balance:,.0f} ILS | "
                f"{allocation_pct.get(ring_name, 0):.1f}% of total portfolio"
            ),
            "score": min(100, max(0, 50 + int(allocation_pct.get(ring_name, 0)))),
        }
        for ring_name in ("retirement", "security", "growth")
    }

    return {
        "summary": (
            f"{summary.client_name}'s portfolio has a financial health score of {score}/100. "
            f"Net worth stands at {summary.net_worth:,.0f} ILS with {len(findings)} key findings."
        ),
        "financial_health_score": score,
        "findings":               findings,
        "recommendations":        recommendations or [{
            "priority": 1,
            "action":   "Maintain current financial strategy",
            "rationale": "Your portfolio shows a solid foundation.",
            "impact":   "Continued discipline will compound wealth over time.",
        }],
        "ring_analysis": ring_scores,
    }
