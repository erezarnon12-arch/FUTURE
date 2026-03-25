"use client";

import { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import type { DashboardData } from "@/types";
import { formatNumber } from "@/lib/utils";

interface Props {
  data: DashboardData;
}

const SCENARIOS = [
  { key: "conservative", label: "Conservative", color: "#94a3b8" },
  { key: "average", label: "Average", color: "#6366f1" },
  { key: "aggressive", label: "Aggressive", color: "#10b981" },
] as const;

export default function ProjectionChart({ data }: Props) {
  const [activeScenario, setActiveScenario] = useState<"conservative" | "average" | "aggressive">("average");

  const scenario = data.projections[activeScenario];

  // Build unified series combining all rings per year
  const yearMap: Record<number, Record<string, number>> = {};
  for (const [ringName, ringProj] of Object.entries(scenario.projections_by_ring)) {
    for (const { year, value } of ringProj.yearly) {
      if (!yearMap[year]) yearMap[year] = { year };
      yearMap[year][ringName] = value;
    }
  }
  const chartData = Object.values(yearMap).sort((a, b) => a.year - b.year);

  const ringColors = { retirement: "#6366f1", security: "#10b981", growth: "#f59e0b" };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const total = payload.reduce((s: number, p: any) => s + (p.value || 0), 0);
    return (
      <div className="glass rounded-xl p-3 text-sm border border-white/10">
        <div className="text-text-secondary mb-2">Age {label}</div>
        {payload.map((p: any) => (
          <div key={p.name} className="flex justify-between gap-4 mb-1">
            <span style={{ color: p.color }} className="capitalize">{p.name}</span>
            <span className="text-white font-medium">₪{formatNumber(p.value)}</span>
          </div>
        ))}
        <div className="border-t border-white/10 mt-2 pt-2 flex justify-between">
          <span className="text-text-secondary">Total</span>
          <span className="text-white font-bold">₪{formatNumber(total)}</span>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Scenario selector */}
      <div className="flex gap-2 mb-6">
        {SCENARIOS.map((s) => (
          <button
            key={s.key}
            onClick={() => setActiveScenario(s.key)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={
              activeScenario === s.key
                ? { backgroundColor: `${s.color}20`, color: s.color, border: `1px solid ${s.color}50` }
                : { backgroundColor: "transparent", color: "#64748b", border: "1px solid rgba(255,255,255,0.08)" }
            }
          >
            {s.label}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-text-secondary text-sm">At retirement:</span>
          <span className="text-white font-bold text-lg">
            ₪{formatNumber(scenario.total_projected_wealth)}
          </span>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <defs>
            {Object.entries(ringColors).map(([ring, color]) => (
              <linearGradient key={ring} id={`grad-proj-${ring}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                <stop offset="95%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis
            dataKey="year"
            tick={{ fill: "#64748b", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={(v) => `₪${formatNumber(v)}`}
            tick={{ fill: "#64748b", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          {Object.entries(ringColors).map(([ring, color]) => (
            <Area
              key={ring}
              type="monotone"
              dataKey={ring}
              name={ring}
              stackId="1"
              stroke={color}
              strokeWidth={2}
              fill={`url(#grad-proj-${ring})`}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
