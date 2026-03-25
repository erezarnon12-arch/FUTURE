"use client";

import { motion } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { DebtPayoffData } from "@/types";
import { formatCurrency, formatNumber } from "@/lib/utils";

interface Props {
  data: DebtPayoffData;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const avalanche = payload.find((p: any) => p.dataKey === "avalanche")?.value ?? 0;
  const snowball = payload.find((p: any) => p.dataKey === "snowball")?.value ?? 0;
  return (
    <div className="glass rounded-xl p-3 text-xs border border-white/10 space-y-1">
      <div className="text-text-secondary mb-1">Month {label}</div>
      <div className="flex justify-between gap-4">
        <span className="text-indigo-400">Avalanche</span>
        <span className="text-white">{formatCurrency(avalanche)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-amber-400">Snowball</span>
        <span className="text-white">{formatCurrency(snowball)}</span>
      </div>
      {avalanche !== snowball && (
        <div className="border-t border-white/10 pt-1 flex justify-between gap-4">
          <span className="text-text-muted">Δ</span>
          <span className="text-emerald-400">{formatCurrency(Math.abs(avalanche - snowball))}</span>
        </div>
      )}
    </div>
  );
};

export default function DebtPayoffChart({ data }: Props) {
  const { avalanche, snowball } = data;

  // Zip schedules, fill shorter one with zeros
  const maxMonths = Math.max(avalanche.total_months, snowball.total_months);
  const chartData: { month: number; avalanche: number; snowball: number }[] = [];
  for (let i = 0; i < maxMonths; i++) {
    const av = avalanche.monthly_schedule[i];
    const sn = snowball.monthly_schedule[i];
    chartData.push({
      month: i + 1,
      avalanche: av ? av.total_remaining : 0,
      snowball: sn ? sn.total_remaining : 0,
    });
  }

  const interestSaved = Math.abs(data.interest_saved_avalanche_vs_snowball);
  const avalancheWins = avalanche.total_interest_paid <= snowball.total_interest_paid;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="space-y-5">
      {/* Chart */}
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis
            dataKey="month"
            tick={{ fill: "#64748b", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            label={{ value: "Month", position: "insideBottom", offset: -2, fill: "#475569", fontSize: 10 }}
          />
          <YAxis
            tickFormatter={(v) => `₪${formatNumber(v)}`}
            tick={{ fill: "#64748b", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={64}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="avalanche"
            stroke="#6366f1"
            strokeWidth={2}
            dot={false}
            name="Avalanche"
          />
          <Line
            type="monotone"
            dataKey="snowball"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
            name="Snowball"
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex gap-4 justify-center text-xs text-text-secondary">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-0.5 bg-indigo-500" /> Avalanche (high rate first)
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-0.5 bg-amber-500" /> Snowball (small balance first)
        </div>
      </div>

      {/* Comparison table */}
      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          {
            label: "Avalanche",
            color: "#6366f1",
            months: avalanche.total_months,
            interest: avalanche.total_interest_paid,
            recommended: avalancheWins,
          },
          {
            label: "Snowball",
            color: "#f59e0b",
            months: snowball.total_months,
            interest: snowball.total_interest_paid,
            recommended: !avalancheWins,
          },
        ].map((s) => (
          <div key={s.label} className="glass rounded-xl p-3 col-span-1">
            <div className="text-xs font-semibold mb-2" style={{ color: s.color }}>{s.label}</div>
            <div className="text-lg font-bold text-white">{s.months}mo</div>
            <div className="text-xs text-text-muted mb-1">payoff time</div>
            <div className="text-sm font-medium text-red-400">{formatCurrency(s.interest)}</div>
            <div className="text-xs text-text-muted">interest paid</div>
            {s.recommended && (
              <div className="mt-2 text-xs text-emerald-400 font-medium">★ Recommended</div>
            )}
          </div>
        ))}

        {/* Savings column */}
        <div className="glass rounded-xl p-3">
          <div className="text-xs font-semibold text-emerald-400 mb-2">Savings</div>
          <div className="text-lg font-bold text-emerald-400">{formatCurrency(interestSaved)}</div>
          <div className="text-xs text-text-muted">interest saved</div>
          <div className="text-xs text-text-muted mt-1">choosing avalanche</div>
        </div>
      </div>

      {/* Recommendation */}
      {data.recommendation && (
        <div className="glass rounded-xl p-4 border border-indigo-500/20">
          <div className="text-xs text-indigo-400 font-semibold mb-1">Recommendation</div>
          <p className="text-xs text-text-secondary">{data.recommendation}</p>
        </div>
      )}
    </motion.div>
  );
}
