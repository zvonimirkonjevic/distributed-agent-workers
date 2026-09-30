from fastapi import FastAPI

def create_app() -> FastAPI:
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
        """
        Health check endpoint to verify that the API is running.
        """
        return {"status": "healthy"}

    return app

app = create_app()