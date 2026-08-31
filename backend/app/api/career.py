import logging
from fastapi import APIRouter, Depends, HTTPException, status
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
async def search_roles(
    q: str,
    country: str = "in",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not q or len(q.strip()) < 2:
        return []
    from app.services.occupation_provider import (
        occupation_service,
        OccupationProviderCredentialError,
        OccupationProviderAPIError,
        OccupationProviderUnavailableError
    )
    try:
        return await occupation_service.search_roles(q, country=country)
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

@router.post("/refresh", response_model=CareerIntelligenceResponse)
async def refresh_career_intelligence(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    intel_data = await career_intelligence_service.generate_career_intelligence(current_user.id, db)
    return CareerIntelligenceResponse(**intel_data)
