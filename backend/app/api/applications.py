import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User, Application, Resume, ApplicationStatus
from app.schemas.application import ApplicationCreate, ApplicationUpdate, ApplicationResponse
from app.services.nlp_service import production_nlp_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/applications", tags=["applications"])

@router.post("/", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
async def create_application(
    payload: ApplicationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    analysis_data = None
    
    # Run dynamic vector similarity analysis if JD text is provided and candidate has resume
    if payload.jd_text:
        res_result = await db.execute(
            select(Resume)
            .filter(Resume.user_id == current_user.id)
            .order_by(Resume.created_at.desc())
        )
        latest_resume = res_result.scalars().first()
        if latest_resume and latest_resume.raw_text:
            sim_res = await production_nlp_service.compute_semantic_similarity(latest_resume.raw_text, payload.jd_text)
            keyphrases = await production_nlp_service.extract_tfidf_keyphrases(payload.jd_text, top_n=5)
            analysis_data = {
                "match_percentage": sim_res["match_percentage"],
                "cosine_score": sim_res["cosine_similarity_score"],
                "required_keyphrases": [kp["keyphrase"] for kp in keyphrases]
            }

    app_record = Application(
        user_id=current_user.id,
        company_name=payload.company_name,
        role_title=payload.role_title,
        status=payload.status.value if payload.status else ApplicationStatus.APPLIED.value,
        jd_text=payload.jd_text,
        analysis=analysis_data
    )
    db.add(app_record)
    await db.commit()
    await db.refresh(app_record)
    return app_record

@router.get("/", response_model=List[ApplicationResponse])
async def list_applications(
    status_filter: Optional[ApplicationStatus] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Application).filter(Application.user_id == current_user.id)
    if status_filter:
        query = query.filter(Application.status == status_filter.value)
    
    query = query.order_by(Application.created_at.desc())
    result = await db.execute(query)
    return list(result.scalars().all())

@router.get("/{application_id}", response_model=ApplicationResponse)
async def get_application(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Application)
        .filter(Application.id == application_id, Application.user_id == current_user.id)
    )
    app_record = result.scalars().first()
    if not app_record:
        raise HTTPException(status_code=404, detail="Application not found.")
    return app_record

@router.patch("/{application_id}", response_model=ApplicationResponse)
async def update_application(
    application_id: int,
    payload: ApplicationUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Application)
        .filter(Application.id == application_id, Application.user_id == current_user.id)
    )
    app_record = result.scalars().first()
    if not app_record:
        raise HTTPException(status_code=404, detail="Application not found.")

    update_data = payload.model_dump(exclude_unset=True)
    
    if "status" in update_data:
        app_record.status = update_data["status"].value if update_data["status"] else None
    if "company_name" in update_data:
        app_record.company_name = update_data["company_name"]
    if "role_title" in update_data:
        app_record.role_title = update_data["role_title"]
        
    if "jd_text" in update_data:
        new_jd = update_data["jd_text"]
        app_record.jd_text = new_jd
        
        # Recompute analysis if new JD text is provided and user has a resume
        if new_jd and len(new_jd.strip()) > 0:
            res_result = await db.execute(
                select(Resume)
                .filter(Resume.user_id == current_user.id)
                .order_by(Resume.created_at.desc())
            )
            latest_resume = res_result.scalars().first()
            if latest_resume and latest_resume.raw_text:
                sim_res = await production_nlp_service.compute_semantic_similarity(latest_resume.raw_text, new_jd)
                keyphrases = await production_nlp_service.extract_tfidf_keyphrases(new_jd, top_n=5)
                app_record.analysis = {
                    "match_percentage": sim_res["match_percentage"],
                    "cosine_score": sim_res["cosine_similarity_score"],
                    "required_keyphrases": [kp["keyphrase"] for kp in keyphrases]
                }
            else:
                app_record.analysis = None
        else:
            app_record.analysis = None

    db.add(app_record)
    await db.commit()
    await db.refresh(app_record)
    return app_record

@router.delete("/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_application(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Application)
        .filter(Application.id == application_id, Application.user_id == current_user.id)
    )
    app_record = result.scalars().first()
    if not app_record:
        raise HTTPException(status_code=404, detail="Application not found.")

    await db.delete(app_record)
    await db.commit()
