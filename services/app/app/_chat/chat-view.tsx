import ChatShell from "./chat-shell";
import Composer from "./composer";
import { listSessions } from "./data";
import Sidebar from "./sidebar";

export default async function ChatView() {
  const sessions = await listSessions();

  return (
    <ChatShell sidebar={<Sidebar sessions={sessions} />}>
      <main className="flex flex-1 flex-col items-center justify-center px-4 pb-[12vh]">
        <h1 className="text-center font-display text-3xl text-zinc-950 sm:text-4xl">What are we working on?</h1>
        <div className="mt-8 w-full max-w-2xl">
          <Composer />
        </div>
      </main>
    </ChatShell>
  );
}
