"""
Unified database client.
Single engine/session management for all database operations.
"""
from contextlib import contextmanager
from loguru import logger

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from core.database.models import Base


# Module level singletons
_engine, _Session = None, None


def init_db(connection_string: str):
    """
    Initialize database. Call once at app startup.
    """

    logger.info("Initializing database...")
    global _engine, _Session

    _engine = create_engine(
        connection_string,
        pool_pre_ping=True,
    )

    _Session = sessionmaker(bind=_engine)

    Base.metadata.create_all(_engine)
    logger.info("Database initialized successfully.")


def get_engine():
    """Get the SQLAlchemy engine."""
    if _engine is None:
        raise RuntimeError("Database engine is not initialized. Call init_db() first.")
    return _engine


def get_session():
    """Get a new SQLAlchemy session."""
    if _Session is None:
        raise RuntimeError("Database session is not initialized. Call init_db() first.")
    return _Session()


@contextmanager
def session_scope():
    """Context manager for a SQLAlchemy session."""
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