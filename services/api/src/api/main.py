"""API gateway entrypoint; `app` is served by uvicorn."""
from fastapi import FastAPI

from api.routers import sessions
from core.database import init_db
from utils.config import Config
from utils.logger import setup_logging


def create_app() -> FastAPI:
    """Configure logging, initialize the database, and build the FastAPI app.

    Returns:
        The configured application with all routes registered.
    """
    setup_logging(level=Config.log_level)

    init_db(Config.database_url)

    app = FastAPI(
        title="Distributed Agent Workers API",
        description=(
            "The single gateway of this open-source practice project for "
            "generating agent answers on workers and keeping chats intact with Postgres "
            "pub/sub. Built to run locally, single-user, with no authentication.\n\n"
            "- **Request/response** endpoints (chat sessions) are called server-to-server "
            "by the Next.js app: Server Components for reads, Server Actions for "
            "mutations.\n"
            "- **Agent runs** are enqueued to SQS and executed by an isolated worker pool; "
            "this gateway never runs agent code itself.\n"
            "- **Streaming**: the browser opens a WebSocket directly to this gateway, which "
            "forwards tokens and state transitions received via Postgres LISTEN/NOTIFY."
        ),
        version="1.0.0"
    )

    @app.get("/health", tags=["Health"])
    async def health_check():
        """Report that the API process is up and serving requests."""
        return {"status": "healthy"}

    app.include_router(sessions.router)

    return app

app = create_app()