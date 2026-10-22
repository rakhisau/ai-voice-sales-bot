import StatusBadge, { STATUS_STYLES } from "./StatusBadge";
import Transcript from "./Transcript";
import { formatDate, formatDuration } from "@/lib/format";

function List({ items, empty, dot }) {
  if (!items.length) return <p className="text-sm text-slate-500">{empty}</p>;
  return (
    <ul className="space-y-1.5 text-sm text-slate-200">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2">
          <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
          {item}
        </li>
      ))}
    </ul>
  );
}

function Card({ icon, title, accent, children }) {
  return (
    <section className="glass rounded-2xl p-4 sm:p-5">
      <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
        <span className={`grid h-7 w-7 place-items-center rounded-lg text-sm ${accent}`}>{icon}</span>
        {title}
      </h3>
      {children}
    </section>
  );
}

export default function CallDetail({ call }) {
  const statusBar = STATUS_STYLES[call.salesStatus]?.bar ?? "bg-slate-600";
  return (
    <div className="space-y-4">
      {/* Status hero */}
      <div className="glass relative overflow-hidden rounded-2xl p-5">
        <div className={`absolute inset-y-0 left-0 w-1.5 ${statusBar}`} />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Final sales status</p>
            <div className="mt-2">
              <StatusBadge status={call.salesStatus} large />
            </div>
          </div>
          <dl className="flex flex-wrap gap-6 text-sm">
            <div>
              <dt className="text-xs text-slate-500">Customer</dt>
              <dd className="font-semibold">{call.customerName || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Date</dt>
              <dd className="font-semibold">{formatDate(call.startedAt || call.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Duration</dt>
              <dd className="font-mono font-semibold">{formatDuration(call.durationSec)}</dd>
            </div>
          </dl>
        </div>
      </div>

      <Card icon="🎧" title="Call recording" accent="bg-cyan-500/15">
        {call.recordingUrl ? (
          <audio controls preload="metadata" src={call.recordingUrl} className="w-full [color-scheme:dark]" />
        ) : (
          <p className="text-sm text-slate-500">Recording is not available yet.</p>
        )}
      </Card>

      <Card icon="✨" title="AI summary" accent="bg-fuchsia-500/15">
        <p className="text-sm leading-relaxed text-slate-200">{call.summary || "Summary not available."}</p>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card icon="🎯" title="Customer requirements" accent="bg-sky-500/15">
          <List items={call.requirements} empty="None captured." dot="bg-sky-400" />
        </Card>
        <Card icon="⚠️" title="Objections" accent="bg-amber-500/15">
          <List items={call.objections} empty="No objections raised." dot="bg-amber-400" />
        </Card>
      </div>

      <Card icon="🚀" title="Next steps" accent="bg-emerald-500/15">
        <p className="text-sm text-slate-200">{call.nextSteps || "—"}</p>
      </Card>

      <section className="glass overflow-hidden rounded-2xl">
        <h3 className="flex items-center gap-2 border-b border-white/10 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-500/15 text-sm">💬</span>
          Full transcript
        </h3>
        <Transcript messages={call.transcript} emptyText="No transcript." className="max-h-[480px]" />
      </section>
    </div>
  );
}
