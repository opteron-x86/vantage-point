"""
FastAPI application entry point.

Run locally with:
    uvicorn app.main:app --reload

In production (Railway), `entrypoint.sh` runs Alembic migrations then execs
uvicorn with --proxy-headers so X-Forwarded-* is trusted from Railway's edge.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import api_router
from app.config import settings
from app.scheduler import start_scheduler, stop_scheduler


logger = logging.getLogger("app")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Fail fast on production misconfig
    settings.check_production_ready()

    # Startup — wrap scheduler start in a try/except so a bad job config
    # doesn't take down the whole API
    try:
        start_scheduler()
    except Exception as e:
        logger.exception("Failed to start scheduler: %s", e)

    yield

    # Shutdown
    try:
        stop_scheduler()
    except Exception as e:
        logger.exception("Failed to stop scheduler: %s", e)


app = FastAPI(
    title="Vantage Point",
    version="0.1.0",
    description="Personal trading research assistant — FastAPI backend",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(ValueError)
async def value_error_handler(_request: Request, exc: ValueError) -> JSONResponse:
    """Treat unhandled ValueErrors from services as 400s."""
    return JSONResponse(status_code=400, content={"detail": str(exc)})


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness probe. Railway hits this before routing traffic."""
    return {"status": "ok"}


@app.get("/")
def root() -> dict[str, str]:
    """Friendly landing for anyone hitting the backend URL directly."""
    return {
        "service": "vantage-point-backend",
        "docs": "/docs",
        "health": "/health",
    }


app.include_router(api_router)
