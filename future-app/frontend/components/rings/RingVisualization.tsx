"use client";

import { motion } from "framer-motion";
import type { DashboardData, RingType } from "@/types";
import { RING_CONFIG, formatCurrency, formatNumber } from "@/lib/utils";

interface Props {
  data: DashboardData;
  activeRing: RingType | null;
  onSelectRing: (ring: RingType | null) => void;
}

const RING_SIZES = {
  retirement: { outer: 240, inner: 180 },
  security:   { outer: 180, inner: 120 },
  growth:     { outer: 120, inner: 60 },
};

export default function RingVisualization({ data, activeRing, onSelectRing }: Props) {
  const total = data.total_assets;

  return (
    <div className="flex flex-col items-center">
      {/* SVG Ring diagram */}
      <div className="relative" style={{ width: 300, height: 300 }}>
        <svg width="300" height="300" viewBox="0 0 300 300">
          <defs>
            {(["retirement", "security", "growth"] as RingType[]).map((ring) => (
              <radialGradient key={ring} id={`grad-${ring}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={RING_CONFIG[ring].lightColor} stopOpacity="0.9" />
                <stop offset="100%" stopColor={RING_CONFIG[ring].color} stopOpacity="1" />
              </radialGradient>
            ))}
          </defs>

          {/* Retirement — outermost */}
          <RingCircle
            ring="retirement"
            cx={150} cy={150}
            r={115}
            strokeWidth={24}
            pct={data.rings.retirement.allocation_pct}
            active={activeRing === "retirement"}
            onClick={() => onSelectRing(activeRing === "retirement" ? null : "retirement")}
          />

          {/* Security — middle */}
          <RingCircle
            ring="security"
            cx={150} cy={150}
            r={80}
            strokeWidth={22}
            pct={data.rings.security.allocation_pct}
            active={activeRing === "security"}
            onClick={() => onSelectRing(activeRing === "security" ? null : "security")}
          />

          {/* Growth — innermost */}
          <RingCircle
            ring="growth"
            cx={150} cy={150}
            r={46}
            strokeWidth={20}
            pct={data.rings.growth.allocation_pct}
            active={activeRing === "growth"}
            onClick={() => onSelectRing(activeRing === "growth" ? null : "growth")}
          />

          {/* Center text */}
          <text x="150" y="143" textAnchor="middle" fill="#f1f5f9" fontSize="13" fontWeight="500" fontFamily="Inter">
            שווי נטו
          </text>
          <text x="150" y="165" textAnchor="middle" fill="white" fontSize="16" fontWeight="700" fontFamily="Inter">
            {formatNumber(data.net_worth)}
          </text>
          <text x="150" y="183" textAnchor="middle" fill="#64748b" fontSize="10" fontFamily="Inter">
            ₪
          </text>
        </svg>

        {/* Tooltip labels around rings */}
        {(["retirement", "security", "growth"] as RingType[]).map((ring, i) => {
          const angles = [315, 45, 225];
          const radii = [115, 80, 46];
          const angle = (angles[i] * Math.PI) / 180;
          const r = radii[i];
          const x = 150 + r * Math.cos(angle);
          const y = 150 + r * Math.sin(angle);
          const cfg = RING_CONFIG[ring];
          return (
            <motion.div
              key={ring}
              className="absolute pointer-events-none"
              style={{
                left: x - 24,
                top: y - 10,
                opacity: activeRing === null || activeRing === ring ? 1 : 0.3,
              }}
              animate={{ opacity: activeRing === null || activeRing === ring ? 1 : 0.3 }}
            >
              <div
                className="text-xs font-bold px-1.5 py-0.5 rounded-md"
                style={{ color: cfg.color, backgroundColor: `${cfg.color}22` }}
              >
                {cfg.icon}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Ring Legend */}
      <div className="flex gap-3 mt-4">
        {(["retirement", "security", "growth"] as RingType[]).map((ring) => {
          const cfg = RING_CONFIG[ring];
          const metrics = data.rings[ring];
          const isActive = activeRing === null || activeRing === ring;

          return (
            <motion.button
              key={ring}
              onClick={() => onSelectRing(activeRing === ring ? null : ring)}
              animate={{ opacity: isActive ? 1 : 0.4 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 rounded-xl p-3 text-left transition-all"
              style={{
                backgroundColor: activeRing === ring ? `${cfg.color}18` : "rgba(26,29,39,0.8)",
                border: `1px solid ${activeRing === ring ? cfg.color + "60" : "rgba(255,255,255,0.06)"}`,
              }}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                <span className="text-xs font-semibold text-white">{cfg.label}</span>
              </div>
              <div className="text-sm font-bold" style={{ color: cfg.color }}>
                {formatNumber(metrics.total_balance)}
              </div>
              <div className="text-xs text-text-muted mt-0.5">
                {metrics.allocation_pct.toFixed(0)}% מהתיק
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function RingCircle({
  ring, cx, cy, r, strokeWidth, pct, active, onClick,
}: {
  ring: RingType; cx: number; cy: number; r: number;
  strokeWidth: number; pct: number; active: boolean; onClick: () => void;
}) {
  const cfg = RING_CONFIG[ring];
  const circumference = 2 * Math.PI * r;
  const dashArray = (pct / 100) * circumference;

  return (
    <g
      onClick={onClick}
      style={{ cursor: "pointer" }}
    >
      {/* Track */}
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={`${cfg.color}18`}
        strokeWidth={strokeWidth}
      />
      {/* Active arc */}
      <motion.circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={`url(#grad-${ring})`}
        strokeWidth={active ? strokeWidth + 3 : strokeWidth}
        strokeLinecap="round"
        strokeDasharray={`${dashArray} ${circumference}`}
        transform={`rotate(-90 ${cx} ${cy})`}
        initial={{ strokeDasharray: `0 ${circumference}` }}
        animate={{
          strokeDasharray: `${dashArray} ${circumference}`,
          strokeWidth: active ? strokeWidth + 3 : strokeWidth,
          filter: active ? `drop-shadow(0 0 8px ${cfg.color})` : "none",
        }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />
    </g>
  );
}
