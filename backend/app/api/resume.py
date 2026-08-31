import os
import logging
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.models.user import User, Resume, Application
from app.schemas.resume import ResumeSchema
from app.services.resume_parser import ResumeParserService
from app.services.document_parser import document_parser_service
from app.services.nlp_service import production_nlp_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/resume", tags=["resume"])
parser_service = ResumeParserService()


def _sanitize_filename(filename: str) -> str:
    """
    Strip path separators and null bytes from a client-supplied filename (RES-006).
    Limits length to 255 characters. Returns a safe basename only.
    """
    # Remove null bytes
    filename = filename.replace("\x00", "")
    # Extract basename only — prevents path traversal via directory separators
    filename = os.path.basename(filename)
    # Truncate to filesystem-safe length
    return filename[:255] if filename else "resume"


@router.post("/upload", response_model=ResumeSchema)
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # 1. Read binary content — bounded read (RES-001)
    content_bytes = await file.read()
    if not content_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # 2. Enforce file size limit (RES-001)
    if len(content_bytes) > settings.MAX_RESUME_SIZE_BYTES:
        max_mb = settings.MAX_RESUME_SIZE_BYTES // (1024 * 1024)
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds the maximum allowed size of {max_mb} MB."
        )

    # 3. Validate file extension against whitelist (RES-002)
    safe_filename = _sanitize_filename(file.filename or "resume.txt")
    ext = os.path.splitext(safe_filename)[1].lower()
    if ext not in settings.ALLOWED_RESUME_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(settings.ALLOWED_RESUME_EXTENSIONS))}"
        )

    # 4. Extract clean text — magic-byte validation happens inside document_parser (RES-002)
    try:
        raw_text = await document_parser_service.extract_text(content_bytes, safe_filename)
    except ValueError as e:
        # Magic-byte mismatch or corrupt file
        raise HTTPException(status_code=415, detail=str(e))

    if not raw_text or len(raw_text.strip()) < 10:
        raise HTTPException(status_code=400, detail="Could not extract readable text from document.")

    # 5. Parse via Resume Parser Service (Gemini LLM → NLP fallback)
    parsed_data = await parser_service.parse_resume(raw_text)

    # 6. Enrich with production NLP linguistic features & TF-IDF keyphrases
    nlp_features = await production_nlp_service.extract_linguistic_features(raw_text)
    tfidf_keyphrases = await production_nlp_service.extract_tfidf_keyphrases(raw_text, top_n=10)

    parsed_dict = parsed_data.model_dump()
    parsed_dict["nlp_metadata"] = {
        "extracted_noun_chunks": nlp_features["noun_chunks"],
        "action_verbs": nlp_features["action_verbs"],
        "quantifiable_metrics": nlp_features["quantifiable_metrics"],
        "top_tfidf_keyphrases": [item["keyphrase"] for item in tfidf_keyphrases]
    }

    # 7. Build Resume row and compute application recalculations atomically (RES-003).
    #    All objects are staged under a single session; one db.commit() persists everything
    #    together. If any step fails, nothing is committed.
    db_resume = Resume(
        user_id=current_user.id,
        file_name=safe_filename,   # sanitized filename (RES-006)
        raw_text=raw_text,
        parsed_data=parsed_dict
    )
    db.add(db_resume)

    # Recompute analysis for all existing applications of this user that have JD text
    apps_result = await db.execute(
        select(Application)
        .filter(Application.user_id == current_user.id)
    )
    user_apps = apps_result.scalars().all()
    for app in user_apps:
        if app.jd_text and len(app.jd_text.strip()) > 0:
            sim_res = await production_nlp_service.compute_semantic_similarity(raw_text, app.jd_text)
            keyphrases = await production_nlp_service.extract_tfidf_keyphrases(app.jd_text, top_n=5)
            app.analysis = {
                "match_percentage": sim_res["match_percentage"],
                "cosine_score": sim_res["cosine_similarity_score"],
                "required_keyphrases": [kp["keyphrase"] for kp in keyphrases]
            }
            db.add(app)

    # Single atomic commit — resume + all application updates together (RES-003)
    await db.commit()
    await db.refresh(db_resume)

    # 8. Reconstruct response from the persisted DB state, not the in-memory parser object (RES-004)
    try:
        return ResumeSchema(**db_resume.parsed_data)
    except Exception as e:
        logger.error(f"Failed to deserialize persisted resume data: {e}")
        raise HTTPException(status_code=500, detail="Resume was saved but could not be returned as structured data.")


@router.get("/latest", response_model=ResumeSchema)
async def get_latest_resume(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Resume)
        .filter(Resume.user_id == current_user.id)
        .order_by(Resume.created_at.desc())
    )
    resume = result.scalars().first()
    if not resume:
        raise HTTPException(status_code=404, detail="No resume uploaded yet.")

    # Guard against None or malformed parsed_data (RES-005)
    if not resume.parsed_data:
        raise HTTPException(status_code=500, detail="Resume record exists but contains no parsed data.")
    try:
        return ResumeSchema(**resume.parsed_data)
    except Exception as e:
        logger.error(f"Resume parsed_data deserialization failed for user {current_user.id}: {e}")
        raise HTTPException(status_code=422, detail="Resume data is stored but could not be deserialized. Re-upload may be required.")


