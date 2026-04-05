"use client";

import { useState, useMemo } from "react";
import MainSidebar from "@/components/ui/MainSidebar";

const PRODUCTS = [
  {
    id: "pension",
    label: "קרן פנסיה",
    icon: "🏛",
    defaultFeeDeposit: 3,
    defaultFeeBalance: 0.3,
    maxFeeDeposit: 6,
    maxFeeBalance: 0.5,
    hasFeeDeposit: true,
    hasFeeBalance: true,
    note: "מקסימום לפי חוק: 6% מהפקדה, 0.5% מצבירה. קרנות ברירת מחדל: ~1% מהפקדה, ~0.22% מצבירה",
  },
  {
    id: "keren_hishtalmut",
    label: "קרן השתלמות",
    icon: "🎓",
    defaultFeeDeposit: 0,
    defaultFeeBalance: 0.7,
    maxFeeDeposit: 0,
    maxFeeBalance: 1.05,
    hasFeeDeposit: false,
    hasFeeBalance: true,
    note: "מקסימום לפי חוק: 1.05% מצבירה. אין דמי ניהול מהפקדה",
  },
  {
    id: "bituach_menahalim",
    label: "ביטוח מנהלים",
    icon: "💼",
    defaultFeeDeposit: 3,
    defaultFeeBalance: 0.9,
    maxFeeDeposit: 4,
    maxFeeBalance: 1.1,
    hasFeeDeposit: true,
    hasFeeBalance: true,
    note: "מקסימום לפי חוק: 4% מהפקדה, 1.1% מצבירה. נחשב יקר — כדאי לבדוק חלופות",
  },
  {
    id: "kupat_gemel",
    label: "קופת גמל",
    icon: "🏦",
    defaultFeeDeposit: 0,
    defaultFeeBalance: 0.6,
    maxFeeDeposit: 4,
    maxFeeBalance: 1.05,
    hasFeeDeposit: true,
    hasFeeBalance: true,
    note: "מקסימום לפי חוק: 4% מהפקדה, 1.05% מצבירה. ניתן למשיכה מגיל 60",
  },
  {
    id: "kupat_gemel_lehashkaa",
    label: "קופת גמל להשקעה",
    icon: "📈",
    defaultFeeDeposit: 0,
    defaultFeeBalance: 0.7,
    maxFeeDeposit: 4,
    maxFeeBalance: 1.05,
    hasFeeDeposit: true,
    hasFeeBalance: true,
    note: "מקסימום לפי חוק: 4% מהפקדה, 1.05% מצבירה. נזילה בכל עת, הטבת מס בגיל 60",
  },
  {
    id: "polisa",
    label: "פוליסת חיסכון",
    icon: "📋",
    defaultFeeDeposit: 0,
    defaultFeeBalance: 1.0,
    maxFeeDeposit: 0,
    maxFeeBalance: 2,
    hasFeeDeposit: false,
    hasFeeBalance: true,
    note: "נזילה בכל עת. אין תקרה חוקית — כדאי להשוות בין חברות",
  },
];

function formatMoney(n: number) {
  return new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n);
}

