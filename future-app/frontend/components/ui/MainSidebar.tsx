"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "דף ראשי", icon: "⬡" },
];

const learnItems = [
  { href: "/learn/security", label: "טבעת הביטחון", icon: "🛡" },
  { href: "/learn/future", label: "טבעת העתיד", icon: "🏛" },
  { href: "/learn/growth", label: "טבעת הצמיחה", icon: "🚀" },
  { href: "/learn/glossary", label: "מילון מושגים", icon: "📖" },
];

const toolItems = [
  { href: "/search", label: "חיפוש FUTURE", icon: "✦" },
];

const planItems = [
  { href: "/plans/managed", label: "אני רוצה שידאגו לי", icon: "🤝" },
  { href: "/plans/learn", label: "אני רוצה להבין", icon: "🎓" },
];


function NavBtn({ item, pathname, router, close }: {
  item: { href: string; label: string; icon: string };
  pathname: string;
  router: ReturnType<typeof useRouter>;
  close: () => void;
}) {
  const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
  return (
    <button
      onClick={() => { router.push(item.href); close(); }}
      className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all
        ${active
          ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
          : "text-text-secondary hover:text-white hover:bg-white/5"
        }`}
    >
      <span>{item.icon}</span>
      {item.label}
    </button>
  );
}

export default function MainSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed top-4 right-4 z-50 text-white text-2xl md:hidden"
        onClick={() => setOpen(!open)}
      >
        ☰
      </button>

      {/* Overlay (mobile) */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-60 z-50 flex flex-col transition-transform duration-300
          ${open ? "translate-x-0" : "translate-x-full"} md:translate-x-0`}
        style={{ backgroundColor: "var(--surface-2)", borderLeft: "1px solid rgba(255,255,255,0.06)" }}
      >
        {/* Logo */}
        <button
          onClick={() => { router.push("/"); setOpen(false); }}
          className="px-5 py-6 flex items-center gap-3 hover:opacity-80 transition-opacity text-left w-full"
        >
          <div className="relative w-8 h-8 flex-shrink-0">
            <div className="absolute inset-0 rounded-full border border-indigo-500/60" />
            <div className="absolute inset-1.5 rounded-full border border-emerald-500/60" />
            <div className="absolute inset-3 rounded-full bg-amber-500" />
          </div>
          <span className="text-lg font-bold text-white tracking-wider">FUTURE</span>
        </button>

        {/* Back button */}
        {pathname !== "/" && (
          <div className="px-3 pb-2">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 px-3 py-2 w-full rounded-xl text-xs text-text-muted hover:text-white hover:bg-white/5 transition-all"
            >
              <span>←</span>
              חזור אחורה
            </button>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 overflow-y-auto pb-4 flex flex-col gap-4">

          {/* ראשי */}
          <div className="space-y-1">
            {navItems.map((item) => <NavBtn key={item.href} item={item} pathname={pathname} router={router} close={() => setOpen(false)} />)}
          </div>

          {/* כלים */}
          <div>
            <div className="border-t border-white/5 pt-3 space-y-1">
              {toolItems.map((item) => <NavBtn key={item.href} item={item} pathname={pathname} router={router} close={() => setOpen(false)} />)}
            </div>
          </div>

          {/* למד */}
          <div>
            <div className="px-3 pb-1 text-xs text-text-muted font-medium tracking-wider">למד</div>
            <div className="space-y-1">
              {learnItems.map((item) => <NavBtn key={item.href} item={item} pathname={pathname} router={router} close={() => setOpen(false)} />)}
            </div>
          </div>

          {/* מסלולים */}
          <div>
            <div className="px-3 pb-1 text-xs text-text-muted font-medium tracking-wider">מסלולים</div>
            <div className="space-y-1">
              {planItems.map((item) => <NavBtn key={item.href} item={item} pathname={pathname} router={router} close={() => setOpen(false)} />)}
            </div>
          </div>


        </nav>
      </div>
    </>
  );
}
