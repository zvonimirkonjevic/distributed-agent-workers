"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";

export default function Composer({ onSend, disabled }: { onSend: (message: string) => void; disabled: boolean }) {
  const [message, setMessage] = useState("");
  const canSend = !disabled && message.trim().length > 0;

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSend) {
      return;
    }
    onSend(message);
    setMessage("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-2 rounded-3xl border border-zinc-200 bg-white p-2 pl-5 shadow-sm transition-colors focus-within:border-zinc-400"
    >
      <textarea
        name="message"
        rows={1}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask anything"
        aria-label="Message"
        className="field-sizing-content max-h-52 min-h-10 flex-1 resize-none bg-transparent py-2 text-[15px] text-zinc-950 outline-none placeholder:text-zinc-400"
      />
      <button
        type="submit"
        disabled={!canSend}
        aria-label="Send message"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-white transition-colors hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-400"
      >
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" />
        </svg>
      </button>
    </form>
  );
}
