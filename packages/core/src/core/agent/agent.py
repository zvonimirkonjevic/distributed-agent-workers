from deepagents import create_deep_agent
from langchain.chat_models import init_chat_model

from core.agent.prompt import SYSTEM_PROMPT
from utils.config import Config

class Agent:
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
        agent = self.create_agent() 
        response = agent.invoke(
            {"messages": [{"role": "user", "content": input_text}]},
            config=self.config,
        )
        return response
        

    def stream_invoke(self):
        pass

    def create_agent(self):
        kwargs = {
            "model": init_chat_model(self.model_id, **Config.model_init_kwargs.get(self.model_id, {})),
            "system_prompt": SYSTEM_PROMPT,
        }

        return create_deep_agent(**kwargs)