export const STATUS_STYLES = {
  Converted: { badge: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/40", bar: "bg-emerald-400", icon: "🎉" },
  "Demo Requested": { badge: "bg-violet-500/15 text-violet-300 ring-violet-400/40", bar: "bg-violet-400", icon: "📅" },
  Interested: { badge: "bg-sky-500/15 text-sky-300 ring-sky-400/40", bar: "bg-sky-400", icon: "👍" },
  "Follow-up Required": { badge: "bg-amber-500/15 text-amber-300 ring-amber-400/40", bar: "bg-amber-400", icon: "🔁" },
  "Not Interested": { badge: "bg-rose-500/15 text-rose-300 ring-rose-400/40", bar: "bg-rose-400", icon: "✋" },
  "No Response": { badge: "bg-slate-500/20 text-slate-300 ring-slate-400/30", bar: "bg-slate-500", icon: "🔇" },
};

export default function StatusBadge({ status, large = false }) {
  const size = large ? "px-4 py-1.5 text-sm" : "px-2.5 py-1 text-xs";
  if (!status) {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full bg-white/5 font-medium text-slate-400 ring-1 ring-white/10 ${size}`}>
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
        Analysing…
      </span>
    );
  }
  const style = STATUS_STYLES[status] ?? STATUS_STYLES["No Response"];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ${style.badge} ${size}`}>
      <span>{style.icon}</span>
      {status}
    </span>
  );
}
