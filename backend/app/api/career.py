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
from app.models.user import Job

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

@router.post("/skills/complete")
async def toggle_skill_completion(
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    skill_name = payload.get("skill_name")
    if not skill_name or not isinstance(skill_name, str):
        raise HTTPException(status_code=400, detail="skill_name is required")
        
    res_prof = await db.execute(select(Profile).filter(Profile.user_id == current_user.id))
    profile = res_prof.scalars().first()
    if not profile:
        profile = Profile(user_id=current_user.id)
        db.add(profile)
        
    current_skills_json = profile.skills_json or {"skills": []}
    skills_list = list(current_skills_json.get("skills", []))
    
    # Toggle skill in verified list (case-insensitive check)
    existing_match = next((s for s in skills_list if s.lower() == skill_name.strip().lower()), None)
    if existing_match:
        skills_list.remove(existing_match)
        is_completed = False
    else:
        skills_list.append(skill_name.strip())
        is_completed = True
        
    profile.skills_json = {"skills": skills_list}
    await db.commit()
    await db.refresh(profile)
    
    # Generate updated intelligence
    intel_data = await career_intelligence_service.generate_career_intelligence(current_user.id, db)
    return {"status": "success", "is_completed": is_completed, "intelligence": intel_data}

@router.post("/refresh", response_model=CareerIntelligenceResponse)
async def refresh_career_intelligence(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    intel_data = await career_intelligence_service.generate_career_intelligence(current_user.id, db)
    return CareerIntelligenceResponse(**intel_data)
