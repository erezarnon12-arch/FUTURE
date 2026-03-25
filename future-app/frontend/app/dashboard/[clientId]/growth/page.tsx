"use client";

import { useEffect, useState, useCallback } from "react";
import { getDashboard, createAsset } from "@/lib/api";
import type { DashboardData } from "@/types";
import RingDetail from "@/components/rings/RingDetail";
import { formatCurrency } from "@/lib/utils";

interface Props { params: { clientId: string } }

const ASSET_TYPES = [
  { value: "stock",               label: "מניות" },
  { value: "etf",                 label: "תעודת סל" },
  { value: "crypto",              label: "קריפטו" },
  { value: "high_risk_provident", label: "קרן נאמנות" },
  { value: "stock_portfolio",     label: "תיק מניות מנוהל" },
];

const EMPTY_FORM = { name: "", asset_type: "etf", provider: "", balance: "", monthly_deposit: "", historical_return: "" };

export default function GrowthPage({ params }: Props) {
  const clientId = parseInt(params.clientId);
  const [data, setData] = useState<DashboardData | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const reload = useCallback(() => {
    getDashboard(clientId).then(setData);
  }, [clientId]);

  useEffect(() => { reload(); }, [reload]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createAsset(clientId, {
        name: form.name,
        asset_type: form.asset_type as never,
        ring: "growth",
        balance: Number(form.balance),
        monthly_deposit: Number(form.monthly_deposit) || 0,
        historical_return: form.historical_return ? Number(form.historical_return) : undefined,
        provider: form.provider || undefined,
        risk_level: "high",
        liquidity_level: "medium_term",
      });
      setShowForm(false);
      setForm(EMPTY_FORM);
      reload();
    } finally {
      setSaving(false);
    }
  };

  if (!data) return <div className="flex justify-center p-12"><div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>;

  const ring = data.rings.growth;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">🚀 טבעת הצמיחה</h1>
          <p className="text-text-secondary text-sm mt-1">השקעות סיכון גבוה ותשואה גבוהה · מניות, תעודות סל, קריפטו</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${showForm ? "bg-white/10 text-text-secondary hover:text-white" : "bg-amber-600 hover:bg-amber-500 text-white"}`}
        >
          {showForm ? "✕ בטל" : "+ הוסף נכס"}
        </button>
      </div>

      {/* Inline add form */}
      {showForm && (
        <div className="glass rounded-2xl p-6 border border-amber-500/20 space-y-4">
          <h2 className="text-base font-semibold text-white">הוספת נכס — טבעת הצמיחה</h2>
          <form onSubmit={handleAdd} className="grid grid-cols-2 gap-4">
            <div className="col-span-2 flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary">שם הנכס</label>
              <input type="text" value={form.name} onChange={e => set("name", e.target.value)} placeholder='למשל: "תעודת סל S&P 500"' required className="p-3 rounded-xl bg-surface text-white border border-white/8 focus:border-amber-500/50 outline-none" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary">סוג נכס</label>
              <select value={form.asset_type} onChange={e => set("asset_type", e.target.value)} className="p-3 rounded-xl bg-surface text-white border border-white/8 focus:border-amber-500/50 outline-none">
                {ASSET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary">בית השקעות / פלטפורמה</label>
              <input type="text" value={form.provider} onChange={e => set("provider", e.target.value)} placeholder="מיטב, אינטראקטיב ברוקרס..." className="p-3 rounded-xl bg-surface text-white border border-white/8 focus:border-amber-500/50 outline-none" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary">יתרה נוכחית (₪)</label>
              <input type="number" value={form.balance} onChange={e => set("balance", e.target.value)} placeholder="0" min={0} required className="p-3 rounded-xl bg-surface text-white border border-white/8 focus:border-amber-500/50 outline-none" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary">הפקדה חודשית (₪)</label>
              <input type="number" value={form.monthly_deposit} onChange={e => set("monthly_deposit", e.target.value)} placeholder="0" min={0} className="p-3 rounded-xl bg-surface text-white border border-white/8 focus:border-amber-500/50 outline-none" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary">תשואה היסטורית (%)</label>
              <input type="number" value={form.historical_return} onChange={e => set("historical_return", e.target.value)} placeholder="7" step="0.1" className="p-3 rounded-xl bg-surface text-white border border-white/8 focus:border-amber-500/50 outline-none" />
            </div>
            <div className="col-span-2 flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-text-secondary hover:text-white transition-colors">ביטול</button>
              <button type="submit" disabled={saving} className="px-6 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors">
                {saving ? "שומר..." : "הוסף נכס ←"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "יתרה כוללת", value: formatCurrency(ring.total_balance), color: "#f59e0b" },
          { label: "תשואה ממוצעת", value: `${ring.avg_historical_return.toFixed(1)}%`, color: "#10b981" },
          { label: "חלק מהתיק", value: `${ring.allocation_pct.toFixed(1)}%` },
        ].map((s) => (
          <div key={s.label} className="glass rounded-2xl p-4">
            <div className="text-sm text-text-secondary mb-1">{s.label}</div>
            <div className="text-xl font-bold" style={{ color: s.color || "white" }}>{s.value}</div>
          </div>
        ))}
      </div>

      <RingDetail ring="growth" metrics={ring} />
    </div>
  );
}
