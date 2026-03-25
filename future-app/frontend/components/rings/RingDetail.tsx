"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { RingType, RingMetrics, Asset } from "@/types";
import { RING_CONFIG, RISK_LABELS, LIQUIDITY_LABELS, ASSET_TYPE_LABELS, formatCurrency, formatNumber } from "@/lib/utils";

interface Props {
  ring: RingType;
  metrics: RingMetrics;
}

export default function RingDetail({ ring, metrics }: Props) {
  const cfg = RING_CONFIG[ring];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl overflow-hidden"
      style={{ border: `1px solid ${cfg.color}30`, backgroundColor: `${cfg.color}08` }}
    >
      {/* Header */}
      <div className="px-5 py-4" style={{ borderBottom: `1px solid ${cfg.color}20` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
              style={{ backgroundColor: `${cfg.color}20` }}>
              {cfg.icon}
            </div>
            <div>
              <h3 className="font-bold text-white">טבעת {cfg.label}</h3>
              <p className="text-xs text-text-secondary">{cfg.description}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold" style={{ color: cfg.color }}>
              {formatCurrency(metrics.total_balance)}
            </div>
            <div className="text-xs text-text-muted">{metrics.allocation_pct.toFixed(1)}% מהתיק</div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-px" style={{ backgroundColor: `${cfg.color}10` }}>
        {[
          { label: "הפקדה חודשית", value: `₪${formatNumber(metrics.total_monthly_deposit)}` },
          { label: "עמלה ממוצעת", value: `${metrics.avg_management_fee.toFixed(2)}%` },
          { label: "תשואה ממוצעת", value: `${metrics.avg_historical_return.toFixed(1)}%` },
        ].map((stat) => (
          <div key={stat.label} className="px-4 py-3 text-center" style={{ backgroundColor: `${cfg.color}08` }}>
            <div className="text-sm font-semibold text-white">{stat.value}</div>
            <div className="text-xs text-text-muted mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Assets list */}
      <div className="p-3 space-y-2">
        {metrics.assets.length === 0 ? (
          <div className="text-center py-6 text-text-muted text-sm">
            אין נכסים בטבעת זו עדיין
          </div>
        ) : (
          metrics.assets.map((asset, i) => (
            <AssetRow key={asset.id ?? i} asset={asset} ringColor={cfg.color} />
          ))
        )}
      </div>
    </motion.div>
  );
}

function AssetRow({ asset, ringColor }: { asset: Asset; ringColor: string }) {
  const riskColor: Record<string, string> = {
    very_low: "#10b981", low: "#34d399", medium: "#f59e0b",
    high: "#f97316", very_high: "#ef4444",
  };

  return (
    <div className="glass rounded-xl px-4 py-3 flex items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="font-medium text-sm text-white truncate">{asset.name}</div>
        <div className="text-xs text-text-secondary mt-0.5">
          {ASSET_TYPE_LABELS[asset.asset_type] ?? asset.asset_type}
          {asset.provider && ` · ${asset.provider}`}
        </div>
        {asset.investment_track && (
          <div className="text-xs text-text-muted mt-0.5">{asset.investment_track}</div>
        )}
      </div>

      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <div className="font-bold text-sm text-white">
          {formatCurrency(asset.balance)}
        </div>
        <div className="flex items-center gap-2 text-xs">
          {asset.management_fees !== undefined && (
            <span className={asset.management_fees > 1 ? "text-amber-400" : "text-text-muted"}>
              {asset.management_fees.toFixed(2)}% עמלה
            </span>
          )}
          <span
            className="px-1.5 py-0.5 rounded text-xs font-medium"
            style={{ color: riskColor[asset.risk_level], backgroundColor: `${riskColor[asset.risk_level]}18` }}
          >
            {RISK_LABELS[asset.risk_level] ?? asset.risk_level}
          </span>
        </div>
      </div>
    </div>
  );
}
