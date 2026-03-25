"use client";

import { useEffect, useState, useCallback } from "react";
import { getDashboard, createAsset } from "@/lib/api";
import type { DashboardData } from "@/types";
import RingDetail from "@/components/rings/RingDetail";
import SafetyCushion from "@/components/ui/SafetyCushion";
import { formatCurrency } from "@/lib/utils";

interface Props { params: { clientId: string } }

const ASSET_TYPES = [
  { value: "money_market",     label: "קרן כספית" },
  { value: "bank_deposit",     label: "פיקדון בנקאי" },
  { value: "government_bond",  label: "אג\"ח ממשלתי" },
  { value: "liquid_etf",       label: "תעודת סל נזילה" },
];

const EMPTY_FORM = { name: "", asset_type: "money_market", provider: "", balance: "", monthly_deposit: "", management_fees: "" };

export default function SecurityPage({ params }: Props) {
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
        ring: "security",
        balance: Number(form.balance),
        monthly_deposit: Number(form.monthly_deposit) || 0,
        management_fees: form.management_fees ? Number(form.management_fees) : undefined,
        provider: form.provider || undefined,
        risk_level: "very_low",
        liquidity_level: "immediate",
      });
      setShowForm(false);
      setForm(EMPTY_FORM);
      reload();
    } finally {
      setSaving(false);
    }
  };

  if (!data) return <div className="flex justify-center p-12"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  const ring = data.rings.security;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">🛡 טבעת הביטחון</h1>
          <p className="text-text-secondary text-sm mt-1">רשת ביטחון פיננסית · נכסים נזילים ובעלי תנודתיות נמוכה</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${showForm ? "bg-white/10 text-text-secondary hover:text-white" : "bg-emerald-600 hover:bg-emerald-500 text-white"}`}
        >
          {showForm ? "✕ בטל" : "+ הוסף נכס"}
        </button>
      </div>

      {/* Inline add form */}
      {showForm && (
        <div className="glass rounded-2xl p-6 border border-emerald-500/20 space-y-4">
          <h2 className="text-base font-semibold text-white">הוספת נכס — טבעת הביטחון</h2>
          <form onSubmit={handleAdd} className="grid grid-cols-2 gap-4">
            <div className="col-span-2 flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary">שם הנכס</label>
              <input type="text" value={form.name} onChange={e => set("name", e.target.value)} placeholder='למשל: "קרן כספית מגדל"' required className="p-3 rounded-xl bg-surface text-white border border-white/8 focus:border-emerald-500/50 outline-none" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary">סוג נכס</label>
              <select value={form.asset_type} onChange={e => set("asset_type", e.target.value)} className="p-3 rounded-xl bg-surface text-white border border-white/8 focus:border-emerald-500/50 outline-none">
                {ASSET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary">גוף מנהל</label>
              <input type="text" value={form.provider} onChange={e => set("provider", e.target.value)} placeholder="מגדל, אינפיניטי, פסגות..." className="p-3 rounded-xl bg-surface text-white border border-white/8 focus:border-emerald-500/50 outline-none" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary">יתרה נוכחית (₪)</label>
              <input type="number" value={form.balance} onChange={e => set("balance", e.target.value)} placeholder="0" min={0} required className="p-3 rounded-xl bg-surface text-white border border-white/8 focus:border-emerald-500/50 outline-none" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary">הפקדה חודשית (₪)</label>
              <input type="number" value={form.monthly_deposit} onChange={e => set("monthly_deposit", e.target.value)} placeholder="0" min={0} className="p-3 rounded-xl bg-surface text-white border border-white/8 focus:border-emerald-500/50 outline-none" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-secondary">דמי ניהול (%)</label>
              <input type="number" value={form.management_fees} onChange={e => set("management_fees", e.target.value)} placeholder="0.1" step="0.01" min={0} max={5} className="p-3 rounded-xl bg-surface text-white border border-white/8 focus:border-emerald-500/50 outline-none" />
            </div>
            <div className="col-span-2 flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-text-secondary hover:text-white transition-colors">ביטול</button>
              <button type="submit" disabled={saving} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors">
                {saving ? "שומר..." : "הוסף נכס ←"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-5">
          <h2 className="text-base text-text-secondary uppercase font-semibold mb-3">כרית ביטחון</h2>
          <SafetyCushion data={data} />
        </div>
        <div className="glass rounded-2xl p-5">
          <h2 className="text-base text-text-secondary uppercase font-semibold mb-3">סקירת טבעת</h2>
          <div className="space-y-3">
            {[
              { label: "יתרה כוללת", value: formatCurrency(ring.total_balance), color: "#10b981" },
              { label: "הפקדות חודשיות", value: formatCurrency(ring.total_monthly_deposit) },
              { label: "הוצאות חודשיות", value: formatCurrency(data.client.monthly_expenses) },
              { label: "כיסוי", value: `${data.safety_months} חודשים`, color: data.safety_months >= 6 ? "#10b981" : "#f59e0b" },
            ].map((s) => (
              <div key={s.label} className="flex justify-between">
                <span className="text-base text-text-secondary">{s.label}</span>
                <span className="text-sm font-semibold" style={{ color: s.color || "white" }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <RingDetail ring="security" metrics={ring} />
    </div>
  );
}
