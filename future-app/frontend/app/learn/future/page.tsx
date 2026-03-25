export default function LearnFuturePage() {
  return (
    <div className="min-h-screen bg-surface">
      <div className="border-b border-white/5 px-8 py-5">
        <h1 className="text-2xl font-bold text-white">🏛 טבעת העתיד</h1>
        <p className="text-text-secondary text-sm mt-1">מוצרים פנסיוניים בישראל — מדריך מקצועי ועדכני</p>
      </div>

      <div className="px-8 py-8 max-w-5xl mx-auto space-y-8">

        {/* סקירה */}
        <section className="bg-surface-2 rounded-2xl p-6 border border-white/5">
          <h2 className="text-lg font-bold text-indigo-300 mb-3">מה זה טבעת העתיד?</h2>
          <p className="text-text-secondary leading-relaxed">
            טבעת העתיד מרכזת את כל החיסכון ארוך הטווח שנועד לפרנס אותך בגיל הפרישה.
            בישראל קיימת חובה חוקית להפריש לפנסיה, וישנם מספר מכשירים מרכזיים — לכל אחד יתרונות,
            חסרונות ומאפיינים ייחודיים. הכרת ההבדלים ביניהם יכולה לחסוך לך עשרות ואף מאות אלפי שקלים לאורך השנים.
          </p>
        </section>

        {/* קרן פנסיה */}
        <section className="bg-surface-2 rounded-2xl p-6 border border-white/5 space-y-4">
          <h2 className="text-lg font-bold text-white">🏦 קרן פנסיה מקיפה</h2>
          <p className="text-text-secondary leading-relaxed">
            המוצר הנפוץ ביותר. כספי העמיתים מאוחדים, ומשולמת קצבה חודשית החל מגיל הפרישה.
            כוללת גם כיסוי ביטוחי לנכות ושאירים.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-surface rounded-xl p-4">
              <div className="text-white font-semibold text-base mb-3">הפרשות חובה (שכיר)</div>
              <div className="space-y-2 text-base">
                <div className="flex justify-between"><span className="text-text-secondary">עובד</span><span className="text-white">6%</span></div>
                <div className="flex justify-between"><span className="text-text-secondary">מעסיק (תגמולים)</span><span className="text-white">6.5%</span></div>
                <div className="flex justify-between"><span className="text-text-secondary">מעסיק (פיצויים)</span><span className="text-white">8.33%</span></div>
                <div className="flex justify-between border-t border-white/10 pt-2 font-semibold"><span className="text-text-secondary">סה"כ מהשכר</span><span className="text-indigo-300">~20.83%</span></div>
              </div>
            </div>
            <div className="bg-surface rounded-xl p-4">
              <div className="text-white font-semibold text-base mb-3">דמי ניהול — מה לדרוש</div>
              <div className="space-y-2 text-base">
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">מצבירה — מצוין</span>
                  <span className="text-emerald-400 font-mono">עד 0.1%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">מצבירה — סביר</span>
                  <span className="text-amber-400 font-mono">0.1%–0.3%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">מצבירה — יקר</span>
                  <span className="text-red-400 font-mono">מעל 0.5%</span>
                </div>
                <div className="flex justify-between items-center border-t border-white/10 pt-2">
                  <span className="text-text-secondary">מהפקדה — מצוין</span>
                  <span className="text-emerald-400 font-mono">0%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">מהפקדה — מקסימום חוקי</span>
                  <span className="text-red-400 font-mono">1.49%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface rounded-xl p-4">
            <div className="text-white font-semibold text-base mb-3">מסלולי השקעה נפוצים</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              {[
                { name: "מסלול מניות", risk: "גבוה", returnAvg: "~10% היסטורי" },
                { name: "מסלול כללי", risk: "בינוני", returnAvg: "~7-8%" },
                { name: "מסלול תלוי גיל", risk: "דינמי", returnAvg: "משתנה" },
                { name: "מסלול אג\"ח", risk: "נמוך", returnAvg: "~3-5%" },
                { name: "מסלול מניות חו\"ל", risk: "גבוה", returnAvg: "~9-10%" },
                { name: "מסלול S&P 500", risk: "גבוה", returnAvg: "~10%" },
              ].map((t) => (
                <div key={t.name} className="bg-surface-2 rounded-lg p-3">
                  <div className="text-white text-sm font-medium">{t.name}</div>
                  <div className="text-text-muted text-sm mt-1">סיכון: {t.risk}</div>
                  <div className="text-indigo-300 text-sm">{t.returnAvg}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 text-base text-indigo-200">
            <strong>נקודה למחשבה:</strong> מתחת לגיל 50 — שקול מסלול בסיכון גבוה יותר. מעל גיל 50 — שקול מסלול בסיכון נמוך ויותר סולידי. הפרשה גדולה ועקבית לאורך השנים = פרישה נוחה יותר.
          </div>
        </section>

        {/* קרן השתלמות */}
        <section className="bg-surface-2 rounded-2xl p-6 border border-white/5 space-y-4">
          <h2 className="text-lg font-bold text-white">📈 קרן השתלמות</h2>
          <p className="text-text-secondary leading-relaxed">
            אחד האפיקים הטובים ביותר בישראל — פטורה ממס רווחי הון (25%) לאחר 6 שנים.
            בפועל, מי שמשקיע דרך קרן השתלמות חוסך עשרות אחוזים על רווחים לטווח ארוך.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-surface rounded-xl p-4 text-center border border-emerald-500/20">
              <div className="text-2xl font-bold text-emerald-400">0%</div>
              <div className="text-text-secondary text-sm mt-1">מס רווחי הון אחרי 6 שנים</div>
            </div>
            <div className="bg-surface rounded-xl p-4 text-center border border-indigo-500/20">
              <div className="text-2xl font-bold text-indigo-400">7.5%</div>
              <div className="text-text-secondary text-sm mt-1">הפרשת מעסיק מקסימלית</div>
            </div>
            <div className="bg-surface rounded-xl p-4 text-center border border-amber-500/20">
              <div className="text-2xl font-bold text-amber-400">2.5%</div>
              <div className="text-text-secondary text-sm mt-1">הפרשת עובד מקסימלית</div>
            </div>
          </div>

          <div className="bg-surface rounded-xl p-4">
            <div className="text-white font-semibold text-base mb-3">דמי ניהול קרן השתלמות</div>
            <div className="space-y-2 text-base">
              <div className="flex items-center justify-between p-2 bg-emerald-500/10 rounded-lg">
                <span className="text-text-secondary">מצוין — מנוהלת / פסיבית מצבירה</span>
                <span className="text-emerald-400 font-mono font-semibold">עד 0.15%</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-amber-500/10 rounded-lg">
                <span className="text-text-secondary">סביר</span>
                <span className="text-amber-400 font-mono font-semibold">0.15%–0.4%</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-red-500/10 rounded-lg">
                <span className="text-text-secondary">יקר — שווה לבדוק ניוד</span>
                <span className="text-red-400 font-mono font-semibold">מעל 0.5%</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-base text-indigo-100">
            <strong>עצמאים:</strong> יכולים להפריש עד 4.5% מההכנסה לקרן השתלמות ולקבל הטבת מס. זה אחד הצעדים הראשונים שעצמאי צריך לעשות.
          </div>
        </section>

        {/* ביטוח מנהלים */}
        <section className="bg-surface-2 rounded-2xl p-6 border border-white/5 space-y-4">
          <h2 className="text-lg font-bold text-white">📋 ביטוח מנהלים</h2>
          <p className="text-text-secondary leading-relaxed">
            חוזה פנסיוני אישי מול חברת ביטוח. גמיש יותר מקרן פנסיה, אך לרוב עם דמי ניהול גבוהים יותר.
            פוליסות ישנות מלפני 2004 מכילות לעתים "מקדם קצבה מובטח" — יתרון משמעותי שכדאי לשמור.
          </p>

          <div className="bg-surface rounded-xl p-4">
            <div className="text-white font-semibold text-base mb-3">דמי ניהול ביטוח מנהלים</div>
            <div className="space-y-2 text-base">
              <div className="flex items-center justify-between p-2 bg-emerald-500/10 rounded-lg">
                <span className="text-text-secondary">מצוין — מצבירה</span>
                <span className="text-emerald-400 font-mono font-semibold">עד 0.6%</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-amber-500/10 rounded-lg">
                <span className="text-text-secondary">סביר</span>
                <span className="text-amber-400 font-mono font-semibold">0.6%–1.0%</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-red-500/10 rounded-lg">
                <span className="text-text-secondary">יקר מאוד — חובה לבדוק</span>
                <span className="text-red-400 font-mono font-semibold">מעל 1.5%</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-base text-red-200">
            <strong>שים לב:</strong> דמי ניהול של 1.5% במצבירה לעומת 0.15% יכולים להגיע להפרש של מאות אלפי שקלים לאורך 30 שנה. תמיד כדאי לבדוק אפשרות ניוד.
          </div>
        </section>

        {/* קופת גמל */}
        <section className="bg-surface-2 rounded-2xl p-6 border border-white/5 space-y-4">
          <h2 className="text-lg font-bold text-white">🏛 קופת גמל להשקעה</h2>
          <p className="text-text-secondary leading-relaxed">
            מכשיר חיסכון גמיש שאינו תלוי מקום עבודה — ניתן להפקיד עד <span className="text-white font-medium">83,641 ₪ בשנה (נכון ל־2026)</span>.
            הכסף נזיל בכל עת (במשיכה חל מס רווחי הון). ניתן לעבור בין מסלולים וגופים ללא אירוע מס.
            פטור ממס רווחי הון אם מושכים את הכסף כקצבה מגיל 60.
          </p>
          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 text-sm text-indigo-100 space-y-1">
            <div className="font-semibold text-indigo-300 mb-1">✦ חשוב לדעת</div>
            <div>• התקרה (83,641 ₪) היא לכלל הקופות יחד — לא לכל קופה בנפרד</div>
            <div>• הפקדה מעל התקרה לא תזכה בהטבת מס</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-base">
            <div className="bg-surface rounded-xl p-4">
              <div className="text-white font-medium mb-2">יתרונות</div>
              <ul className="text-text-secondary space-y-1">
                <li>✓ גמישות מלאה — ניתן להפקיד כל סכום</li>
                <li>✓ פטור ממס אם נמשך כקצבה</li>
                <li>✓ נזיל בכל עת (בכפוף למס)</li>
                <li>✓ מגוון מסלולי השקעה</li>
              </ul>
            </div>
            <div className="bg-surface rounded-xl p-4">
              <div className="text-white font-medium mb-2">חסרונות</div>
              <ul className="text-text-secondary space-y-1">
                <li>✗ אין הפרשות מעסיק</li>
                <li>✗ אין כיסוי ביטוחי</li>
                <li>✗ מס 25% על משיכה לפני פרישה</li>
              </ul>
            </div>
          </div>
        </section>

        {/* טבלת השוואה */}
        <section className="bg-surface-2 rounded-2xl p-6 border border-white/5">
          <h2 className="text-lg font-bold text-white mb-4">📊 השוואה מהירה</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="pb-3 text-text-muted font-medium">מוצר</th>
                  <th className="pb-3 text-text-muted font-medium text-center">דמי ניהול טובים</th>
                  <th className="pb-3 text-text-muted font-medium text-center">נזילות</th>
                  <th className="pb-3 text-text-muted font-medium text-center">כיסוי ביטוחי</th>
                  <th className="pb-3 text-text-muted font-medium text-center">מס על רווח</th>
                </tr>
              </thead>
              <tbody className="space-y-1">
                {[
                  { name: "קרן פנסיה", fees: "מצבירה < 0.3%", liq: "גיל פרישה", ins: "✓ כן", tax: "מס קצבה" },
                  { name: "קרן השתלמות", fees: "< 0.2%", liq: "6 שנים", ins: "✗ לא", tax: "0% אחרי 6 שנים" },
                  { name: "ביטוח מנהלים", fees: "מצבירה < 0.8%", liq: "גיל פרישה", ins: "✓ כן", tax: "מס קצבה" },
                  { name: "קופת גמל להשקעה", fees: "< 0.5%", liq: "גמיש", ins: "✗ לא", tax: "0% כקצבה / 25% הון" },
                ].map((r, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td className="py-3 text-white font-medium">{r.name}</td>
                    <td className="py-3 text-emerald-400 text-center">{r.fees}</td>
                    <td className="py-3 text-text-secondary text-center">{r.liq}</td>
                    <td className="py-3 text-center">{r.ins}</td>
                    <td className="py-3 text-text-secondary text-center">{r.tax}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  );
}
