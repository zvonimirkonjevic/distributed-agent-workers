"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

function SidebarToggle({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-200/60 hover:text-zinc-900"
    >
      <svg viewBox="0 0 16 16" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <rect x="2" y="2.5" width="12" height="11" rx="2" />
        <path d="M6 2.5v11" />
      </svg>
    </button>
  );
}

/**
 * Layout chrome for the chat: a sidebar that is a collapsible column on desktop
 * and an off-canvas drawer below md. The sidebar content is server-rendered and
 * passed in, so only the open/closed state lives on the client.
 */
export default function ChatShell({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) {
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-dvh">
      {mobileOpen && (
        <div
          aria-hidden="true"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-zinc-950/20 md:hidden"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-zinc-200 bg-zinc-50 transition-transform md:static md:z-auto md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${desktopOpen ? "md:flex" : "md:hidden"}`}
      >
        <div className="flex h-14 shrink-0 items-center gap-1 px-3">
          <Link
            href="/"
            className="flex h-9 flex-1 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-200/60"
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M8 3H4.5A1.5 1.5 0 0 0 3 4.5v7A1.5 1.5 0 0 0 4.5 13h7a1.5 1.5 0 0 0 1.5-1.5V8" />
              <path d="M11.6 2.4a1.4 1.4 0 0 1 2 2L8.5 9.5 6 10l.5-2.5Z" />
            </svg>
            New chat
          </Link>
          <span className="hidden md:block">
            <SidebarToggle label="Close sidebar" onClick={() => setDesktopOpen(false)} />
          </span>
          <span className="md:hidden">
            <SidebarToggle label="Close sidebar" onClick={() => setMobileOpen(false)} />
          </span>
        </div>
        {sidebar}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 shrink-0 items-center px-3">
          <span className="md:hidden">
            <SidebarToggle label="Open sidebar" onClick={() => setMobileOpen(true)} />
          </span>
          {!desktopOpen && (
            <span className="hidden md:block">
              <SidebarToggle label="Open sidebar" onClick={() => setDesktopOpen(true)} />
            </span>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
