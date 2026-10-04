"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { deleteSession } from "./actions";

/**
 * The button only shows while its row is hovered, focused, or the menu is
 * open; on touch screens, which cannot hover, it is always visible.
 */
export default function SessionMenu({
  sessionId,
  title,
  isActive,
}: {
  sessionId: string;
  title: string;
  isActive: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    function handlePointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteSession(sessionId, isActive);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div ref={rootRef} className="absolute inset-y-0 right-1 flex items-center">
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen((current) => !current);
        }}
        aria-label={`More options for ${title}`}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition-colors group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-zinc-300/60 hover:text-zinc-900 [@media(hover:none)]:opacity-100 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      >
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden="true">
          <circle cx="3.5" cy="8" r="1.25" />
          <circle cx="8" cy="8" r="1.25" />
          <circle cx="12.5" cy="8" r="1.25" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute top-full right-0 z-10 mt-1 w-44 rounded-xl border border-zinc-200 bg-white p-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={handleDelete}
            disabled={isPending}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2.5 4.5h11M6.5 4.5V3a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1.5M4 4.5l.7 8.6a1 1 0 0 0 1 .9h4.6a1 1 0 0 0 1-.9l.7-8.6" />
            </svg>
            {isPending ? "Deleting…" : "Delete"}
          </button>
          {error && <p className="px-2.5 pt-1 pb-1.5 text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
