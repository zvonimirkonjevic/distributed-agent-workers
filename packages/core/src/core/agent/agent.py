"""Deep agent wrapper that runs one session and tags its LangSmith traces."""
from deepagents import create_deep_agent
from langchain.chat_models import init_chat_model

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
            "metadata": {
                "session_id": self.session_id,
                "model_id": self.model_id,
            }
        }


    def invoke(self, input_text: str):
        """Run the agent to completion on a single user message.

        Args:
            input_text: The user's message.

        Returns:
            The final graph state, including the full message history
            under "messages".
        """
        agent = self.create_agent() 
        response = agent.invoke(
            {"messages": [{"role": "user", "content": input_text}]},
            config=self.config,
        )
        return response
        

    def stream_invoke(self):
        """Stream agent output. Not implemented yet."""
        pass

    def create_agent(self):
        """Build the deep agent graph for this session's model.

        The chat model gets any extra kwargs registered for `model_id` in
        `Config.model_init_kwargs`.

        Returns:
            The compiled deepagents graph.
        """
        kwargs = {
            "model": init_chat_model(self.model_id, **Config.model_init_kwargs.get(self.model_id, {})),
            "system_prompt": SYSTEM_PROMPT,
        }

        return create_deep_agent(**kwargs)