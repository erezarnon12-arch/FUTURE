"use client";

import { useEffect, useState } from "react";
import { getDashboard, getMonteCarlo } from "@/lib/api";
import type { DashboardData, MonteCarloData } from "@/types";
import ProjectionChart from "@/components/charts/ProjectionChart";
import MonteCarloChart from "@/components/charts/MonteCarloChart";
import { formatCurrency, RING_CONFIG } from "@/lib/utils";

interface Props { params: { clientId: string } }

const SCENARIOS = [
  { key: "conservative" as const, label: "שמרני", desc: "תשואה שנתית 4-5%", color: "#94a3b8" },
  { key: "average" as const, label: "ממוצע שוק", desc: "תשואה שנתית 6-9%", color: "#6366f1" },
  { key: "aggressive" as const, label: "אגרסיבי", desc: "תשואה שנתית 8-14%", color: "#10b981" },
];

export default function SimulationPage({ params }: Props) {
  const clientId = parseInt(params.clientId);
  const [data, setData] = useState<DashboardData | null>(null);
  const [tab, setTab] = useState<"projections" | "montecarlo">("projections");
  const [mcScenario, setMcScenario] = useState<"conservative" | "average" | "aggressive">("average");
  const [mcData, setMcData] = useState<MonteCarloData | null>(null);
  const [mcLoading, setMcLoading] = useState(false);

  useEffect(() => {
    getDashboard(clientId).then(setData);
  }, [clientId]);

  useEffect(() => {
    if (tab !== "montecarlo") return;
    setMcLoading(true);
    getMonteCarlo(clientId, mcScenario, 1000)
      .then(setMcData)
      .catch(() => {})
      .finally(() => setMcLoading(false));
  }, [clientId, tab, mcScenario]);

  if (!data) {
    return (
      <div className="flex justify-center p-12">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">◉ סימולציה עתידית</h1>
        <p className="text-text-secondary text-sm mt-1">
          תחזית עושר לגיל פרישה {data.client.retirement_age} תחת 3 תרחישי שוק
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2">
        {[
          { key: "projections" as const, label: "תחזיות" },
          { key: "montecarlo" as const, label: "מונטה קרלו" },
        ].map((t) => (
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

      {tab === "projections" && (
        <>
          <div className="grid grid-cols-3 gap-4">
            {SCENARIOS.map((s) => {
              const proj = data.projections[s.key];
              return (
                <div key={s.key} className="glass rounded-2xl p-5" style={{ borderColor: `${s.color}30`, borderWidth: 1 }}>
                  <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: s.color }}>{s.label}</div>
                  <div className="text-xs text-text-muted mb-3">{s.desc}</div>
                  <div className="text-2xl font-bold text-white">{formatCurrency(proj.total_projected_wealth)}</div>
                  <div className="text-xs text-text-secondary mt-1">בגיל {proj.retirement_age}</div>
                  <div className="mt-3 space-y-1">
                    {Object.entries(proj.projections_by_ring).map(([ring, rp]) => (
                      <div key={ring} className="flex justify-between text-xs">
                        <span style={{ color: RING_CONFIG[ring as keyof typeof RING_CONFIG]?.color }} className="capitalize">{ring}</span>
                        <span className="text-text-secondary">{formatCurrency(rp.final_value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="glass rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-5">צמיחת עושר לאורך זמן</h2>
            <ProjectionChart data={data} />
          </div>

          <div className="glass rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-4">הנחות</h2>
            <div className="grid grid-cols-3 gap-4 text-sm">
              {[
                { label: "שמרני", rows: [["טבעת פרישה", "4% / שנה"], ["טבעת ביטחון", "2% / שנה"], ["טבעת צמיחה", "5% / שנה"]] },
                { label: "ממוצע", rows: [["טבעת פרישה", "6% / שנה"], ["טבעת ביטחון", "3% / שנה"], ["טבעת צמיחה", "9% / שנה"]] },
                { label: "אגרסיבי", rows: [["טבעת פרישה", "8% / שנה"], ["טבעת ביטחון", "3.5% / שנה"], ["טבעת צמיחה", "14% / שנה"]] },
              ].map((s) => (
                <div key={s.label}>
                  <div className="text-xs text-text-secondary font-semibold mb-2">{s.label}</div>
                  {s.rows.map(([ring, ret]) => (
                    <div key={ring} className="flex justify-between text-xs mb-1">
                      <span className="text-text-muted">{ring}</span>
                      <span className="text-white">{ret}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <p className="text-xs text-text-muted mt-4">
              * ההפקדות החודשיות מחושבות בריבית דריבית חודשית. התחזיות הן להמחשה בלבד ואינן מובטחות.
              ביצועי עבר אינם מנבאים תוצאות עתידיות.
            </p>
          </div>
        </>
      )}

      {tab === "montecarlo" && (
        <>
          <div className="flex gap-2 flex-wrap">
            {SCENARIOS.map((s) => (
              <button
                key={s.key}
                onClick={() => setMcScenario(s.key)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={
                  mcScenario === s.key
                    ? { backgroundColor: `${s.color}20`, color: s.color, border: `1px solid ${s.color}50` }
                    : { backgroundColor: "transparent", color: "#64748b", border: "1px solid rgba(255,255,255,0.08)" }
                }
              >
                {s.label}
                <span className="ml-2 text-xs opacity-60">{s.desc}</span>
              </button>
            ))}
          </div>

          <div className="glass rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-5">
              סימולציית מונטה קרלו — 1,000 מסלולים
            </h2>
            {mcLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : mcData ? (
              <MonteCarloChart data={mcData} />
            ) : (
              <div className="text-center text-text-muted py-8 text-sm">בחר תרחיש למעלה להפעלת הסימולציה.</div>
            )}
          </div>

          <div className="glass rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">אודות מונטה קרלו</h2>
            <p className="text-xs text-text-muted leading-relaxed">
              כל סימולציה מריצה 1,000 מסלולים אקראיים תוך שימוש בפיצולי תשואה לוג-נורמליים.
              הרצועות מציגות את התוצאות באחוזון ה-10, 25, 50, 75 ו-90.
              הסתברות הצלחה = שיעור המסלולים החורג מחיסכון היעד בגיל הפרישה.
              ביצועי עבר אינם מבטיחים תוצאות עתידיות.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
