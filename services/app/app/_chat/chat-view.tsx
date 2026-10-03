import ChatShell from "./chat-shell";
import Composer from "./composer";
import { SAMPLE_SESSIONS } from "./sample-sessions";
import Sidebar from "./sidebar";

export default function ChatView() {
  return (
    <ChatShell sidebar={<Sidebar sessions={SAMPLE_SESSIONS} />}>
      <main className="flex flex-1 flex-col items-center justify-center px-4 pb-[12vh]">
        <h1 className="text-center font-display text-3xl text-zinc-950 sm:text-4xl">What are we working on?</h1>
        <div className="mt-8 w-full max-w-2xl">
          <Composer />
        </div>
      </main>
    </ChatShell>
  );
}
