"use client";

import { useEffect, useState, useCallback } from "react";
import { getDashboard, getRetirementReadiness, createAsset } from "@/lib/api";
import type { DashboardData, RetirementReadiness } from "@/types";
import RingDetail from "@/components/rings/RingDetail";
import RetirementReadinessWidget from "@/components/ui/RetirementReadinessWidget";
import { formatCurrency } from "@/lib/utils";

interface Props { params: { clientId: string } }

const ASSET_TYPES = [
  { value: "pension_fund",      label: "קרן פנסיה" },
  { value: "pension_insurance", label: "ביטוח מנהלים" },
  { value: "study_fund",        label: "קרן השתלמות" },
  { value: "provident_fund",    label: "קופת גמל" },
  { value: "ira",               label: "IRA" },
];

const EMPTY_FORM = { name: "", asset_type: "pension_fund", provider: "", balance: "", monthly_deposit: "", management_fees: "" };

export default function RetirementPage({ params }: Props) {
  const clientId = parseInt(params.clientId);
  const [data, setData] = useState<DashboardData | null>(null);
  const [readiness, setReadiness] = useState<RetirementReadiness | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const reload = useCallback(() => {
    getDashboard(clientId).then(setData);
    getRetirementReadiness(clientId).then(setReadiness).catch(() => {});
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
        ring: "retirement",
        balance: Number(form.balance),
        monthly_deposit: Number(form.monthly_deposit) || 0,
        management_fees: form.management_fees ? Number(form.management_fees) : undefined,
        provider: form.provider || undefined,
        risk_level: "low",
        liquidity_level: "long_term",
      });
      setShowForm(false);
      setForm(EMPTY_FORM);
      reload();
    } finally {
      setSaving(false);
    }
  };

  if (!data) return (
    <div className="flex justify-center p-12">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const ring = data.rings.retirement;
  const yearsLeft = data.client.retirement_age - data.client.age;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">🏛 טבעת העתיד</h1>
          <p className="text-text-secondary text-sm mt-1">נכסי פנסיה וחיסכון לטווח ארוך · {yearsLeft} שנים לפרישה</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${showForm ? "bg-white/10 text-text-secondary hover:text-white" : "bg-indigo-600 hover:bg-indigo-500 text-white"}`}
        >
          {showForm ? "✕ בטל" : "+ הוסף נכס"}
        </button>
      </div>

      {/* Inline add form */}
      {showForm && (
        <div className="glass rounded-2xl p-6 border border-indigo-500/20 space-y-4">
          <h2 className="text-base font-semibold text-white">הוספת נכס — טבעת העתיד</h2>
          <form onSubmit={handleAdd} className="grid grid-cols-2 gap-4">
            <div className="col-span-2 flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary">שם הנכס</label>
              <input type="text" value={form.name} onChange={e => set("name", e.target.value)} placeholder='למשל: "קרן פנסיה מנורה"' required className="p-3 rounded-xl bg-surface text-white border border-white/8 focus:border-indigo-500/50 outline-none" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary">סוג נכס</label>
              <select value={form.asset_type} onChange={e => set("asset_type", e.target.value)} className="p-3 rounded-xl bg-surface text-white border border-white/8 focus:border-indigo-500/50 outline-none">
                {ASSET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary">גוף מנהל</label>
              <input type="text" value={form.provider} onChange={e => set("provider", e.target.value)} placeholder="מנורה, הראל, כלל..." className="p-3 rounded-xl bg-surface text-white border border-white/8 focus:border-indigo-500/50 outline-none" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary">יתרה נוכחית (₪)</label>
              <input type="number" value={form.balance} onChange={e => set("balance", e.target.value)} placeholder="0" min={0} required className="p-3 rounded-xl bg-surface text-white border border-white/8 focus:border-indigo-500/50 outline-none" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary">הפקדה חודשית (₪)</label>
              <input type="number" value={form.monthly_deposit} onChange={e => set("monthly_deposit", e.target.value)} placeholder="0" min={0} className="p-3 rounded-xl bg-surface text-white border border-white/8 focus:border-indigo-500/50 outline-none" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary">דמי ניהול מצבירה (%)</label>
              <input type="number" value={form.management_fees} onChange={e => set("management_fees", e.target.value)} placeholder="0.5" step="0.01" min={0} max={5} className="p-3 rounded-xl bg-surface text-white border border-white/8 focus:border-indigo-500/50 outline-none" />
            </div>
            <div className="col-span-2 flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-text-secondary hover:text-white transition-colors">ביטול</button>
              <button type="submit" disabled={saving} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors">
                {saving ? "שומר..." : "הוסף נכס ←"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "יתרה כוללת", value: formatCurrency(ring.total_balance), color: "#6366f1" },
          { label: "הפקדות חודשיות", value: formatCurrency(ring.total_monthly_deposit) },
          { label: "עמלה ממוצעת", value: `${ring.avg_management_fee.toFixed(2)}%`, color: ring.avg_management_fee > 1 ? "#f59e0b" : "#10b981" },
        ].map((s) => (
          <div key={s.label} className="glass rounded-2xl p-4">
            <div className="text-sm text-text-secondary mb-1">{s.label}</div>
            <div className="text-xl font-bold" style={{ color: s.color || "white" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {readiness ? (
        <div className="glass rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-5">מוכנות לפרישה</h2>
          <RetirementReadinessWidget data={readiness} />
        </div>
      ) : (
        <div className="glass rounded-2xl p-6 flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <RingDetail ring="retirement" metrics={ring} />
    </div>
  );
}
