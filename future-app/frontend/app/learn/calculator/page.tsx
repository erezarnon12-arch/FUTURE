"use client";

import { useState, useMemo } from "react";
import MainSidebar from "@/components/ui/MainSidebar";

interface Track {
  id: string;
  name: string;
  feeDeposit: number;
  feeBalance: number;
  directExpenses: number;
  defaultReturn: number;
  description: string;
}

interface Company {
  id: string;
  name: string;
  tracks: Track[];
}

const COMPANIES: Company[] = [
  {
    id: "altshuler",
    name: "אלטשולר שחם",
    tracks: [
      { id: "default", name: "מסלול נבחר (ברירת מחדל)", feeDeposit: 1.00, feeBalance: 0.22, directExpenses: 0, defaultReturn: 6.0, description: "מסלול ברירת מחדל, חשיפה מאוזנת (~50% מניות)" },
      { id: "active_stocks", name: "מסלול מניות אקטיבי", feeDeposit: 1.00, feeBalance: 0.25, directExpenses: 0.22, defaultReturn: 9.0, description: "חשיפה גבוהה למניות (~85%), ניהול אקטיבי" },
      { id: "sp500", name: "מסלול עוקב S&P 500", feeDeposit: 1.00, feeBalance: 0.08, directExpenses: 0.03, defaultReturn: 10.0, description: "עוקב אחרי מדד S&P 500 האמריקאי (100% מניות)" },
      { id: "index_flexible", name: "מסלול עוקב מדדים גמיש", feeDeposit: 1.00, feeBalance: 0.22, directExpenses: 0.07, defaultReturn: 8.0, description: "עוקב מדדים עם גמישות בחשיפה (~70% מניות)" },
      { id: "halacha", name: "מסלול הלכה", feeDeposit: 1.00, feeBalance: 0.22, directExpenses: 0.05, defaultReturn: 5.5, description: "השקעות בהתאם להלכה יהודית (~45% מניות)" },
    ],
  },
  {
    id: "meitav",
    name: "מיטב",
    tracks: [
      { id: "default", name: "קרן נבחרת (ברירת מחדל)", feeDeposit: 1.00, feeBalance: 0.22, directExpenses: 0, defaultReturn: 6.0, description: "מסלול ברירת מחדל של מיטב (~50% מניות)" },
      { id: "conversion_high", name: "מסלול המרה (צבירות גבוהות)", feeDeposit: 2.00, feeBalance: 0.12, directExpenses: 0, defaultReturn: 8.0, description: "לצבירות גבוהות — דמי ניהול נמוכים מהצבירה (~65% מניות)" },
      { id: "passive_mixed", name: "מסלול פאסיבי משולב", feeDeposit: 1.00, feeBalance: 0.20, directExpenses: 0.05, defaultReturn: 8.5, description: "פאסיבי בשילוב מדדים (~75% מניות)" },
      { id: "money_market", name: "מסלול כספי", feeDeposit: 0.50, feeBalance: 0.05, directExpenses: 0.01, defaultReturn: 3.0, description: "מסלול שמרני לחלוטין, אגרות חוב קצרות" },
    ],
  },
  {
    id: "menora",
    name: "מנורה מבטחים",
    tracks: [
      { id: "target_under50", name: "מסלול יעד לפרישה (עד 50)", feeDeposit: 1.85, feeBalance: 0.24, directExpenses: 0.23, defaultReturn: 6.0, description: "מסלול ייעודי לצעירים עד גיל 50 (~50% מניות)" },
      { id: "stocks", name: "מסלול מניות", feeDeposit: 1.60, feeBalance: 0.16, directExpenses: 0.21, defaultReturn: 9.5, description: "חשיפה גבוהה למניות (~90% מניות)" },
      { id: "sp500", name: "מסלול עוקב S&P 500", feeDeposit: 1.15, feeBalance: 0.19, directExpenses: 0.04, defaultReturn: 10.0, description: "עוקב מדד S&P 500 (100% מניות)" },
      { id: "tradable_mixed", name: "מסלול משולב סחיר", feeDeposit: 1.10, feeBalance: 0.18, directExpenses: 0.04, defaultReturn: 8.0, description: "מאוזן עם נכסים סחירים (~65% מניות)" },
      { id: "halacha", name: "מסלול הלכה", feeDeposit: 1.70, feeBalance: 0.25, directExpenses: 0.10, defaultReturn: 5.5, description: "השקעות בהתאם להלכה יהודית (~40% מניות)" },
    ],
  },
  {
    id: "harel",
    name: "הראל",
    tracks: [
      { id: "under50", name: "מסלול גילאי 50 ומטה", feeDeposit: 1.50, feeBalance: 0.21, directExpenses: 0.22, defaultReturn: 6.0, description: "ברירת מחדל לצעירים עד גיל 50 (~50% מניות)" },
      { id: "stocks", name: "מסלול מניות", feeDeposit: 1.45, feeBalance: 0.19, directExpenses: 0.19, defaultReturn: 9.5, description: "חשיפה גבוהה למניות (~90% מניות)" },
      { id: "sp500", name: "מסלול עוקב S&P 500", feeDeposit: 1.10, feeBalance: 0.15, directExpenses: 0.04, defaultReturn: 10.0, description: "עוקב מדד S&P 500 האמריקאי (100% מניות)" },
      { id: "index_mixed", name: "מסלול מחקה מדדים משולב", feeDeposit: 1.15, feeBalance: 0.16, directExpenses: 0.06, defaultReturn: 8.0, description: "מחקה מדדים משולב (~70% מניות)" },
      { id: "esg", name: "מסלול קיימות (ESG)", feeDeposit: 1.60, feeBalance: 0.25, directExpenses: 0.15, defaultReturn: 7.5, description: "השקעות אחראיות ומקיימות (~65% מניות)" },
    ],
  },
  {
    id: "phoenix",
    name: "הפניקס",
    tracks: [
      { id: "under50", name: "מסלול גילאי 50 ומטה", feeDeposit: 1.62, feeBalance: 0.21, directExpenses: 0.24, defaultReturn: 6.0, description: "ברירת מחדל לצעירים עד גיל 50 (~50% מניות)" },
      { id: "foreign_stocks", name: "מסלול מניות חו\"ל", feeDeposit: 1.50, feeBalance: 0.22, directExpenses: 0.20, defaultReturn: 9.5, description: "חשיפה למניות בינלאומיות (~85% מניות)" },
      { id: "sp500", name: "מסלול עוקב S&P 500", feeDeposit: 1.25, feeBalance: 0.14, directExpenses: 0.03, defaultReturn: 10.0, description: "עוקב מדד S&P 500 (100% מניות)" },
      { id: "tradable_index", name: "מסלול סחיר (מדדים)", feeDeposit: 1.20, feeBalance: 0.15, directExpenses: 0.04, defaultReturn: 8.0, description: "מדדים סחירים משולבים (~70% מניות)" },
    ],
  },
];

