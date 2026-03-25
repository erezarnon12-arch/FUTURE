// ── Enums ──────────────────────────────────────────────────────────────────────
export type RingType = "retirement" | "security" | "growth";
export type RiskLevel = "very_low" | "low" | "medium" | "high" | "very_high";
export type LiquidityLevel = "immediate" | "short_term" | "medium_term" | "long_term" | "illiquid";
export type AssetType =
  | "pension_fund" | "pension_insurance" | "ira" | "study_fund" | "provident_fund"
  | "money_market" | "bank_deposit" | "government_bond" | "liquid_etf"
  | "stock" | "etf" | "crypto" | "high_risk_provident" | "stock_portfolio";
export type LiabilityType = "loan" | "mortgage" | "credit_line" | "other";
export type GoalType =
  | "emergency_fund" | "retirement_target" | "debt_payoff"
  | "savings_target" | "education_fund" | "home_purchase" | "custom";
export type GoalStatus = "active" | "achieved" | "cancelled";

// ── Core entities ──────────────────────────────────────────────────────────────
export interface Client {
  id: number;
  name: string;
  age: number;
  monthly_income: number;
  monthly_expenses: number;
  risk_tolerance: RiskLevel;
  retirement_age: number;
  created_at?: string;
  updated_at?: string;
}

export interface Asset {
  id: number;
  client_id: number;
  ring: RingType;
  asset_type: AssetType;
  name: string;
  provider?: string;
  balance: number;
  monthly_deposit?: number;
  investment_track?: string;
  management_fees?: number;
  historical_return?: number;
  risk_level: RiskLevel;
  liquidity_level: LiquidityLevel;
  currency?: string;
  notes?: string;
}

export interface Liability {
  id: number;
  client_id?: number;
  liability_type: LiabilityType;
  name: string;
  lender?: string;
  original_amount: number;
  remaining_balance: number;
  interest_rate: number;
  monthly_payment: number;
  remaining_months?: number;
}

export interface Goal {
  id: number;
  client_id: number;
  goal_type: GoalType;
  title: string;
  description?: string;
  target_amount: number;
  current_amount: number;
  target_date?: string;
  monthly_contribution: number;
  status: GoalStatus;
  ring?: RingType;
  progress_pct: number;
  created_at?: string;
}

export interface NetWorthSnapshot {
  id: number;
  client_id: number;
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
  retirement_balance: number;
  security_balance: number;
  growth_balance: number;
  notes?: string;
  snapshot_date: string;
}

export interface ChatMessage {
  id?: number;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

// ── Dashboard / rings ──────────────────────────────────────────────────────────
export interface RingMetrics {
  total_balance: number;
  total_monthly_deposit: number;
  avg_management_fee: number;
  avg_historical_return: number;
  asset_count: number;
  allocation_pct: number;
  assets: Asset[];
}

export interface ProjectionYear {
  year: number;
  value: number;
}

export interface RingProjection {
  final_value: number;
  yearly: ProjectionYear[];
}

export interface Scenario {
  scenario: string;
  years_to_retirement: number;
  retirement_age: number;
  projections_by_ring: Record<RingType, RingProjection>;
  total_projected_wealth: number;
}

export interface DashboardData {
  client: Client;
  net_worth: number;
  total_assets: number;
  total_liabilities: number;
  monthly_surplus: number;
  safety_months: number;
  safety_status: "critical" | "low" | "good" | "excellent";
  flags: string[];
  rings: Record<RingType, RingMetrics>;
  projections: { conservative: Scenario; average: Scenario; aggressive: Scenario };
  liabilities: Liability[];
}

// ── AI ─────────────────────────────────────────────────────────────────────────
export interface AIFinding {
  category: string;
  severity: "critical" | "warning" | "info" | "positive";
  message: string;
}

export interface AIRecommendation {
  priority: number;
  action: string;
  rationale: string;
  impact: string;
}

export interface AIAnalysis {
  summary: string;
  financial_health_score: number;
  findings: AIFinding[];
  recommendations: AIRecommendation[];
  ring_analysis: Record<RingType, { assessment: string; score: number }>;
}

// ── Retirement readiness ───────────────────────────────────────────────────────
export interface RetirementReadiness {
  target_nest_egg: number;
  projected_at_retirement: number;
  readiness_pct: number;
  status: "on_track" | "slightly_behind" | "behind" | "significantly_behind";
  years_to_retirement: number;
  annual_expenses: number;
  current_retirement_balance: number;
  current_monthly_contribution: number;
  additional_monthly_needed: number;
  gap: number;
  summary: string;
}

// ── Rebalancing ────────────────────────────────────────────────────────────────
export interface RebalanceItem {
  ring: RingType;
  current_pct: number;
  target_pct: number;
  current_amount: number;
  target_amount: number;
  delta: number;
  action: "increase" | "decrease" | "hold";
}

export interface RebalanceData {
  client_age: number;
  total_assets: number;
  targets: Record<string, number>;
  items: RebalanceItem[];
  in_balance: boolean;
  summary: string;
}

// ── Fee drag ───────────────────────────────────────────────────────────────────
export interface FeeDragItem {
  asset_id: number;
  asset_name: string;
  provider?: string;
  fee_pct: number;
  balance: number;
  fv_actual: number;
  fv_baseline: number;
  drag: number;
  drag_pct: number;
}

export interface FeeDragData {
  horizon_years: number;
  baseline_fee_pct: number;
  assumed_gross_return_pct: number;
  total_fee_drag: number;
  items: FeeDragItem[];
  summary: string;
}

// ── Debt payoff ────────────────────────────────────────────────────────────────
export interface DebtPayoffPlan {
  strategy: string;
  total_months: number;
  total_interest_paid: number;
  total_paid: number;
  payoff_order: string[];
  monthly_schedule: Array<{ month: number; total_remaining: number; interest_paid: number; total_paid: number }>;
  savings_vs_minimum: number;
}

export interface DebtPayoffData {
  avalanche: DebtPayoffPlan;
  snowball: DebtPayoffPlan;
  interest_saved_avalanche_vs_snowball: number;
  recommendation: string;
}

// ── Monte Carlo ────────────────────────────────────────────────────────────────
export interface MonteCarloData {
  scenario: string;
  n_paths: number;
  years: number;
  percentile_finals: Record<string, number>;
  probability_of_success: number;
  target_nest_egg: number;
  yearly_bands: Record<string, Array<{ year: number; value: number }>>;
  summary: string;
}
