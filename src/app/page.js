"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Transcript from "@/components/Transcript";
import CallDetail from "@/components/CallDetail";
import { PRODUCT, buildAssistant } from "@/lib/salesConfig";
import { formatDuration } from "@/lib/format";

// End the call automatically if the customer stays silent this long.
const SILENCE_LIMIT_MS = 40_000;

const PHASE_LABEL = {
  idle: "Ready to call",
  connecting: "Connecting…",
  active: "Live",
  ending: "Ending call…",
  processing: "Generating AI summary…",
  done: "Call ended",
  error: "Error",
};

export default function CallPage() {
  const vapiRef = useRef(null);
  const callIdRef = useRef(null);
  const lastUserActivityRef = useRef(0);
  const liveRef = useRef(false);

  const [phase, setPhase] = useState("idle");
  const [consent, setConsent] = useState(false);
  const [messages, setMessages] = useState([]);
  const [partials, setPartials] = useState({ assistant: "", user: "" });
  const [botSpeaking, setBotSpeaking] = useState(false);
  const [volume, setVolume] = useState(0);
  const [startedAt, setStartedAt] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  // Poll our API until Vapi has finished the recording + AI analysis.
  const loadResult = useCallback(async (callId) => {
    for (let attempt = 0; attempt < 60; attempt++) {
      await new Promise((r) => setTimeout(r, 3000));
      try {
        const res = await fetch(`/api/calls/${callId}`, { cache: "no-store" });
        const data = await res.json();
        if (data.call) {
          setResult(data.call);
          // Wait for both analysis and recording (give the recording ~30s extra at most).
          if (data.call.analysisReady && (data.call.recordingUrl || attempt >= 10)) {
            setPhase("done");
            return;
          }
        }
      } catch {
        // network hiccup — keep polling
      }
    }
    setPhase("done");
  }, []);

  useEffect(() => {
    let vapi;
    let cancelled = false;

    (async () => {
      const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
      if (!publicKey) {
        setError("NEXT_PUBLIC_VAPI_PUBLIC_KEY is missing. Add it to .env.local (or Vercel env vars).");
        return;
      }
      const { default: Vapi } = await import("@vapi-ai/web");
      if (cancelled) return;
      vapi = new Vapi(publicKey);
      vapiRef.current = vapi;

      // Switch to "live" on whichever comes first: call-start, bot speech, or the first transcript.
      const markLive = () => {
        if (liveRef.current) return;
        liveRef.current = true;
        setPhase("active");
        setStartedAt(Date.now());
        lastUserActivityRef.current = Date.now();
      };

      vapi.on("call-start", markLive);
      vapi.on("speech-start", () => {
        markLive();
        setBotSpeaking(true);
      });
      vapi.on("speech-end", () => {
        setBotSpeaking(false);
        lastUserActivityRef.current = Math.max(lastUserActivityRef.current, Date.now());
      });
      vapi.on("volume-level", (v) => setVolume(v));
      vapi.on("message", (msg) => {
        if (msg.type !== "transcript" || !msg.transcript) return;
        markLive();
        const role = msg.role === "user" ? "user" : "assistant";
        if (role === "user") lastUserActivityRef.current = Date.now();

        if (msg.transcriptType === "partial") {
          setPartials((p) => ({ ...p, [role]: msg.transcript }));
          return;
        }
        setPartials((p) => ({ ...p, [role]: "" }));
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          // Merge consecutive final chunks from the same speaker into one bubble.
          if (last && last.role === role) {
            return [...prev.slice(0, -1), { role, text: `${last.text} ${msg.transcript}` }];
          }
          return [...prev, { role, text: msg.transcript }];
        });
      });
      vapi.on("call-end", () => {
        liveRef.current = false;
        setBotSpeaking(false);
        setVolume(0);
        setPartials({ assistant: "", user: "" });
        setStartedAt(null);
        if (callIdRef.current) {
          setPhase("processing");
          loadResult(callIdRef.current);
        } else {
          setPhase("idle");
        }
      });
      vapi.on("error", (e) => {
        console.error("Vapi error", e);
        const text = e?.error?.message || e?.errorMsg || e?.message || "Something went wrong with the call.";
        setError(typeof text === "string" ? text : JSON.stringify(text));
      });
    })();

    return () => {
      cancelled = true;
      vapi?.stop();
      vapi?.removeAllListeners?.();
    };
  }, [loadResult]);

  // Call timer + silence auto-hangup.
  useEffect(() => {
    if (!startedAt) return;
    const timer = setInterval(() => {
      setSeconds(Math.floor((Date.now() - startedAt) / 1000));
      if (Date.now() - lastUserActivityRef.current > SILENCE_LIMIT_MS) {
        setPhase("ending");
        vapiRef.current?.stop();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

  async function startCall() {
    if (!vapiRef.current || !consent) return;
    setError("");
    setMessages([]);
    setPartials({ assistant: "", user: "" });
    setResult(null);
    setSeconds(0);
    callIdRef.current = null;
    liveRef.current = false;
    setPhase("connecting");
    try {
      const call = await vapiRef.current.start(buildAssistant());
      if (!call) throw new Error("Could not start the call. Check your Vapi public key and microphone permission.");
      callIdRef.current = call.id;
    } catch (e) {
      setError(e?.message || "Could not start the call.");
      setPhase("error");
    }
  }

  function endCall() {
    setPhase("ending");
    vapiRef.current?.stop();
  }

  const inCall = phase === "connecting" || phase === "active" || phase === "ending";
  const liveMessages = [
    ...messages,
    ...(partials.assistant ? [{ role: "assistant", text: partials.assistant, pending: true }] : []),
    ...(partials.user ? [{ role: "user", text: partials.user, pending: true }] : []),
  ];

  let statusText = PHASE_LABEL[phase];
  if (phase === "active") statusText = botSpeaking ? "AI is speaking" : "Listening to customer";

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* Left: product + call controls */}
        <aside className="space-y-4">
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Product being sold</p>
            <h1 className="mt-1 text-xl font-bold">{PRODUCT.name}</h1>
            <p className="mt-1 text-sm text-slate-500">{PRODUCT.tagline}</p>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {PRODUCT.features.map((f) => (
                <li key={f} className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-3 space-y-0.5 text-xs text-slate-500">
              {PRODUCT.plans.map((p) => (
                <p key={p.name}>
                  <span className="font-medium text-slate-700">{p.name}:</span> {p.price}
                </p>
              ))}
              <p className="pt-1 text-emerald-700">{PRODUCT.trial}</p>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    phase === "active" ? "animate-pulse bg-emerald-500" : inCall ? "bg-amber-400" : phase === "error" ? "bg-rose-500" : "bg-slate-300"
                  }`}
                />
                <span className="text-sm font-medium text-slate-700">{statusText}</span>
              </div>
              <span className="font-mono text-2xl font-semibold tabular-nums text-slate-800">{formatDuration(seconds)}</span>
            </div>

            {/* Simple voice activity meter */}
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-indigo-500 transition-[width] duration-100"
                style={{ width: `${Math.min(100, Math.round(volume * 100))}%` }}
              />
            </div>

            <label className="mt-4 flex items-start gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-indigo-600"
                checked={consent}
                disabled={inCall}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <span>I agree that this call will be recorded and transcribed for quality, training and summary purposes.</span>
            </label>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                onClick={startCall}
                disabled={!consent || inCall || phase === "processing"}
                className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Start Call
              </button>
              <button
                onClick={endCall}
                disabled={!inCall || phase === "ending"}
                className="rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                End Call
              </button>
            </div>
            {!consent && !inCall && (
              <p className="mt-2 text-xs text-slate-400">Tick the consent box to enable the call.</p>
            )}
            {error && <p className="mt-3 rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{error}</p>}
          </section>

          <section className="rounded-2xl bg-white p-5 text-xs leading-relaxed text-slate-500 shadow-sm ring-1 ring-slate-200">
            <p className="font-semibold text-slate-700">Try saying</p>
            <p className="mt-1">&ldquo;Yes, tell me more. We are a 10-person real estate team using Excel.&rdquo;</p>
            <p>&ldquo;That sounds expensive.&rdquo; · &ldquo;Can I see a demo on Friday?&rdquo;</p>
            <p className="mt-2">Use Chrome or Edge and allow microphone access.</p>
          </section>
        </aside>

        {/* Right: live chat */}
        <section className="flex min-h-[520px] flex-col rounded-2xl bg-slate-50 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-700">Live conversation</h2>
            {phase === "active" && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-rose-600">
                <span className="h-2 w-2 animate-pulse rounded-full bg-rose-600" /> REC
              </span>
            )}
          </div>
          <Transcript
            messages={liveMessages}
            emptyText="Press Start Call — the AI sales agent will greet you and the conversation will appear here in real time."
            className="h-[460px] flex-1 lg:h-auto lg:max-h-[640px]"
          />
        </section>
      </div>

      {(phase === "processing" || phase === "done") && (
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Call result</h2>
            <Link href="/history" className="text-sm font-medium text-indigo-600 hover:underline">
              View all calls →
            </Link>
          </div>
          {phase === "processing" && (
            <p className="mb-4 flex items-center gap-2 text-sm text-slate-500">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
              Saving recording and generating AI summary… this takes a few seconds.
            </p>
          )}
          {result && <CallDetail call={result} />}
        </section>
      )}
    </div>
  );
}
