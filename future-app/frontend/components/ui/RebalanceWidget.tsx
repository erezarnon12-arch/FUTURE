"use client";

import { motion } from "framer-motion";
import type { RebalanceData } from "@/types";
import { RING_CONFIG, formatCurrency, formatPct } from "@/lib/utils";

interface Props {
  data: RebalanceData;
}

const ACTION_CONFIG = {
  increase: { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", label: "↑ הגדל" },
  decrease: { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30", label: "↓ הקטן" },
  hold: { color: "text-text-muted", bg: "bg-white/5", border: "border-white/10", label: "— שמור" },
} as const;

export default function RebalanceWidget({ data }: Props) {
  return (
    <div className="space-y-5">
      {/* Rings */}
      <div className="space-y-4">
        {data.items.map((item) => {
          const cfg = RING_CONFIG[item.ring];
          const actionCfg = ACTION_CONFIG[item.action] ?? ACTION_CONFIG.hold;
          return (
            <div key={item.ring} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">{cfg.icon}</span>
                  <span className="text-sm font-medium text-white">{cfg.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${actionCfg.bg} ${actionCfg.border} ${actionCfg.color}`}>
                    {actionCfg.label}
                  </span>
                  <span className="text-xs text-text-muted">
                    {item.delta > 0 ? "+" : ""}{formatCurrency(item.delta)}
                  </span>
                </div>
              </div>

              {/* Current bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-text-muted">
                  <span>נוכחי {formatPct(item.current_pct)}</span>
                  <span>יעד {formatPct(item.target_pct)}</span>
                </div>
                <div className="relative h-3 bg-white/5 rounded-full overflow-hidden">
                  {/* Current */}
                  <motion.div
                    className="absolute left-0 top-0 h-full rounded-full"
                    style={{ backgroundColor: cfg.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, item.current_pct)}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
                {/* Target marker */}
                <div className="relative h-2">
                  <div
                    className="absolute top-0 w-0.5 h-2 rounded-full opacity-60"
                    style={{
                      left: `${Math.min(100, item.target_pct)}%`,
                      backgroundColor: cfg.color,
                    }}
                  />
                </div>
              </div>

              {/* Amounts */}
              <div className="flex justify-between text-xs text-text-muted">
                <span>נוכחי: <span className="text-white">{formatCurrency(item.current_amount)}</span></span>
                <span>יעד: <span style={{ color: cfg.color }}>{formatCurrency(item.target_amount)}</span></span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Balance status */}
      <div className={`flex items-center gap-2 p-3 rounded-xl border ${
        data.in_balance
          ? "bg-emerald-500/10 border-emerald-500/30"
          : "bg-amber-500/10 border-amber-500/30"
      }`}>
        <span className="text-base">{data.in_balance ? "✓" : "⚠"}</span>
        <span className={`text-xs font-medium ${data.in_balance ? "text-emerald-400" : "text-amber-400"}`}>
          {data.in_balance ? "התיק מאוזן" : "מומלץ לאזן מחדש"}
        </span>
      </div>

      {/* Summary */}
      {data.summary && (
        <p className="text-xs text-text-muted italic border-t border-white/5 pt-3">{data.summary}</p>
      )}
    </div>
  );
}
