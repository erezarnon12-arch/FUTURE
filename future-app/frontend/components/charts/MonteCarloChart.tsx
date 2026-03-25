"use client";

import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import type { MonteCarloData } from "@/types";
import { formatNumber, formatCurrency } from "@/lib/utils";

interface Props {
  data: MonteCarloData;
}

function successColor(pct: number): string {
  if (pct >= 70) return "#10b981";
  if (pct >= 50) return "#f59e0b";
  return "#ef4444";
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const bands = ["p10", "p25", "p50", "p75", "p90"] as const;
  // Reconstruct absolute values from deltas
  const vals: Record<string, number> = {};
  let running = 0;
  for (const b of bands) {
    const entry = payload.find((p: any) => p.dataKey === b);
    running += entry?.value || 0;
    vals[b] = running;
  }
  return (
    <div className="glass rounded-xl p-3 text-xs border border-white/10 space-y-1">
      <div className="text-text-secondary mb-1 font-medium">Year {label}</div>
      {[["p90", "#818cf8"], ["p75", "#a5b4fc"], ["p50", "#6366f1"], ["p25", "#4f46e5"], ["p10", "#3730a3"]].map(
        ([k, c]) => (
          <div key={k} className="flex justify-between gap-4">
            <span style={{ color: c as string }}>{k.toUpperCase()}</span>
            <span className="text-white font-medium">₪{formatNumber(vals[k])}</span>
          </div>
        )
      )}
    </div>
  );
};

export default function MonteCarloChart({ data }: Props) {
  // Zip yearly_bands into flat array of deltas for stacked area
  const years = data.yearly_bands["p10"]?.map((d) => d.year) ?? [];
  const chartData = years.map((year, i) => {
    const p10 = data.yearly_bands["p10"]?.[i]?.value ?? 0;
    const p25 = data.yearly_bands["p25"]?.[i]?.value ?? 0;
    const p50 = data.yearly_bands["p50"]?.[i]?.value ?? 0;
    const p75 = data.yearly_bands["p75"]?.[i]?.value ?? 0;
    const p90 = data.yearly_bands["p90"]?.[i]?.value ?? 0;
    return {
      year,
      p10,
      p25: Math.max(0, p25 - p10),
      p50: Math.max(0, p50 - p25),
      p75: Math.max(0, p75 - p50),
      p90: Math.max(0, p90 - p75),
    };
  });

  const pSuccess = Math.round(data.probability_of_success * 100);
  const sColor = successColor(pSuccess);
  const p50Final = data.percentile_finals["p50"] ?? 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      {/* Stat row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-xs text-text-secondary mb-1">Probability of Success</div>
          <div className="text-2xl font-bold" style={{ color: sColor }}>{pSuccess}%</div>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-xs text-text-secondary mb-1">Median Outcome (p50)</div>
          <div className="text-2xl font-bold text-white">{formatCurrency(p50Final)}</div>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-xs text-text-secondary mb-1">Target Nest Egg</div>
          <div className="text-2xl font-bold text-indigo-400">{formatCurrency(data.target_nest_egg)}</div>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            {[
              { id: "mc-p10", color: "#4338ca", op1: 0.12, op2: 0.04 },
              { id: "mc-p25", color: "#4f46e5", op1: 0.18, op2: 0.06 },
              { id: "mc-p50", color: "#6366f1", op1: 0.30, op2: 0.10 },
              { id: "mc-p75", color: "#818cf8", op1: 0.18, op2: 0.06 },
              { id: "mc-p90", color: "#a5b4fc", op1: 0.12, op2: 0.04 },
            ].map(({ id, color, op1, op2 }) => (
              <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={op1} />
                <stop offset="95%" stopColor={color} stopOpacity={op2} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="year" tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis
            tickFormatter={(v) => `₪${formatNumber(v)}`}
            tick={{ fill: "#64748b", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={64}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={data.target_nest_egg}
            stroke="#ef4444"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            label={{ value: "Target", position: "insideTopRight", fill: "#ef4444", fontSize: 10 }}
          />
          <Area type="monotone" dataKey="p10" stackId="mc" stroke="#4338ca" strokeWidth={1} fill="url(#mc-p10)" />
          <Area type="monotone" dataKey="p25" stackId="mc" stroke="#4f46e5" strokeWidth={1} fill="url(#mc-p25)" />
          <Area type="monotone" dataKey="p50" stackId="mc" stroke="#6366f1" strokeWidth={2} fill="url(#mc-p50)" />
          <Area type="monotone" dataKey="p75" stackId="mc" stroke="#818cf8" strokeWidth={1} fill="url(#mc-p75)" />
          <Area type="monotone" dataKey="p90" stackId="mc" stroke="#a5b4fc" strokeWidth={1} fill="url(#mc-p90)" />
        </AreaChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex gap-4 mt-3 justify-center flex-wrap">
        {[["p10–p25", "#4338ca"], ["p25–p50", "#4f46e5"], ["p50 median", "#6366f1"], ["p50–p75", "#818cf8"], ["p75–p90", "#a5b4fc"]].map(
          ([label, color]) => (
            <div key={label} className="flex items-center gap-1.5 text-xs text-text-secondary">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color as string, opacity: 0.7 }} />
              {label}
            </div>
          )
        )}
        <div className="flex items-center gap-1.5 text-xs text-text-secondary">
          <div className="w-3 h-1 border-t-2 border-dashed border-red-400" />
          Target
        </div>
      </div>

      {/* Summary */}
      {data.summary && (
        <p className="text-xs text-text-muted italic mt-4 text-center">{data.summary}</p>
      )}
    </motion.div>
  );
}
