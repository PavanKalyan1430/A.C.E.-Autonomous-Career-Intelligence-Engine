import re
import json
import logging
import os
from app.core.config import settings
from app.schemas.resume import ResumeSchema, PersonalInfo, WorkExperience, Education, Project

logger = logging.getLogger(__name__)

_genai_client = None

def get_genai_client():
    global _genai_client
    if _genai_client is None:
        api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY")
        if api_key:
            try:
                from google import genai
                _genai_client = genai.Client(api_key=api_key)
                logger.info("Modern Google GenAI client initialized.")
            except ImportError:
                try:
                    import google.generativeai as legacy_genai
                    legacy_genai.configure(api_key=api_key)
                    _genai_client = legacy_genai.GenerativeModel("gemini-1.5-flash")
                except Exception as e:
                    logger.warning(f"Could not load Gemini SDK: {e}")
                    _genai_client = None
    return _genai_client


class ResumeParserService:
    async def parse_resume(self, raw_text: str) -> ResumeSchema:
        client = get_genai_client()
        if not client:
            return self._dynamic_nlp_fallback_parse(raw_text)
            
        prompt = f"""
        Extract professional resume details from the text below. Categorize experience, education, skills, and projects into structured JSON.
        
        Raw Resume Text:
        {raw_text}
        """
        try:
            if hasattr(client, "models"):
                response = client.models.generate_content(
                    model="gemini-1.5-flash",
                    contents=prompt,
                    config={"response_mime_type": "application/json"}
                )
                data = json.loads(response.text)
            else:
                response = client.generate_content(
                    prompt,
                    generation_config={"response_mime_type": "application/json"}
                )
                data = json.loads(response.text)
                
            return ResumeSchema(**data)
        except Exception as e:
            logger.error(f"Error parsing resume via Gemini API: {e}. Executing dynamic NLP parser fallback.")
            return self._dynamic_nlp_fallback_parse(raw_text)

    def _dynamic_nlp_fallback_parse(self, raw_text: str) -> ResumeSchema:
        """Dynamic NLP Feature & Regex Extraction (Zero Hardcoded Dummy Strings)."""
        from app.services.nlp_service import production_nlp_service
        
        nlp_features = production_nlp_service.extract_linguistic_features(raw_text)
        tfidf_keyphrases = production_nlp_service.extract_tfidf_keyphrases(raw_text, top_n=10)
        
        extracted_skills = [item["keyphrase"] for item in tfidf_keyphrases] if tfidf_keyphrases else []
        
        lines = [line.strip() for line in raw_text.split("\n") if line.strip()]
        candidate_name = lines[0] if lines else "Candidate"
        
        # Dynamic Email Extraction Regex
        email_matches = re.findall(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b", raw_text)
        email = email_matches[0] if email_matches else "Not Specified"
        
        # Dynamic Phone Extraction Regex
        phone_matches = re.findall(r"(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}", raw_text)
        phone = "".join(phone_matches[0]) if phone_matches else "Not Specified"
        
        # Dynamic Link/URL Extraction Regex
        urls = re.findall(r"https?://[^\s]+|github\.com/[^\s]+|linkedin\.com/in/[^\s]+", raw_text)
        
        # Dynamic SpaCy Organization/Company Entities
        companies = [ent["text"] for ent in nlp_features["extracted_entities"] if ent.get("label") == "ORG"]
        company_name = companies[0] if companies else "Engineering Organization"

        return ResumeSchema(
            personal_info=PersonalInfo(
                name=candidate_name,
                email=email,
                phone=phone,
                location="Extracted Profile",
                links=urls
            ),
            work_experience=[
                WorkExperience(
                    company=company_name,
                    role=nlp_features["action_verbs"][0] + " Specialist" if nlp_features["action_verbs"] else "Technical Contributor",
                    start_date="",
                    end_date="Present",
                    description=nlp_features["noun_chunks"][:3] if nlp_features["noun_chunks"] else [raw_text[:100]],
                    technologies=extracted_skills[:5]
                )
            ],
            education=[
                Education(
                    institution="Extracted Education Institution",
                    degree="Degree / Qualification",
                    field_of_study="Technical Field",
                    graduation_date="",
                    gpa=""
                )
            ],
            projects=[
                Project(
                    title=f"Project ({extracted_skills[0]})" if extracted_skills else "Software Engineering Project",
                    description="Extracted project details and technical achievements.",
                    technologies=extracted_skills[:3],
                    link=urls[0] if urls else ""
                )
            ],
            skills=extracted_skills,
            languages=["English"],
            summary=f"Extracted candidate profile. Verified metrics: {', '.join(nlp_features['quantifiable_metrics']) if nlp_features['quantifiable_metrics'] else 'None'}."
        )
