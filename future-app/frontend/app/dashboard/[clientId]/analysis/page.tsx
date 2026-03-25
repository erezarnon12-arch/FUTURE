"use client";

import { useCallback, useEffect, useState } from "react";
import { runAnalysis, getRetirementReadiness, getRebalancing, getFeesReport } from "@/lib/api";
import type { AIAnalysis, RetirementReadiness, RebalanceData, FeeDragData } from "@/types";
import AIInsightsPanel from "@/components/ui/AIInsightsPanel";
import RetirementReadinessWidget from "@/components/ui/RetirementReadinessWidget";
import RebalanceWidget from "@/components/ui/RebalanceWidget";
import FeeDragChart from "@/components/charts/FeeDragChart";
import { RING_CONFIG } from "@/lib/utils";

interface Props { params: { clientId: string } }

const TABS = [
  { key: "ai", label: "ניתוח AI" },
  { key: "readiness", label: "מוכנות לפרישה" },
  { key: "rebalancing", label: "איזון מחדש" },
  { key: "fees", label: "השפעת עמלות" },
] as const;

type Tab = typeof TABS[number]["key"];

const HORIZON_OPTIONS = [10, 20, 30] as const;

export default function AnalysisPage({ params }: Props) {
  const clientId = parseInt(params.clientId);
  const [tab, setTab] = useState<Tab>("ai");
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [readiness, setReadiness] = useState<RetirementReadiness | null>(null);
  const [rebalance, setRebalance] = useState<RebalanceData | null>(null);
  const [feeDrag, setFeeDrag] = useState<FeeDragData | null>(null);
  const [feesLoading, setFeesLoading] = useState(false);
  const [feeHorizon, setFeeHorizon] = useState<10 | 20 | 30>(30);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getRetirementReadiness(clientId),
      getRebalancing(clientId),
      getFeesReport(clientId, 30),
    ])
      .then(([r, rb, f]) => {
        setReadiness(r);
        setRebalance(rb);
        setFeeDrag(f);
      })
      .catch(() => {})
      .finally(() => setAnalyticsLoading(false));
  }, [clientId]);

  useEffect(() => {
    if (tab !== "fees") return;
    setFeesLoading(true);
    getFeesReport(clientId, feeHorizon)
      .then(setFeeDrag)
      .catch(() => {})
      .finally(() => setFeesLoading(false));
  }, [clientId, feeHorizon, tab]);

  const handleRun = useCallback(async () => {
    setAnalysisLoading(true);
    try {
      const result = await runAnalysis(clientId);
      setAnalysis(result);
    } finally {
      setAnalysisLoading(false);
    }
  }, [clientId]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">✦ ניתוח AI</h1>
        <p className="text-text-secondary text-sm mt-1">
          מופעל על ידי Claude AI · ניתוח ותובנות לתיק
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={
              tab === t.key
                ? { backgroundColor: "rgba(99,102,241,0.15)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.3)" }
                : { backgroundColor: "transparent", color: "#64748b", border: "1px solid rgba(255,255,255,0.08)" }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* AI Analysis tab */}
      {tab === "ai" && (
        <>
          <div className="glass rounded-2xl p-6">
            <AIInsightsPanel analysis={analysis} loading={analysisLoading} onRunAnalysis={handleRun} />
          </div>

          {analysis && (
            <div className="glass rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-4">
                הערכה לפי טבעת
              </h2>
              <div className="space-y-4">
                {Object.entries(analysis.ring_analysis).map(([ring, ra]) => {
                  const cfg = RING_CONFIG[ring as keyof typeof RING_CONFIG];
                  if (!cfg) return null;
                  return (
                    <div key={ring} className="rounded-xl p-4" style={{ backgroundColor: `${cfg.color}10`, border: `1px solid ${cfg.color}25` }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span>{cfg.icon}</span>
                          <span className="font-semibold text-white">טבעת {cfg.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${ra.score}%`, backgroundColor: cfg.color }} />
                          </div>
                          <span className="text-sm font-bold" style={{ color: cfg.color }}>{ra.score}/100</span>
                        </div>
                      </div>
                      <p className="text-base text-text-secondary">{ra.assessment}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Retirement Readiness tab */}
      {tab === "readiness" && (
        <div className="glass rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-5">
            מוכנות לפרישה
          </h2>
          {analyticsLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : readiness ? (
            <RetirementReadinessWidget data={readiness} />
          ) : (
            <div className="text-center text-text-muted py-8 text-sm">לא ניתן לטעון נתוני מוכנות לפרישה.</div>
          )}
        </div>
      )}

      {/* Rebalancing tab */}
      {tab === "rebalancing" && (
        <div className="glass rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-5">
            איזון תיק מחדש
          </h2>
          {analyticsLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : rebalance ? (
            <RebalanceWidget data={rebalance} />
          ) : (
            <div className="text-center text-text-muted py-8 text-sm">לא ניתן לטעון נתוני איזון.</div>
          )}
        </div>
      )}

      {/* Fee Drag tab */}
      {tab === "fees" && (
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
              ניתוח השפעת עמלות
            </h2>
            {/* Horizon selector */}
            <div className="flex gap-1">
              {HORIZON_OPTIONS.map((h) => (
                <button
                  key={h}
                  onClick={() => setFeeHorizon(h)}
                  className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
                  style={
                    feeHorizon === h
                      ? { backgroundColor: "rgba(99,102,241,0.15)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.3)" }
                      : { backgroundColor: "transparent", color: "#64748b", border: "1px solid rgba(255,255,255,0.08)" }
                  }
                >
                  {h} שנים
                </button>
              ))}
            </div>
          </div>
          {feesLoading || analyticsLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : feeDrag ? (
            <FeeDragChart data={feeDrag} />
          ) : (
            <div className="text-center text-text-muted py-8 text-sm">לא ניתן לטעון נתוני השפעת עמלות.</div>
          )}
        </div>
      )}
    </div>
  );
}
