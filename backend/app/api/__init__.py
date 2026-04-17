"""
API routes.

Each domain has its own module with a FastAPI APIRouter. The root router
is assembled in `main.py` and mounted under /api.
"""

from fastapi import APIRouter

from app.api import (
    admin,
    ai_settings,
    auth,
    briefing,
    chat,
    journal,
    logs,
    market,
    settings,
    watchlist,
)

api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(watchlist.router, prefix="/watchlist", tags=["watchlist"])
api_router.include_router(market.router, prefix="/market", tags=["market"])
api_router.include_router(briefing.router, prefix="/briefings", tags=["briefings"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(logs.router, prefix="/logs", tags=["logs"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(journal.router, prefix="/journal", tags=["journal"])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])
api_router.include_router(ai_settings.router, prefix="/ai-settings", tags=["ai-settings"])
