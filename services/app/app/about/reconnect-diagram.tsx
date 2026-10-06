type Status = "live" | "offline" | "running" | "saved" | "replay";

const STATUS_STYLES: Record<Status, string> = {
  live: "bg-teal/10 text-teal ring-teal/20",
  running: "bg-teal/10 text-teal ring-teal/20",
  replay: "bg-warning-soft text-warning ring-warning/20",
  saved: "bg-success-soft text-success ring-success/20",
  offline: "bg-canvas text-ink-muted ring-line",
};

const STAGES: { title: string; browser: [Status, string]; worker: [Status, string]; caption: string }[] = [
  {
    title: "You send a message",
    browser: ["live", "Socket open"],
    worker: ["running", "Run started"],
    caption: "Tokens flow worker → NOTIFY → gateway → your socket.",
  },
  {
    title: "You switch context",
    browser: ["offline", "Socket closed"],
    worker: ["running", "Still running"],
    caption: "NOTIFY is fire-and-forget, so nothing waits on the missing listener.",
  },
  {
    title: "The run finishes",
    browser: ["offline", "Away"],
    worker: ["saved", "State persisted"],
    caption: "Final state is committed, then the SQS message is deleted.",
  },
  {
    title: "You come back",
    browser: ["replay", "Catching up"],
    worker: ["saved", "Source of truth"],
    caption: "Reconnect by task id: load persisted state first, then resume live events.",
  },
];

function Chip({ status, label }: { status: Status; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${STATUS_STYLES[status]}`}>
      <span
        className={`h-1.5 w-1.5 rounded-full bg-current ${status === "running" || status === "live" ? "motion-safe:animate-pulse" : ""}`}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}

export default function ReconnectDiagram() {
  return (
    <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {STAGES.map((stage, i) => (
        <li key={stage.title} className="flex flex-col rounded-xl border border-line bg-surface p-4">
          <span className="font-mono text-[11px] text-ink-faint">0{i + 1}</span>
          <p className="mt-1 font-medium text-ink">{stage.title}</p>
          <dl className="mt-4 grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 text-xs text-ink-muted">
            <dt>Browser</dt>
            <dd><Chip status={stage.browser[0]} label={stage.browser[1]} /></dd>
            <dt>Worker</dt>
            <dd><Chip status={stage.worker[0]} label={stage.worker[1]} /></dd>
          </dl>
          <p className="mt-4 text-sm leading-snug text-ink-soft">{stage.caption}</p>
        </li>
      ))}
    </ol>
  );
}
