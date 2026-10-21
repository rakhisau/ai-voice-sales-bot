import StatusBadge from "./StatusBadge";
import Transcript from "./Transcript";
import { formatDate, formatDuration } from "@/lib/format";

function List({ items, empty }) {
  if (!items.length) return <p className="text-sm text-slate-400">{empty}</p>;
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

function Card({ title, children }) {
  return (
    <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      {children}
    </section>
  );
}

export default function CallDetail({ call }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
        <StatusBadge status={call.salesStatus} />
        <span>{formatDate(call.startedAt || call.createdAt)}</span>
        <span>Duration {formatDuration(call.durationSec)}</span>
        {call.customerName && <span>Customer: {call.customerName}</span>}
      </div>

      <Card title="Call recording">
        {call.recordingUrl ? (
          <audio controls preload="none" src={call.recordingUrl} className="w-full" />
        ) : (
          <p className="text-sm text-slate-400">Recording is not available yet.</p>
        )}
      </Card>

      <Card title="AI summary">
        <p className="text-sm leading-relaxed text-slate-700">{call.summary || "Summary not available."}</p>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card title="Customer requirements">
          <List items={call.requirements} empty="None captured." />
        </Card>
        <Card title="Objections">
          <List items={call.objections} empty="No objections raised." />
        </Card>
      </div>

      <Card title="Next steps">
        <p className="text-sm text-slate-700">{call.nextSteps || "—"}</p>
      </Card>

      <section className="rounded-xl bg-slate-50 ring-1 ring-slate-200">
        <h3 className="border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Transcript
        </h3>
        <Transcript messages={call.transcript} emptyText="No transcript." className="max-h-[480px]" />
      </section>
    </div>
  );
}
