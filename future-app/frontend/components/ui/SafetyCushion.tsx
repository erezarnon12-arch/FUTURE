"use client";

import { motion } from "framer-motion";
import type { DashboardData } from "@/types";

interface Props {
  data: DashboardData;
}

export default function SafetyCushion({ data }: Props) {
  const { safety_months, safety_status } = data;
  const target = 12;
  const pct = Math.min(100, (safety_months / target) * 100);

  const statusConfig = {
    critical: { color: "#ef4444", label: "קריטי",  bg: "bg-red-500/10" },
    low:      { color: "#f59e0b", label: "נמוך",   bg: "bg-amber-500/10" },
    good:     { color: "#10b981", label: "טוב",    bg: "bg-emerald-500/10" },
    excellent:{ color: "#6366f1", label: "מצוין",  bg: "bg-indigo-500/10" },
  };

  const cfg = statusConfig[safety_status] || statusConfig.good;

  return (
    <div>
      <div className="flex items-end justify-between mb-3">
        <div>
          <span className="text-2xl font-bold text-white">{safety_months}</span>
          <span className="text-text-secondary text-sm ml-1">חודשים</span>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg}`} style={{ color: cfg.color }}>
          {cfg.label}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-3">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: cfg.color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>

      {/* Month markers */}
      <div className="flex justify-between text-xs text-text-muted">
        <span>0</span>
        <span className="text-amber-500 font-medium">6 חודשים</span>
        <span>9</span>
        <span className="text-emerald-500 font-medium">12 חודשים ✓</span>
      </div>

      {safety_months < 6 && (
        <div className="mt-3 text-xs text-amber-400 glass rounded-lg px-3 py-2 border border-amber-500/20">
          יעד: עוד ₪{((6 - safety_months) * data.client.monthly_expenses).toLocaleString()} להגיע ל-6 חודשים
        </div>
      )}
    </div>
  );
}
