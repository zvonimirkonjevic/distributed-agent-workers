import Link from "next/link";
import type { components } from "@/lib/api/schema";

type ChatSession = components["schemas"]["SessionResponse"];

const DAY = 24 * 60 * 60 * 1000;

function groupByRecency(sessions: ChatSession[], now: Date) {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const groups: { label: string; items: ChatSession[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Previous 7 days", items: [] },
    { label: "Older", items: [] },
  ];
  for (const session of sessions) {
    const created = new Date(session.created_at).getTime();
    const index =
      created >= startOfToday ? 0 : created >= startOfToday - DAY ? 1 : created >= startOfToday - 7 * DAY ? 2 : 3;
    groups[index].items.push(session);
  }
  return groups.filter((group) => group.items.length > 0);
}

export default function Sidebar({ sessions }: { sessions: ChatSession[] }) {
  const groups = groupByRecency(sessions, new Date());

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <nav aria-label="Chat history" className="mt-2 min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {groups.length === 0 ? (
          <p className="px-2.5 text-sm leading-relaxed text-zinc-500">
            No chats yet. Your conversations will show up here.
          </p>
        ) : (
          groups.map((group) => (
            <section key={group.label} className="mb-5">
              <h2 className="px-2.5 pb-1.5 text-xs font-medium text-zinc-500">{group.label}</h2>
              <ul>
                {group.items.map((session) => (
                  <li key={session.id}>
                    {/* A button until chat pages exist; becomes a Link to the session then. */}
                    <button
                      type="button"
                      title={session.title}
                      className="w-full truncate rounded-lg px-2.5 py-2 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-200/60"
                    >
                      {session.title}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </nav>

      <div className="border-t border-zinc-200 p-3">
        <Link
          href="/about"
          className="flex h-10 items-center gap-2.5 rounded-lg px-2.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-200/60"
        >
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
            <circle cx="8" cy="8" r="6" />
            <path d="M8 7.5v3.5M8 5h.01" />
          </svg>
          How it works
        </Link>
      </div>
    </div>
  );
}
