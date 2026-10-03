"""User persistence: CRUD operations on the `users` table."""
from .crud import (
    create_user,
    delete_user,
    get_user,
    get_user_by_email,
    update_user,
)

__all__ = [
    "create_user",
    "delete_user",
    "get_user",
    "get_user_by_email",
    "update_user",
]
