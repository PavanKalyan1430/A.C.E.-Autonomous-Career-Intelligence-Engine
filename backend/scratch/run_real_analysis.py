import asyncio
import os
import sys
import pprint
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.ats_analyzer import ats_analyzer_service

async def main():
    print("Executing End-to-End Real Resume Intelligence Analysis Trace...")
    raw_text = """
    Jane Doe
    jane.doe@email.com | (123) 456-7890 | github.com/janedoe
    
    Summary:
    Results-driven Software Architect with 8+ years of experience building scalable backend platforms.
    
    Skills:
    Python, Go, FastAPI, Kubernetes, Docker, PostgreSQL, Distributed Systems, System Design.
    
    Experience:
    Staff Backend Engineer | Stripe (2022 - Present)
    - Designed and scaled high-throughput API gateway processing 10k+ requests per second using Go and gRPC.
    - Improved database query latency by 45% by optimizing indexing and caching strategies in PostgreSQL.
    
    Projects:
    Distrubuted Task Queue (github.com/janedoe/task-queue)
    - Built a distributed task runner using Python, redis, and Docker with full fault-tolerance.
    """
    
    parsed_data = {
        "personal_info": {
            "name": "Jane Doe",
            "email": "jane.doe@email.com",
            "phone": "123-456-7890",
            "links": ["https://github.com/janedoe", "https://github.com/janedoe/task-queue"]
        },
        "summary": "Results-driven Software Architect with 8+ years of experience building scalable backend platforms.",
        "skills": ["Python", "Go", "FastAPI", "Kubernetes", "Docker", "PostgreSQL", "Distributed Systems", "System Design"],
        "work_experience": [
            {
                "role": "Staff Backend Engineer",
                "company": "Stripe",
                "description": "Designed and scaled high-throughput API gateway processing 10k+ requests per second using Go and gRPC. Improved database query latency by 45% by optimizing indexing and caching strategies in PostgreSQL."
            }
        ],
        "projects": [
            {
                "name": "Distributed Task Queue",
                "description": "Built a distributed task runner using Python, redis, and Docker with full fault-tolerance."
            }
        ]
    }
    
    target_role = "Senior Backend Engineer"
    
    res = await ats_analyzer_service.analyze_resume_ats(
        raw_text=raw_text,
        parsed_data=parsed_data,
        target_role=target_role
    )
    
    print("\n--- ANALYSIS RESULTS ---")
    print(json.dumps(res, indent=2, ensure_ascii=True))

if __name__ == "__main__":
    asyncio.run(main())
