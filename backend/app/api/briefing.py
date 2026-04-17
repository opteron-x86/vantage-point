"""Briefing endpoints."""

from fastapi import APIRouter, HTTPException, Query

from app.ai.logged_client import get_logged_client
from app.api.deps import CurrentUser, DbSession
from app.schemas.briefing import BriefingOut, BriefingSummary, GenerateBriefingResult
from app.services import briefing as briefing_service

router = APIRouter()


@router.get("", response_model=list[BriefingSummary])
def list_briefings(
    db: DbSession, user: CurrentUser, limit: int = Query(30, ge=1, le=100)
) -> list[BriefingSummary]:
    items = briefing_service.list_briefings(db, user_id=user.id, limit=limit)
    return [BriefingSummary.model_validate(b) for b in items]


@router.get("/{briefing_id}", response_model=BriefingOut)
def get_briefing(
    briefing_id: int, db: DbSession, user: CurrentUser
) -> BriefingOut:
    b = briefing_service.get_briefing(db, user_id=user.id, briefing_id=briefing_id)
    if b is None:
        raise HTTPException(status_code=404, detail="Briefing not found")
    return BriefingOut.model_validate(b)


@router.post("/generate", response_model=GenerateBriefingResult)
def generate_briefing(
    db: DbSession, user: CurrentUser
) -> GenerateBriefingResult:
    client = get_logged_client(db=db, user_id=user.id)
    result = briefing_service.generate_briefing(db, client, user_id=user.id)
    if "error" in result and "id" not in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return GenerateBriefingResult(**result)
