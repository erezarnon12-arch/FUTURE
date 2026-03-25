"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { AIAnalysis, AIFinding } from "@/types";
import { SEVERITY_CONFIG } from "@/lib/utils";
import HealthScore from "./HealthScore";

interface Props {
  analysis: AIAnalysis | null;
  loading: boolean;
  onRunAnalysis: () => void;
}

export default function AIInsightsPanel({ analysis, loading, onRunAnalysis }: Props) {
  const [tab, setTab] = useState<"findings" | "recommendations">("findings");

  if (!analysis && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4 text-2xl">
          🤖
        </div>
        <h3 className="font-semibold text-white mb-2">ניתוח AI מוכן</h3>
        <p className="text-text-secondary text-sm mb-6 max-w-xs">
          הרץ ניתוח מלא של התיק מבוסס Claude AI לקבלת תובנות והמלצות אישיות.
        </p>
        <button
          onClick={onRunAnalysis}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all"
        >
          הרץ ניתוח AI
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-4">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-text-secondary text-sm">מנתח את התיק שלך עם AI...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Score + Summary */}
      <div className="flex items-start gap-5 mb-5 p-4 glass rounded-xl">
        <HealthScore score={analysis!.financial_health_score} size={80} />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-text-secondary mb-1">סיכום AI</h3>
          <p className="text-sm text-white leading-relaxed">{analysis!.summary}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {(["findings", "recommendations"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={
              tab === t
                ? { backgroundColor: "rgba(99,102,241,0.15)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.3)" }
                : { backgroundColor: "transparent", color: "#64748b", border: "1px solid rgba(255,255,255,0.06)" }
            }
          >
            {t === "findings" ? "ממצאים" : "המלצות"}
            {t === "findings" && ` (${analysis!.findings.length})`}
            {t === "recommendations" && ` (${analysis!.recommendations.length})`}
          </button>
        ))}
        <button
          onClick={onRunAnalysis}
          className="ml-auto px-3 py-2 text-xs text-text-muted hover:text-white border border-white/10 rounded-lg transition-all"
        >
          רענן ↻
        </button>
      </div>

      <AnimatePresence mode="wait">
        {tab === "findings" && (
          <motion.div
            key="findings"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-2"
          >
            {analysis!.findings.map((f, i) => (
              <FindingRow key={i} finding={f} />
            ))}
          </motion.div>
        )}
        {tab === "recommendations" && (
          <motion.div
            key="recs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {analysis!.recommendations.map((r, i) => (
              <div key={i} className="glass rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {r.priority}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-white mb-1">{r.action}</div>
                    <div className="text-xs text-text-secondary mb-2">{r.rationale}</div>
                    <div className="text-xs text-emerald-400 flex items-center gap-1">
                      <span>→</span> {r.impact}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FindingRow({ finding }: { finding: AIFinding }) {
  const cfg = SEVERITY_CONFIG[finding.severity] || SEVERITY_CONFIG.info;
  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${cfg.bg} ${cfg.border}`}>
      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${cfg.dot}`} />
      <div>
        <div className={`text-xs font-semibold mb-0.5 ${cfg.color}`}>{finding.category}</div>
        <div className="text-sm text-text-primary">{finding.message}</div>
      </div>
    </div>
  );
}
