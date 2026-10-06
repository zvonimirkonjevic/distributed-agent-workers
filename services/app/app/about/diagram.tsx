import { Fragment } from "react";

export type DiagramNode = {
  layer: string;
  name: string;
  detail: string;
  accent?: boolean;
};

function Connector() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto h-8 w-px shrink-0 bg-ink/10 lg:mx-0 lg:my-auto lg:h-px lg:w-8"
    >
      <span className="absolute left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-teal motion-safe:animate-flow-y lg:hidden" />
      <span className="absolute top-1/2 hidden h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-teal motion-safe:animate-flow-x lg:block" />
    </div>
  );
}

export default function FlowDiagram({ title, start, nodes }: { title: string; start: number; nodes: DiagramNode[] }) {
  return (
    <figure>
      <figcaption className="mb-3 text-xs font-medium tracking-wider text-ink-muted uppercase">{title}</figcaption>
      <ol className="flex flex-col lg:flex-row">
        {nodes.map((node, i) => (
          <Fragment key={`${node.name}-${i}`}>
            {i > 0 && <Connector />}
            <li
              className={`flex-1 rounded-xl border bg-surface p-4 ${node.accent ? "border-teal/30 ring-4 ring-teal/5" : "border-line"}`}
            >
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-canvas font-mono text-[11px] text-ink-soft">
                  {start + i}
                </span>
                <span className="text-[11px] font-medium tracking-wider text-ink-faint uppercase">{node.layer}</span>
              </div>
              <p className="mt-2 font-medium text-ink">{node.name}</p>
              <p className="mt-1 text-sm leading-snug text-ink-soft">{node.detail}</p>
            </li>
          </Fragment>
        ))}
      </ol>
    </figure>
  );
}
