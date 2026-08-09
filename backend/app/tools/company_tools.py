import json
import logging
from pydantic import BaseModel, Field
from langchain_core.tools import tool
from app.services.company_intelligence import CompanyIntelligenceService

logger = logging.getLogger(__name__)
company_service = CompanyIntelligenceService()

class CompanyQueryInput(BaseModel):
    company_name: str = Field(description="Target company name e.g. 'Google', 'Stripe', 'OpenAI'")

@tool(args_schema=CompanyQueryInput)
async def search_company_intelligence_tool(company_name: str) -> str:
    """
    Gathers live web search intelligence (tech stack, interview process, hiring trends) for a target company.
    """
    try:
        insights = await company_service.get_company_insights(company_name)
        return json.dumps(insights, indent=2)
    except Exception as e:
        logger.error(f"Error executing company intelligence tool for {company_name}: {e}")
        return json.dumps({"error": str(e), "company_name": company_name})
