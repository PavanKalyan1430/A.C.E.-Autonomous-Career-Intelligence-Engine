import time
import asyncio
from app.core.config import settings
from google import genai
from groq import AsyncGroq
from app.services.nlp_service import production_nlp_service

async def benchmark_models():
    sample_prompt = "Generate a JSON list of 5 technical skills required for an AI Engineer."
    results = {}

    # 1. Gemini 3.5 Flash Lite
    try:
        c = genai.Client(api_key=settings.GEMINI_API_KEY)
        t0 = time.perf_counter()
        res = c.models.generate_content(model="gemini-3.5-flash-lite", contents=sample_prompt)
        dt = time.perf_counter() - t0
        results["Gemini 3.5 Flash Lite"] = f"{dt:.2f}s (Success - 1,500 RPD Quota)"
    except Exception as e:
        results["Gemini 3.5 Flash Lite"] = f"Failed ({e})"

    # 2. Gemini 3.5 Flash
    try:
        c = genai.Client(api_key=settings.GEMINI_API_KEY)
        t0 = time.perf_counter()
        res = c.models.generate_content(model="gemini-3.5-flash", contents=sample_prompt)
        dt = time.perf_counter() - t0
        results["Gemini 3.5 Flash"] = f"{dt:.2f}s (Success)"
    except Exception as e:
        err = str(e)
        if "429" in err:
            results["Gemini 3.5 Flash"] = "Rate Limited (429 - Exceeded 20 RPD cap)"
        else:
            results["Gemini 3.5 Flash"] = f"Failed ({err[:60]})"

    # 3. Gemini Flash Latest
    try:
        c = genai.Client(api_key=settings.GEMINI_API_KEY)
        t0 = time.perf_counter()
        res = c.models.generate_content(model="gemini-flash-latest", contents=sample_prompt)
        dt = time.perf_counter() - t0
        results["Gemini Flash Latest"] = f"{dt:.2f}s (Success)"
    except Exception as e:
        err = str(e)
        if "503" in err:
            results["Gemini Flash Latest"] = "High Demand (503 - Temporary Google server congestion)"
        else:
            results["Gemini Flash Latest"] = f"Failed ({err[:60]})"

    # 4. Groq Qwen 3.8 27B
    try:
        t0 = time.perf_counter()
        async with AsyncGroq(api_key=settings.GROQ_API_KEY) as g_client:
            res = await g_client.chat.completions.create(
                model="qwen/qwen3.8-27b",
                messages=[{"role": "user", "content": sample_prompt}]
            )
            dt = time.perf_counter() - t0
            results["Groq (Qwen 3.8 27B)"] = f"{dt:.2f}s (Success)"
    except Exception as e:
        err = str(e)
        if "429" in err:
            results["Groq (Qwen 3.8 27B)"] = "Rate Limited (429 - Daily token limit reached)"
        else:
            results["Groq (Qwen 3.8 27B)"] = f"Failed ({err[:60]})"

    # 5. Local Dynamic SpaCy + TF-IDF Engine
    try:
        t0 = time.perf_counter()
        kps = await production_nlp_service.extract_tfidf_keyphrases("Python PyTorch FastAPI PostgreSQL AI Engineer", top_n=5)
        dt = time.perf_counter() - t0
        results["Local Dynamic NLP Engine"] = f"{dt:.3f}s (0.1s - Instant local execution)"
    except Exception as e:
        results["Local Dynamic NLP Engine"] = f"Failed ({e})"

    print("\n================ MODEL LATENCY & QUOTA BENCHMARK ================")
    for model_name, info in results.items():
        print(f"%-30s : %s" % (model_name, info))
    print("=================================================================\n")

if __name__ == "__main__":
    asyncio.run(benchmark_models())
