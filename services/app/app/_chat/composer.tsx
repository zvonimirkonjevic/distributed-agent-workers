"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";

export default function Composer({
  onSend,
  disabled,
  streaming,
  onStreamingChange,
}: {
  onSend: (message: string) => void;
  disabled: boolean;
  streaming: boolean;
  onStreamingChange: (streaming: boolean) => void;
}) {
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
      className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-3 shadow-sm transition-colors focus-within:border-ink/30"
    >
      <textarea
        name="message"
        rows={1}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask anything"
        aria-label="Message"
        className="field-sizing-content max-h-52 min-h-10 resize-none bg-transparent px-2 py-2 text-[15px] text-ink outline-none placeholder:text-ink-faint"
      />
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onStreamingChange(!streaming)}
          aria-pressed={streaming}
          title="Show the agent's progress as it works"
          className="h-9 rounded-full border border-ink/20 bg-surface px-4 text-sm text-ink-soft transition-colors hover:bg-canvas aria-pressed:border-ink aria-pressed:bg-canvas aria-pressed:text-ink"
        >
          Stream
        </button>
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Send message"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-white transition-colors hover:bg-ink/85 disabled:bg-ink/10 disabled:text-ink-faint"
        >
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" />
          </svg>
        </button>
      </div>
    </form>
  );
}
