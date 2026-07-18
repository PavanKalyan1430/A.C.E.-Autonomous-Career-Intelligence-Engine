from langchain_core.tools import tool
import json
from app.services.resume_parser import ResumeParserService

parser_service = ResumeParserService()

@tool
async def parse_resume_text(raw_text: str) -> str:
    """Parses raw resume text and returns a structured JSON string of the candidate profile."""
    profile = await parser_service.parse_resume(raw_text)
    return json.dumps(profile.model_dump(), indent=2)

@tool
def match_resume_to_job(resume_json_str: str, job_description: str) -> str:
    """
    Compares parsed resume JSON data with a target job description.
    Returns matching score, key skill gaps, and suggestions for refinement.
    """
    try:
        resume_data = json.loads(resume_json_str)
    except Exception:
        return "Invalid resume JSON format."
        
    # Standard heuristic matching for basic score if LLM is offline,
    # will be enhanced with LLM analysis in Agent workflows.
    skills = [s.lower() for s in resume_data.get("skills", [])]
    jd_words = job_description.lower().split()
    
    matched_skills = [s for s in skills if s in jd_words]
    score = int((len(matched_skills) / max(len(skills), 1)) * 100)
    
    result = {
        "match_score": min(score + 30, 95),  # Heuristic boost for demo
        "matched_skills": matched_skills,
        "missing_skills_detected": [w for w in ["docker", "kubernetes", "fastapi", "react", "next.js", "aws"] if w in jd_words and w not in skills],
        "refinement_suggestions": [
            "Highlight experience with technologies matching the job description.",
            "Add projects showcasing relevant system architecture skills."
        ]
    }
    return json.dumps(result, indent=2)
