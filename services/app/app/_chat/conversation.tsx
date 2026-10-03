"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { sendMessage } from "./actions";
import Composer from "./composer";
import type { ChatMessage } from "./data";

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-3xl bg-zinc-100 px-4 py-2.5 text-[15px] whitespace-pre-wrap text-zinc-950">
          {message.content}
        </p>
      </div>
    );
  }
  return <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-zinc-900">{message.content}</p>;
}

/**
 * The message list and composer for one chat, or for a new chat when
 * `sessionId` is null.
 *
 * Messages come from the server; while a send is in flight the user's message
 * is shown optimistically and a thinking indicator stands in for the reply.
 * When the action finishes, the server re-render replaces both with the
 * persisted history.
 */
export default function Conversation({
  sessionId,
  messages,
}: {
  sessionId: string | null;
  messages: ChatMessage[];
}) {
  const [optimisticMessages, addOptimisticMessage] = useOptimistic(
    messages,
    (current: ChatMessage[], sent: ChatMessage) => [...current, sent],
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [optimisticMessages.length, isPending]);

  function handleSend(content: string) {
    setError(null);
    startTransition(async () => {
      addOptimisticMessage({ id: `pending-${Date.now()}`, role: "user", content });
      const result = await sendMessage(sessionId, content);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  if (optimisticMessages.length === 0) {
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
          {optimisticMessages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {isPending && <p className="animate-pulse text-[15px] text-zinc-500">Thinking…</p>}
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
