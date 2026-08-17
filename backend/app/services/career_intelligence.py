import logging
import json
from typing import List, Dict, Any, Optional, Set
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.user import (
    User, Profile, Resume, Application, InterviewSession, UserMemory, Company
)
from app.services.nlp_service import production_nlp_service
from app.services.company_intelligence import CompanyIntelligenceService

logger = logging.getLogger(__name__)

def normalize_skill(raw_skill: str) -> str:
    cleaned = raw_skill.strip()
    if not cleaned:
        return ""
    if cleaned.isupper() and len(cleaned) <= 5:
        return cleaned
    return cleaned.title()

def normalize_skill_list(skills: List[str]) -> List[str]:
    seen: Set[str] = set()
    normalized: List[str] = []
    for s in skills:
        norm = normalize_skill(s)
        if norm and norm.lower() not in seen:
            seen.add(norm.lower())
            normalized.append(norm)
    return normalized

class CareerIntelligenceService:
    def __init__(self):
        self.company_intel_service = CompanyIntelligenceService()

    async def get_canonical_candidate_profile(
        self, user_id: int, db: AsyncSession
    ) -> Dict[str, Any]:
        # 1. Fetch User & Profile
        res_u = await db.execute(select(User).filter(User.id == user_id))
        user = res_u.scalars().first()
        if not user:
            raise ValueError(f"User {user_id} not found")

        res_prof = await db.execute(select(Profile).filter(Profile.user_id == user_id))
        profile = res_prof.scalars().first()

        # 2. Fetch Latest Resume
        res_resumes = await db.execute(
            select(Resume)
            .filter(Resume.user_id == user_id)
            .order_by(Resume.created_at.desc())
        )
        resumes = list(res_resumes.scalars().all())
        latest_resume = resumes[0] if resumes else None

        raw_verified_skills = []
        experience_summary = []
        if latest_resume and latest_resume.parsed_data:
            p_data = latest_resume.parsed_data
            if isinstance(p_data, dict):
                raw_verified_skills = p_data.get("skills", [])
                experience_summary = p_data.get("work_experience", [])

        if not raw_verified_skills and profile and profile.skills_json:
            if isinstance(profile.skills_json, dict):
                raw_verified_skills = profile.skills_json.get("skills", [])

        verified_skills = normalize_skill_list(raw_verified_skills)

        # 3. Fetch Applications & Target Company / Role
        res_apps = await db.execute(
            select(Application)
            .filter(Application.user_id == user_id)
            .order_by(Application.created_at.desc())
        )
        apps = list(res_apps.scalars().all())

        target_role = profile.target_role if profile and profile.target_role else (
            apps[0].role_title if apps else "Senior Backend Engineer"
        )
        target_company = apps[0].company_name if apps else "Stripe"

        # 4. Fetch User Memories (Weak Areas)
        res_mems = await db.execute(select(UserMemory).filter(UserMemory.user_id == user_id))
        mems = list(res_mems.scalars().all())
        weak_areas_set = {m.memory_text for m in mems if m.category == "weak_area"}

        # 5. Fetch Interview Sessions & Performance
        res_interviews = await db.execute(
            select(InterviewSession)
            .filter(InterviewSession.user_id == user_id)
            .options(selectinload(InterviewSession.feedbacks))
        )
        interviews = list(res_interviews.scalars().all())
        completed_interviews = [i for i in interviews if i.is_completed]

        scores = []
        for i in completed_interviews:
            s_score = 0.0
            if i.feedback and isinstance(i.feedback, dict):
                s_score = float(i.feedback.get("overall_score", 0.0))
            elif i.feedbacks:
                s_score = float(i.feedbacks[0].overall_score)
            if s_score > 0:
                scores.append(s_score)

            if i.transcript and isinstance(i.transcript, list):
                for qa in i.transcript:
                    if isinstance(qa, dict):
                        eval_data = qa.get("evaluation", {})
                        if isinstance(eval_data, dict):
                            if eval_data.get("score", 100) < 70:
                                weak_areas_set.add(eval_data.get("category", "General"))

        avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0

        return {
            "user_id": user.id,
            "email": user.email,
            "target_role": target_role,
            "target_company": target_company,
            "verified_skills": verified_skills,
            "experience_summary": experience_summary,
            "weak_areas": list(weak_areas_set),
            "interview_history_count": len(completed_interviews),
            "average_interview_score": avg_score
        }

    async def generate_career_intelligence(
        self, user_id: int, db: AsyncSession
    ) -> Dict[str, Any]:
        profile_data = await self.get_canonical_candidate_profile(user_id, db)

        # 1. Fetch Target Company Intelligence if company specified
        company_tech_stack = ["Python", "FastAPI", "PostgreSQL", "Docker", "Kubernetes", "System Design", "gRPC"]
        if profile_data["target_company"]:
            try:
                c_insights = await self.company_intel_service.get_company_insights(profile_data["target_company"])
                if c_insights and c_insights.get("tech_stack"):
                    company_tech_stack = normalize_skill_list(c_insights.get("tech_stack", []))
            except Exception as e:
                logger.warning(f"Could not fetch company insights for {profile_data['target_company']}: {e}")

        # 2. Deterministic Skill Alignment
        candidate_skills_set = set(profile_data["verified_skills"])
        target_skills_set = set(normalize_skill_list(company_tech_stack))

        matched_skills = list(candidate_skills_set & target_skills_set)
        missing_skills = list(target_skills_set - candidate_skills_set)

        coverage_pct = round((len(matched_skills) / max(len(target_skills_set), 1)) * 100, 1) if target_skills_set else 100.0

        # 3. Skill Gap Prioritization
        prioritized_gaps = []
        for ms in missing_skills:
            evidence = ["company_requirement"]
            priority = "medium"
            reason = f"Required by target role at {profile_data['target_company']} and absent from candidate profile."

            if ms in profile_data["weak_areas"]:
                priority = "high"
                evidence.append("interview_weakness")
                reason += f" Identified as an active weakness in interview performance."
            elif ms in ["System Design", "Kubernetes", "PostgreSQL"]:
                priority = "high"
                reason += " High-impact core backend architecture requirement."

            prioritized_gaps.append({
                "skill": ms,
                "priority": priority,
                "reason": reason,
                "evidence_sources": evidence
            })

        # 4. Learning Dependency Graph (DAG)
        prereq_graph = {
            "Python": [],
            "REST APIs": ["Python"],
            "Docker": ["REST APIs"],
            "Kubernetes": ["Docker"],
            "System Design": ["REST APIs"],
            "gRPC": ["REST APIs", "Kubernetes"]
        }

        learning_roadmap = []
        # Add completed candidate skills
        for s in profile_data["verified_skills"][:3]:
            learning_roadmap.append({
                "id": s.lower().replace(" ", "_"),
                "name": s,
                "status": "completed",
                "impact": "high",
                "prerequisites": [],
                "reason": "Verified skill in candidate profile.",
                "estimated_effort_hours": 0
            })

        # Add missing skills to roadmap with dependency check
        for gap in prioritized_gaps:
            s_name = gap["skill"]
            prereqs = prereq_graph.get(s_name, [])
            met_prereqs = [p for p in prereqs if p in candidate_skills_set]
            is_blocked = len(met_prereqs) < len(prereqs)

            status = "blocked" if is_blocked else ("focus" if gap["priority"] == "high" else "recommended")

            learning_roadmap.append({
                "id": s_name.lower().replace(" ", "_"),
                "name": s_name,
                "status": status,
                "impact": gap["priority"],
                "prerequisites": prereqs,
                "reason": gap["reason"],
                "estimated_effort_hours": 12 if gap["priority"] == "high" else 8
            })

        # 5. Recommendation Provenance Engine
        recommendations = []
        if profile_data["interview_history_count"] == 0:
            recommendations.append({
                "title": "Complete Initial Mock Interview",
                "priority": "high",
                "reason": "Complete a mock interview session to evaluate system design and response clarity.",
                "source_metrics": ["interview_history_count"],
                "recommended_action": "Start a new mock interview session."
            })

        for gap in prioritized_gaps[:2]:
            recommendations.append({
                "title": f"Master {gap['skill']} for {profile_data['target_company']}",
                "priority": gap["priority"],
                "reason": gap["reason"],
                "source_metrics": gap["evidence_sources"],
                "recommended_action": f"Review {gap['skill']} architecture guidelines and practice interview scenarios."
            })

        if profile_data["weak_areas"]:
            recommendations.append({
                "title": f"Target Weak Topic: {profile_data['weak_areas'][0]}",
                "priority": "high",
                "reason": f"Interview analysis identified {profile_data['weak_areas'][0]} as an area requiring technical depth.",
                "source_metrics": ["interview_weakness"],
                "recommended_action": f"Practice targeted questions on {profile_data['weak_areas'][0]}."
            })

        # 6. LLM Career Synthesis (Optional grounding)
        ai_synthesis = None
        try:
            from app.core.llm_router import generate_content_with_routing
            prompt = (
                f"Summarize candidate career readiness for {profile_data['email']}:\n"
                f"Target Role: {profile_data['target_role']} at {profile_data['target_company']}\n"
                f"Coverage: {coverage_pct}%\n"
                f"Verified Skills: {', '.join(profile_data['verified_skills'])}\n"
                f"Missing Skills: {', '.join(missing_skills)}\n"
                f"Weak Areas: {', '.join(profile_data['weak_areas'])}\n\n"
                f"Provide a 2-sentence executive career roadmap summary based strictly on these facts."
            )
            ai_synthesis = await generate_content_with_routing(
                prompt=prompt,
                timeout=10.0
            )
        except Exception as e:
            logger.warning(f"AI synthesis unavailable: {e}")
            ai_synthesis = f"Target role skill coverage for {profile_data['target_role']} at {profile_data['target_company']} is {coverage_pct}%. Focus on high-priority gaps: {', '.join(missing_skills[:2])}."

        return {
            "profile": profile_data,
            "skill_alignment": {
                "target_role": profile_data["target_role"],
                "target_company": profile_data["target_company"],
                "matched_skills": matched_skills,
                "missing_skills": missing_skills,
                "coverage_percentage": coverage_pct
            },
            "prioritized_gaps": prioritized_gaps,
            "learning_roadmap": learning_roadmap,
            "recommendations": recommendations,
            "ai_synthesis": ai_synthesis
        }

career_intelligence_service = CareerIntelligenceService()
