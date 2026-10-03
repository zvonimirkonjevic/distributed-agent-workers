"""Convert a session's LangGraph history into chat UI messages."""
from typing import Literal, TypedDict

from langchain_core.messages import AIMessage, AnyMessage, HumanMessage

from core.agent.agent import Agent
from utils.config import Config


class ChatMessage(TypedDict):
    """A user or assistant message as shown in the chat UI."""

    id: str
    role: Literal["user", "assistant"]
    content: str


def to_chat_messages(messages: list[AnyMessage]) -> list[ChatMessage]:
    """Keep user and assistant text, dropping tool traffic and empty turns.

    An AIMessage that only requests tool calls has no text, so it is skipped
    rather than shown as an empty bubble.

    Args:
        messages: LangGraph state messages, oldest first.

    Returns:
        The visible messages, oldest first.
    """
    visible: list[ChatMessage] = []
    for message in messages:
        if isinstance(message, HumanMessage):
            role = "user"
        elif isinstance(message, AIMessage):
            role = "assistant"
        else:
            continue

        content = str(message.text)
        if content.strip():
            visible.append({"id": message.id, "role": role, "content": content})
    return visible


async def get_chat_messages(session_id: str) -> list[ChatMessage]:
    """Load a session's visible history from its latest checkpoint.

    The checkpoint is the single source of truth for history: whoever runs
    the agent (the API now, a worker later) writes it as the run progresses,
    so readers never depend on the process that produced the messages.

    Args:
        session_id: Chat session id, used as the LangGraph thread_id.

    Returns:
        The user and assistant messages, oldest first; empty if the session
        has no runs yet.
    """
    # Reading state needs only the graph's structure, not the session's model.
    messages = await Agent(session_id, Config.model_id).aget_messages()
    return to_chat_messages(messages)
