"""
AI Chat — multi-turn conversational financial advisor.

Supports:
  • Stateful conversation history persisted in the database
  • Full portfolio context injected as system message on every call
  • Streaming responses via Server-Sent Events (async, non-blocking)
  • Non-streaming JSON responses for simpler consumers
  • Rule-based offline fallback when no API key is configured
"""

from __future__ import annotations

import json
from typing import AsyncIterator, List

from sqlalchemy.orm import Session

from models import Asset, ChatMessage, Client, Liability
from services.portfolio import (
    compute_allocation_pct,
    compute_rebalancing,
    compute_summary,
)
from simulations.retirement import compute_retirement_readiness
from ai.client import MODEL, api_key_valid, get_async_client, get_sync_client


# ── System prompt builder ─────────────────────────────────────────────────────

def _build_system_prompt(
    client: Client,
    assets: List[Asset],
    liabilities: List[Liability],
) -> str:
    summary    = compute_summary(client, assets, liabilities)
    allocation = compute_allocation_pct(summary.rings)
    readiness  = compute_retirement_readiness(client, assets)
    rebalance  = compute_rebalancing(client, assets)

    rings_text = ""
    for ring_name, metrics in summary.rings.items():
        rings_text += (
            f"\n  {ring_name.upper()} RING:"
            f"\n    Balance: ₪{metrics.total_balance:,.0f} ({allocation.get(ring_name, 0):.1f}%)"
            f"\n    Monthly deposits: ₪{metrics.total_monthly_deposit:,.0f}"
            f"\n    Avg management fee: {metrics.avg_management_fee:.2f}%"
            f"\n    Avg historical return: {metrics.avg_historical_return:.1f}%"
            f"\n    Assets: {metrics.asset_count}"
        )
        for a in metrics.assets:
            rings_text += (
                f"\n      • {a['name']} ({a['asset_type']}) — "
                f"₪{a['balance']:,.0f} @ {a['management_fees']:.2f}% fee"
            )

    liabilities_text = "\n  None" if not liabilities else ""
    for l in liabilities:
        liabilities_text += (
            f"\n  • {l.name}: ₪{l.remaining_balance:,.0f} remaining @ {l.interest_rate}% APR, "
            f"₪{l.monthly_payment:,.0f}/month"
        )

    flags_text = (
        "\n".join(f"  ⚠ {f}" for f in summary.flags) if summary.flags else "  None"
    )

    rebalance_text = ""
    for item in rebalance["items"]:
        if item["action"] != "hold":
            rebalance_text += (
                f"\n  • {item['ring'].capitalize()}: {item['action']} by ₪{abs(item['delta']):,.0f} "
                f"(currently {item['current_pct']}%, target {item['target_pct']}%)"
            )
    if not rebalance_text:
        rebalance_text = "\n  Portfolio is within target allocation ranges."

    return (
        f"You are FUTURE, a personalised AI financial advisor.\n"
        f"You have full access to your client's financial data and must give concrete, data-driven advice.\n\n"
        f"IMPORTANT RULES:\n"
        f"- Always refer to specific numbers from the client's portfolio\n"
        f"- Be direct and actionable — no vague platitudes\n"
        f"- Flag risks clearly\n"
        f"- When recommending changes, explain the expected monetary impact\n"
        f"- Currency is Israeli Shekel (ILS / ₪)\n"
        f"- Keep responses concise unless the user asks for detail\n\n"
        f"{'═' * 47}\n"
        f"CLIENT PROFILE\n"
        f"{'═' * 47}\n"
        f"Name:             {client.name}\n"
        f"Age:              {client.age}\n"
        f"Monthly Income:   ₪{client.monthly_income:,.0f}\n"
        f"Monthly Expenses: ₪{client.monthly_expenses:,.0f}\n"
        f"Monthly Surplus:  ₪{summary.monthly_surplus:,.0f}\n"
        f"Risk Tolerance:   {client.risk_tolerance.value}\n"
        f"Retirement Age:   {client.retirement_age}\n"
        f"Net Worth:        ₪{summary.net_worth:,.0f}\n"
        f"Safety Cushion:   {summary.safety_months} months ({summary.safety_status})\n\n"
        f"RETIREMENT READINESS\n"
        f"  Status:               {readiness['status'].replace('_', ' ').title()}\n"
        f"  Target nest egg:      ₪{readiness['target_nest_egg']:,.0f}\n"
        f"  Projected at retire:  ₪{readiness['projected_at_retirement']:,.0f}\n"
        f"  Readiness:            {readiness['readiness_pct']}%\n"
        f"  Extra needed/month:   ₪{readiness['additional_monthly_needed']:,.0f}\n\n"
        f"PORTFOLIO RINGS\n{rings_text}\n\n"
        f"LIABILITIES\n{liabilities_text}\n\n"
        f"ACTIVE ALERTS\n{flags_text}\n\n"
        f"REBALANCING NEEDED\n{rebalance_text}\n"
        f"{'═' * 47}\n"
    )


