"use client";

import { useState, useMemo } from "react";
import MainSidebar from "@/components/ui/MainSidebar";

const TRACKS = [
  { id: "cash", label: "מסלול כספי", rate: 3, color: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-500/30" },
  { id: "general", label: "מסלול כללי", rate: 6, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30" },
  { id: "mixed", label: "מסלול מניות משולב", rate: 8, color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/30" },
  { id: "stocks", label: "מסלול מניות", rate: 10, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
];

function calcBalance(monthly: number, years: number, rate: number) {
  const months = years * 12;
  const monthlyRate = rate / 100 / 12;
  let balance = 0;
  for (let i = 0; i < months; i++) {
    balance = (balance + monthly) * (1 + monthlyRate);
  }
  return balance;
}

function formatMoneyFull(n: number) {
  return new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n);
}

export default function CalculatorPage() {
  const [monthly, setMonthly] = useState(1500);
  const [years, setYears] = useState(25);
  const [trackA, setTrackA] = useState("general");
  const [trackB, setTrackB] = useState("stocks");

  const tA = TRACKS.find((t) => t.id === trackA)!;
  const tB = TRACKS.find((t) => t.id === trackB)!;

  const { balA, balB, gap, totalDeposited, gapMonths } = useMemo(() => {
    const balA = calcBalance(monthly, years, tA.rate);
    const balB = calcBalance(monthly, years, tB.rate);
    const totalDeposited = monthly * years * 12;
    const gap = Math.abs(balB - balA);
    const gapMonths = Math.round(gap / monthly);
    return { balA, balB, gap, totalDeposited, gapMonths };
  }, [monthly, years, tA, tB]);

  const better = balB >= balA ? tB : tA;
  const worse = balB >= balA ? tA : tB;
  const betterBal = Math.max(balA, balB);
  const worseBal = Math.min(balA, balB);
  const gapPct = worseBal > 0 ? Math.round(((betterBal - worseBal) / worseBal) * 100) : 0;
  const barWorse = Math.round((worseBal / betterBal) * 100);

  return (
    <div className="flex min-h-screen bg-surface">
      <MainSidebar />
      <main className="flex-1 md:mr-60 overflow-x-hidden" dir="rtl">

        {/* HEADER */}
        <div className="border-b border-white/5 px-10 py-5">
          <p className="text-text-muted text-xs uppercase tracking-widest mb-1">כלי חישוב</p>
          <h1 className="text-2xl font-bold text-white">מה שווה בחירת המסלול הנכון?</h1>
          <p className="text-text-muted text-sm mt-1">השווה בין שני מסלולים וראה את ההבדל בשקלים</p>
        </div>

        <div className="max-w-3xl mx-auto px-6 py-10">

          {/* INPUTS */}
          <div className="bg-surface-2 rounded-2xl border border-white/5 p-6 mb-8 space-y-6">

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-white font-bold">₪{monthly.toLocaleString()}</span>
                <label className="text-text-secondary text-sm">הפקדה חודשית</label>
              </div>
              <input
                type="range" min={300} max={15000} step={100} value={monthly}
                onChange={(e) => setMonthly(+e.target.value)}
                className="w-full accent-indigo-500" dir="ltr"
              />
              <div className="flex justify-between text-text-muted text-xs mt-1" dir="ltr">
                <span>₪300</span>
                <span>₪15,000</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-white font-bold">{years} שנים</span>
                <label className="text-text-secondary text-sm">תקופת חיסכון</label>
              </div>
              <input
                type="range" min={5} max={40} step={1} value={years}
                onChange={(e) => setYears(+e.target.value)}
                className="w-full accent-indigo-500" dir="ltr"
              />
              <div className="flex justify-between text-text-muted text-xs mt-1" dir="ltr">
                <span>5 שנים</span>
                <span>40 שנים</span>
              </div>
            </div>

            <div className="pt-2 border-t border-white/5 text-xs text-text-muted">
              סה״כ הפקדות: <span className="text-white font-medium">{formatMoneyFull(totalDeposited)}</span>
            </div>
          </div>

          {/* TRACK SELECTORS */}
          <div className="grid grid-cols-2 gap-4 mb-8">

            {/* Track A */}
            <div>
              <p className="text-text-muted text-xs mb-2 text-center">המסלול הנוכחי שלי</p>
              <div className="space-y-2">
                {TRACKS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTrackA(t.id)}
                    disabled={t.id === trackB}
                    className={`w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all border flex justify-between items-center ${
                      trackA === t.id
                        ? `${t.bg} ${t.border} ${t.color}`
                        : t.id === trackB
                        ? "opacity-25 cursor-not-allowed border-white/5 text-text-muted"
                        : "border-white/5 text-text-secondary hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span className={`text-xs font-bold ${trackA === t.id ? t.color : "text-text-muted"}`}>{t.rate}%</span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Track B */}
            <div>
              <p className="text-text-muted text-xs mb-2 text-center">מסלול אחר לבדיקה</p>
              <div className="space-y-2">
                {TRACKS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTrackB(t.id)}
                    disabled={t.id === trackA}
                    className={`w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all border flex justify-between items-center ${
                      trackB === t.id
                        ? `${t.bg} ${t.border} ${t.color}`
                        : t.id === trackA
                        ? "opacity-25 cursor-not-allowed border-white/5 text-text-muted"
                        : "border-white/5 text-text-secondary hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span className={`text-xs font-bold ${trackB === t.id ? t.color : "text-text-muted"}`}>{t.rate}%</span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* RESULTS */}
          <div className="space-y-4">

            {/* Two balances with bar */}
            <div className="bg-surface-2 rounded-2xl border border-white/5 p-6 space-y-5">

              {/* Better track */}
              <div>
                <div className="flex justify-between items-baseline mb-2">
                  <span className={`text-2xl font-bold ${better.color}`}>{formatMoneyFull(betterBal)}</span>
                  <span className="text-text-secondary text-sm">{better.label} — {better.rate}%</span>
                </div>
                <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${better.id === "stocks" || better.id === "mixed" ? "bg-emerald-500" : better.id === "general" ? "bg-blue-500" : "bg-indigo-500"}`} style={{ width: "100%" }} />
                </div>
              </div>

              {/* Worse track */}
              <div>
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-xl font-bold text-white/60">{formatMoneyFull(worseBal)}</span>
                  <span className="text-text-secondary text-sm">{worse.label} — {worse.rate}%</span>
                </div>
                <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-white/20" style={{ width: `${barWorse}%` }} />
                </div>
              </div>
            </div>

            {/* THE GAP — hero number */}
            <div className="bg-gradient-to-br from-amber-500/15 to-amber-500/5 border border-amber-500/30 rounded-2xl p-8 text-center">
              <p className="text-amber-400 text-sm mb-2">ההפרש בין המסלולים</p>
              <p className="text-5xl font-bold text-white mb-1">{formatMoneyFull(gap)}</p>
              <p className="text-amber-300/70 text-sm mt-3">
                {gapPct}% יותר — שווה ל-{gapMonths > 12 ? `${Math.round(gapMonths / 12)} שנות` : `${gapMonths} חודשי`} הפקדות
              </p>
            </div>

            {/* CTA */}
            <a
              href="/#contact"
              className="block w-full text-center px-6 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors"
            >
              רוצה לדעת באיזה מסלול אתה נמצא? דבר איתנו
            </a>

            {/* Disclaimer */}
            <div className="flex items-start gap-2 pt-2">
              <span className="text-text-muted text-sm flex-shrink-0">ℹ️</span>
              <p className="text-text-muted text-xs leading-relaxed">
                נתוני התשואה מבוססים על ממוצעים היסטוריים בלבד ואינם מהווים הבטחה או תחזית לעתיד.
                ההיסטוריה היא המידע היחיד שיש לנו ללמוד ממנו — אך השוק אינו חייב לחזור על עצמו.
              </p>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
