from langchain_core.tools import tool
import json
from app.services.company_intelligence import CompanyIntelligenceService

company_service = CompanyIntelligenceService()

@tool
async def get_company_info(company_name: str) -> str:
    """
    Searches and gathers company intelligence (tech stack, hiring trends, interview insights)
    for a given company name.
    """
    insights = await company_service.get_company_insights(company_name)
    return json.dumps(insights, indent=2)
