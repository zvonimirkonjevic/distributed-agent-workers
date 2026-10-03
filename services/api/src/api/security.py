"""Password hashing and verification for user credentials."""
from pwdlib import PasswordHash

_password_hash = PasswordHash.recommended()
# Verified against when the email is unknown, so a failed login takes the same
# time whether or not the account exists and timing cannot enumerate emails.
_DUMMY_HASH = _password_hash.hash("dummy-password")


def hash_password(password: str) -> str:
    """Hash a plaintext password with the recommended algorithm (Argon2id).

    Args:
        password: Plaintext password.

    Returns:
        The encoded hash, including algorithm parameters and salt.
    """
    return _password_hash.hash(password)


def verify_password(password: str, hashed_password: str | None) -> bool:
    """Check a plaintext password against a stored hash in constant time.

    Args:
        password: Plaintext password from the login request.
        hashed_password: Stored hash, or None if no user matched the email.

    Returns:
        True if the password matches; always False when `hashed_password`
        is None, after doing the same hashing work as a real check.
    """
    if hashed_password is None:
        _password_hash.verify(password, _DUMMY_HASH)
        return False
    return _password_hash.verify(password, hashed_password)
