import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import asyncio
import httpx
import json
from app.core.config import settings

async def main():
    url = f"https://api.adzuna.com/v1/api/jobs/in/search/1"
    params = {
        "app_id": settings.ADZUNA_APP_ID,
        "app_key": settings.ADZUNA_APP_KEY,
        "what": "AI",
        "results_per_page": 1
    }
    async with httpx.AsyncClient() as client:
        try:
            res = await client.get(url, params=params)
            data = res.json()
            results = data.get("results", [])
            if results:
                print(json.dumps(results[0], indent=2))
            else:
                print("No results found")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
