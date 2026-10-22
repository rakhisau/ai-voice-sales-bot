"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CallDetail from "@/components/CallDetail";

export default function CallDetailClient({ id }) {
  const [call, setCall] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/calls/${id}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => (data.call ? setCall(data.call) : setError(data.error || "Call not found")))
      .catch((e) => setError(e.message));
  }, [id]);

  return (
    <div className="space-y-4">
      <Link href="/history" className="text-sm font-medium text-indigo-300 hover:text-indigo-200">
        ← Back to call history
      </Link>
      <h1 className="text-3xl font-extrabold tracking-tight">
        Call <span className="gradient-text">details</span>
      </h1>
      {error && <p className="rounded-xl bg-rose-500/10 p-3 text-sm text-rose-300 ring-1 ring-rose-500/30">{error}</p>}
      {!call && !error && <p className="text-sm text-slate-400">Loading…</p>}
      {call && <CallDetail call={call} />}
    </div>
  );
}
