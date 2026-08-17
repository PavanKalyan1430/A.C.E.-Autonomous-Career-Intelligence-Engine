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

@router.get("/profile", response_model=CanonicalCandidateProfile)
async def get_candidate_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    profile_data = await career_intelligence_service.get_canonical_candidate_profile(current_user.id, db)
    return CanonicalCandidateProfile(**profile_data)

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
