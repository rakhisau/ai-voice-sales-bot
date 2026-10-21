"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
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
      <div className="mx-auto mt-10 max-w-sm rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-xl font-bold">Sales team login</h1>
        <p className="mt-1 text-sm text-slate-500">
          Call history contains customer recordings and is only visible to the sales team.
        </p>
        <form onSubmit={login} className="mt-4 space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin password"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            autoFocus
          />
          {loginError && <p className="text-sm text-rose-600">{loginError}</p>}
          <button className="w-full rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
            Log in
          </button>
        </form>
      </div>
    );
  }

  const shown = (calls ?? []).filter((c) => filter === "All" || c.salesStatus === filter);
  const counts = Object.fromEntries(SALES_STATUSES.map((s) => [s, (calls ?? []).filter((c) => c.salesStatus === s).length]));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Call History</h1>
          <p className="text-sm text-slate-500">Every call with its recording, transcript, AI summary and sales status.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={logout} className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 ring-1 ring-slate-300 hover:bg-white">
            Log out
          </button>
          <Link href="/" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
            + New call
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {["All", ...SALES_STATUSES].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${
              filter === s ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {s} {s === "All" ? `(${calls?.length ?? 0})` : `(${counts[s] ?? 0})`}
          </button>
        ))}
      </div>

      {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {calls === null && !error && <p className="text-sm text-slate-500">Loading calls…</p>}
      {calls && shown.length === 0 && <p className="text-sm text-slate-500">No calls yet.</p>}

      <div className="space-y-3">
        {shown.map((c) => (
          <Link
            key={c.id}
            href={`/history/${c.id}`}
            className="block rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition hover:ring-indigo-300"
          >
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <StatusBadge status={c.salesStatus} />
              <span className="font-medium text-slate-800">{c.customerName || "Customer"}</span>
              <span className="text-slate-500">{formatDate(c.startedAt || c.createdAt)}</span>
              <span className="text-slate-500">{formatDuration(c.durationSec)}</span>
              <span className="text-slate-400">{c.transcript.length} messages</span>
              {c.recordingUrl && <span className="text-slate-400">🎧 Recording</span>}
            </div>
            <p className="mt-2 line-clamp-2 text-sm text-slate-600">{c.summary || "No summary available."}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
