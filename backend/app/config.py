"""
Application settings.

Loaded from environment variables (or .env) via pydantic-settings.
Centralizes all configuration — nothing should read os.environ directly.
"""

from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


Provider = Literal["anthropic", "openrouter"]
Environment = Literal["development", "production"]


def _normalize_database_url(url: str) -> str:
    """
    Normalize Postgres URLs to the driver-qualified form SQLAlchemy expects.

    Railway (and most managed Postgres providers) hand out URLs like
    `postgres://user:pw@host/db`. SQLAlchemy 2 wants `postgresql+psycopg://...`
    so the psycopg3 driver is used explicitly.
    """
    if url.startswith("postgres://"):
        return "postgresql+psycopg://" + url[len("postgres://"):]
    if url.startswith("postgresql://") and "+psycopg" not in url:
        return "postgresql+psycopg://" + url[len("postgresql://"):]
    return url


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- Environment ---
    environment: Environment = "development"

    # --- Database ---
    database_url: str = Field(
        default="postgresql+psycopg://market:market@localhost:5432/market_assistant"
    )

    # --- Market data ---
    alpaca_api_key: str | None = None
    alpaca_secret_key: str | None = None

    # --- News ---
    finnhub_api_key: str | None = None

    # --- AI provider ---
    ai_provider: Provider = "anthropic"
    anthropic_api_key: str | None = None
    openrouter_api_key: str | None = None
    model_briefing: str | None = None      # defaults resolved in ai/client.py
    model_classifier: str | None = None

    # --- Auth ---
    jwt_secret: str = "change-me-in-env"
    jwt_algorithm: str = "HS256"
    jwt_expire_hours: int = 168  # 1 week

    # --- Bootstrap ---
    # Set once in the environment to enable the one-time /setup flow that
    # creates the first user. Unset the variable after you've used it.
    bootstrap_token: str | None = None

    # --- Server ---
    backend_host: str = "127.0.0.1"
    backend_port: int = 8000
    cors_origins: str = "http://localhost:3000"

    @field_validator("database_url")
    @classmethod
    def _normalize_db(cls, v: str) -> str:
        return _normalize_database_url(v)

    @field_validator("cors_origins")
    @classmethod
    def _keep_cors_as_string(cls, v: str) -> str:
        # We parse on use below to allow live updates without reconstructing Settings
        return v

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    def check_production_ready(self) -> None:
        """
        Raise if running in production with unsafe defaults.
        Called from main.py at startup so deploys fail fast on misconfig.
        """
        if not self.is_production:
            return
        if self.jwt_secret == "change-me-in-env" or len(self.jwt_secret) < 32:
            raise RuntimeError(
                "JWT_SECRET must be set to a random string of 32+ characters in production. "
                "Generate one with: python -c 'import secrets; print(secrets.token_urlsafe(48))'"
            )
        if not self.cors_origins_list:
            raise RuntimeError("CORS_ORIGINS must be set in production.")
        if not (self.anthropic_api_key or self.openrouter_api_key):
            raise RuntimeError(
                "At least one of ANTHROPIC_API_KEY or OPENROUTER_API_KEY must be set."
            )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


# Convenient module-level accessor for non-DI code paths (scripts, tools).
settings = get_settings()