# ── History helpers ───────────────────────────────────────────────────────────

def get_history(db: Session, client_id: int, limit: int = 20) -> List[dict]:
    """Fetch recent chat history ordered oldest-first."""
    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.client_id == client_id)
        .order_by(ChatMessage.created_at.desc())
        .limit(limit)
        .all()
    )
    return [{"role": m.role, "content": m.content} for m in reversed(messages)]


def save_message(db: Session, client_id: int, role: str, content: str) -> None:
    db.add(ChatMessage(client_id=client_id, role=role, content=content))
    db.commit()


def clear_history(db: Session, client_id: int) -> int:
    deleted = db.query(ChatMessage).filter(ChatMessage.client_id == client_id).delete()
    db.commit()
    return deleted


# ── Non-streaming chat ────────────────────────────────────────────────────────

def chat(
    db: Session,
    client: Client,
    assets: List[Asset],
    liabilities: List[Liability],
    user_message: str,
    include_history: bool = True,
) -> str:
    """Send a message and return the full assistant response as a string."""
    if not api_key_valid():
        return _offline_response(user_message, client, assets, liabilities)

    system   = _build_system_prompt(client, assets, liabilities)
    history  = get_history(db, client.id) if include_history else []
    messages = history + [{"role": "user", "content": user_message}]

    save_message(db, client.id, "user", user_message)

    try:
        response = get_sync_client().messages.create(
            model=MODEL,
            max_tokens=1024,
            system=system,
            messages=messages,
        )
        assistant_text = response.content[0].text
        save_message(db, client.id, "assistant", assistant_text)
        return assistant_text

    except Exception as e:
        error_msg = f"AI service unavailable: {str(e)}"
        save_message(db, client.id, "assistant", error_msg)
        return error_msg


# ── Streaming chat (SSE) ──────────────────────────────────────────────────────

async def chat_stream(
    db: Session,
    client: Client,
    assets: List[Asset],
    liabilities: List[Liability],
    user_message: str,
    include_history: bool = True,
) -> AsyncIterator[str]:
    """
    Async generator that yields SSE-formatted chunks.
    Each chunk:    data: <json>\\n\\n
    Final chunk:   data: [DONE]\\n\\n
    """
    if not api_key_valid():
        offline = _offline_response(user_message, client, assets, liabilities)
        save_message(db, client.id, "user", user_message)
        save_message(db, client.id, "assistant", offline)
        yield f"data: {json.dumps({'text': offline})}\n\n"
        yield "data: [DONE]\n\n"
        return

    system   = _build_system_prompt(client, assets, liabilities)
    history  = get_history(db, client.id) if include_history else []
    messages = history + [{"role": "user", "content": user_message}]

    save_message(db, client.id, "user", user_message)
    full_response = ""

    try:
        async with get_async_client().messages.stream(
            model=MODEL,
            max_tokens=1024,
            system=system,
            messages=messages,
        ) as stream:
            async for text_chunk in stream.text_stream:
                full_response += text_chunk
                yield f"data: {json.dumps({'text': text_chunk})}\n\n"

        save_message(db, client.id, "assistant", full_response)

    except Exception as e:
        yield f"data: {json.dumps({'text': f'[Error: {e}]', 'error': True})}\n\n"

    yield "data: [DONE]\n\n"


