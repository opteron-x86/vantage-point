"""
Password hashing using bcrypt directly.

We dropped passlib because its last release was 2020 and it's now
incompatible with modern bcrypt versions. Using bcrypt directly is a
few more lines but avoids a whole class of future surprises.

Bcrypt has a 72-byte limit on passwords. We enforce it explicitly
rather than silently truncating — silent truncation masks weak
passwords (two 80-char passwords that differ only after byte 72 hash
identically).
"""

import bcrypt


MAX_PASSWORD_BYTES = 72


class PasswordTooLong(ValueError):
    """Raised when a password exceeds bcrypt's 72-byte limit."""


def hash_password(password: str) -> str:
    password_bytes = password.encode("utf-8")
    if len(password_bytes) > MAX_PASSWORD_BYTES:
        raise PasswordTooLong(
            f"Password is {len(password_bytes)} bytes; bcrypt's maximum is {MAX_PASSWORD_BYTES}."
        )
    hashed = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        plain_bytes = plain.encode("utf-8")
        if len(plain_bytes) > MAX_PASSWORD_BYTES:
            return False
        return bcrypt.checkpw(plain_bytes, hashed.encode("utf-8"))
    except (ValueError, TypeError):
        # Malformed hash — treat as non-match rather than crashing
        return False
