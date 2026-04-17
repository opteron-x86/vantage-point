"""
SQLAlchemy engine + session factory.

We use the modern 2.0-style API. Routes get a session via FastAPI's
dependency injection (see api/deps.py); services accept a Session
parameter rather than creating their own.
"""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import settings


engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,   # Verify connections before using (handles idle disconnects)
    pool_size=5,
    max_overflow=10,
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency: yields a session, guarantees cleanup."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
