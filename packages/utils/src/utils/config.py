import os
from typing import Any, Callable


class classproperty[T]:
    """Like @property, but read from the class itself: Config.database_url."""

    def __init__(self, fget: Callable[[Any], T]):
        self.fget = fget

    def __get__(self, instance: Any, owner: type) -> T:
        return self.fget(owner)


class Config:
    """Configuration class for managing application settings."""

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
        """Get the database URL from environment variables."""
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
    def log_level(cls) -> str:
        """Get the minimum log level from environment variables."""
        return os.getenv("LOG_LEVEL", "INFO")
