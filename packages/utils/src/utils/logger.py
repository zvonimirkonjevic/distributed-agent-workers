"""Process-wide logging setup built on loguru."""
import sys

from loguru import logger

LOG_FORMAT = (
    "<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | "
    "<level>{level: <8}</level> | "
    "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | "
    "<level>{message}</level>"
)


def setup_logging(level: str = "INFO") -> None:
    """Replace loguru's default handler with one using the project log format.

    Args:
        level: Minimum level to emit, e.g. "DEBUG" or "INFO".
    """
    logger.remove()
    logger.add(sys.stdout, level=level, format=LOG_FORMAT)
