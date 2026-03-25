export default function LearnSecurityPage() {
  return (
    <div className="min-h-screen bg-surface">
      <div className="border-b border-white/5 px-8 py-5">
        <h1 className="text-2xl font-bold text-white">🛡 טבעת הביטחון</h1>
        <p className="text-text-secondary text-sm mt-1">כרית ביטחון כלכלית, קרן כספית והגנה מהאינפלציה</p>
      </div>

      <div className="px-8 py-8 max-w-5xl mx-auto space-y-8">

        {/* מה זה */}
        <section className="bg-surface-2 rounded-2xl p-6 border border-white/5">
          <h2 className="text-lg font-bold text-emerald-300 mb-3">מה זה טבעת הביטחון?</h2>
          <p className="text-text-secondary leading-relaxed">
            טבעת הביטחון היא השכבה שמגנה עליך כשהחיים מפתיעים — פיטורין, מחלה, תיקון דחוף, הוצאה לא צפויה.
            לפני שמשקיעים בשוק ההון, לפני שמגדילים פנסיה — קודם בונים כרית ביטחון.
            זו לא בזבוז; זו הבסיס שמאפשר לכל השאר לעבוד.
          </p>
        </section>

        {/* כרית ביטחון */}
        <section className="bg-surface-2 rounded-2xl p-6 border border-white/5">
          <h2 className="text-lg font-bold text-white mb-4">🪑 כרית ביטחון — כמה צריך?</h2>
          <p className="text-text-secondary leading-relaxed mb-4">
            הכלל המקובל: לשמור בצד סכום שמכסה בין 3 ל-12 חודשי הוצאות.
            כמה בדיוק תלוי בך — ביציבות ההכנסה שלך, בהוצאות הקבועות ובתחושת הביטחון שאתה צריך.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div className="bg-surface rounded-xl p-4 text-center border border-emerald-500/20">
              <div className="text-2xl font-bold text-emerald-400">3 חודשים</div>
              <div className="text-text-secondary text-sm mt-1">שכיר עם הכנסה יציבה</div>
            </div>
            <div className="bg-surface rounded-xl p-4 text-center border border-amber-500/20">
              <div className="text-2xl font-bold text-amber-400">6 חודשים</div>
              <div className="text-text-secondary text-sm mt-1">רוב האנשים — המקום להתחיל</div>
            </div>
            <div className="bg-surface rounded-xl p-4 text-center border border-indigo-500/20">
              <div className="text-2xl font-bold text-indigo-400">12 חודשים</div>
              <div className="text-text-secondary text-sm mt-1">עצמאי / תנודתיות גבוהה</div>
            </div>
          </div>
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-base text-emerald-200">
            הכסף הזה לא "שוכב" — הוא עובד בשבילך בקרן כספית (ראה למטה) ומוגן מאינפלציה.
          </div>
        </section>

        {/* קרן כספית */}
        <section className="bg-surface-2 rounded-2xl p-6 border border-white/5">
          <h2 className="text-lg font-bold text-white mb-4">💰 קרן כספית — מה זה?</h2>
          <p className="text-text-secondary leading-relaxed mb-4">
            קרן כספית היא קרן נאמנות המשקיעה בנכסים קצרי טווח ובטוחים — אגרות חוב ממשלתיות קצרות,
            פיקדונות בנקאיים ומכשירים דומים. היא לא קסם — היא לא תעשיר אותך — אבל היא:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">✓</span>
                <div>
                  <div className="text-white text-base font-medium">נזילה לחלוטין</div>
                  <div className="text-text-secondary text-sm">אפשר למשוך כסף תוך יום-יומיים</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">✓</span>
                <div>
                  <div className="text-white text-base font-medium">מוגנת מאינפלציה</div>
                  <div className="text-text-secondary text-sm">תשואה הקרובה לריבית בנק ישראל</div>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">✓</span>
                <div>
                  <div className="text-white text-base font-medium">סיכון נמוך מאוד</div>
                  <div className="text-text-secondary text-sm">לא חשופה לתנודות שוק המניות</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">✓</span>
                <div>
                  <div className="text-white text-base font-medium">ללא עמלות כניסה/יציאה</div>
                  <div className="text-text-secondary text-sm">דמי ניהול נמוכים מאוד</div>
                </div>
              </div>
            </div>
          </div>
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-base text-indigo-100">
            כרית הביטחון שלך צריכה להיות בקרן כספית — לא בחשבון עו"ש שנשחק מעמלות, ולא בשוק המניות שעלול לרדת 30% בדיוק כשתזדקק לכסף.
          </div>
        </section>

        {/* ביטוחים */}
        <section className="bg-surface-2 rounded-2xl p-6 border border-white/5">
          <h2 className="text-lg font-bold text-white mb-4">🔒 ביטוחים — ההגנה האחרת</h2>
          <p className="text-text-secondary leading-relaxed mb-4">
            כרית ביטחון מכסה הוצאות לא צפויות. ביטוח מכסה אירועים קטסטרופליים.
            שניהם יחד יוצרים מעטפת ביטחון מלאה.
          </p>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-surface rounded-xl">
              <span className="text-lg">🏥</span>
              <div>
                <div className="text-white text-base font-medium">ביטוח בריאות</div>
                <div className="text-text-secondary text-sm">כיסוי תרופות, ניתוחים, רופאים פרטיים. משלים את קופת החולים.</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-surface rounded-xl">
              <span className="text-lg">💼</span>
              <div>
                <div className="text-white text-base font-medium">ביטוח אובדן כושר עבודה</div>
                <div className="text-text-secondary text-sm">אם לא תוכל לעבוד — מקבל הכנסה חלופית. קריטי לעצמאים.</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-surface rounded-xl">
              <span className="text-lg">🏠</span>
              <div>
                <div className="text-white text-base font-medium">ביטוח חיים</div>
                <div className="text-text-secondary text-sm">רלוונטי בעיקר אם יש תלויים או משכנתה. בדוק שאין כפל ביטוחים.</div>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
