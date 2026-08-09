import logging
import json
import os
from tavily import TavilyClient
from app.core.config import settings
from app.services.nlp_service import production_nlp_service

logger = logging.getLogger(__name__)

class CompanyIntelligenceService:
    def __init__(self):
        api_key = settings.TAVILY_API_KEY or os.environ.get("TAVILY_API_KEY")
        if api_key:
            self.client = TavilyClient(api_key=api_key)
        else:
            self.client = None
            logger.warning("TAVILY_API_KEY not set.")

    async def get_company_insights(self, company_name: str) -> dict:
        snippets = ""
        sources = []
        
        if self.client:
            try:
                query = f"{company_name} engineering tech stack interview process questions hiring trends"
                response = self.client.search(query=query, max_results=5)
                results = response.get("results", [])
                sources = [r.get("url") for r in results if r.get("url")]
                snippets = " ".join([r.get("content", "") for r in results if r.get("content")])
            except Exception as e:
                logger.error(f"Error fetching live search via Tavily for {company_name}: {e}")

        # Extract dynamic TF-IDF keyphrases from live snippets
        extracted_features = production_nlp_service.extract_tfidf_keyphrases(snippets, top_n=10) if snippets else []
        dynamic_tech_stack = [item["keyphrase"] for item in extracted_features]

        # Use Gemini LLM to synthesize live search snippets into structured insights
        gemini_api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY")
        if gemini_api_key and snippets:
            try:
                from google import genai
                client = genai.Client(api_key=gemini_api_key)
                prompt = (
                    f"Synthesize the following live web search snippets for {company_name}:\n{snippets}\n\n"
                    f"Return JSON format with keys: 'tech_stack' (list of technologies), 'interview_process' (summary of coding/system design stages), "
                    f"and 'hiring_trends' (current engineering focus areas)."
                )
                res = client.models.generate_content(
                    model="gemini-1.5-flash",
                    contents=prompt,
                    config={"response_mime_type": "application/json"}
                )
                llm_data = json.loads(res.text)
                llm_data["company_name"] = company_name
                llm_data["sources"] = sources
                return llm_data
            except Exception as e:
                logger.error(f"Error synthesizing search snippets via LLM: {e}")

        return {
            "company_name": company_name,
            "tech_stack": dynamic_tech_stack,
            "interview_process": snippets[:300] if snippets else "",
            "hiring_trends": "",
            "sources": sources,
            "raw_summary": snippets[:1000] if snippets else ""
        }
