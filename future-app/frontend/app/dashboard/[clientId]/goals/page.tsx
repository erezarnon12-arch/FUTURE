"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getGoals, createGoal, updateGoal, deleteGoal } from "@/lib/api";
import type { Goal, GoalType, GoalStatus, RingType } from "@/types";
import { RING_CONFIG, formatCurrency } from "@/lib/utils";

interface Props { params: { clientId: string } }

const GOAL_ICONS: Record<GoalType, string> = {
  emergency_fund: "🛡",
  retirement_target: "🏛",
  debt_payoff: "⊖",
  savings_target: "💰",
  education_fund: "🎓",
  home_purchase: "🏠",
  custom: "◎",
};

const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  emergency_fund: "קרן חירום",
  retirement_target: "יעד פרישה",
  debt_payoff: "פירעון חוב",
  savings_target: "יעד חיסכון",
  education_fund: "קרן חינוך",
  home_purchase: "רכישת דירה",
  custom: "מותאם אישית",
};

const STATUS_CONFIG = {
  active: { label: "פעיל", color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/30" },
  achieved: { label: "הושג", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
  cancelled: { label: "בוטל", color: "text-text-muted", bg: "bg-white/5", border: "border-white/10" },
} as const;

const EMPTY_FORM = {
  goal_type: "savings_target" as GoalType,
  title: "",
  description: "",
  target_amount: "",
  current_amount: "",
  target_date: "",
  monthly_contribution: "",
  ring: "" as RingType | "",
  status: "active" as GoalStatus,
};

export default function GoalsPage({ params }: Props) {
  const clientId = parseInt(params.clientId);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const refresh = useCallback(() => {
    return getGoals(clientId).then(setGoals).catch(() => {});
  }, [clientId]);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const openAdd = () => {
    setEditingGoal(null);
    setForm({ ...EMPTY_FORM });
    setShowModal(true);
  };

  const openEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setForm({
      goal_type: goal.goal_type,
      title: goal.title,
      description: goal.description || "",
      target_amount: String(goal.target_amount),
      current_amount: String(goal.current_amount),
      target_date: goal.target_date ? goal.target_date.slice(0, 10) : "",
      monthly_contribution: String(goal.monthly_contribution),
      ring: goal.ring || "",
      status: goal.status,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        goal_type: form.goal_type,
        title: form.title,
        description: form.description || undefined,
        target_amount: parseFloat(form.target_amount),
        current_amount: parseFloat(form.current_amount) || 0,
        target_date: form.target_date || undefined,
        monthly_contribution: parseFloat(form.monthly_contribution) || 0,
        ring: (form.ring || undefined) as RingType | undefined,
        status: form.status,
      };
      if (editingGoal) {
        await updateGoal(editingGoal.id, payload);
      } else {
        await createGoal(clientId, payload);
      }
      setShowModal(false);
      refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("למחוק את היעד?")) return;
    await deleteGoal(id);
    refresh();
  };

  const activeGoals = goals.filter((g) => g.status === "active");
  const achievedGoals = goals.filter((g) => g.status === "achieved");
  const totalTarget = goals.reduce((s, g) => s + g.target_amount, 0);
  const totalCurrent = goals.reduce((s, g) => s + g.current_amount, 0);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">◎ יעדים</h1>
          <p className="text-text-secondary text-sm mt-1">עקוב ונהל את היעדים הפיננסיים שלך</p>
        </div>
        <button onClick={openAdd} className="px-4 py-2 bg-indigo-600/80 hover:bg-indigo-600 text-white font-medium rounded-xl text-sm transition-all">
          + הוסף יעד
        </button>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "סך יעדים", value: String(goals.length) },
          { label: "הושגו", value: String(achievedGoals.length), color: "#10b981" },
          { label: "סך יעד", value: formatCurrency(totalTarget) },
          { label: "סך נחסך", value: formatCurrency(totalCurrent), color: "#6366f1" },
        ].map((s) => (
          <div key={s.label} className="glass rounded-2xl p-4">
            <div className="text-xs text-text-secondary mb-1">{s.label}</div>
            <div className="text-xl font-bold" style={{ color: s.color || "white" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : goals.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <div className="text-4xl mb-3">◎</div>
          <p className="text-white font-medium mb-1">אין יעדים עדיין</p>
          <p className="text-text-muted text-sm mb-4">הגדר יעדים פיננסיים לעקוב אחר ההתקדמות שלך</p>
          <button onClick={openAdd} className="px-4 py-2 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-xl text-sm">
            צור את היעד הראשון שלך
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((goal) => {
            const statusCfg = STATUS_CONFIG[goal.status];
            const ringCfg = goal.ring ? RING_CONFIG[goal.ring] : null;
            const barColor = ringCfg?.color ?? "#6366f1";
            const pct = Math.min(100, goal.progress_pct);
            const daysLeft = goal.target_date
              ? Math.ceil((new Date(goal.target_date).getTime() - Date.now()) / 86400000)
              : null;

            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-2xl p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{GOAL_ICONS[goal.goal_type]}</span>
                    <div>
                      <div className="font-semibold text-white">{goal.title}</div>
                      <div className="text-xs text-text-muted">{GOAL_TYPE_LABELS[goal.goal_type]}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${statusCfg.bg} ${statusCfg.border} ${statusCfg.color}`}>
                      {statusCfg.label}
                    </span>
                    <button onClick={() => openEdit(goal)} className="text-text-muted hover:text-white text-xs transition-colors">✎</button>
                    <button onClick={() => handleDelete(goal.id)} className="text-text-muted hover:text-red-400 text-xs transition-colors">✕</button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-2">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: goal.status === "achieved" ? "#10b981" : barColor }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>

                <div className="flex justify-between text-xs text-text-muted mb-3">
                  <span>{formatCurrency(goal.current_amount)} נחסך</span>
                  <span className="font-medium" style={{ color: goal.status === "achieved" ? "#10b981" : barColor }}>
                    {pct.toFixed(0)}%
                  </span>
                  <span>{formatCurrency(goal.target_amount)} יעד</span>
                </div>

                <div className="flex justify-between text-xs text-text-muted">
                  <span>
                    {goal.monthly_contribution > 0
                      ? `${formatCurrency(goal.monthly_contribution)}/חודש`
                      : "לא הוגדרה תרומה חודשית"}
                  </span>
                  {daysLeft !== null ? (
                    <span className={daysLeft < 0 ? "text-red-400" : daysLeft < 30 ? "text-amber-400" : ""}>
                      {daysLeft < 0 ? "באיחור" : daysLeft === 0 ? "היום" : `${daysLeft} ימים נותרו`}
                    </span>
                  ) : null}
                </div>

                {goal.description && (
                  <p className="text-xs text-text-muted mt-2 border-t border-white/5 pt-2">{goal.description}</p>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
            <motion.div
              className="relative w-full max-w-lg glass rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <h2 className="text-lg font-bold text-white mb-5">
                {editingGoal ? "ערוך יעד" : "יעד חדש"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-text-secondary block mb-1">סוג יעד</label>
                    <select
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                      value={form.goal_type}
                      onChange={(e) => setForm({ ...form, goal_type: e.target.value as GoalType })}
                    >
                      {(Object.entries(GOAL_TYPE_LABELS) as [GoalType, string][]).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-text-secondary block mb-1">סטטוס</label>
                    <select
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value as GoalStatus })}
                    >
                      <option value="active">פעיל</option>
                      <option value="achieved">הושג</option>
                      <option value="cancelled">בוטל</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-text-secondary block mb-1">כותרת *</label>
                  <input
                    required
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                    placeholder="למשל: קרן חירום 6 חודשים"
                  />
                </div>

                <div>
                  <label className="text-xs text-text-secondary block mb-1">תיאור</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm resize-none"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-text-secondary block mb-1">סכום יעד (₪) *</label>
                    <input
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.target_amount}
                      onChange={(e) => setForm({ ...form, target_amount: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-text-secondary block mb-1">סכום נוכחי (₪)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.current_amount}
                      onChange={(e) => setForm({ ...form, current_amount: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-text-secondary block mb-1">תרומה חודשית (₪)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.monthly_contribution}
                      onChange={(e) => setForm({ ...form, monthly_contribution: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-text-secondary block mb-1">תאריך יעד</label>
                    <input
                      type="date"
                      value={form.target_date}
                      onChange={(e) => setForm({ ...form, target_date: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-text-secondary block mb-1">טבעת (אופציונלי)</label>
                  <select
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                    value={form.ring}
                    onChange={(e) => setForm({ ...form, ring: e.target.value as RingType | "" })}
                  >
                    <option value="">ללא טבעת</option>
                    <option value="retirement">🏛 פרישה</option>
                    <option value="security">🛡 ביטחון</option>
                    <option value="growth">🚀 צמיחה</option>
                  </select>
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-sm text-text-secondary border border-white/10 rounded-lg hover:text-white transition-colors"
                  >
                    ביטול
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-all"
                  >
                    {saving ? "שומר..." : editingGoal ? "עדכן יעד" : "צור יעד"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