# ── Offline fallback ──────────────────────────────────────────────────────────

def _offline_response(
    user_message: str,
    client: Client,
    assets: List[Asset],
    liabilities: List[Liability],
) -> str:
    """Rule-based responses when no API key is configured."""
    msg     = user_message.lower()
    summary = compute_summary(client, assets, liabilities)

    if any(w in msg for w in ("pension", "retirement", "retire")):
        readiness = compute_retirement_readiness(client, assets)
        return (
            f"**Retirement Overview for {client.name}**\n\n"
            f"Status: **{readiness['status'].replace('_', ' ').title()}**\n"
            f"- Projected at retirement: ₪{readiness['projected_at_retirement']:,.0f}\n"
            f"- Target nest egg (25× expenses): ₪{readiness['target_nest_egg']:,.0f}\n"
            f"- Readiness: {readiness['readiness_pct']}%\n\n"
            f"{readiness['summary']}\n\n"
            f"*Configure ANTHROPIC_API_KEY for deeper AI-powered analysis.*"
        )

    if any(w in msg for w in ("fee", "fees", "cost", "expensive")):
        from services.portfolio import compute_fee_drag
        drag = compute_fee_drag(assets)
        if drag["items"]:
            top = drag["items"][0]
            return (
                f"**Fee Analysis**\n\n"
                f"{drag['summary']}\n\n"
                f"Top cost: **{top['asset_name']}** (fee: {top['fee_pct']}%) — "
                f"drag over 30 years: ₪{top['drag']:,.0f}\n\n"
                f"*Configure ANTHROPIC_API_KEY for full AI analysis.*"
            )
        return "All assets have fees at or below the baseline. Good job!"

    if any(w in msg for w in ("debt", "loan", "mortgage", "borrow")):
        total_debt    = sum(l.remaining_balance for l in liabilities)
        monthly_pmts  = sum(l.monthly_payment for l in liabilities)
        return (
            f"**Liability Overview**\n\n"
            f"Total debt: ₪{total_debt:,.0f}\n"
            f"Monthly payments: ₪{monthly_pmts:,.0f}\n"
            f"Liabilities: {', '.join(l.name for l in liabilities)}\n\n"
            f"*Use the Debt Payoff tool for avalanche/snowball plans.*"
        )

    if any(w in msg for w in ("emergency", "safety", "cushion", "security")):
        sec_balance = summary.rings["security"].total_balance
        shortfall = (6 - summary.safety_months) * client.monthly_expenses
        return (
            f"**Security Ring / Emergency Fund**\n\n"
            f"Current coverage: **{summary.safety_months} months** of expenses ({summary.safety_status})\n"
            f"Target: 6–12 months\n"
            f"Security ring balance: ₪{sec_balance:,.0f}\n\n"
            + (
                f"You need ₪{shortfall:,.0f} more to reach 6 months."
                if summary.safety_months < 6
                else "Your emergency fund is well-funded. ✓"
            )
        )

    if any(w in msg for w in ("net worth", "total", "wealth", "balance")):
        return (
            f"**Portfolio Summary for {client.name}**\n\n"
            f"Net Worth: ₪{summary.net_worth:,.0f}\n"
            f"Total Assets: ₪{summary.total_assets:,.0f}\n"
            f"Total Liabilities: ₪{summary.total_liabilities:,.0f}\n"
            f"Monthly Surplus: ₪{summary.monthly_surplus:,.0f}\n\n"
            + ("\n".join(f"⚠ {f}" for f in summary.flags[:3]) if summary.flags else "No critical alerts.")
        )

    return (
        f"Hello {client.name}! I'm your FUTURE financial advisor.\n\n"
        f"You can ask me about:\n"
        f"- **Retirement** readiness and projections\n"
        f"- **Management fees** and fee drag\n"
        f"- **Debt** payoff strategies\n"
        f"- **Emergency fund** status\n"
        f"- **Net worth** and portfolio overview\n\n"
        f"*For full AI-powered analysis, configure ANTHROPIC_API_KEY.*"
    )
