"""
Bootstrap the first (or any additional) user.

Usage:
    python -m scripts.create_user                     # interactive
    python -m scripts.create_user --username alice    # prompts for password only

Non-interactive (useful from Railway Shell or CI):
    USERNAME=alice PASSWORD=... python -m scripts.create_user --non-interactive
"""

import argparse
import getpass
import os
import sys

from app.db.session import SessionLocal
from app.services import users


def _read_password(prompt: str) -> str:
    """
    getpass works when stdin is a TTY. Railway's web Shell sometimes isn't,
    in which case we fall back to a visible prompt (with a warning).
    """
    try:
        return getpass.getpass(prompt)
    except (EOFError, OSError):
        print(
            "(No TTY detected — password input will be visible. "
            "Use the env-var flow for non-interactive runs.)",
            file=sys.stderr,
        )
        return input(prompt)


def main() -> int:
    parser = argparse.ArgumentParser(description="Create a user.")
    parser.add_argument("--username", help="Username (will prompt if omitted)")
    parser.add_argument(
        "--non-interactive",
        action="store_true",
        help="Read USERNAME and PASSWORD from environment.",
    )
    args = parser.parse_args()

    if args.non_interactive:
        username = os.environ.get("USERNAME", "").strip()
        password = os.environ.get("PASSWORD", "")
        if not username or not password:
            print("--non-interactive requires USERNAME and PASSWORD env vars.")
            return 1
    else:
        username = args.username or input("Username: ").strip()
        if not username:
            print("Username is required.")
            return 1

        password = _read_password("Password: ")
        confirm = _read_password("Confirm password: ")
        if password != confirm:
            print("Passwords don't match.")
            return 1

    if len(password) < 8:
        print("Password must be at least 8 characters.")
        return 1
    if len(password.encode("utf-8")) > 72:
        print("Password must be 72 bytes or fewer (bcrypt limit).")
        return 1

    with SessionLocal() as db:
        try:
            user = users.create_user(db, username=username, password=password)
        except ValueError as e:
            print(f"Error: {e}")
            return 1

    print(f"Created user '{user.username}' (id={user.id})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
