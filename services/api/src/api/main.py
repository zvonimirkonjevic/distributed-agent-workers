"""API gateway entrypoint; `app` is served by uvicorn."""
from fastapi import FastAPI

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
            "API gateway for a distributed agentic dispatch engine. Accepts agent jobs, "
            "enqueues them to SQS for execution by an isolated worker pool, and streams "
            "progress back to clients over WebSockets via Postgres LISTEN/NOTIFY."
        ),
        version="1.0.0"
    )

    @app.get("/health", tags=["Health"])
    async def health_check():
        """Report that the API process is up and serving requests."""
        return {"status": "healthy"}

    return app

app = create_app()