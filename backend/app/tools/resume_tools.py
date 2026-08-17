import json
import logging
from pydantic import BaseModel, Field
from langchain_core.tools import tool
from app.services.resume_parser import ResumeParserService
from app.services.nlp_service import production_nlp_service

logger = logging.getLogger(__name__)
resume_service = ResumeParserService()

class ResumeParseInput(BaseModel):
    raw_text: str = Field(description="Raw resume text extracted from uploaded PDF/DOCX/TXT file")

class SemanticMatchInput(BaseModel):
    resume_or_profile_text: str = Field(description="Candidate resume text or skill profile")
    job_description_text: str = Field(description="Target job description text")

@tool(args_schema=ResumeParseInput)
async def parse_resume_document_tool(raw_text: str) -> str:
    """
    Parses raw resume document content into structured candidate JSON schema.
    """
    try:
        parsed = await resume_service.parse_resume(raw_text)
        return json.dumps(parsed.model_dump(), indent=2)
    except Exception as e:
        logger.error(f"Resume parsing error: {e}")
        return json.dumps({"error": str(e)})

@tool(args_schema=SemanticMatchInput)
async def nlp_semantic_similarity_tool(resume_or_profile_text: str, job_description_text: str) -> str:
    """
    Computes 384-dimensional dense vector embeddings using SentenceTransformers and exact Cosine Distance.
    """
    result = await production_nlp_service.compute_semantic_similarity(resume_or_profile_text, job_description_text)
    return json.dumps(result, indent=2)
