import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.career import (
    CareerIntelligenceResponse, CanonicalCandidateProfile, SkillAlignment
)
from app.services.career_intelligence import career_intelligence_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/career", tags=["career"])

import json
from sqlalchemy.future import select
from app.models.user import Job, Profile, LearningCompletion

@router.get("/profile", response_model=CanonicalCandidateProfile)
async def get_candidate_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    profile_data = await career_intelligence_service.get_canonical_candidate_profile(current_user.id, db)
    return CanonicalCandidateProfile(**profile_data)

@router.get("/roles/search")
@router.get("/roles/suggest")
async def search_roles(
    q: Optional[str] = Query(None),
    query: Optional[str] = Query(None),
    country: str = "in",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    search_query = q or query or ""
    if not search_query or len(search_query.strip()) < 2:
        return []
    from app.services.occupation_provider import (
        occupation_service,
        OccupationProviderCredentialError,
        OccupationProviderAPIError,
        OccupationProviderUnavailableError
    )
    try:
        return await occupation_service.search_roles(search_query, country=country)
    except OccupationProviderCredentialError as e:
        logger.warning(f"Adzuna credential/authorization error: {e}")
        reason = "credentials_invalid" if "auth" in str(e).lower() else "credentials_missing_or_invalid"
        message = "Role suggestions temporarily unavailable." if reason == "credentials_invalid" else "Role suggestions temporarily unavailable (provider credentials unconfigured)."
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "status": "unconfigured" if reason == "credentials_missing_or_invalid" else "unauthorized",
                "message": message,
                "reason": reason
            }
        )
    except OccupationProviderAPIError as e:
        logger.error(f"Adzuna API status error: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "status": "api_error",
                "message": "Role suggestions temporarily unavailable.",
                "reason": "upstream_api_failed"
            }
        )
    except OccupationProviderUnavailableError as e:
        logger.error(f"Adzuna network/connection error: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "status": "unavailable",
                "message": "Role suggestions temporarily unavailable.",
                "reason": "network_connection_failed"
            }
        )

@router.get("/intelligence", response_model=CareerIntelligenceResponse)
async def get_career_intelligence(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    intel_data = await career_intelligence_service.generate_career_intelligence(current_user.id, db)
    return CareerIntelligenceResponse(**intel_data)

from sqlalchemy.exc import IntegrityError
from app.models.user import Job, Profile, LearningCompletion, Roadmap, RoadmapNode

@router.put("/skills/complete")
@router.put("/skills/{node_id}/completion")
async def toggle_skill_completion(
    payload: Optional[dict] = None,
    node_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    payload = payload or {}
    raw_node_id = payload.get("roadmap_node_id") or payload.get("node_id") or node_id
    completed = payload.get("completed", True)
    skill_name = payload.get("skill_name")

    if raw_node_id is None:
        raise HTTPException(status_code=400, detail="roadmap_node_id is required")

    if not isinstance(completed, bool):
        raise HTTPException(status_code=400, detail="completed boolean is required")

    roadmap_node = None
    if raw_node_id is not None:
        try:
            node_pk = int(raw_node_id)
            res_node = await db.execute(
                select(RoadmapNode)
                .join(Roadmap)
                .filter(RoadmapNode.id == node_pk)
                .filter(Roadmap.user_id == current_user.id)
            )
            roadmap_node = res_node.scalars().first()
        except ValueError:
            res_node = await db.execute(
                select(RoadmapNode)
                .join(Roadmap)
                .filter(RoadmapNode.skill_id == str(raw_node_id))
                .filter(Roadmap.user_id == current_user.id)
            )
            roadmap_node = res_node.scalars().first()

    if not roadmap_node:
        raise HTTPException(status_code=404, detail="Roadmap node not found or unauthorized")

    # Authoritative Ownership Verification
    res_rm = await db.execute(select(Roadmap).filter(Roadmap.id == roadmap_node.roadmap_id))
    roadmap = res_rm.scalars().first()
    if not roadmap or roadmap.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden: You do not own this roadmap node")

    # Idempotent DB state mutation
    res_comp = await db.execute(
        select(LearningCompletion)
        .filter(LearningCompletion.user_id == current_user.id)
        .filter(LearningCompletion.roadmap_node_id == roadmap_node.id)
    )
    existing_completion = res_comp.scalars().first()

    if completed:
        if not existing_completion:
            new_comp = LearningCompletion(
                user_id=current_user.id,
                roadmap_node_id=roadmap_node.id,
                skill_name=roadmap_node.skill_name
            )
            db.add(new_comp)
    else:
        if existing_completion:
            await db.delete(existing_completion)

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()

    # Recompute intelligence dynamically with NetworkX graph engine
    intel_data = await career_intelligence_service.generate_career_intelligence(current_user.id, db, force_refresh=False)
    return {
        "status": "success",
        "is_completed": completed,
        "roadmap_node_id": roadmap_node.id,
        "intelligence": intel_data
    }

@router.post("/refresh", response_model=CareerIntelligenceResponse)
async def refresh_career_intelligence(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    intel_data = await career_intelligence_service.generate_career_intelligence(current_user.id, db, force_refresh=True)
    return CareerIntelligenceResponse(**intel_data)
