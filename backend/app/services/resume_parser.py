import json
import logging
import google.generativeai as genai
from app.core.config import settings
from app.schemas.resume import ResumeSchema, PersonalInfo, WorkExperience, Education, Project

logger = logging.getLogger(__name__)

class ResumeParserService:
    def __init__(self):
        # Allow loading key directly from env if settings is empty
        api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY")
        if api_key:
            genai.configure(api_key=api_key)
            # Use gemini-1.5-flash as default stable version for structured JSON outputs
            self.model = genai.GenerativeModel("gemini-1.5-flash")
        else:
            self.model = None
            logger.warning("GEMINI_API_KEY not set. Resume parser will run in mock fallback mode.")

    async def parse_resume(self, raw_text: str) -> ResumeSchema:
        if not self.model:
            return self._mock_parse(raw_text)
            
        prompt = f"""
        Extract professional resume details from the text below. Categorize experience, education, skills, and projects.
        
        Raw Resume Text:
        {raw_text}
        """
        try:
            # Running synchronous Gemini call in an async-friendly executor is best,
            # but for simplicity we call it directly here.
            response = self.model.generate_content(
                prompt,
                generation_config={
                    "response_mime_type": "application/json",
                    "response_schema": ResumeSchema
                }
            )
            data = json.loads(response.text)
            return ResumeSchema(**data)
        except Exception as e:
            logger.error(f"Error parsing resume via Gemini: {e}. Falling back to basic parsing.")
            return self._mock_parse(raw_text)

    def _mock_parse(self, raw_text: str) -> ResumeSchema:
        # Simple extraction logic for demo/offline fallback
        lines = [line.strip() for line in raw_text.split("\n") if line.strip()]
        name = lines[0] if lines else "John Doe"
        email = "john.doe@example.com"
        for line in lines:
            if "@" in line:
                email = line.split()[-1]
                break

        return ResumeSchema(
            personal_info=PersonalInfo(
                name=name,
                email=email,
                phone="+1-555-0199",
                location="San Francisco, CA",
                links=["https://linkedin.com/in/johndoe", "https://github.com/johndoe"]
            ),
            work_experience=[
                WorkExperience(
                    company="Acme Corp",
                    role="Software Engineer",
                    start_date="2022-01",
                    end_date="Present",
                    description=["Developed scalable web services using Python and FastAPI.", "Implemented automated pipelines."],
                    technologies=["Python", "FastAPI", "PostgreSQL"]
                )
            ],
            education=[
                Education(
                    institution="State University",
                    degree="Bachelor of Science",
                    field_of_study="Computer Science",
                    graduation_date="2021-12",
                    gpa="3.8"
                )
            ],
            projects=[
                Project(
                    title="Resume Parser OS",
                    description="An AI Career Operating System backend.",
                    technologies=["FastAPI", "Gemini", "LangGraph"],
                    link="https://github.com/johndoe/resume-parser"
                )
            ],
            skills=["Python", "FastAPI", "SQL", "Git", "Docker", "Machine Learning"],
            languages=["English"],
            summary="Detail-oriented software engineer with experience building web applications and AI workflows."
        )

# Import os for environment checks
import os
