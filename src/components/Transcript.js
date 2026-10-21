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
    <div ref={boxRef} className={`space-y-3 overflow-y-auto p-4 ${className}`}>
      {messages.length === 0 && <p className="py-10 text-center text-sm text-slate-400">{emptyText}</p>}
      {messages.map((m, i) => {
        const isBot = m.role === "assistant";
        return (
          <div key={i} className={`flex ${isBot ? "justify-start" : "justify-end"}`}>
            <div className="max-w-[85%]">
              <p className={`mb-1 text-[11px] font-medium text-slate-400 ${isBot ? "" : "text-right"}`}>
                {isBot ? "AI Agent (Alex)" : "Customer"}
              </p>
              <div
                className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  isBot
                    ? "rounded-tl-sm bg-white text-slate-800 shadow-sm ring-1 ring-slate-200"
                    : "rounded-tr-sm bg-indigo-600 text-white"
                } ${m.pending ? "opacity-60" : ""}`}
              >
                {m.text}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
