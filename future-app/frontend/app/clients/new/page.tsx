"use client";

import { useState } from "react";
import { createClient } from "@/lib/api";
import { useRouter } from "next/navigation";
import type { RiskLevel } from "@/types";

export default function NewClientPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    age: "",
    monthly_income: "",
    monthly_expenses: "",
    risk_tolerance: "medium" as RiskLevel,
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const client = await createClient({
        name: form.name,
        age: Number(form.age),
        monthly_income: Number(form.monthly_income),
        monthly_expenses: Number(form.monthly_expenses),
        retirement_age: 67,
        risk_tolerance: form.risk_tolerance,
      });
      router.push(`/dashboard/${client.id}`);
    } catch {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Header */}
      <div className="border-b border-white/5 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative w-6 h-6">
            <div className="absolute inset-0 rounded-full border border-indigo-500/60" />
            <div className="absolute inset-1 rounded-full border border-emerald-500/60" />
            <div className="absolute inset-2 rounded-full bg-amber-500" />
          </div>
          <span className="text-white font-bold tracking-wider">FUTURE</span>
        </div>
        <button
          onClick={() => router.push("/clients")}
          className="text-sm text-text-secondary hover:text-white transition-colors"
        >
          ← חזור לרשימה
        </button>
      </div>

      {/* Centered form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">פרופיל לקוח חדש</h1>
            <p className="text-text-secondary text-sm">מלא את הפרטים הבסיסיים — אפשר תמיד לעדכן לאחר מכן</p>
          </div>

          {/* Card */}
          <div className="bg-surface-2 rounded-2xl p-8 border border-white/8 space-y-5">
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">

              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-text-secondary font-medium">שם מלא</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="ישראל ישראלי"
                  required
                  className="p-3 rounded-xl bg-surface text-white border border-white/8 focus:border-indigo-500/60 outline-none placeholder:text-text-muted transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm text-text-secondary font-medium">גיל</label>
                  <input
                    type="number"
                    value={form.age}
                    onChange={(e) => set("age", e.target.value)}
                    placeholder="40"
                    min={18} max={100}
                    required
                    className="p-3 rounded-xl bg-surface text-white border border-white/8 focus:border-indigo-500/60 outline-none placeholder:text-text-muted transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm text-text-secondary font-medium">הכנסה חודשית (₪)</label>
                  <input
                    type="number"
                    value={form.monthly_income}
                    onChange={(e) => set("monthly_income", e.target.value)}
                    placeholder="20,000"
                    min={0}
                    required
                    className="p-3 rounded-xl bg-surface text-white border border-white/8 focus:border-indigo-500/60 outline-none placeholder:text-text-muted transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm text-text-secondary font-medium">הוצאות חודשיות (₪)</label>
                  <input
                    type="number"
                    value={form.monthly_expenses}
                    onChange={(e) => set("monthly_expenses", e.target.value)}
                    placeholder="12,000"
                    min={0}
                    required
                    className="p-3 rounded-xl bg-surface text-white border border-white/8 focus:border-indigo-500/60 outline-none placeholder:text-text-muted transition-colors"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-text-secondary font-medium">פרופיל סיכון</label>
                <select
                  value={form.risk_tolerance}
                  onChange={(e) => set("risk_tolerance", e.target.value)}
                  className="p-3 rounded-xl bg-surface text-white border border-white/8 focus:border-indigo-500/60 outline-none transition-colors"
                >
                  <option value="very_low">שמרני מאוד</option>
                  <option value="low">שמרני</option>
                  <option value="medium">מאוזן</option>
                  <option value="high">אגרסיבי</option>
                  <option value="very_high">אגרסיבי מאוד</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="mt-2 w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors text-base"
              >
                {saving ? "יוצר תיק..." : "פתח תיק ←"}
              </button>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
