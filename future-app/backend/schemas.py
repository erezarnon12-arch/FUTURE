"""
Pydantic schemas — request bodies and response models.

Naming convention:
  XxxCreate  — POST body (no id, no timestamps)
  XxxUpdate  — PUT body  (full replacement, all fields required)
  XxxPatch   — PATCH body (partial update, all fields Optional)
  XxxOut     — response model (includes id + timestamps)
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator

from models import (
    RingType, RiskLevel, LiquidityLevel, AssetType,
    LiabilityType, GoalType, GoalStatus,
)


# ── Clients ───────────────────────────────────────────────────────────────────

class ClientCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    age: int  = Field(..., ge=18, le=100)
    monthly_income: float   = Field(..., ge=0)
    monthly_expenses: float = Field(..., ge=0)
    risk_tolerance: RiskLevel   = RiskLevel.MEDIUM
    retirement_age: int = Field(67, ge=50, le=80)


class ClientPatch(BaseModel):
    name: Optional[str]             = None
    age: Optional[int]              = Field(None, ge=18, le=100)
    monthly_income: Optional[float] = Field(None, ge=0)
    monthly_expenses: Optional[float] = Field(None, ge=0)
    risk_tolerance: Optional[RiskLevel] = None
    retirement_age: Optional[int]   = Field(None, ge=50, le=80)


class ClientOut(BaseModel):
    id: int
    name: str
    age: int
    monthly_income: float
    monthly_expenses: float
    risk_tolerance: RiskLevel
    retirement_age: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Assets ────────────────────────────────────────────────────────────────────

class AssetCreate(BaseModel):
    ring: RingType
    asset_type: AssetType
    name: str = Field(..., min_length=1, max_length=255)
    provider: Optional[str] = None
    balance: float = Field(0.0, ge=0)
    monthly_deposit: Optional[float] = Field(0.0, ge=0)
    investment_track: Optional[str] = None
    management_fees: Optional[float] = Field(0.0, ge=0, le=10)
    historical_return: Optional[float] = Field(0.0, ge=-100, le=100)
    risk_level: RiskLevel
    liquidity_level: LiquidityLevel
    currency: Optional[str] = "ILS"
    notes: Optional[str] = None


class AssetPatch(BaseModel):
    ring: Optional[RingType]          = None
    asset_type: Optional[AssetType]   = None
    name: Optional[str]               = None
    provider: Optional[str]           = None
    balance: Optional[float]          = Field(None, ge=0)
    monthly_deposit: Optional[float]  = Field(None, ge=0)
    investment_track: Optional[str]   = None
    management_fees: Optional[float]  = Field(None, ge=0, le=10)
    historical_return: Optional[float]= Field(None, ge=-100, le=100)
    risk_level: Optional[RiskLevel]   = None
    liquidity_level: Optional[LiquidityLevel] = None
    currency: Optional[str]           = None
    notes: Optional[str]              = None


class AssetOut(BaseModel):
    id: int
    client_id: int
    ring: RingType
    asset_type: AssetType
    name: str
    provider: Optional[str]
    balance: float
    monthly_deposit: Optional[float]
    investment_track: Optional[str]
    management_fees: Optional[float]
    historical_return: Optional[float]
    risk_level: RiskLevel
    liquidity_level: LiquidityLevel
    currency: Optional[str]
    notes: Optional[str]
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Liabilities ───────────────────────────────────────────────────────────────

class LiabilityCreate(BaseModel):
    liability_type: LiabilityType
    name: str = Field(..., min_length=1, max_length=255)
    lender: Optional[str] = None
    original_amount: float   = Field(..., gt=0)
    remaining_balance: float = Field(..., ge=0)
    interest_rate: float     = Field(..., ge=0, le=100)
    monthly_payment: float   = Field(..., gt=0)
    remaining_months: Optional[int] = Field(None, ge=0)


class LiabilityPatch(BaseModel):
    liability_type: Optional[LiabilityType] = None
    name: Optional[str]                     = None
    lender: Optional[str]                   = None
    original_amount: Optional[float]        = Field(None, gt=0)
    remaining_balance: Optional[float]      = Field(None, ge=0)
    interest_rate: Optional[float]          = Field(None, ge=0, le=100)
    monthly_payment: Optional[float]        = Field(None, gt=0)
    remaining_months: Optional[int]         = Field(None, ge=0)


class LiabilityOut(BaseModel):
    id: int
    client_id: int
    liability_type: LiabilityType
    name: str
    lender: Optional[str]
    original_amount: float
    remaining_balance: float
    interest_rate: float
    monthly_payment: float
    remaining_months: Optional[int]
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Investment Theses ─────────────────────────────────────────────────────────

class ThesisCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    macro_environment: Optional[str] = None
    sectors: Optional[str]           = None
    advantages: Optional[str]        = None
    risks: Optional[str]             = None
    historical_examples: Optional[str] = None
    is_active: bool = True


class ThesisPatch(BaseModel):
    title: Optional[str]              = None
    macro_environment: Optional[str]  = None
    sectors: Optional[str]            = None
    advantages: Optional[str]         = None
    risks: Optional[str]              = None
    historical_examples: Optional[str]= None
    is_active: Optional[bool]         = None


class ThesisOut(BaseModel):
    id: int
    client_id: int
    title: str
    macro_environment: Optional[str]
    sectors: Optional[str]
    advantages: Optional[str]
    risks: Optional[str]
    historical_examples: Optional[str]
    is_active: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Goals ─────────────────────────────────────────────────────────────────────

class GoalCreate(BaseModel):
    goal_type: GoalType
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str]           = None
    target_amount: float                  = Field(..., gt=0)
    current_amount: float                 = Field(0.0, ge=0)
    target_date: Optional[datetime]       = None
    monthly_contribution: float           = Field(0.0, ge=0)
    status: GoalStatus                    = GoalStatus.ACTIVE
    ring: Optional[RingType]              = None


class GoalPatch(BaseModel):
    goal_type: Optional[GoalType]         = None
    title: Optional[str]                  = None
    description: Optional[str]           = None
    target_amount: Optional[float]        = Field(None, gt=0)
    current_amount: Optional[float]       = Field(None, ge=0)
    target_date: Optional[datetime]       = None
    monthly_contribution: Optional[float] = Field(None, ge=0)
    status: Optional[GoalStatus]          = None
    ring: Optional[RingType]              = None


class GoalOut(BaseModel):
    id: int
    client_id: int
    goal_type: GoalType
    title: str
    description: Optional[str]
    target_amount: float
    current_amount: float
    target_date: Optional[datetime]
    monthly_contribution: float
    status: GoalStatus
    ring: Optional[RingType]
    progress_pct: float = 0.0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

    @classmethod
    def from_orm_with_progress(cls, obj: Any) -> "GoalOut":
        data = cls.model_validate(obj)
        if obj.target_amount > 0:
            data.progress_pct = round(min(100, obj.current_amount / obj.target_amount * 100), 1)
        return data


# ── Net Worth Snapshots ───────────────────────────────────────────────────────

class SnapshotCreate(BaseModel):
    notes: Optional[str] = Field(None, max_length=500)


class SnapshotOut(BaseModel):
    id: int
    client_id: int
    total_assets: float
    total_liabilities: float
    net_worth: float
    retirement_balance: float
    security_balance: float
    growth_balance: float
    notes: Optional[str]
    snapshot_date: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Chat ──────────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    include_history: bool = True


class ChatMessageOut(BaseModel):
    id: int
    client_id: int
    role: str
    content: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ChatResponse(BaseModel):
    response: str
    role: str = "assistant"


# ── AI Analysis ───────────────────────────────────────────────────────────────

class AnalysisOut(BaseModel):
    id: int
    analysis_type: str
    summary: str
    findings: List[Dict[str, Any]]
    recommendations: List[Dict[str, Any]]
    score: Optional[float]
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Bulk operations ───────────────────────────────────────────────────────────

class BulkAssetCreate(BaseModel):
    assets: List[AssetCreate] = Field(..., min_length=1, max_length=50)


class BulkAssetOut(BaseModel):
    created: int
    assets: List[AssetOut]
