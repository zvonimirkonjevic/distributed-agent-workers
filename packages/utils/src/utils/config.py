"""Application settings read from environment variables."""
import os
from typing import Any, Callable


class classproperty[T]:
    """Like @property, but read from the class itself: Config.database_url.

    Args:
        fget: Getter called with the owning class on every access.
    """

    def __init__(self, fget: Callable[[Any], T]):
        self.fget = fget

    def __get__(self, instance: Any, owner: type) -> T:
        return self.fget(owner)


class Config:
    """Application settings, accessed on the class, e.g. `Config.database_url`.

    Values are re-read from the environment on every access, not cached at
    import time.
    """

    @classproperty
    def env(cls) -> str:
        """Get the deployment environment name, e.g. "local" or "production"."""
        return os.getenv("ENV", "local")

    @classproperty
    def inside_container(cls) -> bool:
        """Whether this process runs in a container (set by docker-compose)."""
        return os.getenv("INSIDE_CONTAINER", "false").lower() == "true"

    @classproperty
    def database_url(cls) -> str:
        """Get the psycopg 3 database URL built from `POSTGRES_*` variables.

        With `ENV=local`, the host is derived: `postgres` (the compose service
        name) inside a container, `localhost` otherwise. Any other environment
        requires `POSTGRES_HOST`.

        Raises:
            KeyError: If `ENV` is not "local" and `POSTGRES_HOST` is unset.
        """
        database_name = os.getenv("POSTGRES_DB", "")
        database_user = os.getenv("POSTGRES_USER", "")
        database_password = os.getenv("POSTGRES_PASSWORD", "")
        database_port = os.getenv("POSTGRES_PORT", "5432")

        if cls.env == "local":
            database_host = "postgres" if cls.inside_container else "localhost"
        else:
            database_host = os.environ["POSTGRES_HOST"]

        return (
            f"postgresql+psycopg://{database_user}:{database_password}"
            f"@{database_host}:{database_port}/{database_name}"
        )

    @classproperty
    def postgres_psycopg_dsn(cls) -> str:
        """Plain psycopg3 DSN for AsyncPostgresSaver."""
        return cls.database_url.replace(
            "postgresql+psycopg://", "postgresql://"
        )

    @classproperty
    def sqs_endpoint_url(cls) -> str | None:
        """Get the SQS endpoint URL, or None to use the real AWS endpoint.

        Locally this points at LocalStack; elsewhere boto3 resolves the
        endpoint from the region, so no override is needed.
        """
        if cls.env != "local":
            return None

        localstack_host = "localstack" if cls.inside_container else "localhost"
        return f"http://{localstack_host}:4566"

    @classproperty
    def log_level(cls) -> str:
        """Get the minimum log level from environment variables."""
        return os.getenv("LOG_LEVEL", "INFO")

    @classproperty
    def model_id(cls) -> str:
        """Get the chat model every session runs on, in "provider:model" form."""
        return os.getenv("MODEL_ID", "openai:gpt-5.6-luna")

    @classproperty
    def model_init_kwargs(cls) -> dict[str, dict]:
        """Extra ``init_chat_model`` kwargs for models that need non-default settings."""
        return {
            # Chat Completions rejects function tools for the gpt-5.6 family while reasoning is on;
            # the Responses API accepts both, so reasoning stays enabled. "v0" keeps reasoning
            # in additional_kwargs instead of content, where Gemini fallbacks fail to parse it.
            "openai:gpt-5.6-sol": {"use_responses_api": True, "output_version": "v0"},
            "openai:gpt-5.6-terra": {"use_responses_api": True, "output_version": "v0"},
            "openai:gpt-5.6-luna": {"use_responses_api": True, "output_version": "v0"},
        }
