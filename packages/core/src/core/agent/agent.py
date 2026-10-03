"""Deep agent wrapper that runs one session and tags its LangSmith traces."""
from deepagents import create_deep_agent
from langchain.chat_models import init_chat_model
from langchain_core.messages import AnyMessage
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

from core.agent.prompt import SYSTEM_PROMPT
from utils.config import Config

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
                config=self.config,
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


    def stream_invoke(self):
        """Stream agent output. Not implemented yet."""
        pass

    def create_agent(self, saver: AsyncPostgresSaver):
        """Build the deep agent graph for this session's model.

        The chat model gets any extra kwargs registered for `model_id` in
        `Config.model_init_kwargs`.

        Returns:
            The compiled deepagents graph.
        """
        kwargs = {
            "model": init_chat_model(self.model_id, **Config.model_init_kwargs.get(self.model_id, {})),
            "system_prompt": SYSTEM_PROMPT,
            "checkpointer": saver,
        }

        return create_deep_agent(**kwargs)