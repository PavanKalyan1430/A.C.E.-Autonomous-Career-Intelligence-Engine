from langchain_core.tools import tool
import json

@tool
def generate_roadmap(skills_list: list, target_role: str) -> str:
    """Generates a detailed, step-by-step career learning roadmap to achieve a target role."""
    # Custom roadmap logic based on gaps
    all_role_skills = {
        "frontend engineer": ["React", "TypeScript", "Tailwind CSS", "Next.js", "Jest"],
        "backend engineer": ["Python", "FastAPI", "PostgreSQL", "Docker", "Redis", "System Design"],
        "fullstack engineer": ["React", "TypeScript", "Python", "FastAPI", "PostgreSQL", "Docker", "AWS"],
        "ai engineer": ["Python", "PyTorch", "Transformers", "LangChain", "Vector Databases", "LLM APIs"]
    }
    
    role = target_role.lower()
    target_skills = all_role_skills.get(role, ["System Design", "Python", "Cloud Systems"])
    
    missing_skills = [s for s in target_skills if s.lower() not in [user_s.lower() for user_s in skills_list]]
    
    roadmap = {
        "target_role": target_role,
        "current_skills": skills_list,
        "missing_skills": missing_skills,
        "phases": [
            {
                "phase": "Phase 1: Foundation Gaps",
                "topics": [s for s in missing_skills[:2]],
                "estimated_time": "2-3 weeks"
            },
            {
                "phase": "Phase 2: Advanced Integrations & Projects",
                "topics": [s for s in missing_skills[2:4]] if len(missing_skills) > 2 else ["Design Patterns", "Scalability"],
                "estimated_time": "3-4 weeks"
            },
            {
                "phase": "Phase 3: Production Deployment & Practice",
                "topics": [s for s in missing_skills[4:]] if len(missing_skills) > 4 else ["CI/CD", "Interview Simulation"],
                "estimated_time": "2 weeks"
            }
        ]
    }
    return json.dumps(roadmap, indent=2)
