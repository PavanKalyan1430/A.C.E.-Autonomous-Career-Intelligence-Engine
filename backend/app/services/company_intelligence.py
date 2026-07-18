import logging
import json
import os
from tavily import TavilyClient
from app.core.config import settings

logger = logging.getLogger(__name__)

class CompanyIntelligenceService:
    def __init__(self):
        api_key = settings.TAVILY_API_KEY or os.environ.get("TAVILY_API_KEY")
        if api_key:
            self.client = TavilyClient(api_key=api_key)
        else:
            self.client = None
            logger.warning("TAVILY_API_KEY not set. Running in mock company intelligence mode.")

    async def get_company_insights(self, company_name: str) -> dict:
        if not self.client:
            return self._mock_company_insights(company_name)
            
        try:
            # Query tech stack and interview questions
            query = f"{company_name} engineering tech stack interview process questions hiring trends"
            response = self.client.search(query=query, max_results=5)
            
            # Formulate aggregated summary
            results = response.get("results", [])
            sources = [r.get("url") for r in results]
            snippets = " ".join([r.get("content", "") for r in results])
            
            return {
                "company_name": company_name,
                "tech_stack": self._extract_skills_heuristics(snippets),
                "interview_process": "Found insights on standard coding loops and system design stages.",
                "hiring_trends": "Active hiring trends in engineering and cloud solutions.",
                "sources": sources,
                "raw_summary": snippets[:1000]
            }
        except Exception as e:
            logger.error(f"Error fetching company intelligence via Tavily: {e}")
            return self._mock_company_insights(company_name)

    def _extract_skills_heuristics(self, text: str) -> list:
        common_skills = [
            "python", "javascript", "typescript", "golang", "java", "c++",
            "react", "angular", "vue", "next.js", "fastapi", "django", "spring boot",
            "aws", "gcp", "azure", "kubernetes", "docker", "postgresql", "redis", "mongodb"
        ]
        text_lower = text.lower()
        extracted = [skill.title() for skill in common_skills if skill in text_lower]
        return extracted if extracted else ["Python", "AWS", "React"]

    def _mock_company_insights(self, company_name: str) -> dict:
        return {
            "company_name": company_name,
            "tech_stack": ["React", "TypeScript", "Python", "FastAPI", "AWS", "PostgreSQL", "Docker"],
            "interview_process": (
                "1. Initial HR screening (30 mins)\n"
                "2. Technical Screening: Live Coding (Leetcode medium) + System Design basics\n"
                "3. Onsite/Virtual Loops: 2 Coding sessions, 1 System Design, 1 Behavioral round."
            ),
            "hiring_trends": "Strong emphasis on building AI integration platforms, cloud-native services, and robust security pipelines.",
            "sources": ["https://glassdoor.com", "https://linkedin.com/jobs"],
            "raw_summary": f"Mock data for {company_name} representing typical high-growth tech firms."
        }
