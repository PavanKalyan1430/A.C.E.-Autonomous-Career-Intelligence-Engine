import asyncio
import os
from app.core.config import settings
from google import genai

async def list_and_test():
    api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY")
    client = genai.Client(api_key=api_key)
    
    print("Fetching available models from Gemini API...")
    try:
        models = list(client.models.list())
        available_names = [m.name for m in models]
        print(f"Available models ({len(available_names)}):")
        for name in available_names:
            print(f" - {name}")
    except Exception as e:
        print(f"Failed to list models: {e}")
        available_names = ["gemini-2.5-flash", "gemini-3.6-flash"]

    for m in available_names[:10]:
        try:
            model_id = m.replace("models/", "")
            start = asyncio.get_event_loop().time()
            res = await client.aio.models.generate_content(
                model=model_id,
                contents="Hello, test prompt",
            )
            dur = asyncio.get_event_loop().time() - start
            print(f"SUCCESS: Model '{model_id}' worked in {dur:.2f}s!")
            break
        except Exception as e:
            print(f"FAILED: Model '{m}' -> {e}")

if __name__ == "__main__":
    asyncio.run(list_and_test())
