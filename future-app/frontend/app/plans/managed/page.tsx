"use client";

import MainSidebar from "@/components/ui/MainSidebar";

export default function ManagedPlanPage() {
  return (
    <div className="flex min-h-screen bg-surface">
      <MainSidebar />
      <main className="flex-1 md:mr-60 overflow-x-hidden">

        {/* HEADER */}
        <div className="border-b border-white/5 px-10 py-5">
          <p className="text-text-muted text-xs uppercase tracking-widest mb-1">מסלול 1</p>
          <h1 className="text-2xl font-bold text-white">אני רוצה שידאגו לי</h1>
          <p className="text-text-secondary text-sm mt-1">ניהול מלא — בלי להתעסק בפרטים</p>
        </div>

        <div className="max-w-3xl mx-auto px-10 py-12 text-right">

          {/* HERO */}
          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-8 mb-10">
            <div className="text-4xl mb-4">🤝</div>
            <h2 className="text-2xl font-bold text-white mb-3">תן לנו לטפל בכל השאר</h2>
            <p className="text-text-secondary leading-relaxed">
              הפיננסים שלך יטופלו על ידינו מקצה לקצה — פנסיה, קרן השתלמות, חסכונות והשקעות.
              אתה לא צריך להבין כלום, רק לדעת שהכסף שלך בידיים טובות.
            </p>
          </div>

          {/* WHAT'S INCLUDED */}
          <h2 className="text-white font-bold text-xl mb-5">מה כולל המסלול?</h2>
          <div className="space-y-4 mb-10">
            {[
              { icon: "🔍", title: "סריקה מלאה של המצב הפיננסי שלך", desc: "נבדוק את כל הנכסים, ההתחייבויות, דמי הניהול והמסלולים הקיימים." },
              { icon: "📋", title: "תכנית פעולה מסודרת", desc: "נגדיר יחד מה צריך לשנות, מה לשמר ומה לשפר — ונבצע." },
              { icon: "⚡", title: "ביצוע מלא על ידינו", desc: "אנחנו מטפלים בכל הבירוקרטיה, ההעברות והשינויים. אתה רק מאשר." },
              { icon: "📞", title: "ליווי שוטף", desc: "זמינים לכל שאלה, עדכון או שינוי לאורך הדרך." },
            ].map((item, i) => (
              <div key={i} className="flex gap-4 bg-surface-2 rounded-xl p-5 border border-white/5 text-right">
                <span className="text-2xl flex-shrink-0">{item.icon}</span>
                <div>
                  <div className="text-white font-medium mb-1">{item.title}</div>
                  <div className="text-text-secondary text-sm">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* FOR WHOM */}
          <div className="bg-surface-2 rounded-2xl border border-white/5 p-7 mb-10">
            <h3 className="text-white font-semibold mb-4">המסלול הזה מתאים לך אם:</h3>
            <ul className="space-y-2 text-text-secondary text-sm">
              {[
                "אין לך זמן או רצון להתעסק בפרטים הפיננסיים",
                "אתה רוצה לדעת שהדברים מסודרים — בלי להבין איך",
                "עברת שינוי בחיים (עבודה חדשה, נישואים, ירושה) ורוצה סדר",
                "ניסית להתמודד לבד ומרגיש שאתה מפספס משהו",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-indigo-400 mt-0.5">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <div className="text-center">
            <a
              href="/#contact"
              className="inline-block px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors text-base"
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
