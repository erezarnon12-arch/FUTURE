"""Initial schema — all tables

Revision ID: 0001
Revises:
Create Date: 2026-01-01
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "clients",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("age", sa.Integer, nullable=False),
        sa.Column("monthly_income", sa.Float, nullable=False),
        sa.Column("monthly_expenses", sa.Float, nullable=False),
        sa.Column("risk_tolerance", sa.String(20), nullable=False, server_default="medium"),
        sa.Column("retirement_age", sa.Integer, nullable=False, server_default="67"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.text("now()")),
    )
    op.create_table(
        "assets",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("client_id", sa.Integer, sa.ForeignKey("clients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("ring", sa.String(20), nullable=False),
        sa.Column("asset_type", sa.String(40), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("provider", sa.String(255)),
        sa.Column("balance", sa.Float, nullable=False, server_default="0"),
        sa.Column("monthly_deposit", sa.Float, server_default="0"),
        sa.Column("investment_track", sa.String(255)),
        sa.Column("management_fees", sa.Float, server_default="0"),
        sa.Column("historical_return", sa.Float, server_default="0"),
        sa.Column("risk_level", sa.String(20), nullable=False),
        sa.Column("liquidity_level", sa.String(20), nullable=False),
        sa.Column("currency", sa.String(10), server_default="ILS"),
        sa.Column("notes", sa.Text),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
    )
    op.create_table(
        "liabilities",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("client_id", sa.Integer, sa.ForeignKey("clients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("liability_type", sa.String(20), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("lender", sa.String(255)),
        sa.Column("original_amount", sa.Float, nullable=False),
        sa.Column("remaining_balance", sa.Float, nullable=False),
        sa.Column("interest_rate", sa.Float, nullable=False),
        sa.Column("monthly_payment", sa.Float, nullable=False),
        sa.Column("remaining_months", sa.Integer),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
    )
    op.create_table(
        "investment_theses",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("client_id", sa.Integer, sa.ForeignKey("clients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("macro_environment", sa.Text),
        sa.Column("sectors", sa.Text),
        sa.Column("advantages", sa.Text),
        sa.Column("risks", sa.Text),
        sa.Column("historical_examples", sa.Text),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
    )
    op.create_table(
        "ai_analyses",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("client_id", sa.Integer, sa.ForeignKey("clients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("analysis_type", sa.String(100)),
        sa.Column("ring", sa.String(20)),
        sa.Column("summary", sa.Text),
        sa.Column("findings", sa.Text),
        sa.Column("recommendations", sa.Text),
        sa.Column("score", sa.Float),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_table(
        "net_worth_snapshots",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("client_id", sa.Integer, sa.ForeignKey("clients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("total_assets", sa.Float, nullable=False),
        sa.Column("total_liabilities", sa.Float, nullable=False),
        sa.Column("net_worth", sa.Float, nullable=False),
        sa.Column("retirement_balance", sa.Float, server_default="0"),
        sa.Column("security_balance", sa.Float, server_default="0"),
        sa.Column("growth_balance", sa.Float, server_default="0"),
        sa.Column("notes", sa.String(500)),
        sa.Column("snapshot_date", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_table(
        "goals",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("client_id", sa.Integer, sa.ForeignKey("clients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("goal_type", sa.String(30), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("target_amount", sa.Float, nullable=False),
        sa.Column("current_amount", sa.Float, server_default="0"),
        sa.Column("target_date", sa.DateTime(timezone=True)),
        sa.Column("monthly_contribution", sa.Float, server_default="0"),
        sa.Column("status", sa.String(20), server_default="active"),
        sa.Column("ring", sa.String(20)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
    )
    op.create_table(
        "chat_messages",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("client_id", sa.Integer, sa.ForeignKey("clients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )

    # Indexes
    op.create_index("ix_assets_client_ring", "assets", ["client_id", "ring"])
    op.create_index("ix_liabilities_client", "liabilities", ["client_id"])
    op.create_index("ix_goals_client_status", "goals", ["client_id", "status"])
    op.create_index("ix_chat_client_date", "chat_messages", ["client_id", "created_at"])
    op.create_index("ix_snapshots_client_date", "net_worth_snapshots", ["client_id", "snapshot_date"])


def downgrade() -> None:
    for table in [
        "chat_messages", "goals", "net_worth_snapshots",
        "ai_analyses", "investment_theses",
        "liabilities", "assets", "clients",
    ]:
        op.drop_table(table)
