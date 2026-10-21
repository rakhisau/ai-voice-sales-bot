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
      <Link href="/history" className="text-sm font-medium text-indigo-600 hover:underline">
        ← Back to call history
      </Link>
      <h1 className="text-2xl font-bold">Call details</h1>
      {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {!call && !error && <p className="text-sm text-slate-500">Loading…</p>}
      {call && <CallDetail call={call} />}
    </div>
  );
}
