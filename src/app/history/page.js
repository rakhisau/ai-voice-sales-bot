"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import StatusBadge, { STATUS_STYLES } from "@/components/StatusBadge";
import { SALES_STATUSES } from "@/lib/salesConfig";
import { formatDate, formatDuration } from "@/lib/format";

export default function HistoryPage() {
  const [calls, setCalls] = useState(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("All");
  const [needLogin, setNeedLogin] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const loadCalls = useCallback(() => {
    setError("");
    fetch("/api/calls", { cache: "no-store" })
      .then(async (r) => {
        const data = await r.json();
        if (r.status === 401) {
          setNeedLogin(true);
          return;
        }
        setNeedLogin(false);
        if (data.error) setError(data.error);
        setCalls(data.calls ?? []);
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    loadCalls();
  }, [loadCalls]);

  async function login(e) {
    e.preventDefault();
    setLoginError("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      setLoginError("Wrong password");
      return;
    }
    setPassword("");
    loadCalls();
  }

  async function logout() {
    await fetch("/api/login", { method: "DELETE" });
    setCalls(null);
    setNeedLogin(true);
  }

  if (needLogin) {
    return (
      <div className="glass relative mx-auto mt-10 max-w-sm overflow-hidden rounded-3xl p-7">
        <div className="pointer-events-none absolute -top-20 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-indigo-600/30 blur-3xl" />
        <span className="relative grid h-12 w-12 place-items-center rounded-2xl bg-linear-to-br from-indigo-500 to-fuchsia-500 text-xl shadow-[0_0_30px_-6px_rgba(168,85,247,0.9)]">
          🔒
        </span>
        <h1 className="relative mt-4 text-xl font-bold">Sales team login</h1>
        <p className="relative mt-1 text-sm text-slate-400">
          Call history contains customer recordings and is only visible to the sales team.
        </p>
        <form onSubmit={login} className="relative mt-5 space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin password"
            className="w-full rounded-xl bg-white/5 px-4 py-2.5 text-sm text-white ring-1 ring-white/15 outline-none placeholder:text-slate-500 focus:ring-indigo-400"
            autoFocus
          />
          {loginError && <p className="text-sm text-rose-400">{loginError}</p>}
          <button className="w-full rounded-xl bg-linear-to-r from-indigo-500 to-violet-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition hover:shadow-indigo-500/50">
            Log in
          </button>
        </form>
      </div>
    );
  }

  const shown = (calls ?? []).filter((c) => filter === "All" || c.salesStatus === filter);
  const counts = Object.fromEntries(SALES_STATUSES.map((s) => [s, (calls ?? []).filter((c) => c.salesStatus === s).length]));

  const all = calls ?? [];
  const won = counts["Converted"] + counts["Demo Requested"];
  const avgDuration = all.length ? Math.round(all.reduce((sum, c) => sum + c.durationSec, 0) / all.length) : 0;
  const stats = [
    { label: "Total calls", value: all.length, icon: "📞", glow: "from-indigo-500/25" },
    { label: "Converted", value: counts["Converted"], icon: "🎉", glow: "from-emerald-500/25" },
    { label: "Demos booked", value: counts["Demo Requested"], icon: "📅", glow: "from-violet-500/25" },
    {
      label: "Win rate",
      value: all.length ? `${Math.round((won / all.length) * 100)}%` : "—",
      icon: "📈",
      glow: "from-fuchsia-500/25",
    },
    { label: "Avg duration", value: formatDuration(avgDuration), icon: "⏱️", glow: "from-cyan-500/25" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Call <span className="gradient-text">History</span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">Every call with its recording, transcript, AI summary and sales status.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={logout} className="rounded-xl px-4 py-2 text-sm font-medium text-slate-300 ring-1 ring-white/15 hover:bg-white/5">
            Log out
          </button>
          <Link
            href="/"
            className="rounded-xl bg-linear-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 transition hover:shadow-emerald-500/50"
          >
            + New call
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className={`glass rounded-2xl bg-linear-to-br ${s.glow} to-transparent p-4`}>
            <p className="flex items-center justify-between text-xs text-slate-400">
              {s.label} <span>{s.icon}</span>
            </p>
            <p className="mt-2 text-2xl font-bold tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {["All", ...SALES_STATUSES].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition ${
              filter === s
                ? "bg-linear-to-r from-indigo-500 to-violet-500 text-white ring-transparent shadow-lg shadow-indigo-500/30"
                : "bg-white/5 text-slate-300 ring-white/10 hover:bg-white/10"
            }`}
          >
            {s !== "All" && `${STATUS_STYLES[s].icon} `}
            {s} <span className="opacity-70">({s === "All" ? all.length : counts[s] ?? 0})</span>
          </button>
        ))}
      </div>

      {error && <p className="rounded-xl bg-rose-500/10 p-3 text-sm text-rose-300 ring-1 ring-rose-500/30">{error}</p>}
      {calls === null && !error && <p className="text-sm text-slate-400">Loading calls…</p>}
      {calls && shown.length === 0 && (
        <div className="glass rounded-2xl p-10 text-center text-sm text-slate-400">No calls here yet.</div>
      )}

      <div className="space-y-3">
        {shown.map((c) => (
          <Link
            key={c.id}
            href={`/history/${c.id}`}
            className="glass group relative block overflow-hidden rounded-2xl p-4 pl-6 transition hover:-translate-y-0.5 hover:bg-white/[0.07] hover:shadow-xl hover:shadow-indigo-500/10"
          >
            <span className={`absolute inset-y-0 left-0 w-1.5 ${STATUS_STYLES[c.salesStatus]?.bar ?? "bg-slate-600"}`} />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <StatusBadge status={c.salesStatus} />
              <span className="font-semibold">{c.customerName || "Customer"}</span>
              <span className="text-slate-400">{formatDate(c.startedAt || c.createdAt)}</span>
              <span className="font-mono text-slate-400">⏱ {formatDuration(c.durationSec)}</span>
              <span className="text-slate-500">💬 {c.transcript.length}</span>
              {c.recordingUrl && <span className="text-slate-500">🎧 Recording</span>}
              <span className="ml-auto text-indigo-300 opacity-0 transition group-hover:opacity-100">Open →</span>
            </div>
            <p className="mt-2 line-clamp-2 text-sm text-slate-300">{c.summary || "No summary available."}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
