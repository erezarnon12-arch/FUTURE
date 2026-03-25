import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency = "ILS"): string {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toString();
}

export function formatPct(value: number): string {
  return `${value.toFixed(1)}%`;
}

export const RING_CONFIG = {
  retirement: {
    label: "עתיד",
    color: "#6366f1",
    lightColor: "#818cf8",
    bgColor: "#eef2ff",
    borderColor: "#c7d2fe",
    gradient: "from-indigo-600 to-indigo-400",
    description: "נכסי פנסיה וחיסכון לטווח ארוך",
    icon: "🏛",
  },
  security: {
    label: "ביטחון",
    color: "#10b981",
    lightColor: "#34d399",
    bgColor: "#ecfdf5",
    borderColor: "#a7f3d0",
    gradient: "from-emerald-600 to-emerald-400",
    description: "רשת ביטחון פיננסית",
    icon: "🛡",
  },
  growth: {
    label: "צמיחה",
    color: "#f59e0b",
    lightColor: "#fcd34d",
    bgColor: "#fffbeb",
    borderColor: "#fde68a",
    gradient: "from-amber-600 to-amber-400",
    description: "השקעות צמיחה בסיכון גבוה",
    icon: "🚀",
  },
} as const;

export const RISK_LABELS: Record<string, string> = {
  very_low: "נמוך מאוד",
  low: "נמוך",
  medium: "בינוני",
  high: "גבוה",
  very_high: "גבוה מאוד",
};

export const LIQUIDITY_LABELS: Record<string, string> = {
  immediate: "מיידי",
  short_term: "לטווח קצר",
  medium_term: "לטווח בינוני",
  long_term: "לטווח ארוך",
  illiquid: "לא נזיל",
};

export const ASSET_TYPE_LABELS: Record<string, string> = {
  pension_fund: "קרן פנסיה",
  pension_insurance: "ביטוח מנהלים",
  ira: "IRA",
  study_fund: "קרן השתלמות",
  provident_fund: "קופת גמל",
  money_market: "שוק כספים",
  bank_deposit: "פיקדון בנקאי",
  government_bond: "אג\"ח ממשלתי",
  liquid_etf: "תעודת סל נזילה",
  stock: "מניה",
  etf: "תעודת סל",
  crypto: "קריפטו",
  high_risk_provident: "קופת גמל סיכון גבוה",
  stock_portfolio: "תיק מניות",
};

export const SEVERITY_CONFIG = {
  critical: { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30", dot: "bg-red-500" },
  warning: { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", dot: "bg-amber-500" },
  info: { color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30", dot: "bg-blue-500" },
  positive: { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", dot: "bg-emerald-500" },
} as const;
