"""Deep agent wrapper that runs one session and tags its LangSmith traces."""
from typing import Any, Iterator

from deepagents import create_deep_agent
from langchain.chat_models import init_chat_model
from langchain_core.messages import AnyMessage, AIMessage, ToolMessage
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

from core.agent.prompt import SYSTEM_PROMPT
from core.agent.tools import TOOLS
from utils.config import Config


def parse_events_from_chunk(chunk: dict) -> Iterator[dict[str, Any]]:
    """
    Parse events from a chunk of data.

    Args:
        chunk (dict): The chunk of data to parse.
    
    Yields:
        dict: Parsed events from the chunk.
    """
    if chunk.get("type") != "updates":
        return

    data = chunk.get("data", {})
    for node_output in data.values():
        if not isinstance(node_output, dict):
            continue

        messages = node_output.get("messages", [])

        if not isinstance(messages, list):
            continue

        for msg in messages:
            if isinstance(msg, AIMessage):
                text = str(msg.text)
                if text.strip():
                    yield {"type": "content", "id": msg.id, "text": text}

                for tool_call in msg.tool_calls:
                    yield {
                        "type": "tool_call",
                        "id": tool_call.get("id"),
                        "tool": tool_call["name"],
                        "inputs": tool_call["args"],
                    }

            elif isinstance(msg, ToolMessage) and msg.content:
                yield {
                    "type": "tool_result",
                    "tool_call_id": msg.tool_call_id,
                    "tool": msg.name,
                    "content": msg.content,
                }


class Agent:
    """Runs a deepagents graph for one session with a given chat model.

    Every run carries `session_id` and `model_id` as run metadata, so
    LangSmith attaches them to the root trace and groups the session's
    traces into one thread.

    Args:
        session_id: Identifier of the conversation; LangSmith threads on it.
        model_id: Chat model in "provider:model" form, e.g.
            "openai:gpt-5.6-luna". Must match a `Config.model_init_kwargs`
            key exactly for model-specific kwargs to apply.

    Attributes:
        session_id: Identifier of the conversation.
        model_id: Chat model in "provider:model" form.
        config: LangGraph run config passed to every invoke, holding the
            recursion limit and trace metadata.
    """

    def __init__(
        self,
        session_id: str,
        model_id: str,
    ):
        self.session_id = session_id
        self.model_id = model_id

        self.config = {
            "recursion_limit": 10,
            "configurable": {"thread_id": self.session_id},
            "metadata": {
                "session_id": self.session_id,
                "model_id": self.model_id,
            }
        }

    async def ainvoke(self, input_text: str):
        """Run the agent to completion on a single user message.

        Args:
            input_text: The user's message.

        Returns:
            The final graph state, including the full message history
            under "messages".
        """
        async with AsyncPostgresSaver.from_conn_string(Config.postgres_psycopg_dsn) as saver:
            agent = self.create_agent(saver)
            response = await agent.ainvoke(
                {"messages": [{"role": "user", "content": input_text}]},
                config={**self.config, "run_name": "Agent"},
            )
        return response

    async def aget_messages(self) -> list[AnyMessage]:
        """Load the session's full message history from its checkpoint.

        deepagents stores `messages` in a DeltaChannel, so the raw checkpoint
        holds only a sentinel and the history must be replayed through the
        compiled graph. Building the graph does not call the model.

        Returns:
            Every message in the latest state, oldest first, including tool
            calls and tool results; empty if the session has no runs yet.
        """
        async with AsyncPostgresSaver.from_conn_string(Config.postgres_psycopg_dsn) as saver:
            snapshot = await self.create_agent(saver).aget_state(self.config)
        return snapshot.values.get("messages", [])


    async def astream(self, input_text: str):
        """Run the agent on a single user message, yielding events per step.

        Events come from LangGraph's "updates" stream, so each one reflects a
        step that has already been checkpointed.

        Args:
            input_text: The user's message.

        Yields:
            Event dicts from `parse_events_from_chunk`, in run order.
        """
        async with AsyncPostgresSaver.from_conn_string(Config.postgres_psycopg_dsn) as saver:
            agent = self.create_agent(saver)

            async for chunk in agent.astream(
                {"messages": [{"role": "user", "content": input_text}]},
                config={**self.config, "run_name": "Agent"},
                stream_mode="updates",
                version="v2",
            ):
                for event in parse_events_from_chunk(chunk):
                    yield event


    def create_agent(self, saver: AsyncPostgresSaver):
        """Build the deep agent graph for this session's model.

        The chat model gets any extra kwargs registered for `model_id` in
        `Config.model_init_kwargs`.

        Returns:
            The compiled deepagents graph.
        """
        kwargs = {
            "model": init_chat_model(self.model_id, **Config.model_init_kwargs.get(self.model_id, {})),
            "tools": TOOLS,
            "system_prompt": SYSTEM_PROMPT,
            "checkpointer": saver,
        }

        return create_deep_agent(**kwargs)
