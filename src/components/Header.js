"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Live Call", short: "Call", icon: "📞" },
  { href: "/history", label: "Call History", short: "History", icon: "🗂️" },
];

export default function Header() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#060918]/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-linear-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-lg font-black shadow-[0_0_24px_-4px_rgba(168,85,247,0.8)]">
            F
          </span>
          <span className="leading-tight">
            <span className="block font-bold tracking-tight">FlowDesk</span>
            <span className="hidden text-[11px] font-medium uppercase tracking-widest text-slate-400 sm:block">
              AI Voice Sales Bot
            </span>
          </span>
        </Link>
        <nav className="flex gap-1 rounded-xl bg-white/5 p-1 text-sm ring-1 ring-white/10">
          {LINKS.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition ${
                  active
                    ? "bg-linear-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30"
                    : "text-slate-300 hover:bg-white/10"
                }`}
              >
                <span className="text-xs">{l.icon}</span>
                <span className="sm:hidden">{l.short}</span>
                <span className="hidden sm:inline">{l.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
