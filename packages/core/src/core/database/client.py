"""Unified database client.

Holds a process-wide SQLAlchemy engine and session factory, created by
`init_db`. Each process (API or forked worker) must call `init_db` itself so
it owns its connections instead of inheriting them across a fork.
"""
from contextlib import contextmanager
from loguru import logger

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from langgraph.checkpoint.postgres import PostgresSaver

from core.database.models import Base


# Module level singletons
_engine, _Session = None, None


def init_db(connection_string: str):
    """Create the engine and session factory, then create any missing tables.

    Call once per process at startup, before any other function here.

    Args:
        connection_string: SQLAlchemy URL, e.g. "postgresql+psycopg://...".
    """

    logger.info("Initializing database...")
    global _engine, _Session

    _engine = create_engine(
        connection_string,
        pool_pre_ping=True,
    )

    # Objects returned from a committed, closed `session_scope` must stay
    # readable; expiring them on commit would force a reload on a dead session.
    _Session = sessionmaker(bind=_engine, expire_on_commit=False)

    Base.metadata.create_all(_engine)
    logger.info("Database initialized successfully.")


def init_checkpointer_schema(connection_string: str):
    """Create or migrate the LangGraph checkpoint tables.

    Run once from a single process (the API at startup), never from every
    worker: concurrent runs race on `checkpoint_migrations` inserts.

    Args:
        connection_string: SQLAlchemy URL, e.g. "postgresql+psycopg://...".
    """
    logger.info("Initializing checkpointer schema...")

    # psycopg only accepts libpq URIs, not SQLAlchemy's `+driver` suffix.
    conninfo = connection_string.replace("postgresql+psycopg://", "postgresql://", 1)
    with PostgresSaver.from_conn_string(conninfo) as saver:
        saver.setup()

    logger.info("Checkpointer schema initialized successfully.")


def get_engine():
    """Get the process-wide SQLAlchemy engine.

    Returns:
        The engine created by `init_db`.

    Raises:
        RuntimeError: If `init_db` has not been called.
    """
    if _engine is None:
        raise RuntimeError("Database engine is not initialized. Call init_db() first.")
    return _engine


def get_session():
    """Create a new SQLAlchemy session.

    The caller owns the session and must commit and close it. Prefer
    `session_scope`, which does both.

    Returns:
        A new session bound to the process-wide engine.

    Raises:
        RuntimeError: If `init_db` has not been called.
    """
    if _Session is None:
        raise RuntimeError("Database session is not initialized. Call init_db() first.")
    return _Session()


@contextmanager
def session_scope():
    """Provide a transactional session scope.

    Commits on normal exit, rolls back and re-raises on exception, and
    always closes the session.

    Yields:
        A new session bound to the process-wide engine.

    Raises:
        RuntimeError: If `init_db` has not been called.
    """
    session = get_session()
    try:
        yield session
        session.commit()
    except Exception as e:
        session.rollback()
        logger.error(f"Session rollback due to exception: {e}")
        raise
    finally:
        session.close()