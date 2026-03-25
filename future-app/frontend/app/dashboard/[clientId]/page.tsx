"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getDashboard, runAnalysis, deleteClient } from "@/lib/api";
import type { DashboardData, AIAnalysis, RingType } from "@/types";
import { formatCurrency, formatNumber } from "@/lib/utils";
import RingVisualization from "@/components/rings/RingVisualization";
import RingDetail from "@/components/rings/RingDetail";
import AllocationBar from "@/components/charts/AllocationBar";
import ProjectionChart from "@/components/charts/ProjectionChart";
import SafetyCushion from "@/components/ui/SafetyCushion";
import AIInsightsPanel from "@/components/ui/AIInsightsPanel";

interface Props {
  params: { clientId: string };
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="text-xs font-medium text-text-secondary mb-2 uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-bold" style={{ color: color || "white" }}>{value}</div>
      {sub && <div className="text-xs text-text-muted mt-1">{sub}</div>}
    </div>
  );
}

export default function DashboardPage({ params }: Props) {
  const clientId = parseInt(params.clientId);
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [activeRing, setActiveRing] = useState<RingType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getDashboard(clientId)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [clientId]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteClient(clientId);
      router.push("/clients");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleRunAnalysis = useCallback(async () => {
    setAnalysisLoading(true);
    try {
      const result = await runAnalysis(clientId);
      setAnalysis(result);
    } finally {
      setAnalysisLoading(false);
    }
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-screen text-red-400">
        {error || "טעינת לוח הבקרה נכשלה. ודא שהשרת פעיל."}
      </div>
    );
  }

  const netWorthColor = data.net_worth >= 0 ? "#10b981" : "#ef4444";
  const surplusColor = data.monthly_surplus >= 0 ? "#10b981" : "#ef4444";

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{data.client.name}</h1>
          <p className="text-text-secondary text-sm">
            גיל {data.client.age} · פרישה בגיל {data.client.retirement_age} ·{" "}
            {data.client.retirement_age - data.client.age} שנים נותרות
          </p>
        </div>
        <div className="flex items-center gap-2">
          {data.flags.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-amber-400 text-xs font-medium">{data.flags.length} התראות</span>
            </div>
          )}
        </div>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="שווי נטו"
          value={formatCurrency(data.net_worth)}
          sub={`נכסים: ${formatCurrency(data.total_assets)}`}
          color={netWorthColor}
        />
        <StatCard
          label="סך נכסים"
          value={formatCurrency(data.total_assets)}
          sub={`${Object.values(data.rings).reduce((s, r) => s + r.asset_count, 0)} נכסים ב-3 טבעות`}
        />
        <StatCard
          label="סך התחייבויות"
          value={formatCurrency(data.total_liabilities)}
          sub={`${data.liabilities.length} התחייבויות פעילות`}
          color="#f87171"
        />
        <StatCard
          label="עודף חודשי"
          value={formatCurrency(data.monthly_surplus)}
          sub={`הכנסה: ${formatCurrency(data.client.monthly_income)}`}
          color={surplusColor}
        />
      </div>

      {/* Quick actions — add data per ring */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: "טבעת העתיד", icon: "🏛", href: `/dashboard/${clientId}/retirement`, count: data.rings.retirement.asset_count, color: "indigo" },
          { label: "טבעת הביטחון", icon: "🛡", href: `/dashboard/${clientId}/security`, count: data.rings.security.asset_count, color: "emerald" },
          { label: "טבעת הצמיחה", icon: "🚀", href: `/dashboard/${clientId}/growth`, count: data.rings.growth.asset_count, color: "amber" },
          { label: "התחייבויות", icon: "⊖", href: `/dashboard/${clientId}/liabilities`, count: data.liabilities.length, color: "rose" },
          { label: "יעדים", icon: "◎", href: `/dashboard/${clientId}/goals`, count: null, color: "violet" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="glass rounded-xl p-4 border border-white/5 hover:border-indigo-500/30 hover:bg-white/3 transition-all group flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xl">{item.icon}</span>
              {item.count !== null && (
                <span className="text-xs text-text-muted">{item.count} פריטים</span>
              )}
            </div>
            <div className="text-sm font-medium text-white">{item.label}</div>
            <div className="text-xs text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
              {item.count === 0 ? "הוסף נתונים ←" : "ערוך / הוסף ←"}
            </div>
          </Link>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Ring visualization + detail */}
        <div className="xl:col-span-1 space-y-6">
          <div className="glass rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-5">
              טבעות פיננסיות
            </h2>
            <RingVisualization
              data={data}
              activeRing={activeRing}
              onSelectRing={setActiveRing}
            />
          </div>

          {/* Security Cushion */}
          <div className="glass rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-4">
              כרית ביטחון
            </h2>
            <SafetyCushion data={data} />
          </div>
        </div>

        {/* Center: Ring detail + Allocation */}
        <div className="xl:col-span-1 space-y-6">
          {/* Ring detail or overview */}
          {activeRing ? (
            <RingDetail ring={activeRing} metrics={data.rings[activeRing]} />
          ) : (
            <div className="glass rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-4">
                הקצאת נכסים
              </h2>
              <AllocationBar data={data} />

              {/* Flags */}
              {data.flags.length > 0 && (
                <div className="mt-5 space-y-2">
                  <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                    התראות
                  </h3>
                  {data.flags.slice(0, 3).map((flag, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-amber-300 glass rounded-lg px-3 py-2 border border-amber-500/20">
                      <span className="text-amber-500 mt-0.5 flex-shrink-0">⚠</span>
                      {flag}
                    </div>
                  ))}
                  {data.flags.length > 3 && (
                    <div className="text-xs text-text-muted text-center">
                      ועוד {data.flags.length - 3} התראות
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Liabilities */}
          <div className="glass rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-4">
              התחייבויות
            </h2>
            {data.liabilities.length === 0 ? (
              <p className="text-text-muted text-sm">אין התחייבויות</p>
            ) : (
              <div className="space-y-3">
                {data.liabilities.map((l) => (
                  <div key={l.id} className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-white font-medium">{l.name}</div>
                      <div className="text-xs text-text-muted capitalize">
                        {l.liability_type} · {l.interest_rate}% APR
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-red-400 font-semibold">
                        {formatCurrency(l.remaining_balance)}
                      </div>
                      <div className="text-xs text-text-muted">
                        ₪{formatNumber(l.monthly_payment)}/mo
                      </div>
                    </div>
                  </div>
                ))}
                <div className="border-t border-white/5 pt-3 flex justify-between text-sm">
                  <span className="text-text-secondary">סך תשלומים חודשיים</span>
                  <span className="text-red-400 font-semibold">
                    {formatCurrency(data.liabilities.reduce((s, l) => s + l.monthly_payment, 0))}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: AI Insights */}
        <div className="xl:col-span-1">
          <div className="glass rounded-2xl p-5 h-full">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
                תובנות AI
              </h2>
              <span className="text-xs text-indigo-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                Claude AI
              </span>
            </div>
            <AIInsightsPanel
              analysis={analysis}
              loading={analysisLoading}
              onRunAnalysis={handleRunAnalysis}
            />
          </div>
        </div>
      </div>

      {/* Projection chart */}
      <div className="glass rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-5">
          תחזית עושר לפרישה
        </h2>
        <ProjectionChart data={data} />
      </div>

      {/* Delete portfolio */}
      <div className="border-t border-white/5 pt-8 pb-4 flex justify-center">
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="px-5 py-2.5 text-sm text-red-400/60 hover:text-red-400 border border-red-500/10 hover:border-red-500/30 rounded-xl transition-all"
          >
            מחק תיק
          </button>
        ) : (
          <div className="flex flex-col items-center gap-3 p-5 bg-red-500/5 border border-red-500/20 rounded-2xl text-center max-w-sm w-full">
            <p className="text-white font-medium">האם אתה בטוח שאתה רוצה למחוק תיק זה?</p>
            <p className="text-text-secondary text-sm">פעולה זו תמחק את כל הנכסים, ההתחייבויות והיעדים. לא ניתן לשחזר.</p>
            <div className="flex gap-3 mt-1">
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-5 py-2 text-sm text-text-secondary hover:text-white border border-white/10 rounded-xl transition-colors"
              >
                ביטול
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-5 py-2 text-sm font-medium bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl transition-colors"
              >
                {deleting ? "מוחק..." : "כן, מחק תיק"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
