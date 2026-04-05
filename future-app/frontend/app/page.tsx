"use client";

import { useEffect, useState } from "react";
import { getClients } from "@/lib/api";
import MainSidebar from "@/components/ui/MainSidebar";

export default function HomePage() {

  const [loading,setLoading] = useState(true);

  const [contact,setContact] = useState({
    name:"",
    age:"",
    phone:""
  });

  const [submitted,setSubmitted] = useState(false);
  const [sending,setSending] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);

  const reviews = [
    { text: "לא ידעתי שכל כך הרבה כסף הולך לאיבוד בדמי ניהול גבוהים. אחרי פגישה אחת שיניתי מסלול וחסכתי אלפי שקלים בשנה.", name: "רונית, 38" },
    { text: "סוף סוף הבנתי לאן הכסף שלי הולך. קיבלתי תמונה ברורה ותכנית מסודרת — בלי עמלות מיותרות ובלי ז'רגון.", name: "דני, 42" },
    { text: "פנסיה, חסכונות — הכל במקום אחד. הרגשתי שמישהו באמת מסתכל על האינטרס שלי.", name: "מיכל, 45" },
    { text: "שירות מקצועי, ברור ואנושי. לא הרגשתי שמוכרים לי — הרגשתי שעוזרים לי.", name: "אורי, 51" },
  ];

  useEffect(()=>{
    getClients()
      .catch(()=>{})
      .finally(()=>setLoading(false));
  },[]);

  const handleContactSubmit = async (e:React.FormEvent)=>{
    e.preventDefault();
    setSending(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contact),
        signal: controller.signal,
      });
      clearTimeout(timeout);
    } catch {}
    setSubmitted(true);
    setSending(false);
    setContact({ name:"", age:"", phone:"" });
  };

  if(loading){
    return(
      <div className="flex items-center justify-center h-screen bg-surface">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
          <p className="text-text-secondary text-sm">טוען FUTURE...</p>
        </div>
      </div>
    );
  }

  return(

<div className="flex min-h-screen bg-surface">

<MainSidebar />

{/* MAIN */}

<main className="flex-1 md:mr-60 overflow-x-hidden">

{/* HEADER */}

<div className="border-b border-white/5 px-10 py-5 flex items-center justify-between">
<div className="flex items-center gap-3">
<div className="relative w-8 h-8">
<div className="absolute inset-0 rounded-full border border-indigo-500/60"/>
<div className="absolute inset-1.5 rounded-full border border-emerald-500/60"/>
<div className="absolute inset-3 rounded-full bg-amber-500"/>
</div>
<span className="text-xl font-bold text-white tracking-wider">FUTURE</span>
<span className="text-text-muted text-xs ml-2 hidden sm:block">פיננסים</span>
</div>
</div>

{/* HERO */}

<div className="max-w-4xl mx-auto px-10 pt-16 pb-12 text-center">
<h2 className="text-7xl font-bold text-white tracking-widest mb-3">FUTURE</h2>
<p className="text-indigo-400 text-sm font-medium tracking-widest mb-6 uppercase">חינוך פיננסי אישי ומקצועי</p>
<h1 className="text-5xl font-bold text-white leading-tight mb-6">
הכסף שלך עובד קשה.<br/>
<span className="text-indigo-400">האם הוא עובד בשבילך?</span>
</h1>
<p className="text-text-secondary text-lg leading-relaxed mb-10 max-w-2xl mx-auto">
רוב האנשים לא יודעים כמה הם משלמים בדמי ניהול, אם הפנסיה שלהם על המסלול הנכון,
ואם יש להם כרית ביטחון מספקת. אנחנו עוזרים לשנות את זה — עם תמונה ברורה ותכנית פעולה מעשית.
</p>
<a
  href="#contact"
  className="inline-block px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors text-base"
>
  לשיחת היכרות חינם
</a>
</div>

{/* PLANS */}

<div className="max-w-4xl mx-auto px-10 mb-16">
  <div className="text-center mb-8">
    <p className="text-indigo-400 text-xs font-medium tracking-widest uppercase mb-2">איך אנחנו עובדים?</p>
    <h2 className="text-white font-bold text-3xl">בחר את המסלול שמתאים לך</h2>
  </div>
  <div className="grid md:grid-cols-2 gap-6">

    <a href="/plans/managed" className="group block bg-surface-2 rounded-2xl p-8 border border-indigo-500/20 hover:border-indigo-500/60 hover:shadow-lg hover:shadow-indigo-500/10 transition-all text-right">
      <div className="w-12 h-12 rounded-xl bg-indigo-500/15 flex items-center justify-center text-2xl mb-5">🤝</div>
      <div className="text-indigo-300 font-bold text-lg mb-2">אני רוצה שידאגו לי</div>
      <div className="text-text-secondary text-sm leading-relaxed mb-5">
        לא מעניין אותך הידע — אתה רוצה שהדברים יסתדרו. אנחנו לוקחים את הכל מקצה לקצה.
      </div>
      <div className="text-indigo-400 text-xs font-medium group-hover:translate-x-[-4px] transition-transform inline-block">
        קרא עוד ←
      </div>
    </a>

    <a href="/plans/learn" className="group block bg-surface-2 rounded-2xl p-8 border border-emerald-500/20 hover:border-emerald-500/60 hover:shadow-lg hover:shadow-emerald-500/10 transition-all text-right">
      <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center text-2xl mb-5">🎓</div>
      <div className="text-emerald-300 font-bold text-lg mb-2">אני רוצה להבין</div>
      <div className="text-text-secondary text-sm leading-relaxed mb-5">
        קורס דיגיטלי על מאקרו כלכלה, ניהול פיננסי והמוצרים בשוק — בשפה שכולם מבינים.
      </div>
      <div className="text-emerald-400 text-xs font-medium group-hover:translate-x-[-4px] transition-transform inline-block">
        קרא עוד ←
      </div>
    </a>

  </div>
</div>

{/* STATS */}

<div className="max-w-5xl mx-auto px-10 mb-16">
<div className="grid grid-cols-3 gap-5 text-center">
<div className="bg-surface-2 rounded-2xl p-6 border border-white/5">
<div className="text-4xl font-bold text-white mb-1">100+</div>
<div className="text-text-secondary text-sm">לקוחות מרוצים</div>
</div>
<div className="bg-surface-2 rounded-2xl p-6 border border-white/5">
<div className="text-4xl font-bold text-white mb-1">3</div>
<div className="text-text-secondary text-sm">טבעות פיננסיות</div>
</div>
<div className="bg-surface-2 rounded-2xl p-6 border border-white/5">
<div className="text-4xl font-bold text-white mb-1">שיחה</div>
<div className="text-text-secondary text-sm">ראשונה ללא עלות</div>
</div>
</div>
</div>

{/* RINGS */}

<div className="max-w-5xl mx-auto px-10 mb-16">
<h2 className="text-white font-bold text-2xl text-right mb-6">השירות שלנו מכסה את כל התמונה</h2>
<div className="grid md:grid-cols-3 gap-6 text-right">

<div className="p-6 bg-surface-2 rounded-2xl border border-indigo-500/30 hover:border-indigo-500/60 transition-colors relative overflow-hidden">
<div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-l from-indigo-500 to-indigo-400"/>
<div className="w-11 h-11 rounded-xl bg-indigo-500/15 flex items-center justify-center text-2xl mb-4">🏛</div>
<div className="font-semibold text-indigo-300 mb-2 text-base">טבעת העתיד</div>
<div className="text-text-secondary text-sm leading-relaxed">פנסיה, קרן השתלמות, ביטוח מנהלים — נבדוק שאתה על המסלול הנכון ושדמי הניהול לא שוחקים אותך.</div>
</div>

<div className="p-6 bg-surface-2 rounded-2xl border border-emerald-500/30 hover:border-emerald-500/60 transition-colors relative overflow-hidden">
<div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-l from-emerald-500 to-emerald-400"/>
<div className="w-11 h-11 rounded-xl bg-emerald-500/15 flex items-center justify-center text-2xl mb-4">🛡</div>
<div className="font-semibold text-emerald-300 mb-2 text-base">טבעת הביטחון</div>
<div className="text-text-secondary text-sm leading-relaxed">כרית ביטחון, ביטוח חיים ובריאות — כדי שאף אירוע בלתי צפוי לא יפיל את כל מה שבנית.</div>
</div>

<div className="p-6 bg-surface-2 rounded-2xl border border-amber-500/30 hover:border-amber-500/60 transition-colors relative overflow-hidden">
<div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-l from-amber-500 to-amber-400"/>
<div className="w-11 h-11 rounded-xl bg-amber-500/15 flex items-center justify-center text-2xl mb-4">🚀</div>
<div className="font-semibold text-amber-300 mb-2 text-base">טבעת הצמיחה</div>
<div className="text-text-secondary text-sm leading-relaxed">השקעות בשוק ההון ונדל"ן — גידול הון לטווח ארוך, בדרך שמתאימה לרמת הסיכון שלך.</div>
</div>

</div>
</div>

{/* WHY US */}

<div className="max-w-5xl mx-auto px-10 mb-16">
<div className="text-center mb-10">
<p className="text-indigo-400 text-xs font-medium tracking-widest uppercase mb-2">למה FUTURE?</p>
<h2 className="text-white font-bold text-4xl">שירות שמתחיל בכנות</h2>
</div>

<div className="grid md:grid-cols-3 gap-6 text-right mb-10">

<div className="p-6 bg-surface-2 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
<div className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center text-2xl mb-5">🤝</div>
<div className="font-semibold text-white mb-3 text-base">ללא ניגוד עניינים</div>
<div className="text-text-secondary text-sm leading-relaxed">אנחנו לא מקבלים עמלות ממוצרים שאנחנו ממליצים עליהם. ההמלצה שלנו מגיעה מהניתוח — לא מהאינטרס.</div>
</div>

<div className="p-6 bg-surface-2 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
<div className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center text-2xl mb-5">🔍</div>
<div className="font-semibold text-white mb-3 text-base">שקיפות מלאה</div>
<div className="text-text-secondary text-sm leading-relaxed">נגיד לך את האמת גם כשהיא לא נוחה. אם יש בעיה בתיק שלך — תדע עליה מיד, עם הסבר ברור ופתרון מעשי.</div>
</div>

<div className="p-6 bg-surface-2 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
<div className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center text-2xl mb-5">💡</div>
<div className="font-semibold text-white mb-3 text-base">פשטות שמאפשרת פעולה</div>
<div className="text-text-secondary text-sm leading-relaxed">פיננסים יכולים להיות מסובכים — אנחנו מתרגמים הכל לשפה שאפשר להבין, להחליט לפיה ולפעול.</div>
</div>

</div>

{/* WHY COMPARISON */}
<div className="bg-surface-2 rounded-2xl border border-white/5 overflow-hidden text-right">
<div className="grid grid-cols-3 text-xs font-medium text-text-muted border-b border-white/5">
<div className="px-6 py-3 col-span-1"></div>
<div className="px-6 py-3 text-center text-indigo-300 font-semibold">FUTURE</div>
<div className="px-6 py-3 text-center">חברות אחרות</div>
</div>
{[
  ["שקיפות מלאה על דמי ניהול", true, false],
  ["ללא עמלות מוצר", true, false],
  ["תמונה כוללת של כל הנכסים", true, false],
  ["שפה פשוטה וברורה", true, false],
  ["ליווי שוטף ומחויבות אמיתית", true, true],
].map(([label, us, them], i) => (
  <div key={i} className={`grid grid-cols-3 text-sm border-b border-white/5 last:border-0 ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}>
    <div className="px-6 py-3 text-text-secondary col-span-1">{label as string}</div>
    <div className="px-6 py-3 text-center">{us ? <span className="text-emerald-400 font-bold">✓</span> : <span className="text-white/20">—</span>}</div>
    <div className="px-6 py-3 text-center">{them ? <span className="text-emerald-400 font-bold">✓</span> : <span className="text-white/20">—</span>}</div>
  </div>
))}
</div>

</div>

{/* PROCESS */}

<div className="max-w-5xl mx-auto px-10 mb-16 bg-surface-2 border border-white/5 rounded-2xl p-10 text-right">
<h2 className="text-white font-bold text-2xl mb-7">איך זה עובד?</h2>
<div className="grid md:grid-cols-2 gap-6">
<div className="flex items-start gap-4">
<span className="text-indigo-400 font-bold text-lg flex-shrink-0">01</span>
<div>
<div className="text-white font-medium mb-1">שיחת היכרות</div>
<div className="text-text-secondary text-sm">מבינים את המצב הפיננסי שלך — ללא לחץ וללא התחייבות.</div>
</div>
</div>
<div className="flex items-start gap-4">
<span className="text-indigo-400 font-bold text-lg flex-shrink-0">02</span>
<div>
<div className="text-white font-medium mb-1">פגישת אפיון</div>
<div className="text-text-secondary text-sm">מכירים אותך לעומק — מה חשוב לך, מה מדאיג אותך, ומה המטרות שלך. כל לקוח מקבל מסגרת עבודה מותאמת אישית.</div>
</div>
</div>
<div className="flex items-start gap-4">
<span className="text-indigo-400 font-bold text-lg flex-shrink-0">03</span>
<div>
<div className="text-white font-medium mb-1">ניתוח מעמיק</div>
<div className="text-text-secondary text-sm">בוחנים את כל הטבעות — עתיד, ביטחון וצמיחה — ומזהים פערים והזדמנויות.</div>
</div>
</div>
<div className="flex items-start gap-4">
<span className="text-indigo-400 font-bold text-lg flex-shrink-0">04</span>
<div>
<div className="text-white font-medium mb-1">תכנית פעולה</div>
<div className="text-text-secondary text-sm">תוכנית פעולה ברורה ומעשית, מותאמת בדיוק לצרכים ולמטרות שלך.</div>
</div>
</div>
<div className="flex items-start gap-4 md:col-span-2 md:max-w-sm md:mx-auto md:w-full">
<span className="text-indigo-400 font-bold text-lg flex-shrink-0">05</span>
<div>
<div className="text-white font-medium mb-1">ליווי שוטף</div>
<div className="text-text-secondary text-sm">נשארים לצידך — זמינים לכל שאלה, שינוי, או עדכון בדרך.</div>
</div>
</div>
</div>
</div>

{/* REVIEWS */}

<div className="max-w-2xl mx-auto px-10 mb-16 text-right">
  <h2 className="text-white font-bold text-2xl mb-8 text-center">מה אומרים הלקוחות שלנו</h2>
  <div className="bg-surface-2 rounded-2xl border border-white/5 p-8">
    <div className="text-yellow-400 text-sm mb-4 tracking-widest">★★★★★</div>
    <p className="text-text-secondary leading-relaxed text-base mb-6">"{reviews[reviewIndex].text}"</p>
    <div className="text-text-muted text-sm">— {reviews[reviewIndex].name}</div>
  </div>
  <div className="flex items-center justify-center gap-4 mt-6">
    <button
      onClick={() => setReviewIndex((reviewIndex - 1 + reviews.length) % reviews.length)}
      className="w-9 h-9 rounded-full border border-white/10 text-text-secondary hover:text-white hover:border-white/30 transition-all flex items-center justify-center"
    >→</button>
    <div className="flex gap-2">
      {reviews.map((_, i) => (
        <button
          key={i}
          onClick={() => setReviewIndex(i)}
          className={`w-2 h-2 rounded-full transition-all ${i === reviewIndex ? "bg-indigo-400 w-4" : "bg-white/20"}`}
        />
      ))}
    </div>
    <button
      onClick={() => setReviewIndex((reviewIndex + 1) % reviews.length)}
      className="w-9 h-9 rounded-full border border-white/10 text-text-secondary hover:text-white hover:border-white/30 transition-all flex items-center justify-center"
    >←</button>
  </div>
</div>

{/* CONTACT */}

<div id="contact" className="max-w-xl mx-auto px-10 py-8 text-center mb-14">
<h2 className="text-3xl font-bold text-white mb-3">מוכן להתחיל?</h2>
<p className="text-text-muted text-sm mb-8">השאירו שם ומספר — ונחזור אליכם לשיחת היכרות קצרה, ללא עלות וללא התחייבות.</p>

<form onSubmit={handleContactSubmit} className="flex flex-col gap-4 text-right">

<input
type="text"
placeholder="שם מלא"
value={contact.name}
onChange={(e)=>setContact({...contact,name:e.target.value})}
className="p-3.5 rounded-xl bg-surface-2 text-white border border-white/5 focus:border-indigo-500/40 focus:outline-none"
required
/>

<input
type="number"
placeholder="גיל"
value={contact.age}
onChange={(e)=>setContact({...contact,age:e.target.value})}
className="p-3.5 rounded-xl bg-surface-2 text-white border border-white/5 focus:border-indigo-500/40 focus:outline-none"
required
/>

<input
type="tel"
placeholder="מספר טלפון"
value={contact.phone}
onChange={(e)=>setContact({...contact,phone:e.target.value})}
className="p-3.5 rounded-xl bg-surface-2 text-white text-right border border-white/5 focus:border-indigo-500/40 focus:outline-none"
required
/>

<button
type="submit"
className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors text-base"
>
{submitted ? "קיבלנו! נחזור אליך בקרוב" : sending ? "שולח..." : "השאר פרטים"}
</button>

{submitted && (
<p className="text-emerald-400 text-sm text-center">תודה! נשמח לדבר איתך בקרוב.</p>
)}

</form>

</div>

</main>

</div>

  );

}
