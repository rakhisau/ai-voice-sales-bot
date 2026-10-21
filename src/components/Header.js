"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Live Call" },
  { href: "/history", label: "Call History" },
];

export default function Header() {
  const pathname = usePathname();
  return (
    <header className="border-b border-slate-800 bg-slate-900 text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-500 text-sm font-bold">F</span>
          <span className="font-semibold">
            FlowDesk <span className="hidden font-normal text-slate-400 sm:inline">· AI Voice Sales Bot</span>
          </span>
        </Link>
        <nav className="flex gap-1 text-sm">
          {LINKS.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-1.5 ${active ? "bg-slate-700 text-white" : "text-slate-300 hover:bg-slate-800"}`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
