from sqlalchemy import Column, Integer, String, Float, Enum, ForeignKey, DateTime, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from database import Base


# ── Enumerations ──────────────────────────────────────────────────────────────

class RingType(str, enum.Enum):
    RETIREMENT = "retirement"
    SECURITY = "security"
    GROWTH = "growth"


class RiskLevel(str, enum.Enum):
    VERY_LOW = "very_low"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    VERY_HIGH = "very_high"


class LiquidityLevel(str, enum.Enum):
    IMMEDIATE = "immediate"
    SHORT_TERM = "short_term"
    MEDIUM_TERM = "medium_term"
    LONG_TERM = "long_term"
    ILLIQUID = "illiquid"


class AssetType(str, enum.Enum):
    # Retirement
    PENSION_FUND = "pension_fund"
    PENSION_INSURANCE = "pension_insurance"
    IRA = "ira"
    STUDY_FUND = "study_fund"
    PROVIDENT_FUND = "provident_fund"
    # Security
    MONEY_MARKET = "money_market"
    BANK_DEPOSIT = "bank_deposit"
    GOVERNMENT_BOND = "government_bond"
    LIQUID_ETF = "liquid_etf"
    # Growth
    STOCK = "stock"
    ETF = "etf"
    CRYPTO = "crypto"
    HIGH_RISK_PROVIDENT = "high_risk_provident"
    STOCK_PORTFOLIO = "stock_portfolio"


class LiabilityType(str, enum.Enum):
    LOAN = "loan"
    MORTGAGE = "mortgage"
    CREDIT_LINE = "credit_line"
    OTHER = "other"


class GoalStatus(str, enum.Enum):
    ACTIVE = "active"
    ACHIEVED = "achieved"
    CANCELLED = "cancelled"


class GoalType(str, enum.Enum):
    EMERGENCY_FUND = "emergency_fund"
    RETIREMENT_TARGET = "retirement_target"
    DEBT_PAYOFF = "debt_payoff"
    SAVINGS_TARGET = "savings_target"
    EDUCATION_FUND = "education_fund"
    HOME_PURCHASE = "home_purchase"
    CUSTOM = "custom"


# ── Core Models ───────────────────────────────────────────────────────────────

class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    age = Column(Integer, nullable=False)
    monthly_income = Column(Float, nullable=False)
    monthly_expenses = Column(Float, nullable=False)
    risk_tolerance = Column(Enum(RiskLevel), nullable=False, default=RiskLevel.MEDIUM)
    retirement_age = Column(Integer, nullable=False, default=67)
    is_demo = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    assets = relationship("Asset", back_populates="client", cascade="all, delete-orphan")
    liabilities = relationship("Liability", back_populates="client", cascade="all, delete-orphan")
    analyses = relationship("AIAnalysis", back_populates="client", cascade="all, delete-orphan")
    snapshots = relationship("NetWorthSnapshot", back_populates="client", cascade="all, delete-orphan")
    goals = relationship("Goal", back_populates="client", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessage", back_populates="client", cascade="all, delete-orphan")


class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    ring = Column(Enum(RingType), nullable=False)
    asset_type = Column(Enum(AssetType), nullable=False)
    name = Column(String(255), nullable=False)
    provider = Column(String(255))
    balance = Column(Float, nullable=False, default=0.0)
    monthly_deposit = Column(Float, default=0.0)
    investment_track = Column(String(255))
    management_fees = Column(Float, default=0.0)    # annual %
    historical_return = Column(Float, default=0.0)  # annual %
    risk_level = Column(Enum(RiskLevel), nullable=False)
    liquidity_level = Column(Enum(LiquidityLevel), nullable=False)
    currency = Column(String(10), default="ILS")
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    client = relationship("Client", back_populates="assets")


class Liability(Base):
    __tablename__ = "liabilities"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    liability_type = Column(Enum(LiabilityType), nullable=False)
    name = Column(String(255), nullable=False)
    lender = Column(String(255))
    original_amount = Column(Float, nullable=False)
    remaining_balance = Column(Float, nullable=False)
    interest_rate = Column(Float, nullable=False)   # annual %
    monthly_payment = Column(Float, nullable=False)
    remaining_months = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    client = relationship("Client", back_populates="liabilities")


class InvestmentThesis(Base):
    __tablename__ = "investment_theses"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    title = Column(String(255), nullable=False)
    macro_environment = Column(Text)
    sectors = Column(Text)           # comma-separated
    advantages = Column(Text)
    risks = Column(Text)
    historical_examples = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class AIAnalysis(Base):
    __tablename__ = "ai_analyses"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    analysis_type = Column(String(100))   # "full" | "ring" | "debt" | "rebalance"
    ring = Column(Enum(RingType), nullable=True)
    summary = Column(Text)
    findings = Column(Text)           # JSON
    recommendations = Column(Text)    # JSON
    score = Column(Float)             # 0–100 financial health score
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    client = relationship("Client", back_populates="analyses")


# ── New Models ────────────────────────────────────────────────────────────────

class NetWorthSnapshot(Base):
    """Periodic snapshots — captured manually or on schedule — for historical charting."""
    __tablename__ = "net_worth_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    total_assets = Column(Float, nullable=False)
    total_liabilities = Column(Float, nullable=False)
    net_worth = Column(Float, nullable=False)
    retirement_balance = Column(Float, default=0.0)
    security_balance = Column(Float, default=0.0)
    growth_balance = Column(Float, default=0.0)
    notes = Column(String(500))
    snapshot_date = Column(DateTime(timezone=True), server_default=func.now())

    client = relationship("Client", back_populates="snapshots")


class Goal(Base):
    """Financial goals tracked against actual portfolio values."""
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    goal_type = Column(Enum(GoalType), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    target_amount = Column(Float, nullable=False)
    current_amount = Column(Float, default=0.0)
    target_date = Column(DateTime(timezone=True), nullable=True)
    monthly_contribution = Column(Float, default=0.0)
    status = Column(Enum(GoalStatus), default=GoalStatus.ACTIVE)
    ring = Column(Enum(RingType), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    client = relationship("Client", back_populates="goals")


class ChatMessage(Base):
    """Persisted AI chat history per client."""
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    role = Column(String(20), nullable=False)   # "user" | "assistant"
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    client = relationship("Client", back_populates="chat_messages")
