"use client";

import MainSidebar from "@/components/ui/MainSidebar";

export default function LearnPlanPage() {
  return (
    <div className="flex min-h-screen bg-surface">
      <MainSidebar />
      <main className="flex-1 md:mr-60 overflow-x-hidden">

        {/* HEADER */}
        <div className="border-b border-white/5 px-10 py-5">
          <p className="text-text-muted text-xs uppercase tracking-widest mb-1">מסלול 2</p>
          <h1 className="text-2xl font-bold text-white">אני רוצה להבין</h1>
          <p className="text-text-secondary text-sm mt-1">קורס דיגיטלי + ליווי אישי</p>
        </div>

        <div className="max-w-3xl mx-auto px-10 py-12 text-right">

          {/* HERO */}
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-8 mb-10">
            <div className="text-4xl mb-4">🎓</div>
            <h2 className="text-2xl font-bold text-white mb-3">תבין את הכסף שלך</h2>
            <p className="text-text-secondary leading-relaxed">
              קורס דיגיטלי שמלמד מקרו כלכלה, ניהול פיננסי אישי והמוצרים הקיימים בשוק —
              בשפה פשוטה וברורה. בנוסף ליווי אישי שמחבר את הידע לפעולה.
            </p>
          </div>

          {/* COURSE MODULES */}
          <h2 className="text-white font-bold text-xl mb-5">תוכן הקורס</h2>
          <div className="space-y-3 mb-10">
            {[
              { num: "01", title: "מאקרו כלכלה בבסיס", desc: "ריבית, אינפלציה, שוק ההון — מה זה אומר עליך ועל הכסף שלך." },
              { num: "02", title: "ניהול פיננסי אישי", desc: "תזרים מזומנים, חיסכון, חוב טוב מול חוב רע — העקרונות שמשנים הכל." },
              { num: "03", title: "טבעת העתיד", desc: "פנסיה, קרן השתלמות, ביטוח מנהלים — איך הם עובדים ואיך לבחור נכון." },
              { num: "04", title: "טבעת הביטחון", desc: "קרן חירום, ביטוח חיים ובריאות — כמה צריך ומה מספיק." },
              { num: "05", title: "טבעת הצמיחה", desc: "שוק ההון, מדדים, השקעות לטווח ארוך — להתחיל נכון." },
              { num: "06", title: "המוצרים בשוק", desc: "קרנות נאמנות, ETF, פוליסות חיסכון — מה כל מוצר עושה ומתי מתאים." },
            ].map((item, i) => (
              <div key={i} className="flex gap-4 bg-surface-2 rounded-xl p-5 border border-white/5">
                <span className="text-emerald-400 font-bold text-lg flex-shrink-0 w-8">{item.num}</span>
                <div className="text-right">
                  <div className="text-white font-medium mb-1">{item.title}</div>
                  <div className="text-text-secondary text-sm">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* WHAT'S INCLUDED */}
          <h2 className="text-white font-bold text-xl mb-5">מה עוד כולל המסלול?</h2>
          <div className="grid md:grid-cols-2 gap-4 mb-10">
            {[
              { icon: "🎥", title: "שיעורים מוקלטים", desc: "צפה בקצב שלך, בכל זמן ומכל מקום." },
              { icon: "📞", title: "פגישת יישום אישית", desc: "נחבר את הידע שרכשת למצב הפיננסי הספציפי שלך." },
              { icon: "📝", title: "חומרי עזר", desc: "גיליונות עבודה, מחשבונים ומדריכים מעשיים." },
              { icon: "💬", title: "שאלות ותשובות", desc: "גישה לשאלות שנענות אישית לאורך הקורס." },
            ].map((item, i) => (
              <div key={i} className="bg-surface-2 rounded-xl p-5 border border-white/5 text-right">
                <div className="text-2xl mb-2">{item.icon}</div>
                <div className="text-white font-medium mb-1">{item.title}</div>
                <div className="text-text-secondary text-sm">{item.desc}</div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center">
            <a
              href="/#contact"
              className="inline-block px-10 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors text-base"
            >
              אני מעוניין — בואו נדבר
            </a>
            <p className="text-text-muted text-xs mt-3">שיחת היכרות ראשונה ללא עלות וללא התחייבות</p>
          </div>

        </div>
      </main>
    </div>
  );
}
