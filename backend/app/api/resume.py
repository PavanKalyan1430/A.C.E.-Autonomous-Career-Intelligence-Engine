from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User, Resume
from app.schemas.resume import ResumeSchema
from app.services.resume_parser import ResumeParserService

router = APIRouter(prefix="/resume", tags=["resume"])
parser_service = ResumeParserService()

@router.post("/upload", response_model=ResumeSchema)
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Read raw content
    content_bytes = await file.read()
    
    # Try decoding as text first
    try:
        raw_text = content_bytes.decode("utf-8")
    except UnicodeDecodeError:
        # If it's a binary file (like PDF), we decode loosely or raise an error for MVP
        # In production, we'd use pdfplumber/PyPDF2
        raw_text = content_bytes.decode("latin-1")
    
    # Parse via service
    parsed_data = await parser_service.parse_resume(raw_text)
    
    # Save to database
    db_resume = Resume(
        user_id=current_user.id,
        file_name=file.filename,
        raw_text=raw_text,
        parsed_data=parsed_data.model_dump()
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
