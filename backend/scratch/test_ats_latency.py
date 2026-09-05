import time
import asyncio
import httpx

async def measure_ats_latency():
    async with httpx.AsyncClient(base_url="http://localhost:8000", timeout=30.0) as client:
        # 1. Login or obtain access token
        login_res = await client.post("/api/v1/auth/login", data={"username": "sai@gmail.com", "password": "password123"})
        if login_res.status_code != 200:
            print(f"Login failed: {login_res.status_code} - {login_res.text}")
            return
        
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        print("Triggering POST /api/v1/resume/ats-analysis...")
        start_time = time.perf_counter()
        
        res = await client.post(
            "/api/v1/resume/ats-analysis",
            json={"target_role": "AI ENGINEER"},
            headers=headers
        )
        
        elapsed = time.perf_counter() - start_time
        
        print("\n================ EMPIRICAL TEST PROOF ================")
        print(f"HTTP Status Code : {res.status_code}")
        print(f"Total Execution Time: {elapsed:.2f} seconds ({elapsed*1000:.0f} ms)")
        if res.status_code == 200:
            data = res.json()
            print(f"Target Role      : {data.get('target_role')}")
            print(f"Overall ATS Score: {data.get('overall_ats_score')}/100 ({data.get('score_level')})")
            print(f"Matched Keywords : {len(data.get('matched_keywords', []))} items")
            print(f"Missing Keywords : {len(data.get('missing_keywords', []))} items")
            print(f"Executive Summary: {data.get('executive_summary')}")
        else:
            print(f"Error Response   : {res.text}")
        print("======================================================\n")

if __name__ == "__main__":
    asyncio.run(measure_ats_latency())
