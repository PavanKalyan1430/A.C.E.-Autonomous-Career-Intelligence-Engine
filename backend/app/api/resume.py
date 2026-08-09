from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User, Resume
from app.schemas.resume import ResumeSchema
from app.services.resume_parser import ResumeParserService
from app.services.document_parser import document_parser_service
from app.services.nlp_service import production_nlp_service

router = APIRouter(prefix="/resume", tags=["resume"])
parser_service = ResumeParserService()

@router.post("/upload", response_model=ResumeSchema)
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # 1. Read binary content
    content_bytes = await file.read()
    if not content_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # 2. Extract clean text using multi-format document parser (PDF, DOCX, TXT)
    raw_text = await document_parser_service.extract_text(content_bytes, file.filename)
    if not raw_text or len(raw_text.strip()) < 10:
        raise HTTPException(status_code=400, detail="Could not extract readable text from document.")

    # 3. Parse via Resume Parser Service
    parsed_data = await parser_service.parse_resume(raw_text)

    # 4. Enrich parsed data with production NLP linguistic features & TF-IDF keyphrases
    nlp_features = production_nlp_service.extract_linguistic_features(raw_text)
    tfidf_keyphrases = production_nlp_service.extract_tfidf_keyphrases(raw_text, top_n=10)
    
    parsed_dict = parsed_data.model_dump()
    parsed_dict["nlp_metadata"] = {
        "extracted_noun_chunks": nlp_features["noun_chunks"],
        "action_verbs": nlp_features["action_verbs"],
        "quantifiable_metrics": nlp_features["quantifiable_metrics"],
        "top_tfidf_keyphrases": [item["keyphrase"] for item in tfidf_keyphrases]
    }

    # 5. Save to Database
    db_resume = Resume(
        user_id=current_user.id,
        file_name=file.filename,
        raw_text=raw_text,
        parsed_data=parsed_dict
    )
    db.add(db_resume)
    await db.commit()
    await db.refresh(db_resume)

    return parsed_data

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
    return ResumeSchema(**resume.parsed_data)
