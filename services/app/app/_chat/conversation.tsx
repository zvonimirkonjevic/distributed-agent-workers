"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createSession } from "./actions";
import Composer from "./composer";
import Markdown from "./markdown";
import type { ChatMessage } from "./data";

/**
 * Send one message over the session's WebSocket and resolve with the agent's
 * reply. The API answers each message with one JSON frame, either
 * `{type: "reply", message}` or `{type: "error", detail}`.
 */
function socketUrl(sessionId: string, path = ""): string {
  // FastAPI is published on port 8000 of the host serving the app, under both
  // `bun run dev` and compose, so no extra URL config is needed locally.
  return `ws://${window.location.hostname}:8000/sessions/${encodeURIComponent(sessionId)}/messages${path}`;
}

function sendOverSocket(sessionId: string, content: string): Promise<string> {
  const url = socketUrl(sessionId);
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    socket.onopen = () => socket.send(content);
    socket.onmessage = (event) => {
      const frame = JSON.parse(String(event.data));
      if (frame.type === "reply") {
        resolve(frame.message.content);
      } else {
        reject(new Error(`agent error: detail=${frame.detail}`));
      }
      socket.close();
    };
    // After a reply, close fires too, but rejecting a settled promise is a no-op.
    socket.onclose = (event) => reject(new Error(`websocket closed before reply: code=${event.code}`));
  });
}

type StreamFrame =
  | { type: "content"; id: string; text: string }
  | { type: "tool_call"; id: string; tool: string; inputs: unknown }
  | { type: "tool_result"; tool_call_id: string; tool: string; content: unknown }
  | { type: "done" }
  | { type: "error"; detail: string };

/**
 * Send one message over the session's streaming WebSocket, passing each agent
 * step to `onFrame` as it completes. Resolves on `done`, rejects on `error`.
 */
function streamOverSocket(sessionId: string, content: string, onFrame: (frame: StreamFrame) => void): Promise<void> {
  const url = socketUrl(sessionId, "/stream");
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    socket.onopen = () => socket.send(content);
    socket.onmessage = (event) => {
      const frame: StreamFrame = JSON.parse(String(event.data));
      if (frame.type === "done") {
        resolve();
        socket.close();
      } else if (frame.type === "error") {
        reject(new Error(`agent error: detail=${frame.detail}`));
        socket.close();
      } else {
        onFrame(frame);
      }
    };
    // After done, close fires too, but rejecting a settled promise is a no-op.
    socket.onclose = (event) => reject(new Error(`websocket closed before done: code=${event.code}`));
  });
}

function Avatar({ role }: { role: ChatMessage["role"] }) {
  if (role === "user") {
    return (
      <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink/10 text-ink-soft">
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="8" cy="5.5" r="2.75" />
          <path d="M2.75 14a5.25 5.25 0 0 1 10.5 0" />
        </svg>
      </span>
    );
  }
  return (
    <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-white">
      <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
        <path d="M8 1.5c.4 3.1 1.9 4.6 5 5-3.1.4-4.6 1.9-5 5-.4-3.1-1.9-4.6-5-5 3.1-.4 4.6-1.9 5-5Z" />
        <path d="M12.75 10.5c.15 1.2.75 1.8 1.75 2-1 .2-1.6.8-1.75 2-.15-1.2-.75-1.8-1.75-2 1-.2 1.6-.8 1.75-2Z" />
      </svg>
    </span>
  );
}

/**
 * A tool call seen on the live stream. Only streamed runs produce these; the
 * history endpoint returns user and assistant text only, so they are gone
 * after a reload.
 */
type ToolStep = {
  id: string;
  role: "tool";
  tool: string;
  inputs: unknown;
  // Absent until the tool_result frame for this call arrives.
  output?: unknown;
};

type Entry = ChatMessage | ToolStep;

/**
 * Each session's on-screen conversation, kept in module memory so tool steps
 * survive client-side navigation (a new chat moving to /sessions/<id>
 * remounts this component) and are dropped only by a full page reload.
 */
const liveHistory = new Map<string, Entry[]>();