export default function CalculatorPage() {
  const [productId, setProductId] = useState("pension");
  const [monthly, setMonthly] = useState(1000);
  const [years, setYears] = useState(20);
  const [returnRate, setReturnRate] = useState(6);
  const [feeDeposit, setFeeDeposit] = useState(3);
  const [feeBalance, setFeeBalance] = useState(0.3);

  const product = PRODUCTS.find((p) => p.id === productId)!;

  const handleProductChange = (id: string) => {
    const p = PRODUCTS.find((x) => x.id === id)!;
    setProductId(id);
    setFeeDeposit(p.defaultFeeDeposit);
    setFeeBalance(p.defaultFeeBalance);
  };

  const result = useMemo(() => {
    const months = years * 12;
    const monthlyNet = monthly * (1 - feeDeposit / 100);
    const monthlyReturn = returnRate / 100 / 12;
    const monthlyFeeBalance = feeBalance / 100 / 12;
    const effectiveMonthlyReturn = monthlyReturn - monthlyFeeBalance;

    let balanceWithFees = 0;
    let balanceNoFees = 0;

    for (let i = 0; i < months; i++) {
      balanceWithFees = (balanceWithFees + monthlyNet) * (1 + effectiveMonthlyReturn);
      balanceNoFees = (balanceNoFees + monthly) * (1 + monthlyReturn);
    }

    const totalDeposited = monthly * months;
    const feeDrag = balanceNoFees - balanceWithFees;
    const profit = balanceWithFees - totalDeposited;

    return { balanceWithFees, balanceNoFees, totalDeposited, feeDrag, profit };
  }, [monthly, years, returnRate, feeDeposit, feeBalance]);

  return (
    <div className="flex min-h-screen bg-surface">
      <MainSidebar />
      <main className="flex-1 md:mr-60 overflow-x-hidden">

        {/* HEADER */}
        <div className="border-b border-white/5 px-10 py-5">
          <p className="text-text-muted text-xs uppercase tracking-widest mb-1">כלי חישוב</p>
          <h1 className="text-2xl font-bold text-white">מחשבון ריבית דריבית</h1>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-10">

          {/* EINSTEIN QUOTE */}
          <div className="text-center mb-12">
            <div className="inline-block bg-indigo-500/10 border border-indigo-500/20 rounded-2xl px-8 py-6 mb-6">
              <p className="text-indigo-300 text-xl font-semibold mb-2">"ריבית דריבית היא הפלא השמיני בתבל."</p>
              <p className="text-text-muted text-sm">— אלברט איינשטיין</p>
            </div>
            <p className="text-text-secondary text-base leading-relaxed max-w-2xl mx-auto">
              מי שמבין את הריבית דריבית — מרוויח אותה. מי שלא — משלם אותה.
              השקעה עקבית של סכום קטן לאורך שנים יוצרת עושר שסכום חד-פעמי גדול לא יכול להשיג.
              הזמן הוא הנכס הפיננסי החשוב ביותר שיש לך.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">

            {/* INPUTS */}
            <div className="space-y-6">

              {/* מוצר */}
              <div className="bg-surface-2 rounded-2xl border border-white/5 p-6">
                <h3 className="text-white font-semibold mb-4 text-right">בחר מוצר פנסיוני</h3>
                <div className="grid grid-cols-1 gap-2">
                  {PRODUCTS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleProductChange(p.id)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-right transition-all border ${
                        productId === p.id
                          ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-300"
                          : "border-white/5 text-text-secondary hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <span>{p.icon}</span>
                      <span className="font-medium">{p.label}</span>
                    </button>
                  ))}
                </div>
                {product.note && (
                  <p className="text-text-muted text-xs mt-3 text-right leading-relaxed">{product.note}</p>
                )}
              </div>

              {/* פרמטרים */}
              <div className="bg-surface-2 rounded-2xl border border-white/5 p-6 space-y-5">
                <h3 className="text-white font-semibold text-right">פרמטרי חיסכון</h3>

                <div className="text-right">
                  <label className="text-text-secondary text-sm block mb-2">הפקדה חודשית</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range" min={200} max={10000} step={100}
                      value={monthly}
                      onChange={(e) => setMonthly(+e.target.value)}
                      className="flex-1 accent-indigo-500"
                    />
                    <span className="text-white font-bold text-sm w-20 text-left">₪{monthly.toLocaleString()}</span>
                  </div>
                </div>

                <div className="text-right">
                  <label className="text-text-secondary text-sm block mb-2">תקופת חיסכון (שנים)</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range" min={1} max={40} step={1}
                      value={years}
                      onChange={(e) => setYears(+e.target.value)}
                      className="flex-1 accent-indigo-500"
                    />
                    <span className="text-white font-bold text-sm w-20 text-left">{years} שנים</span>
                  </div>
                </div>

                <div className="text-right">
                  <label className="text-text-secondary text-sm block mb-2">תשואה שנתית משוערת</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range" min={1} max={15} step={0.5}
                      value={returnRate}
                      onChange={(e) => setReturnRate(+e.target.value)}
                      className="flex-1 accent-emerald-500"
                    />
                    <span className="text-white font-bold text-sm w-20 text-left">{returnRate}%</span>
                  </div>
                </div>
              </div>

              {/* דמי ניהול */}
              <div className="bg-surface-2 rounded-2xl border border-amber-500/20 p-6 space-y-5">
                <h3 className="text-white font-semibold text-right">דמי ניהול</h3>

                {product.hasFeeDeposit && (
                  <div className="text-right">
                    <label className="text-text-secondary text-sm block mb-2">
                      דמי ניהול מהפקדה — מקסימום {product.maxFeeDeposit}%
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range" min={0} max={product.maxFeeDeposit} step={0.1}
                        value={feeDeposit}
                        onChange={(e) => setFeeDeposit(+e.target.value)}
                        className="flex-1 accent-amber-500"
                      />
                      <span className="text-amber-400 font-bold text-sm w-20 text-left">{feeDeposit}%</span>
                    </div>
                  </div>
                )}

                {product.hasFeeBalance && (
                  <div className="text-right">
                    <label className="text-text-secondary text-sm block mb-2">
                      דמי ניהול מצבירה — מקסימום {product.maxFeeBalance}%
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range" min={0} max={product.maxFeeBalance} step={0.05}
                        value={feeBalance}
                        onChange={(e) => setFeeBalance(+e.target.value)}
                        className="flex-1 accent-amber-500"
                      />
                      <span className="text-amber-400 font-bold text-sm w-20 text-left">{feeBalance}%</span>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* RESULTS */}
            <div className="space-y-4">

              {/* Main result */}
              <div className="bg-gradient-to-br from-indigo-500/20 to-indigo-500/5 border border-indigo-500/30 rounded-2xl p-8 text-center">
                <p className="text-indigo-300 text-sm mb-2">סכום צבור אחרי {years} שנים</p>
                <p className="text-5xl font-bold text-white mb-1">{formatMoney(result.balanceWithFees)}</p>
                <p className="text-text-muted text-xs">לאחר דמי ניהול</p>
              </div>

              {/* Breakdown */}
              <div className="bg-surface-2 rounded-2xl border border-white/5 p-6 space-y-4">
                <div className="flex justify-between items-center text-right border-b border-white/5 pb-3">
                  <span className="text-emerald-400 font-semibold">{formatMoney(result.totalDeposited)}</span>
                  <span className="text-text-secondary text-sm">סה״כ הפקדות</span>
                </div>
                <div className="flex justify-between items-center text-right border-b border-white/5 pb-3">
                  <span className="text-indigo-400 font-semibold">{formatMoney(result.profit)}</span>
                  <span className="text-text-secondary text-sm">רווח מתשואה</span>
                </div>
                <div className="flex justify-between items-center text-right">
                  <span className="text-red-400 font-semibold">-{formatMoney(result.feeDrag)}</span>
                  <span className="text-text-secondary text-sm">עלות דמי ניהול לאורך הזמן</span>
                </div>
              </div>

              {/* Fee drag callout */}
              {result.feeDrag > 10000 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 text-right">
                  <p className="text-red-400 font-semibold text-sm mb-1">⚠️ שים לב לעלות דמי הניהול</p>
                  <p className="text-text-secondary text-xs leading-relaxed">
                    עם דמי הניהול הנוכחיים אתה מפסיד {formatMoney(result.feeDrag)} לאורך {years} שנים.
                    הורדה של 0.5% בדמי הניהול יכולה לחסוך לך עשרות אלפי שקלים.
                  </p>
                </div>
              )}

              {/* Without fees comparison */}
              <div className="bg-surface-2 rounded-2xl border border-white/5 p-5 text-right">
                <p className="text-text-muted text-xs mb-1">ללא דמי ניהול היית מגיע ל:</p>
                <p className="text-white font-bold text-xl">{formatMoney(result.balanceNoFees)}</p>
                <p className="text-text-muted text-xs mt-1">הפרש של {formatMoney(result.feeDrag)}</p>
              </div>

              {/* CTA */}
              <a
                href="/#contact"
                className="block w-full text-center px-6 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors"
              >
                רוצה לשפר את דמי הניהול שלך? דבר איתנו
              </a>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
