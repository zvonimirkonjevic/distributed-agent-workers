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
function sendOverSocket(sessionId: string, content: string): Promise<string> {
  // FastAPI is published on port 8000 of the host serving the app, under both
  // `bun run dev` and compose, so no extra URL config is needed locally.
  const url = `ws://${window.location.hostname}:8000/messages/ws/sessions/${encodeURIComponent(sessionId)}`;
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

function Avatar({ role }: { role: ChatMessage["role"] }) {
  if (role === "user") {
    return (
      <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-zinc-600">
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="8" cy="5.5" r="2.75" />
          <path d="M2.75 14a5.25 5.25 0 0 1 10.5 0" />
        </svg>
      </span>
    );
  }
  return (
    <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-white">
      <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
        <path d="M8 1.5c.4 3.1 1.9 4.6 5 5-3.1.4-4.6 1.9-5 5-.4-3.1-1.9-4.6-5-5 3.1-.4 4.6-1.9 5-5Z" />
        <path d="M12.75 10.5c.15 1.2.75 1.8 1.75 2-1 .2-1.6.8-1.75 2-.15-1.2-.75-1.8-1.75-2 1-.2 1.6-.8 1.75-2Z" />
      </svg>
    </span>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex items-start justify-end gap-3">
        <p className="max-w-[85%] rounded-3xl bg-zinc-100 px-4 py-2.5 text-[15px] whitespace-pre-wrap text-zinc-950">
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
  const [history, setHistory] = useState(messages);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

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
      }

      const reply = await sendOverSocket(id, text);
      setHistory((current) => [...current, { id: `assistant-${Date.now()}`, role: "assistant", content: reply }]);

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
        <h1 className="text-center font-display text-3xl text-zinc-950 sm:text-4xl">What are we working on?</h1>
        <div className="mt-8 w-full max-w-2xl">
          <Composer onSend={handleSend} disabled={isPending} />
          {error && <p className="mt-3 px-5 text-sm text-red-600">{error}</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-6">
          {history.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {isPending && (
            <div className="flex items-start gap-3">
              <Avatar role="assistant" />
              <p className="animate-pulse pt-1 text-[15px] text-zinc-500">Thinking…</p>
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div ref={endRef} />
        </div>
      </div>
      <div className="px-4 pb-6">
        <div className="mx-auto w-full max-w-2xl">
          <Composer onSend={handleSend} disabled={isPending} />
        </div>
      </div>
    </main>
  );
}
