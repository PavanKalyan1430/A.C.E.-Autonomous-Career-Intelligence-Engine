import datetime
import logging
import re
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User, Company, Application, ApplicationStatus, Resume
from app.services.job_discovery import job_discovery_service
from app.services.nlp_service import production_nlp_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/jobs", tags=["jobs"])

class JobTrackPayload(BaseModel):
    id: Optional[str] = None
    title: str
    company_name: str
    company_industry: Optional[str] = "Technology"
    company_website: Optional[str] = "https://example.com"
    description: Optional[str] = ""
    requirements: List[str] = []
    location: Optional[str] = "Remote"
    experience: Optional[str] = "Intermediate"
    job_type: Optional[str] = "Full-time"
    remote_onsite: Optional[str] = "Remote"
    salary_range: Optional[str] = "Salary estimate unavailable"
    external_apply_url: Optional[str] = ""

def is_valid_http_url(url: Optional[str]) -> bool:
    if not url or not isinstance(url, str):
        return False
    clean_url = url.strip()
    return clean_url.startswith("http://") or clean_url.startswith("https://")

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
    url = payload.external_apply_url
    if not is_valid_http_url(url):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Application link unavailable for this position."
        )

    return {
        "success": True,
        "action": "external_application_handoff",
        "external_apply_url": url.strip(),
        "requires_user_confirmation": True
    }

@router.post("/confirm-apply")
async def confirm_applied_to_job(
    payload: JobTrackPayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        # Check if an existing application/tracking record exists for user + company + title
        stmt = select(Application).filter(
            Application.user_id == current_user.id,
            Application.company_name == payload.company_name,
            Application.role_title == payload.title
        )
        res = await db.execute(stmt)
        existing_app = res.scalars().first()

        now = datetime.datetime.utcnow()

        if existing_app:
            existing_app.status = ApplicationStatus.APPLIED.value
            existing_app.applied_at = now
            existing_app.application_source = "EXTERNAL_USER_CONFIRMED"
            if payload.external_apply_url:
                existing_app.external_apply_url = payload.external_apply_url
            if payload.location:
                existing_app.location = payload.location

            await db.commit()
            await db.refresh(existing_app)
            return {
                "status": "success",
                "message": f"ACE recorded your application to {payload.title} at {payload.company_name}.",
                "application_id": existing_app.id,
                "applied_at": existing_app.applied_at.isoformat() if existing_app.applied_at else None
            }

        # Otherwise create new application record
        # Find or create company
        c_stmt = select(Company).filter(Company.name == payload.company_name)
        c_res = await db.execute(c_stmt)
        company = c_res.scalars().first()

        if not company:
            company = Company(
                name=payload.company_name,
                industry=payload.company_industry or "Technology",
                website=payload.company_website or "https://example.com",
                tech_stack=payload.requirements or []
            )
            db.add(company)
            await db.flush()

        # Compute semantic match analysis if user has a resume
        res_stmt = select(Resume).filter(Resume.user_id == current_user.id).order_by(Resume.created_at.desc())
        res_res = await db.execute(res_stmt)
        latest_resume = res_res.scalars().first()

        analysis_data = None
        jd_text = f"{payload.title}\n{payload.description or ''}"
        
        if latest_resume and latest_resume.raw_text:
            sim_res = await production_nlp_service.compute_semantic_similarity(latest_resume.raw_text, jd_text)
            keyphrases = await production_nlp_service.extract_tfidf_keyphrases(jd_text, top_n=5)
            analysis_data = {
                "match_percentage": sim_res["match_percentage"],
                "cosine_score": sim_res["cosine_similarity_score"],
                "required_keyphrases": [kp["keyphrase"] for kp in keyphrases]
            }

        app_record = Application(
            user_id=current_user.id,
            company_name=payload.company_name,
            role_title=payload.title,
            status=ApplicationStatus.APPLIED.value,
            applied_at=now,
            application_source="EXTERNAL_USER_CONFIRMED",
            external_apply_url=payload.external_apply_url or "",
            location=payload.location or "Remote",
            jd_text=jd_text,
            analysis=analysis_data
        )

        db.add(app_record)
        await db.commit()
        await db.refresh(app_record)

        return {
            "status": "success",
            "message": f"ACE recorded your application to {payload.title} at {payload.company_name}.",
            "application_id": app_record.id,
            "applied_at": app_record.applied_at.isoformat() if app_record.applied_at else None
        }
    except Exception as e:
        logger.error(f"Error confirming application: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to record application confirmation."
        )

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

