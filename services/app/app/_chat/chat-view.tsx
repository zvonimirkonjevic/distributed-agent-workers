import { notFound } from "next/navigation";
import ChatShell from "./chat-shell";
import Conversation from "./conversation";
import { getSession, listMessages, listSessions } from "./data";
import Sidebar from "./sidebar";

/** The chat screen: a new, empty chat without `sessionId`, otherwise that session's history. */
export default async function ChatView({ sessionId }: { sessionId?: string }) {
  const sessions = await listSessions();

  let messages: Awaited<ReturnType<typeof listMessages>> = [];
  if (sessionId) {
    if ((await getSession(sessionId)) === null) {
      notFound();
    }
    messages = await listMessages(sessionId);
  }

  return (
    <ChatShell sidebar={<Sidebar sessions={sessions} activeId={sessionId} />}>
      {messages === null ? (
        <main className="flex flex-1 items-center justify-center px-4">
          <p className="text-sm text-zinc-500">Couldn&apos;t load this chat. Check that the API is running.</p>
        </main>
      ) : (
        // Keyed so switching chats resets the optimistic and error state.
        <Conversation key={sessionId ?? "new"} sessionId={sessionId ?? null} messages={messages} />
      )}
    </ChatShell>
  );
}
