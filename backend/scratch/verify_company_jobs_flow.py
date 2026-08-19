import asyncio
import httpx

BASE_URL = "http://127.0.0.1:8000/api/v1"

async def test_company_and_job_intelligence():
    async with httpx.AsyncClient() as client:
        # First login to get token
        login_resp = await client.post(
            f"{BASE_URL}/auth/login",
            data={"username": "signup_user_99c4985e@example.com", "password": "SecurePassword123!"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        if login_resp.status_code != 200:
            # Register fallback user
            reg_resp = await client.post(
                f"{BASE_URL}/auth/register",
                json={"email": "comp_user_test@example.com", "password": "SecurePassword123!"}
            )
            login_resp = await client.post(
                f"{BASE_URL}/auth/login",
                data={"username": "comp_user_test@example.com", "password": "SecurePassword123!"},
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
        
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        print("=== TEST 1: Company Intelligence API Endpoint (/company/Google) ===")
        comp_resp = await client.get(f"{BASE_URL}/company/Google", headers=headers)
        print(f"Company API Status: {comp_resp.status_code}")
        assert comp_resp.status_code == 200, f"Expected 200, got {comp_resp.status_code}"
        comp_data = comp_resp.json()
        print(f"Company Name: {comp_data.get('company_name')}")
        print(f"Tech Stack: {comp_data.get('tech_stack')}")
        print(f"Hiring Trends: {comp_data.get('hiring_trends', '').encode('ascii', 'ignore').decode('ascii')[:80]}...")
        
        sources = comp_data.get("sources", [])
        print(f"Sources Count: {len(sources)}")
        if sources:
            first_src = sources[0]
            print(f"First Source Object: {first_src}")
            assert isinstance(first_src, dict), "Source item should be a dict/object!"
            assert "url" in first_src, "Source object must contain 'url'"
            print(f"Verified Source Object fields: title='{first_src.get('title')}', domain='{first_src.get('domain')}', tier='{first_src.get('tier')}'")

        print("\n=== TEST 2: Job Intelligence / Applications Endpoint (/applications/) ===")
        app_resp = await client.get(f"{BASE_URL}/applications/", headers=headers)
        print(f"Applications API Status: {app_resp.status_code}")
        assert app_resp.status_code == 200, f"Expected 200, got {app_resp.status_code}"
        print(f"Tracked Applications Count: {len(app_resp.json())}")

        print("\n[SUCCESS] ALL COMPANY & JOB INTELLIGENCE CONTRACT TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(test_company_and_job_intelligence())
