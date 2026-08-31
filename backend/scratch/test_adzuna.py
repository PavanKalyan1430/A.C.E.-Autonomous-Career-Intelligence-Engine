import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import asyncio
import httpx
from app.core.config import settings

async def main():
    print(f"ADZUNA_APP_ID: {settings.ADZUNA_APP_ID}")
    print(f"ADZUNA_APP_KEY: {settings.ADZUNA_APP_KEY}")
    
    url = f"https://api.adzuna.com/v1/api/jobs/in/search/1"
    params = {
        "app_id": settings.ADZUNA_APP_ID,
        "app_key": settings.ADZUNA_APP_KEY,
        "what": "AI",
        "results_per_page": 5
    }
    async with httpx.AsyncClient() as client:
        try:
            res = await client.get(url, params=params)
            print(f"Status Code: {res.status_code}")
            print(f"Response Headers: {res.headers}")
            print(f"Response Body: {res.text[:500]}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
