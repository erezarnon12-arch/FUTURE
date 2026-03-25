"use client";

import { motion } from "framer-motion";

interface Props {
  score: number;
  size?: number;
}

function scoreColor(s: number): string {
  if (s >= 80) return "#10b981";
  if (s >= 60) return "#6366f1";
  if (s >= 40) return "#f59e0b";
  return "#ef4444";
}

function scoreLabel(s: number): string {
  if (s >= 80) return "מצוין";
  if (s >= 60) return "טוב";
  if (s >= 40) return "בינוני";
  return "בסיכון";
}

export default function HealthScore({ score, size = 120 }: Props) {
  const r = (size / 2) * 0.75;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = scoreColor(score);
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div className="flex flex-col items-center">
      <div style={{ width: size, height: size }} className="relative">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Track */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} />
          {/* Score arc */}
          <motion.circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={color}
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            transform={`rotate(-90 ${cx} ${cy})`}
            initial={{ strokeDasharray: `0 ${circ}` }}
            animate={{ strokeDasharray: `${dash} ${circ}` }}
            transition={{ duration: 1.4, ease: "easeOut" }}
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
          {/* Score text */}
          <text x={cx} y={cy - 6} textAnchor="middle" fill="white" fontSize={size * 0.22} fontWeight="700" fontFamily="Inter">
            {score}
          </text>
          <text x={cx} y={cy + 12} textAnchor="middle" fill="#64748b" fontSize={size * 0.09} fontFamily="Inter">
            / 100
          </text>
        </svg>
      </div>
      <div className="text-sm font-semibold mt-1" style={{ color }}>
        {scoreLabel(score)}
      </div>
    </div>
  );
}
