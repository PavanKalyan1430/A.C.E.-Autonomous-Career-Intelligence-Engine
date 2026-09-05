import asyncio
import logging
import sys

# Set up logging to stdout
logging.basicConfig(level=logging.INFO, stream=sys.stdout)

from app.services.company_intelligence import CompanyIntelligenceService

async def main():
    service = CompanyIntelligenceService()
    print(f"Tavily client initialized: {service.client is not None}")
    print("Testing get_company_insights('Google')...")
    try:
        res = await service.get_company_insights("Google")
        print("\n--- RESULT ---")
        print(res)
    except Exception as e:
        print("\n--- EXCEPTION ---")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
