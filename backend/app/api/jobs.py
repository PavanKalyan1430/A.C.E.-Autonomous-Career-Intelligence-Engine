import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.services.job_discovery import job_discovery_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/jobs", tags=["jobs"])

class JobTrackPayload(BaseModel):
    id: Optional[str] = None
    title: str
    company_name: str
    company_industry: Optional[str] = "Technology"
    company_website: Optional[str] = "https://example.com"
    description: str
    requirements: List[str] = []
    location: Optional[str] = "Remote"
    experience: Optional[str] = "Intermediate"
    job_type: Optional[str] = "Full-time"
    remote_onsite: Optional[str] = "Remote"
    salary_range: Optional[str] = "Salary estimate unavailable"
    external_apply_url: Optional[str] = ""

@router.get("/discover")
async def discover_jobs(
    keyword: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    job_type: Optional[str] = Query(None),
    experience: Optional[str] = Query(None),
    remote_onsite: Optional[str] = Query(None),
    skills: Optional[str] = Query(None),
    salary_min: Optional[str] = Query(None),
    sort_by: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    filters = {
        "keyword": keyword,
        "location": location,
        "role": role,
        "job_type": job_type,
        "experience": experience,
        "remote_onsite": remote_onsite,
        "skills": skills,
        "salary_min": salary_min,
        "sort_by": sort_by
    }
    
    # Clean filters
    filters = {k: v.strip() for k, v in filters.items() if v and isinstance(v, str) and v.strip()}

    try:
        results = await job_discovery_service.search_and_discover_jobs(
            user_id=current_user.id,
            filters=filters,
            page=page,
            limit=limit,
            db=db
        )
        return results
    except ValueError as e:
        logger.warning(f"Adzuna config error: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Job discovery service is currently unconfigured. Please contact support."
        )
    except RuntimeError as e:
        logger.error(f"Adzuna upstream/network error: {e}")
        # Identify timeouts or API response errors and route them cleanly
        err_str = str(e).lower()
        if "timeout" in err_str or "connection" in err_str:
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="Connection to the job provider timed out. Please try again."
            )
        elif "status code 401" in err_str or "status code 403" in err_str:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Authentication failed with the job provider."
            )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to retrieve jobs from the provider. Please try again later."
        )
    except Exception as e:
        logger.exception(f"Unhandled error in discover_jobs API: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred. Please try again."
        )

@router.post("/apply")
async def apply_to_job(
    payload: JobTrackPayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return {
        "status": "success",
        "message": f"Successfully registered simulated application to {payload.title} at {payload.company_name}."
    }

@router.post("/track")
async def track_discovered_job(
    payload: JobTrackPayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        res = await job_discovery_service.track_discovered_job(
            job_data=payload.model_dump(),
            current_user=current_user,
            db=db
        )
        return res
    except Exception as e:
        logger.error(f"Error tracking dynamic job: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to track the selected job."
        )
