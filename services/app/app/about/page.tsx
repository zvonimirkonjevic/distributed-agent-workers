import type { Metadata } from "next";
import Link from "next/link";
import FlowDiagram, { type DiagramNode } from "./diagram";
import ReconnectDiagram from "./reconnect-diagram";

export const metadata: Metadata = { title: "About - Distributed Agent Workers" };

const REPO_URL = "https://github.com/zvonimirkonjevic/distributed-agent-workers";

const DISPATCH: DiagramNode[] = [
  { layer: "Client", name: "Browser", detail: "Sends a message from the chat UI." },
  { layer: "UI server", name: "Next.js", detail: "Server Action forwards the message to the API." },
  { layer: "Gateway", name: "FastAPI", detail: "Enqueues the job and returns a task id at once.", accent: true },
  { layer: "Broker", name: "AWS SQS", detail: "Holds the job until a worker claims it." },
  { layer: "Compute", name: "Worker pool", detail: "Runs the LangGraph agent in an isolated process.", accent: true },
];

const STREAM: DiagramNode[] = [
  { layer: "Compute", name: "Worker", detail: "Commits each token batch with NOTIFY on the task channel.", accent: true },
  { layer: "Pub/sub", name: "Postgres", detail: "Delivers notifications on commit; stores final state via PgBouncer." },
  { layer: "Gateway", name: "FastAPI", detail: "One direct LISTEN connection multiplexes every task channel.", accent: true },
  { layer: "Client", name: "Browser", detail: "Receives tokens over a WebSocket opened directly to the API." },
];

const FAILURE_MODES = [
  {
    name: "Blocking requests",
    problem: "An LLM call held inside a request ties up the server for minutes.",
    fix: "The gateway only enqueues and routes. Agent code never runs in the request path.",
  },
  {
    name: "Connection starvation",
    problem: "Hundreds of long runs each holding a database connection exhaust the pool.",
    fix: "Workers open their own connections after fork and go through PgBouncer in transaction mode.",
  },
  {
    name: "Zombie WebSockets",
    problem: "A dropped socket kills the job, or a dead job leaves the socket hanging.",
    fix: "Jobs are decoupled from sockets. A client reconnects by task id and recovers from persisted state.",
  },
];

const STACK = ["FastAPI", "Next.js 16", "LangGraph", "deepagents", "AWS SQS", "PostgreSQL LISTEN/NOTIFY", "PgBouncer", "Docker"];

export default function AboutPage() {
  return (
    <main className="flex-1">
      <header className="mx-auto max-w-6xl px-6 pt-8 pb-16">
        <div className="flex items-center justify-between text-[15px] font-medium text-zinc-600">
          <Link href="/" className="flex items-center gap-1.5 transition-colors hover:text-zinc-900">
            <svg
              viewBox="0 0 16 16"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M13 8H3M7 4 3 8l4 4" />
            </svg>
            Back to chat
          </Link>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 transition-colors hover:text-zinc-900"
          >
            <svg viewBox="0 0 16 16" className="h-5 w-5 fill-current" aria-hidden="true">
              <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
            </svg>
            Source
          </a>
        </div>
        <h1 className="mt-14 font-display text-4xl text-zinc-950 sm:text-5xl">About</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-zinc-600">
          Distributed Agent Workers is my open-source project for practicing backend agent development. The API
          never runs the model: it queues each message, a LangGraph agent generates the answer on a separate
          worker process, and Postgres pub/sub carries the tokens back. That bookkeeping is persisted, so leaving
          a chat mid-answer loses nothing.
        </p>
      </header>

      <section className="border-t border-zinc-200/70 bg-zinc-50/60">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="font-display text-3xl text-zinc-950 sm:text-4xl">What it solves</h2>
          <p className="mt-3 max-w-2xl text-zinc-600">
            Running agents behind a web API breaks in predictable ways. Each part of the architecture exists to
            rule one of them out.
          </p>
          <ul className="mt-10 grid gap-4 md:grid-cols-3">
            {FAILURE_MODES.map((mode) => (
              <li key={mode.name} className="rounded-xl border border-zinc-200 bg-white p-5">
                <p className="font-medium text-zinc-950">{mode.name}</p>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">{mode.problem}</p>
                <p className="mt-3 border-t border-zinc-100 pt-3 text-sm leading-relaxed text-zinc-700">{mode.fix}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="font-display text-3xl text-zinc-950 sm:text-4xl">Architecture</h2>
        <p className="mt-3 max-w-2xl text-zinc-600">
          The gateway and the workers never call each other. They meet only in SQS and Postgres: jobs go out
          through the queue, progress comes back through Postgres pub/sub.
        </p>
        <div className="mt-10 flex flex-col gap-10">
          <FlowDiagram title="Dispatch: request to queued job" start={1} nodes={DISPATCH} />
          <FlowDiagram title="Stream: worker back to your screen" start={6} nodes={STREAM} />
        </div>
      </section>

      <section className="border-t border-zinc-200/70 bg-zinc-50/60">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="font-display text-3xl text-zinc-950 sm:text-4xl">Chat integrity across context switches</h2>
          <p className="mt-3 max-w-2xl text-zinc-600">
            The socket is a view, not the job. Leaving a chat mid-answer closes your connection, but the run,
            and the record of it, carry on without you.
          </p>
          <div className="mt-10">
            <ReconnectDiagram />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="font-display text-3xl text-zinc-950 sm:text-4xl">Stack</h2>
        <ul className="mt-6 flex flex-wrap gap-2">
          {STACK.map((item) => (
            <li key={item} className="rounded-full border border-zinc-200 px-3 py-1 text-sm text-zinc-700">
              {item}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
