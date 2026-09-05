import asyncio
import json
from httpx import AsyncClient, ASGITransport
from app.main import app

from app.core.security import create_access_token, get_password_hash
from app.core.database import SessionLocal
from app.models.user import User, Profile
from sqlalchemy.future import select

async def test_live_ats_api():
    async with SessionLocal() as db:
        res = await db.execute(select(User).filter(User.email == "test_ats_user@ace.ai"))
        user = res.scalars().first()
        if not user:
            user = User(email="test_ats_user@ace.ai", hashed_password=get_password_hash("Password123!"), is_active=True)
            db.add(user)
            await db.commit()
            await db.refresh(user)
            prof = Profile(user_id=user.id, target_role="AI ENGINEER")
            db.add(prof)
            await db.commit()
    
    token = create_access_token(subject=str(user.id))
    headers = {"Authorization": f"Bearer {token}"}
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        
        # 2. Upload sample resume if needed
        sample_resume_content = b"Sai Pavankalyan Reddy\nEmail: sai@gmail.com\nSkills: Python, PyTorch, FastAPI, PostgreSQL, Docker, AWS\nExperience: Software Engineer at Tech Corp working on Python and ML microservices."
        files = {"file": ("resume.txt", sample_resume_content, "text/plain")}
        upload_res = await ac.post("/api/v1/resume/upload", headers=headers, files=files)
        print(f"Upload Response: {upload_res.status_code}")
        
        # 3. Trigger ATS Analysis
        trigger_res = await ac.post("/api/v1/resume/ats-analysis", headers=headers, json={"target_role": "AI ENGINEER"})
        print(f"Trigger ATS Analysis Status Code: {trigger_res.status_code}")
        if trigger_res.status_code == 200:
            data = trigger_res.json()
            print("================ ATS API SUCCESS ================")
            print(f"Target Role       : {data.get('target_role')}")
            print(f"Overall ATS Score : {data.get('overall_ats_score')}")
            print(f"Score Level       : {data.get('score_level')}")
            print(f"Matched Keywords  : {len(data.get('matched_keywords', []))} items")
            print("=================================================")
        else:
            print(f"Trigger Failed: {trigger_res.text}")

if __name__ == "__main__":
    asyncio.run(test_live_ats_api())
