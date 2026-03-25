"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

function NavLink({ href, label, icon }: NavItem) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
        active
          ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
          : "text-text-secondary hover:text-white hover:bg-white/5"
      )}
    >
      <span className="text-base">{icon}</span>
      {label}
    </Link>
  );
}

interface Props {
  clientId: number;
}

export default function Sidebar({ clientId }: Props) {
  const base = `/dashboard/${clientId}`;

  const nav: NavItem[] = [
    { href: base, label: "לוח בקרה", icon: "⬡" },
    { href: `${base}/retirement`, label: "טבעת העתיד", icon: "🏛" },
    { href: `${base}/security`, label: "טבעת הביטחון", icon: "🛡" },
    { href: `${base}/growth`, label: "טבעת הצמיחה", icon: "🚀" },
    { href: `${base}/assets`, label: "כל הנכסים", icon: "◈" },
    { href: `${base}/liabilities`, label: "התחייבויות", icon: "⊖" },
    { href: `${base}/simulation`, label: "סימולציה", icon: "◉" },
    { href: `${base}/analysis`, label: "ניתוח AI", icon: "✦" },
  ];

  const goalsChatNav: NavItem[] = [
    { href: `${base}/goals`, label: "יעדים", icon: "◎" },
    { href: `${base}/chat`, label: "שיחה עם AI", icon: "✉" },
  ];

  return (
    <aside className="w-60 flex-shrink-0 h-screen sticky top-0 flex flex-col"
      style={{ backgroundColor: "var(--surface-2)", borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
      {/* Logo */}
      <div className="px-5 py-6 flex items-center gap-3">
        <div className="relative w-8 h-8">
          <div className="absolute inset-0 rounded-full border border-indigo-500/60" />
          <div className="absolute inset-1.5 rounded-full border border-emerald-500/60" />
          <div className="absolute inset-3 rounded-full bg-amber-500" />
        </div>
        <span className="text-lg font-bold text-white tracking-wider">FUTURE</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 overflow-y-auto">
        <div className="space-y-1">
          {nav.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </div>
        <div className="border-t border-white/5 my-2" />
        <div className="space-y-1">
          {goalsChatNav.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </div>
      </nav>

      {/* Bottom */}
      <div className="px-4 py-4 border-t border-white/5">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs text-text-muted hover:text-white transition-colors"
        >
          ← כל הלקוחות
        </Link>
      </div>
    </aside>
  );
}
