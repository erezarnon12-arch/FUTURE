"use client";

import { motion } from "framer-motion";
import type { RetirementReadiness } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface Props {
  data: RetirementReadiness;
}

const STATUS_CONFIG = {
  on_track: { color: "#10b981", label: "על המסלול", bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400" },
  slightly_behind: { color: "#6366f1", label: "מעט מאחור", bg: "bg-indigo-500/10", border: "border-indigo-500/30", text: "text-indigo-400" },
  behind: { color: "#f59e0b", label: "מאחור", bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400" },
  significantly_behind: { color: "#ef4444", label: "מאחור משמעותית", bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400" },
} as const;

export default function RetirementReadinessWidget({ data }: Props) {
  const cfg = STATUS_CONFIG[data.status] ?? STATUS_CONFIG.behind;
  const pct = Math.min(100, Math.max(0, data.readiness_pct));

  // Semicircle gauge: radius 70, center (100, 100), sweep 180 degrees (left to right)
  const r = 70;
  const cx = 100;
  const cy = 100;
  const circumference = Math.PI * r; // half circle
  const filled = (pct / 100) * circumference;

  return (
    <div className="space-y-5">
      {/* Gauge */}
      <div className="flex flex-col items-center">
        <svg width="200" height="110" viewBox="0 0 200 110">
          {/* Track */}
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* Filled arc */}
          <motion.path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none"
            stroke={cfg.color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${filled} ${circumference}`}
            initial={{ strokeDasharray: `0 ${circumference}` }}
            animate={{ strokeDasharray: `${filled} ${circumference}` }}
            transition={{ duration: 1.4, ease: "easeOut" }}
            style={{ filter: `drop-shadow(0 0 6px ${cfg.color})` }}
          />
          {/* Percentage text */}
          <text x={cx} y={cy - 8} textAnchor="middle" fill="white" fontSize="24" fontWeight="700" fontFamily="Inter">
            {Math.round(pct)}%
          </text>
          <text x={cx} y={cy + 12} textAnchor="middle" fill="#64748b" fontSize="10" fontFamily="Inter">
            מוכנות
          </text>
        </svg>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.text} -mt-2`}>
          {cfg.label}
        </span>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass rounded-xl p-3">
          <div className="text-xs text-text-secondary mb-1">חיסכון יעד</div>
          <div className="text-sm font-bold text-white">{formatCurrency(data.target_nest_egg)}</div>
        </div>
        <div className="glass rounded-xl p-3">
          <div className="text-xs text-text-secondary mb-1">תחזית לגיל פרישה</div>
          <div className="text-sm font-bold" style={{ color: cfg.color }}>{formatCurrency(data.projected_at_retirement)}</div>
        </div>
        <div className="glass rounded-xl p-3">
          <div className="text-xs text-text-secondary mb-1">פער</div>
          <div className={`text-sm font-bold ${data.gap > 0 ? "text-red-400" : "text-emerald-400"}`}>
            {data.gap > 0 ? "-" : "+"}{formatCurrency(Math.abs(data.gap))}
          </div>
        </div>
        <div className="glass rounded-xl p-3">
          <div className="text-xs text-text-secondary mb-1">תוספת חודשית נדרשת</div>
          <div className="text-sm font-bold text-amber-400">
            {data.additional_monthly_needed > 0
              ? formatCurrency(data.additional_monthly_needed)
              : <span className="text-emerald-400">על המסלול</span>
            }
          </div>
        </div>
      </div>

      {/* Details row */}
      <div className="flex justify-between text-xs text-text-muted px-1">
        <span>יתרת חיסכון נוכחית: <span className="text-white">{formatCurrency(data.current_retirement_balance)}</span></span>
        <span>{data.years_to_retirement} שנים נותרות</span>
      </div>

      {/* Summary */}
      {data.summary && (
        <p className="text-xs text-text-muted italic border-t border-white/5 pt-3">{data.summary}</p>
      )}
    </div>
  );
}
