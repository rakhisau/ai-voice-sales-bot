"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Transcript from "@/components/Transcript";
import CallDetail from "@/components/CallDetail";
import { AGENT_NAME, PRODUCT, buildAssistant } from "@/lib/salesConfig";
import { formatDuration } from "@/lib/format";

// End the call automatically if the customer stays silent this long.
const SILENCE_LIMIT_MS = 40_000;

const NO_AUDIO_HELP =
  "The AI couldn't hear your microphone. Open this link directly in Chrome (not inside WhatsApp/LinkedIn), allow microphone access, and close other apps using the mic.";

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
  const lastErrorRef = useRef("");

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
        if (msg.type === "status-update" && String(msg.endedReason ?? "").includes("did-not-receive-customer-audio")) {
          setError(NO_AUDIO_HELP);
        }
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
        lastErrorRef.current = typeof text === "string" ? text : JSON.stringify(text);
        setError(lastErrorRef.current);
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
    lastErrorRef.current = "";
    setPhase("connecting");

    // Check the microphone first so the customer gets a clear message instead of a silent failure.
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser can't use the microphone. Open the link directly in Chrome or Safari, not inside WhatsApp, LinkedIn or Instagram.");
      setPhase("error");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch (e) {
      const micHelp = {
        NotAllowedError:
          "Microphone permission is blocked. Tap the lock icon next to the website address → Permissions → allow Microphone, then press Start Call again.",
        NotFoundError:
          "No microphone found on this device. Plug in a mic (or check Windows Sound settings → Input), then restart the browser and try again.",
        NotReadableError: "The microphone is being used by another app. Close that app and try again.",
      };
      setError(micHelp[e?.name] ?? `Microphone not available (${e?.message || e?.name}).`);
      setPhase("error");
      return;
    }

    try {
      const call = await vapiRef.current.start(buildAssistant());
      if (!call) throw new Error(lastErrorRef.current || "Could not start the call. Please check your internet connection and try again.");
      callIdRef.current = call.id;
    } catch (e) {
      setError(lastErrorRef.current || e?.message || "Could not start the call.");
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

  const orbActive = phase === "active";
  const dotColor =
    phase === "active" ? "bg-emerald-400" : inCall || phase === "processing" ? "bg-amber-400" : phase === "error" ? "bg-rose-500" : "bg-slate-500";

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-indigo-200 ring-1 ring-white/10">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> AI sales agent online 24/7
          </p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Talk to our <span className="gradient-text">AI Sales Agent</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm text-slate-400">
            A real-time voice conversation. Ask anything about {PRODUCT.name}, raise your doubts, and get a demo or free trial in minutes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {["🎙️ Real-time voice", "💬 Live transcript", "✨ AI summary", "🔒 Consent-based recording"].map((f) => (
            <span key={f} className="rounded-full bg-white/5 px-3 py-1.5 text-slate-300 ring-1 ring-white/10">
              {f}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* Left: call controls + product */}
        <aside className="space-y-5">
          <section className="glass relative overflow-hidden rounded-3xl p-6">
            <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-violet-600/30 blur-3xl" />

            {/* AI orb */}
            <div className="relative mx-auto grid h-40 w-40 place-items-center">
              {orbActive && (
                <>
                  <span className="orb-ring absolute inset-3 rounded-full bg-indigo-500/40" />
                  <span className="orb-ring orb-ring-delay absolute inset-3 rounded-full bg-fuchsia-500/35" />
                </>
              )}
              <div
                className={`relative grid h-32 w-32 place-items-center rounded-full bg-linear-to-br from-indigo-500 via-violet-500 to-fuchsia-500 transition-transform duration-100 ${
                  orbActive ? "shadow-[0_0_70px_-6px_rgba(168,85,247,0.9)]" : "opacity-80 shadow-[0_0_40px_-12px_rgba(168,85,247,0.8)]"
                } ${phase === "connecting" ? "animate-pulse" : ""}`}
                style={{ transform: `scale(${1 + Math.min(volume, 1) * 0.18})` }}
              >
                {botSpeaking ? (
                  <div className="flex h-10 items-end gap-1">
                    {[0, 0.15, 0.3, 0.45, 0.6].map((d) => (
                      <span key={d} className="eq-bar h-10 w-1.5 rounded-full bg-white" style={{ animationDelay: `${d}s` }} />
                    ))}
                  </div>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-12 w-12 fill-white" aria-hidden="true">
                    <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2Z" />
                  </svg>
                )}
              </div>
            </div>

            <div className="relative mt-3 text-center">
              <p className="font-semibold">{AGENT_NAME} · AI Sales Agent</p>
              <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-slate-300 ring-1 ring-white/10">
                <span className={`h-2 w-2 rounded-full ${dotColor} ${orbActive ? "animate-pulse" : ""}`} />
                {statusText}
              </p>
              <p className="mt-4 font-mono text-5xl font-bold tabular-nums tracking-tight">
                <span className={orbActive ? "gradient-text" : "text-slate-300"}>{formatDuration(seconds)}</span>
              </p>
              <p className="text-[11px] uppercase tracking-widest text-slate-500">Call duration</p>
            </div>

            <label
              className={`relative mt-5 flex cursor-pointer items-start gap-3 rounded-2xl p-3 text-xs leading-relaxed ring-1 transition ${
                consent ? "bg-emerald-500/10 text-emerald-100 ring-emerald-400/40" : "bg-white/5 text-slate-300 ring-white/10 hover:ring-white/20"
              }`}
            >
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-500"
                checked={consent}
                disabled={inCall}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <span>
                <span className="font-semibold">🔒 Recording consent:</span> I agree that this call will be recorded and transcribed for
                quality, training and summary purposes.
              </span>
            </label>

            <div className="relative mt-4 grid grid-cols-2 gap-3">
              <button
                onClick={startCall}
                disabled={!consent || inCall || phase === "processing"}
                className="flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-emerald-500 to-teal-500 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 transition hover:scale-[1.02] hover:shadow-emerald-500/50 disabled:scale-100 disabled:cursor-not-allowed disabled:from-white/10 disabled:to-white/10 disabled:text-slate-500 disabled:shadow-none"
              >
                📞 Start Call
              </button>
              <button
                onClick={endCall}
                disabled={!inCall || phase === "ending"}
                className="flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-rose-500 to-pink-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-rose-500/30 transition hover:scale-[1.02] hover:shadow-rose-500/50 disabled:scale-100 disabled:cursor-not-allowed disabled:from-white/10 disabled:to-white/10 disabled:text-slate-500 disabled:shadow-none"
              >
                ⏹ End Call
              </button>
            </div>
            {!consent && !inCall && (
              <p className="relative mt-2 text-center text-[11px] text-slate-500">Tick the consent box to enable the call.</p>
            )}
            {error && <p className="relative mt-3 rounded-xl bg-rose-500/10 p-3 text-xs text-rose-300 ring-1 ring-rose-500/30">{error}</p>}
          </section>

          <section className="glass rounded-3xl p-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-fuchsia-300">Product being sold</p>
            <h2 className="mt-1 text-xl font-bold">{PRODUCT.name}</h2>
            <p className="mt-1 text-sm text-slate-400">{PRODUCT.tagline}</p>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {PRODUCT.features.map((f) => (
                <li key={f} className="rounded-lg bg-indigo-500/10 px-2 py-1 text-xs text-indigo-200 ring-1 ring-indigo-400/20">
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {PRODUCT.plans.map((p) => (
                <div key={p.name} className="rounded-xl bg-white/5 p-2 text-center ring-1 ring-white/10">
                  <p className="text-[11px] text-slate-400">{p.name}</p>
                  <p className="mt-0.5 text-xs font-semibold">{p.price.replace(" / user / month", "")}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 rounded-lg bg-emerald-500/10 px-3 py-2 text-center text-xs font-medium text-emerald-300 ring-1 ring-emerald-400/20">
              🎁 {PRODUCT.trial}
            </p>
          </section>

          <section className="glass rounded-3xl p-5 text-xs leading-relaxed text-slate-400">
            <p className="font-semibold text-slate-200">💡 Try saying</p>
            <p className="mt-2">&ldquo;We are a 10-person real estate team using Excel.&rdquo;</p>
            <p>&ldquo;That sounds expensive.&rdquo;</p>
            <p>&ldquo;Can I see a demo on Friday?&rdquo;</p>
            <p className="mt-2 text-slate-500">Use Chrome or Edge and allow microphone access.</p>
          </section>
        </aside>

        {/* Right: live chat */}
        <section className="glass flex min-h-[560px] flex-col overflow-hidden rounded-3xl">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <h2 className="font-semibold">Live conversation</h2>
              <p className="text-xs text-slate-500">Speech is transcribed in real time</p>
            </div>
            {orbActive ? (
              <span className="flex items-center gap-1.5 rounded-full bg-rose-500/15 px-3 py-1 text-xs font-bold text-rose-300 ring-1 ring-rose-400/40">
                <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" /> REC
              </span>
            ) : (
              <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-400 ring-1 ring-white/10">
                {messages.length} messages
              </span>
            )}
          </div>
          <Transcript
            messages={liveMessages}
            emptyText={`Press Start Call. ${AGENT_NAME} will greet you and the whole conversation will appear here in real time.`}
            className="h-[480px] flex-1 lg:h-auto lg:max-h-[760px]"
          />
        </section>
      </div>

      {(phase === "processing" || phase === "done") && (
        <section className="fade-up space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-bold">
              Call <span className="gradient-text">result</span>
            </h2>
            <Link href="/history" className="text-sm font-medium text-indigo-300 hover:text-indigo-200">
              View all calls →
            </Link>
          </div>
          {phase === "processing" && (
            <p className="glass flex items-center gap-3 rounded-2xl p-4 text-sm text-slate-300">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-fuchsia-400 border-t-transparent" />
              Saving the recording and generating the AI summary… this takes a few seconds.
            </p>
          )}
          {result && <CallDetail call={result} />}
        </section>
      )}
    </div>
  );
}
