from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.services.company_intelligence import CompanyIntelligenceService

router = APIRouter(prefix="/company", tags=["company"])
company_service = CompanyIntelligenceService()

@router.get("/{company_name}")
async def get_company_insights(
    company_name: str,
    current_user: User = Depends(get_current_user)
):
    try:
        insights = await company_service.get_company_insights(company_name)
        return insights
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
