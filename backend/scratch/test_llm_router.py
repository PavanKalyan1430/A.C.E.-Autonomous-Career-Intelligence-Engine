import asyncio
import logging
import sys

logging.basicConfig(level=logging.INFO, stream=sys.stdout)

from app.core.llm_router import generate_content_with_routing

async def main():
    print("Testing generate_content_with_routing directly...")
    try:
        res = await generate_content_with_routing(
            prompt="Hello, return JSON: {\"status\": \"ok\"}",
            response_mime_type="application/json"
        )
        print("Success:", res)
    except Exception as e:
        print("Failed:", e)
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
