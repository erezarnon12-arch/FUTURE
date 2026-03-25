"""
Anthropic client factory — lazy singletons shared across the ai package.

Provides:
    get_sync_client()   — synchronous client for blocking calls
    get_async_client()  — async client for non-blocking SSE streaming
    api_key_valid()     — guard before making any API call
    MODEL               — canonical model identifier for the app
"""

from __future__ import annotations

import os
from typing import Optional

import anthropic

MODEL = "claude-sonnet-4-6"

_sync_client:  Optional[anthropic.Anthropic]       = None
_async_client: Optional[anthropic.AsyncAnthropic]  = None


def get_sync_client() -> anthropic.Anthropic:
    global _sync_client
    if _sync_client is None:
        _sync_client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))
    return _sync_client


def get_async_client() -> anthropic.AsyncAnthropic:
    global _async_client
    if _async_client is None:
        _async_client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))
    return _async_client


def api_key_valid() -> bool:
    key = os.getenv("ANTHROPIC_API_KEY", "")
    return bool(key) and key != "your-api-key-here"
