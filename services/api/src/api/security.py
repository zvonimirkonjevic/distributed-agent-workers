"""Password hashing for user credentials."""
from pwdlib import PasswordHash

_password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    """Hash a plaintext password with the recommended algorithm (Argon2id).

    Args:
        password: Plaintext password.

    Returns:
        The encoded hash, including algorithm parameters and salt.
    """
    return _password_hash.hash(password)
