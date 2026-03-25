"use client";

import { motion } from "framer-motion";
import type { DashboardData, RingType } from "@/types";
import { RING_CONFIG, formatCurrency } from "@/lib/utils";

interface Props {
  data: DashboardData;
}

export default function AllocationBar({ data }: Props) {
  const rings: RingType[] = ["retirement", "security", "growth"];

  return (
    <div>
      {/* Stacked bar */}
      <div className="flex rounded-full overflow-hidden h-4 mb-5 gap-0.5">
        {rings.map((ring) => {
          const pct = data.rings[ring].allocation_pct;
          const cfg = RING_CONFIG[ring];
          return (
            <motion.div
              key={ring}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1, delay: 0.2 }}
              style={{ backgroundColor: cfg.color }}
              className="h-full first:rounded-l-full last:rounded-r-full"
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-3 gap-3">
        {rings.map((ring) => {
          const cfg = RING_CONFIG[ring];
          const metrics = data.rings[ring];
          return (
            <div key={ring} className="glass rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} />
                <span className="text-xs font-semibold text-text-secondary">{cfg.label}</span>
              </div>
              <div className="font-bold text-white text-sm">{formatCurrency(metrics.total_balance)}</div>
              <div className="text-xs text-text-muted mt-0.5">{metrics.allocation_pct.toFixed(1)}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