function formatMoney(n: number) {
  return new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n);
}

function calcBalance(monthly: number, years: number, returnRate: number, feeDeposit: number, totalFeeBalance: number) {
  const months = years * 12;
  const monthlyNet = monthly * (1 - feeDeposit / 100);
  const monthlyReturn = returnRate / 100 / 12;
  const monthlyFeeBalance = totalFeeBalance / 100 / 12;
  const effectiveMonthlyReturn = monthlyReturn - monthlyFeeBalance;
  let balance = 0;
  for (let i = 0; i < months; i++) {
    balance = (balance + monthlyNet) * (1 + effectiveMonthlyReturn);
  }
  return balance;
}

export default function CalculatorPage() {
  const [companyId, setCompanyId] = useState("altshuler");
  const [trackId, setTrackId] = useState("default");
  const [monthly, setMonthly] = useState(1500);
  const [years, setYears] = useState(25);
  const [returnRate, setReturnRate] = useState(7.0);

  const company = COMPANIES.find((c) => c.id === companyId)!;
  const track = company.tracks.find((t) => t.id === trackId) ?? company.tracks[0];
  const totalFeeBalance = track.feeBalance + track.directExpenses;

  const handleCompanyChange = (id: string) => {
    const c = COMPANIES.find((x) => x.id === id)!;
    setCompanyId(id);
    setTrackId(c.tracks[0].id);
    setReturnRate(c.tracks[0].defaultReturn);
  };

  const handleTrackChange = (id: string) => {
    const t = company.tracks.find((x) => x.id === id)!;
    setTrackId(id);
    setReturnRate(t.defaultReturn);
  };

  const result = useMemo(() => {
    const balanceWithFees = calcBalance(monthly, years, returnRate, track.feeDeposit, totalFeeBalance);
    const balanceNoFees = calcBalance(monthly, years, returnRate, 0, 0);
    const totalDeposited = monthly * years * 12;
    const feeDrag = balanceNoFees - balanceWithFees;
    const profit = balanceWithFees - totalDeposited;
    return { balanceWithFees, balanceNoFees, totalDeposited, feeDrag, profit };
  }, [monthly, years, returnRate, track, totalFeeBalance]);

  const trackComparison = useMemo(() => {
    return company.tracks
      .map((t) => {
        const totalFee = t.feeBalance + t.directExpenses;
        const finalBalance = calcBalance(monthly, years, t.defaultReturn, t.feeDeposit, totalFee);
        return { ...t, finalBalance, totalFeeBalance: totalFee };
      })
      .sort((a, b) => b.finalBalance - a.finalBalance);
  }, [company, monthly, years]);

  const bestBalance = trackComparison[0]?.finalBalance ?? 0;
  const worstBalance = trackComparison[trackComparison.length - 1]?.finalBalance ?? 0;
  const gapBestWorst = bestBalance - worstBalance;

  return (
    <div className="flex min-h-screen bg-surface">
      <MainSidebar />
      <main className="flex-1 md:mr-60 overflow-x-hidden" dir="rtl">

        {/* HEADER */}
        <div className="border-b border-white/5 px-10 py-5">
          <p className="text-text-muted text-xs uppercase tracking-widest mb-1">כלי חישוב</p>
          <h1 className="text-2xl font-bold text-white">מחשבון פנסיה חכם</h1>
          <p className="text-text-muted text-sm mt-1">השווה מסלולים ודמי ניהול בין חברות הפנסיה המובילות — נתוני 2026</p>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-8">

          {/* DISCLAIMER */}
          <div className="mb-8 bg-white/3 border border-white/8 rounded-xl px-5 py-3 flex items-start gap-3">
            <span className="text-text-muted text-base mt-0.5 flex-shrink-0">ℹ️</span>
            <p className="text-text-muted text-xs leading-relaxed">
              <strong className="text-text-secondary">שים לב:</strong> נתוני התשואה המוצגים מבוססים על ביצועים היסטוריים בלבד.
              הם אינם מהווים הבטחה, תחזית או ייעוץ השקעות לגבי ביצועים עתידיים.
              ההיסטוריה היא המידע היחיד שיש לנו ללמוד ממנו — אך השוק אינו חייב לחזור על עצמו.
            </p>
          </div>

          {/* STEP 1: Company */}
          <div className="mb-8">
            <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
              <span className="bg-indigo-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">1</span>
              בחר חברת פנסיה
            </h2>
            <div className="flex flex-wrap gap-2">
              {COMPANIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleCompanyChange(c.id)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                    companyId === c.id
                      ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300"
                      : "border-white/10 text-text-secondary hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* STEP 2: Track */}
          <div className="mb-8">
            <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
              <span className="bg-indigo-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">2</span>
              בחר מסלול השקעה
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {company.tracks.map((t) => {
                const total = (t.feeBalance + t.directExpenses).toFixed(2);
                const isActive = trackId === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => handleTrackChange(t.id)}
                    className={`p-4 rounded-xl text-right transition-all border ${
                      isActive
                        ? "bg-indigo-500/15 border-indigo-500/40"
                        : "bg-surface-2 border-white/5 hover:border-white/20"
                    }`}
                  >
                    <div className={`font-medium text-sm mb-1 ${isActive ? "text-indigo-300" : "text-white"}`}>
                      {t.name}
                    </div>
                    <div className="text-text-muted text-xs mb-3 leading-relaxed">{t.description}</div>
                    <div className="flex gap-3 text-xs">
                      <span className="text-amber-400">{t.feeDeposit}% הפקדה</span>
                      <span className="text-amber-300">{total}% צבירה</span>
                      <span className="text-emerald-400">{t.defaultReturn}% תשואה</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">

            {/* RESULTS — first in DOM = right column in RTL */}
            <div className="space-y-4">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <span className="bg-emerald-500 text-white text-xs px-1.5 py-0.5 rounded-full">✓</span>
                תוצאות
              </h2>

              <div className="bg-gradient-to-br from-indigo-500/20 to-indigo-500/5 border border-indigo-500/30 rounded-2xl p-6 text-center">
                <p className="text-indigo-300 text-sm mb-1">סכום צבור אחרי {years} שנים</p>
                <p className="text-4xl font-bold text-white mb-1">{formatMoney(result.balanceWithFees)}</p>
                <p className="text-text-muted text-xs">{company.name} — {track.name}</p>
              </div>

              <div className="bg-surface-2 rounded-2xl border border-white/5 p-5 space-y-3">
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <span className="text-emerald-400 font-semibold">{formatMoney(result.totalDeposited)}</span>
                  <span className="text-text-secondary text-sm">סה"כ הפקדות</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <span className="text-indigo-400 font-semibold">{formatMoney(result.profit)}</span>
                  <span className="text-text-secondary text-sm">רווח מתשואה</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-red-400 font-semibold">-{formatMoney(result.feeDrag)}</span>
                  <span className="text-text-secondary text-sm">עלות דמי ניהול</span>
                </div>
              </div>

              <div className="bg-surface-2 rounded-2xl border border-white/5 p-4 text-right">
                <p className="text-text-muted text-xs mb-1">ללא דמי ניהול היית מגיע ל:</p>
                <p className="text-white font-bold text-xl">{formatMoney(result.balanceNoFees)}</p>
                <p className="text-text-muted text-xs mt-1">הפרש של {formatMoney(result.feeDrag)}</p>
              </div>

              <a
                href="/#contact"
                className="block w-full text-center px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors text-sm"
              >
                רוצה לשפר את דמי הניהול שלך? דבר איתנו
              </a>
            </div>

            {/* STEP 3: Parameters — second in DOM = left column in RTL */}
            <div className="space-y-4">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <span className="bg-indigo-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">3</span>
                פרמטרי חיסכון
              </h2>

              <div className="bg-surface-2 rounded-2xl border border-white/5 p-6 space-y-5">

                <div>
                  <label className="text-text-secondary text-sm block mb-2">הפקדה חודשית</label>
                  <div className="flex items-center gap-3" dir="ltr">
                    <span className="text-white font-bold text-sm w-24">₪{monthly.toLocaleString()}</span>
                    <input type="range" min={500} max={15000} step={100} value={monthly}
                      onChange={(e) => setMonthly(+e.target.value)} className="flex-1 accent-indigo-500" />
                  </div>
                </div>

                <div>
                  <label className="text-text-secondary text-sm block mb-2">תקופת חיסכון</label>
                  <div className="flex items-center gap-3" dir="ltr">
                    <span className="text-white font-bold text-sm w-24">{years} שנים</span>
                    <input type="range" min={5} max={40} step={1} value={years}
                      onChange={(e) => setYears(+e.target.value)} className="flex-1 accent-indigo-500" />
                  </div>
                </div>

                <div>
                  <label className="text-text-secondary text-sm block mb-2">תשואה שנתית משוערת</label>
                  <div className="flex items-center gap-3" dir="ltr">
                    <span className="text-white font-bold text-sm w-24">{returnRate}%</span>
                    <input type="range" min={1} max={15} step={0.5} value={returnRate}
                      onChange={(e) => setReturnRate(+e.target.value)} className="flex-1 accent-emerald-500" />
                  </div>
                </div>

                {/* Fee breakdown */}
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                  <p className="text-amber-400 text-xs font-semibold mb-2">דמי ניהול בפועל — {track.name}</p>
                  <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                    <div>
                      <span className="text-text-muted block mb-0.5">מהפקדה</span>
                      <span className="text-amber-300 font-bold">{track.feeDeposit}%</span>
                    </div>
                    <div>
                      <span className="text-text-muted block mb-0.5">מהצבירה</span>
                      <span className="text-amber-300 font-bold">{track.feeBalance}%</span>
                    </div>
                    <div>
                      <span className="text-text-muted block mb-0.5">הוצ׳ ישירות</span>
                      <span className="text-amber-300 font-bold">{track.directExpenses}%</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-amber-500/20 flex justify-between items-center">
                    <span className="text-text-muted text-xs">עלות שנתית</span>
                    <span className="text-amber-400 font-bold text-sm">{totalFeeBalance.toFixed(2)}% סה"כ מהצבירה</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* TRACK COMPARISON TABLE */}
          <div className="mt-10">
            <div className="flex items-center justify-between mb-1">
              <p className="text-text-muted text-xs">מחושב לפי תשואה ייחודית לכל מסלול | ₪{monthly.toLocaleString()} לחודש | {years} שנים</p>
              <h2 className="text-white font-semibold flex items-center gap-2">
                השוואת מסלולים — {company.name}
                <span>📊</span>
              </h2>
            </div>

            <div className="bg-surface-2 rounded-2xl border border-white/5 overflow-hidden mt-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8 bg-white/2">
                    <th className="px-4 py-3 text-text-muted font-medium">מסלול</th>
                    <th className="text-center px-3 py-3 text-text-muted font-medium">% הפקדה</th>
                    <th className="text-center px-3 py-3 text-text-muted font-medium">% צבירה</th>
                    <th className="text-center px-3 py-3 text-text-muted font-medium">תשואה</th>
                    <th className="px-4 py-3 text-text-muted font-medium">צבירה סופית</th>
                  </tr>
                </thead>
                <tbody>
                  {trackComparison.map((t, i) => {
                    const isCurrent = t.id === trackId;
                    const isBest = i === 0;
                    return (
                      <tr
                        key={t.id}
                        onClick={() => handleTrackChange(t.id)}
                        className={`border-b border-white/5 cursor-pointer transition-colors last:border-0 ${
                          isCurrent ? "bg-indigo-500/10" : "hover:bg-white/3"
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {isBest && (
                              <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
                                מיטבי
                              </span>
                            )}
                            {isCurrent && !isBest && (
                              <span className="text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded-full">
                                נבחר
                              </span>
                            )}
                            <span className={`font-medium ${isCurrent ? "text-indigo-300" : "text-white"}`}>
                              {t.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center text-amber-400">{t.feeDeposit}%</td>
                        <td className="px-3 py-3 text-center text-amber-300">{t.totalFeeBalance.toFixed(2)}%</td>
                        <td className="px-3 py-3 text-center text-emerald-400">{t.defaultReturn}%</td>
                        <td className="px-4 py-3">
                          <span className={`font-semibold ${isBest ? "text-emerald-400" : isCurrent ? "text-indigo-300" : "text-white"}`}>
                            {formatMoney(t.finalBalance)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="px-4 py-2.5 border-t border-white/5 bg-white/1">
                <p className="text-text-muted text-xs">
                  * נתוני התשואה מבוססים על ביצועים היסטוריים ואינם מבטיחים תשואה עתידית.
                </p>
              </div>
            </div>

            {gapBestWorst > 50000 && (
              <div className="mt-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 text-right">
                <p className="text-amber-400 font-semibold text-sm mb-1">⚡ ההבדל בין המסלולים</p>
                <p className="text-text-secondary text-xs leading-relaxed">
                  הפרש של{" "}
                  <strong className="text-amber-300">{formatMoney(gapBestWorst)}</strong>{" "}
                  בין המסלול הטוב לגרוע ב-{company.name}, לאורך {years} שנים.
                  בחירת המסלול הנכון עשויה לשנות את פני הפרישה שלך.
                </p>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