function formatPayload(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

function ToolStepRow({ step }: { step: ToolStep }) {
  const isRunning = step.output === undefined;
  return (
    // pl matches the assistant bubble's text column: 32px avatar + 12px gap.
    <details className="group pl-11">
      <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 rounded-full text-sm text-ink-muted transition-colors hover:text-ink [&::-webkit-details-marker]:hidden">
        <span className={isRunning ? "animate-pulse" : undefined}>
          {isRunning ? "Using" : "Used"} <code className="font-mono text-[13px]">{step.tool}</code>
        </span>
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m4 6 4 4 4-4" />
        </svg>
      </summary>
      <div className="mt-2 flex flex-col gap-3 rounded-2xl border border-line bg-canvas p-3 text-xs">
        <section>
          <h3 className="mb-1 font-medium text-ink-muted">Input</h3>
          <pre className="max-h-60 overflow-auto font-mono whitespace-pre-wrap break-words text-ink">{formatPayload(step.inputs)}</pre>
        </section>
        <section>
          <h3 className="mb-1 font-medium text-ink-muted">Output</h3>
          {isRunning ? (
            <p className="text-ink-faint">Waiting for result…</p>
          ) : (
            <pre className="max-h-60 overflow-auto font-mono whitespace-pre-wrap break-words text-ink">{formatPayload(step.output)}</pre>
          )}
        </section>
      </div>
    </details>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex items-start justify-end gap-3">
        <p className="max-w-[85%] rounded-3xl bg-canvas px-4 py-2.5 text-[15px] whitespace-pre-wrap text-ink">
          {message.content}
        </p>
        {/* Centers the avatar on the bubble's first line: (44px bubble - 32px avatar) / 2. */}
        <span className="mt-1.5">
          <Avatar role="user" />
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3">
      <Avatar role="assistant" />
      {/* pt aligns the first text line with the avatar's center. */}
      <div className="min-w-0 flex-1 pt-1">
        <Markdown>{message.content}</Markdown>
      </div>
    </div>
  );
}

/**
 * History comes from the server; sent messages and replies are appended
 * locally as they happen. A new chat creates its session first and opens it
 * once the reply arrives.
 */
export default function Conversation({
  sessionId,
  messages,
}: {
  sessionId: string | null;
  messages: ChatMessage[];
}) {
  const router = useRouter();
  const [history, setHistory] = useState<Entry[]>(() => (sessionId && liveHistory.get(sessionId)) || messages);
  // A new chat has no id until its session is created; history is cached under it from then on.
  const [liveId, setLiveId] = useState(sessionId);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (liveId) {
      liveHistory.set(liveId, history);
    }
  }, [liveId, history]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [history.length, isPending]);

  async function handleSend(content: string) {
    const text = content.trim();
    if (!text) {
      return;
    }
    setError(null);
    setIsPending(true);
    setHistory((current) => [...current, { id: `user-${Date.now()}`, role: "user", content: text }]);
    try {
      let id = sessionId;
      if (id === null) {
        const result = await createSession(text);
        if ("error" in result) {
          setError(result.error);
          return;
        }
        id = result.id;
        setLiveId(id);
      }

      if (streaming) {
        await streamOverSocket(id, text, (frame) => {
          if (frame.type === "content") {
            setHistory((current) => [...current, { id: frame.id, role: "assistant", content: frame.text }]);
          } else if (frame.type === "tool_call") {
            setHistory((current) => [...current, { id: frame.id, role: "tool", tool: frame.tool, inputs: frame.inputs }]);
          } else if (frame.type === "tool_result") {
            setHistory((current) =>
              current.map((entry) =>
                entry.role === "tool" && entry.id === frame.tool_call_id ? { ...entry, output: frame.content } : entry,
              ),
            );
          }
        });
      } else {
        const reply = await sendOverSocket(id, text);
        setHistory((current) => [...current, { id: `assistant-${Date.now()}`, role: "assistant", content: reply }]);
      }

      if (sessionId === null) {
        router.push(`/sessions/${id}`);
      }
    } catch {
      setError("The agent couldn't reply. Try again.");
    } finally {
      setIsPending(false);
    }
  }

  if (history.length === 0) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-4 pb-[12vh]">
        <h1 className="text-center font-medium tracking-tightest text-3xl text-ink sm:text-4xl">What are we working on?</h1>
        <div className="mt-8 w-full max-w-2xl">
          <Composer onSend={handleSend} disabled={isPending} streaming={streaming} onStreamingChange={setStreaming} />
          {error && <p className="mt-3 px-5 text-sm text-red-600">{error}</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-6">
          {history.map((entry) =>
            entry.role === "tool" ? (
              <ToolStepRow key={entry.id} step={entry} />
            ) : (
              <MessageBubble key={entry.id} message={entry} />
            ),
          )}
          {isPending && (
            <div className="flex items-start gap-3">
              <Avatar role="assistant" />
              <p className="animate-pulse pt-1 text-[15px] text-ink-muted">Thinking…</p>
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div ref={endRef} />
        </div>
      </div>
      <div className="px-4 pb-6">
        <div className="mx-auto w-full max-w-2xl">
          <Composer onSend={handleSend} disabled={isPending} streaming={streaming} onStreamingChange={setStreaming} />
        </div>
      </div>
    </main>
  );
}
