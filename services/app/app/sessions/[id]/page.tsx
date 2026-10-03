import ChatView from "../../_chat/chat-view";

export default async function SessionPage({ params }: PageProps<"/sessions/[id]">) {
  const { id } = await params;
  return <ChatView sessionId={id} />;
}
