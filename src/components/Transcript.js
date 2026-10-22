"use client";

import { useEffect, useRef } from "react";

// messages: [{ role: "assistant" | "user", text, pending? }]
export default function Transcript({ messages, emptyText = "No messages yet.", className = "" }) {
  const boxRef = useRef(null);

  useEffect(() => {
    const box = boxRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [messages]);

  return (
    <div ref={boxRef} className={`space-y-4 overflow-y-auto p-4 sm:p-5 ${className}`}>
      {messages.length === 0 && (
        <div className="flex h-full flex-col items-center justify-center gap-3 py-12 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/5 text-2xl ring-1 ring-white/10">💬</span>
          <p className="max-w-xs text-sm text-slate-400">{emptyText}</p>
        </div>
      )}
      {messages.map((m, i) => {
        const isBot = m.role === "assistant";
        return (
          <div key={i} className={`fade-up flex items-end gap-2.5 ${isBot ? "" : "flex-row-reverse"}`}>
            <span
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${
                isBot
                  ? "bg-linear-to-br from-indigo-500 to-fuchsia-500 shadow-[0_0_16px_-4px_rgba(168,85,247,0.9)]"
                  : "bg-linear-to-br from-cyan-400 to-sky-600"
              }`}
            >
              {isBot ? "AI" : "You"}
            </span>
            <div className={`max-w-[80%] ${isBot ? "" : "text-right"}`}>
              <p className="mb-1 text-[11px] font-medium text-slate-500">{isBot ? "Alex · AI Sales Agent" : "Customer"}</p>
              <div
                className={`inline-block rounded-2xl px-4 py-2.5 text-left text-sm leading-relaxed ${
                  isBot
                    ? "rounded-bl-sm bg-white/8 text-slate-100 ring-1 ring-white/10"
                    : "rounded-br-sm bg-linear-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/20"
                } ${m.pending ? "opacity-70" : ""}`}
              >
                {m.text}
                {m.pending && (
                  <span className="ml-1.5 inline-flex gap-0.5 align-middle">
                    <span className="typing-dot h-1 w-1 rounded-full bg-current" />
                    <span className="typing-dot h-1 w-1 rounded-full bg-current [animation-delay:0.2s]" />
                    <span className="typing-dot h-1 w-1 rounded-full bg-current [animation-delay:0.4s]" />
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
