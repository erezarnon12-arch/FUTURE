export default function LearnGrowthPage() {
  return (
    <div className="min-h-screen bg-surface">
      <div className="border-b border-white/5 px-8 py-5">
        <h1 className="text-2xl font-bold text-white">🚀 טבעת הצמיחה</h1>
        <p className="text-text-secondary text-sm mt-1">שוק ההון, השקעות אלטרנטיביות וציפיות ריאליות</p>
      </div>

      <div className="px-8 py-8 max-w-5xl mx-auto space-y-8">

        {/* אזהרה ראשונה */}
        <section className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-indigo-300 mb-3">✦ לפני הכל — ציפיות ריאליות</h2>
          <p className="text-indigo-100 leading-relaxed">
            אם אתה מצפה להכפיל כסף תוך שבוע, לראות רווחים של 50% בחודש, או שמישהו הבטיח לך תשואות מובטחות —
            זה לא המקום הזה, וכנראה שמישהו מנסה לרמות אותך.
            <strong className="block mt-2">השקעה אמיתית היא תהליך ארוך טווח של שנים ועשרות שנים.</strong>
          </p>
        </section>

        {/* מה זה */}
        <section className="bg-surface-2 rounded-2xl p-6 border border-white/5">
          <h2 className="text-lg font-bold text-amber-300 mb-3">מה זה טבעת הצמיחה?</h2>
          <p className="text-text-secondary leading-relaxed">
            טבעת הצמיחה היא הכסף שמעבר לביטחון ולפנסיה — הכסף שעובד בשבילך לאורך זמן ומגדיל את העושר שלך.
            היא מגיעה שלישית בסדר עדיפויות: קודם כרית ביטחון, אחר כך פנסיה, ואז — צמיחה.
          </p>
        </section>

        {/* שוק ההון */}
        <section className="bg-surface-2 rounded-2xl p-6 border border-white/5">
          <h2 className="text-lg font-bold text-white mb-4">📊 שוק ההון — המניות והאינדקסים</h2>
          <p className="text-text-secondary leading-relaxed mb-4">
            שוק המניות הוא הדרך הנגישה ביותר להשקעה לטווח ארוך. במקום לנסות לבחור מניה אחת שתעלה,
            ניתן להשקיע ב<strong className="text-white">אינדקס</strong> — סל של מאות חברות בו זמנית.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-surface rounded-xl p-4">
              <div className="text-white font-semibold mb-2 text-base">אינדקסים מרכזיים</div>
              <ul className="text-text-secondary text-base space-y-1">
                <li>• S&P 500 — 500 החברות הגדולות בארה"ב</li>
                <li>• נאסד"ק 100 — 100 חברות טכנולוגיה</li>
                <li>• MSCI World — מדד עולמי</li>
                <li>• ת"א 125 — שוק ישראלי</li>
              </ul>
            </div>
            <div className="bg-surface rounded-xl p-4">
              <div className="text-white font-semibold mb-2 text-base">תשואה היסטורית (ממוצע)</div>
              <ul className="text-text-secondary text-base space-y-1">
                <li>• S&P 500: כ-10% לשנה לאורך עשרות שנים</li>
                <li>• אחרי אינפלציה: כ-7% ריאלי</li>
                <li>• עם תנודות: שנים של +30%, שנים של -30%</li>
                <li>• <strong className="text-amber-400">אין ערובה לעתיד</strong></li>
              </ul>
            </div>
          </div>
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-base text-indigo-200">
            ככל שטווח ההשקעה ארוך יותר, כך הסיכון קטן. מי שהשקיע ב-S&P 500 לכל תקופה של 15 שנה מעולם לא הפסיד — היסטורית.
          </div>
        </section>

        {/* מה לא לעשות */}
        <section className="bg-surface-2 rounded-2xl p-6 border border-white/5">
          <h2 className="text-lg font-bold text-white mb-4">🚫 מה לא לעשות</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <span className="text-red-400 text-lg">✗</span>
              <div>
                <div className="text-white text-base font-medium">לצפות להכפלה מהירה</div>
                <div className="text-text-secondary text-sm">כסף שהוכפל תוך שבוע — כנראה הונאה. השקעות אמיתיות לוקחות שנים.</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <span className="text-red-400 text-lg">✗</span>
              <div>
                <div className="text-white text-base font-medium">להשקיע כסף שאתה צריך בקרוב</div>
                <div className="text-text-secondary text-sm">אם תצטרך את הכסף תוך שנה — הוא לא שייך לשוק ההון. שוק יכול לרדת בדיוק אז.</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <span className="text-red-400 text-lg">✗</span>
              <div>
                <div className="text-white text-base font-medium">לרכוש מניה בודדת "בטוחה"</div>
                <div className="text-text-secondary text-sm">גם חברות ענק קרסו. פיזור על פני מאות חברות מפחית דרמטית את הסיכון.</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <span className="text-red-400 text-lg">✗</span>
              <div>
                <div className="text-white text-base font-medium">לבצע "טיימינג" לשוק</div>
                <div className="text-text-secondary text-sm">לנסות לקנות בתחתית ולמכור בשיא — אפילו מקצוענים נכשלים בזה. השקע בקביעות.</div>
              </div>
            </div>
          </div>
        </section>

        {/* השקעות אלטרנטיביות */}
        <section className="bg-surface-2 rounded-2xl p-6 border border-white/5">
          <h2 className="text-lg font-bold text-white mb-4">🏢 השקעות אלטרנטיביות</h2>
          <p className="text-text-secondary leading-relaxed mb-4">
            מעבר לשוק המניות, ישנם אפיקי השקעה נוספים — מתאימים בדרך כלל למשקיעים עם ניסיון ויכולת להקצות סכומים גדולים יותר.
          </p>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-4 bg-surface rounded-xl">
              <span className="text-2xl">🏠</span>
              <div>
                <div className="text-white text-base font-medium">נדל"ן</div>
                <div className="text-text-secondary text-sm leading-relaxed">
                  דירה להשקעה, נדל"ן מסחרי, קרנות ריט. מספק תזרים שכירות + עליית ערך.
                  דורש הון פנוי גבוה, ניהול שוטף ונזילות נמוכה.
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-surface rounded-xl">
              <span className="text-2xl">🏭</span>
              <div>
                <div className="text-white text-base font-medium">Private Equity / קרנות השקעה</div>
                <div className="text-text-secondary text-sm leading-relaxed">
                  השקעה בחברות פרטיות. פוטנציאל תשואה גבוה, אבל כסף נעול לשנים ורמת סיכון גבוהה.
                  מתאים למשקיעים מתוחכמים עם הון פנוי.
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-surface rounded-xl">
              <span className="text-2xl">🌾</span>
              <div>
                <div className="text-white text-base font-medium">סחורות ואנרגיה</div>
                <div className="text-text-secondary text-sm leading-relaxed">
                  זהב, נפט, חקלאות. משמשים לגיוון ולהגנה מפני אינפלציה. תנודתיות גבוהה.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* עיקרון מנחה */}
        <section className="bg-indigo-500/10 border border-indigo-500/30 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-indigo-300 mb-3">💡 העיקרון הכי חשוב</h2>
          <p className="text-indigo-100 leading-relaxed">
            השקע בקביעות, לאורך זמן, בפיזור רחב — ואל תיגע בכסף בשוק הלחץ.
            <strong className="block mt-2">זמן בשוק עדיף על תזמון שוק.</strong>
            מי שהשקיע ₪1,000 בחודש ב-S&P 500 למשך 30 שנה — צבר הון שמעטים היו מאמינים שאפשרי.
          </p>
        </section>

      </div>
    </div>
  );
}
