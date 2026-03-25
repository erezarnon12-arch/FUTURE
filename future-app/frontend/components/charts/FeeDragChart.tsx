"use client";

import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import type { FeeDragData } from "@/types";
import { formatCurrency, formatPct, formatNumber } from "@/lib/utils";

interface Props {
  data: FeeDragData;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="glass rounded-xl p-3 text-xs border border-white/10 space-y-1 min-w-[180px]">
      <div className="text-white font-medium mb-2">{d.name}</div>
      <div className="flex justify-between gap-4">
        <span className="text-text-muted">Fee rate</span>
        <span className="text-amber-400">{formatPct(d.fee_pct)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-text-muted">Balance</span>
        <span className="text-white">{formatCurrency(d.balance)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-text-muted">With current fees</span>
        <span className="text-white">{formatCurrency(d.fv_actual)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-text-muted">At baseline fee</span>
        <span className="text-emerald-400">{formatCurrency(d.fv_baseline)}</span>
      </div>
      <div className="border-t border-white/10 pt-1 flex justify-between gap-4">
        <span className="text-text-muted">Fee drag</span>
        <span className="text-red-400 font-semibold">{formatCurrency(d.drag)} ({formatPct(d.drag_pct)})</span>
      </div>
    </div>
  );
};

export default function FeeDragChart({ data }: Props) {
  // Sort by drag descending, build chart data
  const sorted = [...data.items].sort((a, b) => b.drag - a.drag);
  const chartData = sorted.map((item) => ({
    name: item.asset_name.length > 14 ? item.asset_name.slice(0, 13) + "…" : item.asset_name,
    fullName: item.asset_name,
    baseline: Math.max(0, item.fv_baseline - item.drag),
    drag: item.drag,
    fee_pct: item.fee_pct ?? 0,
    balance: item.balance,
    fv_actual: item.fv_actual,
    fv_baseline: item.fv_baseline,
    drag_pct: item.drag_pct,
  }));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="space-y-5">
      {/* KPI header */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass rounded-xl p-4">
          <div className="text-xs text-text-secondary mb-1">Total Fee Drag ({data.horizon_years}y)</div>
          <div className="text-2xl font-bold text-red-400">{formatCurrency(data.total_fee_drag)}</div>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="text-xs text-text-secondary mb-1">Assumed Gross Return</div>
          <div className="text-2xl font-bold text-white">{formatPct(data.assumed_gross_return_pct)}/yr</div>
          <div className="text-xs text-text-muted mt-0.5">Baseline fee: {formatPct(data.baseline_fee_pct)}</div>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 40, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="name"
              tick={{ fill: "#64748b", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              angle={-30}
              textAnchor="end"
              interval={0}
            />
            <YAxis
              tickFormatter={(v) => `₪${formatNumber(v)}`}
              tick={{ fill: "#64748b", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={64}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="baseline" stackId="a" fill="#334155" radius={[0, 0, 4, 4]} name="Projected (net)" />
            <Bar dataKey="drag" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} name="Fee drag" />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="text-center text-text-muted text-sm py-8">No assets with fee data available.</div>
      )}

      {/* Legend */}
      <div className="flex gap-4 justify-center text-xs text-text-secondary">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-[#334155]" /> Net projected value</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-red-500" /> Lost to fees vs {formatPct(data.baseline_fee_pct)} baseline</div>
      </div>

      {/* Summary */}
      {data.summary && (
        <p className="text-xs text-text-muted italic border-t border-white/5 pt-3">{data.summary}</p>
      )}
    </motion.div>
  );
}
