"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getDashboard, createLiability, deleteLiability, getDebtPayoff } from "@/lib/api";
import type { DashboardData, DebtPayoffData, LiabilityType } from "@/types";
import DebtPayoffChart from "@/components/charts/DebtPayoffChart";
import { formatCurrency } from "@/lib/utils";

interface Props { params: { clientId: string } }

export default function LiabilitiesPage({ params }: Props) {
  const clientId = parseInt(params.clientId);
  const [data, setData] = useState<DashboardData | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [debtPayoff, setDebtPayoff] = useState<DebtPayoffData | null>(null);
  const [debtLoading, setDebtLoading] = useState(false);
  const [extraMonthly, setExtraMonthly] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [form, setForm] = useState({
    liability_type: "loan" as LiabilityType,
    name: "", lender: "",
    original_amount: "", remaining_balance: "",
    interest_rate: "", monthly_payment: "",
    remaining_months: "",
  });

  const refresh = useCallback(() => getDashboard(clientId).then(setData), [clientId]);

  useEffect(() => { refresh(); }, [refresh]);

  // Fetch debt payoff with debounce on extraMonthly changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebtLoading(true);
      getDebtPayoff(clientId, extraMonthly)
        .then(setDebtPayoff)
        .catch(() => {})
        .finally(() => setDebtLoading(false));
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [clientId, extraMonthly]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createLiability(clientId, {
        liability_type: form.liability_type,
        name: form.name,
        lender: form.lender || undefined,
        original_amount: parseFloat(form.original_amount),
        remaining_balance: parseFloat(form.remaining_balance),
        interest_rate: parseFloat(form.interest_rate),
        monthly_payment: parseFloat(form.monthly_payment),
        remaining_months: form.remaining_months ? parseInt(form.remaining_months) : undefined,
      });
      setShowForm(false);
      refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("למחוק את ההתחייבות?")) return;
    await deleteLiability(id);
    refresh();
  };

  if (!data) return (
    <div className="flex justify-center p-12">
      <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const totalMonthly = data.liabilities.reduce((s, l) => s + l.monthly_payment, 0);
  const dsr = data.client.monthly_income > 0 ? (totalMonthly / data.client.monthly_income) * 100 : 0;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">⊖ התחייבויות</h1>
          <p className="text-text-secondary text-sm mt-1">{data.liabilities.length} התחייבויות · {formatCurrency(data.total_liabilities)} סה"כ</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white font-medium rounded-xl text-sm">
          + Add Liability
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-4">
          <div className="text-sm text-text-secondary mb-1">סך החוב</div>
          <div className="text-xl font-bold text-red-400">{formatCurrency(data.total_liabilities)}</div>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="text-sm text-text-secondary mb-1">תשלומים חודשיים</div>
          <div className="text-xl font-bold text-white">{formatCurrency(totalMonthly)}</div>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="text-sm text-text-secondary mb-1">יחס שירות חוב</div>
          <div className="text-xl font-bold" style={{ color: dsr > 40 ? "#ef4444" : dsr > 30 ? "#f59e0b" : "#10b981" }}>
            {dsr.toFixed(0)}%
          </div>
          <div className="text-xs text-text-muted">מההכנסה החודשית</div>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="glass rounded-2xl p-6">
          <h2 className="font-semibold text-white mb-4">התחייבות חדשה</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-text-secondary block mb-1">Type</label>
              <select className="w-full bg-surface-3 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                value={form.liability_type} onChange={(e) => setForm({ ...form, liability_type: e.target.value as LiabilityType })}>
                {(["loan", "mortgage", "credit_line", "other"] as LiabilityType[]).map((t) => (
                  <option key={t} value={t} className="capitalize">{t.replace("_", " ")}</option>
                ))}
              </select>
            </div>
            {[
              { key: "name", label: "שם", required: true },
              { key: "lender", label: "מלווה" },
              { key: "original_amount", label: "סכום מקורי (₪)", type: "number" },
              { key: "remaining_balance", label: "יתרה לסילוק (₪)", type: "number" },
              { key: "interest_rate", label: "ריבית (%)", type: "number" },
              { key: "monthly_payment", label: "תשלום חודשי (₪)", type: "number" },
              { key: "remaining_months", label: "חודשים נותרים", type: "number" },
            ].map((f) => (
              <div key={f.key}>
                <label className="text-xs text-text-secondary block mb-1">{f.label}</label>
                <input type={f.type || "text"} required={f.required}
                  value={(form as any)[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  className="w-full bg-surface-3 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" step="0.01" />
              </div>
            ))}
            <div className="col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-text-secondary border border-white/10 rounded-lg">ביטול</button>
              <button type="submit" disabled={saving} className="px-6 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {saving ? "שומר..." : "הוסף התחייבות"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liability list */}
      <div className="space-y-3">
        {data.liabilities.length === 0 && <div className="text-center py-8 text-text-muted">No liabilities</div>}
        {data.liabilities.map((l) => {
          const progress = ((l.original_amount - l.remaining_balance) / l.original_amount) * 100;
          return (
            <div key={l.id} className="glass rounded-2xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-semibold text-white">{l.name}</div>
                  <div className="text-xs text-text-muted capitalize mt-0.5">
                    {l.liability_type.replace("_", " ")} {l.lender ? `· ${l.lender}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-red-400 font-bold">{formatCurrency(l.remaining_balance)}</div>
                    <div className="text-xs text-text-muted">{l.interest_rate}% APR</div>
                  </div>
                  <button onClick={() => handleDelete(l.id)} className="text-text-muted hover:text-red-400 text-xs transition-colors">✕</button>
                </div>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-red-500/60 rounded-full" style={{ width: `${progress}%` }} />
              </div>
              <div className="flex justify-between text-xs text-text-muted">
                <span>{progress.toFixed(0)}% שולם</span>
                <span>₪{l.monthly_payment.toLocaleString()}/חודש{l.remaining_months ? ` · ${l.remaining_months} חודשים נותרים` : ""}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Debt Payoff Strategies */}
      {data.liabilities.length > 0 && (
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
              אסטרטגיות פירעון חוב
            </h2>
            <div className="flex items-center gap-2">
              <label className="text-xs text-text-muted">תוספת חודשית:</label>
              <div className="flex items-center gap-1">
                <span className="text-xs text-text-secondary">₪</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={extraMonthly}
                  onChange={(e) => setExtraMonthly(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-20 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white text-xs text-right"
                />
              </div>
            </div>
          </div>
          {debtLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : debtPayoff ? (
            <DebtPayoffChart data={debtPayoff} />
          ) : null}
        </div>
      )}
    </div>
  );
}