from app.schemas.resume import ResumeSchema, ATSAnalysisResponse, JDCompareRequest, TriggerATSAnalysisRequest
from app.services.ats_analyzer import ats_analyzer_service
from typing import Optional, List
from sqlalchemy.orm.attributes import flag_modified

# (existing imports and functions remain)

@router.post("/compare-jd")
async def compare_resume_with_jd(
    payload: JDCompareRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Read-only semantic similarity check between user's latest resume and a job description.
    Does NOT create an Application record. Returns match percentage, cosine score, and key phrases.
    """
    if not payload.jd_text or len(payload.jd_text.strip()) < 20:
        raise HTTPException(status_code=400, detail="Job description text is too short for meaningful analysis.")

    result = await db.execute(
        select(Resume)
        .filter(Resume.user_id == current_user.id)
        .order_by(Resume.created_at.desc())
    )
    latest_resume = result.scalars().first()

    if not latest_resume or not latest_resume.raw_text:
        raise HTTPException(status_code=404, detail="No resume found. Upload a resume before comparing.")

    sim_res = await production_nlp_service.compute_semantic_similarity(latest_resume.raw_text, payload.jd_text)
    keyphrases = await production_nlp_service.extract_tfidf_keyphrases(payload.jd_text, top_n=8)

    return {
        "match_percentage": sim_res["match_percentage"],
        "cosine_similarity_score": sim_res["cosine_similarity_score"],
        "required_keyphrases": [kp["keyphrase"] for kp in keyphrases]
    }


@router.get("/ats-analysis", response_model=ATSAnalysisResponse)
async def get_ats_analysis(
    target_role: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves the persisted, explainable ATS analysis breakdown for the user's latest resume.
    If no pre-existing analysis is found, returns an 'analysis_unavailable' state.
    This endpoint is read-only and never runs a new LLM analysis.
    """
    result = await db.execute(
        select(Resume)
        .filter(Resume.user_id == current_user.id)
        .order_by(Resume.created_at.desc())
    )
    latest_resume = result.scalars().first()

    if not latest_resume or not latest_resume.raw_text:
        raise HTTPException(status_code=404, detail="No resume found. Upload a resume to generate ATS analysis.")

    effective_role = target_role
    if not effective_role and current_user.profile:
        effective_role = current_user.profile.target_role
    if not effective_role and current_user.preferences and isinstance(current_user.preferences, dict):
        effective_role = current_user.preferences.get("target_role")

    if not effective_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target role not specified. Please specify a target role."
        )

    role_key = effective_role.strip().lower()
    if latest_resume.ats_analysis and role_key in latest_resume.ats_analysis:
        return ATSAnalysisResponse(**latest_resume.ats_analysis[role_key])

    # Fallback/Empty State: Return structured unavailable state
    unavailable_res = ats_analyzer_service._build_unavailable_response(effective_role)
    return ATSAnalysisResponse(**unavailable_res)


@router.post("/ats-analysis", response_model=ATSAnalysisResponse)
async def trigger_ats_analysis(
    payload: TriggerATSAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Triggers a fresh ATS analysis run for the user's latest resume against the target role.
    Persists the resulting analysis in the database under the resume model.
    """
    result = await db.execute(
        select(Resume)
        .filter(Resume.user_id == current_user.id)
        .order_by(Resume.created_at.desc())
    )
    latest_resume = result.scalars().first()

    if not latest_resume or not latest_resume.raw_text:
        raise HTTPException(status_code=404, detail="No resume found. Upload a resume to generate ATS analysis.")

    effective_role = payload.target_role.strip()
    if not effective_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target role cannot be empty."
        )

    # Query user applications to see if there is an application for this role with a JD
    app_result = await db.execute(
        select(Application)
        .filter(Application.user_id == current_user.id)
        .order_by(Application.created_at.desc())
    )
    apps = app_result.scalars().all()
    jd_text = None
    matching_app = next((a for a in apps if a.role_title.lower() == effective_role.lower() and a.jd_text), None)
    if matching_app:
        jd_text = matching_app.jd_text

    analysis_res = await ats_analyzer_service.analyze_resume_ats(
        raw_text=latest_resume.raw_text,
        parsed_data=latest_resume.parsed_data or {},
        target_role=effective_role,
        jd_text=jd_text
    )

    if analysis_res.get("status") == "success":
        if latest_resume.ats_analysis is None:
            latest_resume.ats_analysis = {}
        latest_resume.ats_analysis[effective_role.lower()] = analysis_res
        flag_modified(latest_resume, "ats_analysis")
        db.add(latest_resume)
        await db.commit()
        await db.refresh(latest_resume)
    else:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="LLM reasoning service is currently rate-limited or unavailable. Please retry."
        )

    return ATSAnalysisResponse(**analysis_res)


