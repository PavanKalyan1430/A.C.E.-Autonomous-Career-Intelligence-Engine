import time
import asyncio
from app.services.ats_analyzer import ats_analyzer_service

async def run_live_ats_test():
    sample_resume_text = """
    Sai Pavankalyan Reddy
    Email: sai@gmail.com | Phone: +1-555-0192 | GitHub: github.com/saipavan
    
    Professional Summary:
    Dedicated AI/ML & Backend Software Engineer with experience in Python, PyTorch, FastAPI, PostgreSQL, Docker, and LLM Application Development.
    
    Experience:
    Senior Software Engineer - Tech Solutions (2022 - Present)
    - Designed and implemented high-performance RESTful microservices in Python using FastAPI and PostgreSQL, serving 500k daily active users.
    - Fine-tuned transformer models using PyTorch and HuggingFace for intelligent semantic search, improving retrieval accuracy by 35%.
    - Containerized and deployed backend services on AWS ECS with Docker and Kubernetes, reducing deployment downtime by 50%.
    
    Education:
    Bachelor of Science in Computer Science - State University
    
    Skills:
    Python, FastAPI, PyTorch, TensorFlow, PostgreSQL, Docker, Kubernetes, AWS, REST APIs, Git, Machine Learning, LangChain.
    """
    
    parsed_data = {
        "personal_info": {"name": "Sai Pavankalyan Reddy", "email": "sai@gmail.com", "phone": "+1-555-0192", "links": ["github.com/saipavan"]},
        "work_experience": [
            {
                "role": "Senior Software Engineer",
                "company": "Tech Solutions",
                "start_date": "2022",
                "end_date": "Present",
                "description": [
                    "Designed and implemented high-performance RESTful microservices in Python using FastAPI and PostgreSQL.",
                    "Fine-tuned transformer models using PyTorch and HuggingFace for intelligent semantic search.",
                    "Containerized and deployed backend services on AWS ECS with Docker."
                ]
            }
        ],
        "education": [{"degree": "Bachelor of Science", "field_of_study": "Computer Science", "institution": "State University"}],
        "projects": [],
        "skills": ["Python", "FastAPI", "PyTorch", "TensorFlow", "PostgreSQL", "Docker", "Kubernetes", "AWS", "REST APIs", "Git", "Machine Learning", "LangChain"]
    }
    
    target_role = "AI ENGINEER"
    print("Pre-warming local NLP embedding weights...")
    from app.services.nlp_service import production_nlp_service
    await production_nlp_service.extract_linguistic_features("warmup")
    await production_nlp_service.compute_batch_semantic_similarity("warmup", ["warmup"])
    print(f"Starting LIVE ATS Resume Analysis for target role: '{target_role}'...")
    
    start_time = time.perf_counter()
    res = await ats_analyzer_service.analyze_resume_ats(
        raw_text=sample_resume_text,
        parsed_data=parsed_data,
        target_role=target_role
    )
    elapsed = time.perf_counter() - start_time
    
    print("\n================ LIVE EMPIRICAL BENCHMARK PROOF ================")
    print(f"Target Role              : {res.get('target_role')}")
    print(f"Status                   : {res.get('status')}")
    print(f"Total Execution Time     : {elapsed:.2f} seconds ({elapsed*1000:.0f} ms)")
    print(f"Overall ATS Score        : {res.get('overall_ats_score')}/100 ({res.get('score_level')})")
    print(f"Strong Matched Keywords  : {len(res.get('matched_keywords', []))} items -> {res.get('matched_keywords')[:4]}")
    print(f"Weak Keywords            : {len(res.get('weak_keywords', []))} items")
    print(f"Missing Keywords         : {len(res.get('missing_keywords', []))} items -> {[m['keyword'] for m in res.get('missing_keywords', [])[:3]]}")
    print(f"Actionable Improvements  : {len(res.get('actionable_improvements', []))} items")
    print(f"Executive Summary        : {res.get('executive_summary')}")
    print("=================================================================\n")

if __name__ == "__main__":
    asyncio.run(run_live_ats_test())
