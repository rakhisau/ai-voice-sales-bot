const STYLES = {
  Converted: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  "Demo Requested": "bg-violet-100 text-violet-800 ring-violet-200",
  Interested: "bg-sky-100 text-sky-800 ring-sky-200",
  "Follow-up Required": "bg-amber-100 text-amber-800 ring-amber-200",
  "Not Interested": "bg-rose-100 text-rose-800 ring-rose-200",
  "No Response": "bg-slate-200 text-slate-700 ring-slate-300",
};

export default function StatusBadge({ status }) {
  if (!status) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
        Analysing…
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${STYLES[status] ?? STYLES["No Response"]}`}
    >
      {status}
    </span>
  );
}
