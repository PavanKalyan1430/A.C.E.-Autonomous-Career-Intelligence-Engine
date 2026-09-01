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
from app.core.llm_router import generate_content_with_routing

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

        target_role = ""
        if profile and profile.target_role:
            target_role = profile.target_role
        elif apps:
            target_role = apps[0].role_title

        target_company = apps[0].company_name if apps else ""

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

        # Retrieve the latest resume to run ATS analysis
        res_resumes = await db.execute(
            select(Resume)
            .filter(Resume.user_id == user_id)
            .order_by(Resume.created_at.desc())
        )
        resumes = list(res_resumes.scalars().all())
        latest_resume = resumes[0] if resumes else None

        # 1. Fetch Target Company Intelligence if company specified
        company_tech_stack = []
        if profile_data["target_company"]:
            try:
                c_insights = await self.company_intel_service.get_company_insights(profile_data["target_company"])
                if c_insights and c_insights.get("tech_stack"):
                    company_tech_stack = normalize_skill_list(c_insights.get("tech_stack", []))
            except Exception as e:
                logger.warning(f"Could not fetch company insights for {profile_data['target_company']}: {e}")

        # If company stack is empty or missing, generate expected tech stack dynamically for the specific target role using LLM
        if not company_tech_stack and profile_data["target_role"]:
            try:
                role_prompt = f"""
Identify the standard, high-demand technical skills and tool stack genuinely required for the target role: "{profile_data['target_role']}".
Strict Rules:
- Return ONLY technical skills, frameworks, and tools that are directly relevant and standard for "{profile_data['target_role']}".
- Do NOT include generic or unrelated software stacks that do not belong to this target role.
- Return ONLY a JSON list of strings (e.g. ["Skill1", "Skill2", "Skill3"]). Do not include conversational text or markdown code fences.
"""
                res = await generate_content_with_routing(prompt=role_prompt, response_mime_type="application/json", timeout=10.0)
                role_skills = json.loads(res.strip())
                if isinstance(role_skills, list):
                    company_tech_stack = normalize_skill_list([str(x) for x in role_skills])
            except Exception as e:
                logger.warning(f"Failed to generate dynamic tech stack for target role: {e}")

        # Run ATS analysis to fetch validated evidence & gaps
        ats_analysis = None
        if latest_resume and profile_data["target_role"]:
            # Query user applications to see if there is an application for this role with a JD
            app_result = await db.execute(
                select(Application)
                .filter(Application.user_id == user_id)
                .order_by(Application.created_at.desc())
            )
            apps = list(app_result.scalars().all())
            jd_text = None
            matching_app = next((a for a in apps if a.role_title.lower() == profile_data["target_role"].lower() and a.jd_text), None)
            if matching_app:
                jd_text = matching_app.jd_text

            try:
                from app.services.ats_analyzer import ats_analyzer_service
                ats_analysis = await ats_analyzer_service.analyze_resume_ats(
                    raw_text=latest_resume.raw_text,
                    parsed_data=latest_resume.parsed_data or {},
                    target_role=profile_data["target_role"],
                    jd_text=jd_text
                )
            except Exception as e:
                logger.error(f"Failed to compute ATS analysis for career intelligence: {e}")

        # 2. Dynamic Skill Alignment using validated evidence and gaps from ATS analysis if available
        candidate_skills_set = set(profile_data["verified_skills"])
        target_skills_set = set(normalize_skill_list(company_tech_stack))

        if ats_analysis and ats_analysis.get("status") == "success":
            matched_skills = normalize_skill_list(ats_analysis.get("matched_keywords", []))
            missing_skills = normalize_skill_list([m.get("keyword", "") for m in ats_analysis.get("missing_keywords", [])])
            weak_skills = normalize_skill_list(ats_analysis.get("weak_keywords", []))
            
            # Merge weak skills into missing/gap skills if they aren't already matched
            for ws in weak_skills:
                if ws not in matched_skills and ws not in missing_skills:
                    missing_skills.append(ws)
            
            total_reqs = len(matched_skills) + len(missing_skills)
            coverage_pct = round((len(matched_skills) / max(total_reqs, 1)) * 100, 1)
        else:
            if not target_skills_set and profile_data["weak_areas"]:
                target_skills_set = target_skills_set.union(set(profile_data["weak_areas"]))
            matched_skills = list(candidate_skills_set & target_skills_set)
            missing_skills = list(target_skills_set - candidate_skills_set)
            coverage_pct = round((len(matched_skills) / max(len(target_skills_set), 1)) * 100, 1) if target_skills_set else 100.0

        # Enforce that if no target_role exists, we notify user rather than fabricating data.
        if not profile_data["target_role"]:
            return {
                "profile": profile_data,
                "skill_alignment": {
                    "target_role": "",
                    "target_company": profile_data["target_company"],
                    "matched_skills": [],
                    "missing_skills": [],
                    "coverage_percentage": 0.0
                },
                "prioritized_gaps": [],
                "learning_roadmap": [],
                "recommendations": [],
                "ai_synthesis": "Please configure your target role in your profile to generate career intelligence."
            }

        # 3. Dynamic Synthesis of roadmaps, prioritized gaps, and recommendations via LLM
        prompt = f"""
You are an expert career advisor. Evaluate this candidate's profile against the target role: "{profile_data['target_role']}".

Candidate Profile:
- Verified Skills: {json.dumps(profile_data['verified_skills'])}
- Weak Areas (from mock interviews): {json.dumps(profile_data['weak_areas'])}
- Interview History Count: {profile_data['interview_history_count']}
- Average Interview Score: {profile_data['average_interview_score']}
- Target Company: "{profile_data['target_company']}"
- Target Tech Stack: {json.dumps(company_tech_stack)}

Analysis Gaps:
- Matched Skills: {json.dumps(matched_skills)}
- Missing Skills: {json.dumps(missing_skills)}
- Coverage Percentage: {coverage_pct}%
"""

        if ats_analysis and ats_analysis.get("status") == "success":
            prompt += f"""
Validated Resume Evidence & Gaps (ATS Analysis):
- Key Strengths: {json.dumps(ats_analysis.get("key_strengths", []))}
- Evidence Matrix: {json.dumps(ats_analysis.get("evidence_matrix", []), indent=2)}
- Actionable Improvements: {json.dumps(ats_analysis.get("actionable_improvements", []), indent=2)}
"""

        prompt += """
Rules:
1. Do not invent details. Base recommendations and gaps strictly on the comparison of verified skills versus target requirements, leveraging the validated evidence and gaps from the resume ATS analysis.
2. Recommendations must arise only from detected gaps. If there are no missing skills, weak areas, or deficiencies, do not recommend random learning resources or paths.
3. Roadmap must be dynamically generated. Do not use generic templates.
4. Output must be a valid JSON matching the schema below.

JSON Schema:
{
  "prioritized_gaps": [
    {
      "skill": "<string: gap skill name>",
      "priority": "<string: high, medium, or low>",
      "reason": "<string: detailed reason why this gap is critical>",
      "evidence_sources": [<list of strings: e.g. "resume_gap", "company_requirement", "interview_weakness">]
    }
  ],
  "learning_roadmap": [
    {
      "id": "<string: lowercase unique ID e.g. fastapi>",
      "name": "<string: skill name>",
      "status": "<string: completed, focus, recommended, or blocked>",
      "impact": "<string: high, or medium>",
      "prerequisites": [<list of strings: prerequisite skill IDs or names>],
      "reason": "<string: reason for this placement>",
      "estimated_effort_hours": <int: estimated hours of effort>
    }
  ],
  "recommendations": [
    {
      "title": "<string: title of recommendation>",
      "priority": "<string: high, medium, or low>",
      "reason": "<string: reason why recommended>",
      "source_metrics": [<list of strings: e.g. "interview_history_count", "resume_gap", "interview_weakness">],
      "recommended_action": "<string: concrete next action steps>"
    }
  ],
  "ai_synthesis": "<string: 2-sentence executive career roadmap summary>"
}

Return ONLY valid JSON matching this schema. Do not add markdown blocks or notes outside the JSON.
"""

        try:
            res_text = await generate_content_with_routing(prompt=prompt, response_mime_type="application/json", timeout=25.0)
            cleaned_json = res_text.strip()
            if cleaned_json.startswith("```"):
                lines = cleaned_json.splitlines()
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].startswith("```"):
                    lines = lines[:-1]
                cleaned_json = "\n".join(lines).strip()

            data = json.loads(cleaned_json)
        except Exception as e:
            logger.error(f"Error generating dynamic career intelligence via LLM: {e}. Utilizing local dynamic data-driven fallback.")
            
            # Dynamic local fallback based strictly on user data to handle offline/test environments
            prioritized_gaps = []
            for ms in missing_skills:
                evidence = ["resume_gap"]
                priority = "medium"
                if ms in profile_data["weak_areas"]:
                    priority = "high"
                    evidence.append("interview_weakness")
                prioritized_gaps.append({
                    "skill": ms,
                    "priority": priority,
                    "reason": f"Skill '{ms}' required for the target role was not found in candidate's verified skills list.",
                    "evidence_sources": evidence
                })
            
            # Ensure weak areas from mock interviews that might not be in missing_skills are also analyzed
            for wa in profile_data["weak_areas"]:
                if wa not in [g["skill"] for g in prioritized_gaps]:
                    prioritized_gaps.append({
                        "skill": wa,
                        "priority": "high",
                        "reason": f"Active weakness in '{wa}' was detected in mock interview history.",
                        "evidence_sources": ["interview_weakness"]
                    })

            learning_roadmap = []
            for gap in prioritized_gaps:
                learning_roadmap.append({
                    "id": gap["skill"].lower().replace(" ", "_"),
                    "name": gap["skill"],
                    "status": "focus" if gap["priority"] == "high" else "recommended",
                    "impact": gap["priority"],
                    "prerequisites": [],
                    "reason": gap["reason"],
                    "estimated_effort_hours": 12 if gap["priority"] == "high" else 8
                })

            recommendations = []
            if profile_data["interview_history_count"] == 0:
                recommendations.append({
                    "title": "Complete Initial Mock Interview",
                    "priority": "high",
                    "reason": "Mock interview profile is currently empty.",
                    "source_metrics": ["interview_history_count"],
                    "recommended_action": "Launch your first mock interview simulation to assess system design and communication skills."
                })
            for gap in prioritized_gaps:
                recommendations.append({
                    "title": f"Master {gap['skill']}",
                    "priority": gap["priority"],
                    "reason": gap["reason"],
                    "source_metrics": gap["evidence_sources"],
                    "recommended_action": f"Review core concepts, architecture guidelines, and typical interview questions for {gap['skill']}."
                })

            data = {
                "prioritized_gaps": prioritized_gaps,
                "learning_roadmap": learning_roadmap,
                "recommendations": recommendations,
                "ai_synthesis": f"Target role skill coverage for {profile_data['target_role']} is {coverage_pct}%."
            }

        # Enrich prerequisites and force verified skills to completed status or blocked if prereqs unmet
        enriched_roadmap = []
        verified_skills_lower = {s.lower() for s in profile_data["verified_skills"]}
        
        # First pass to compute completed nodes
        raw_nodes = data.get("learning_roadmap", [])
        for node in raw_nodes:
            node_copy = dict(node)
            raw_prereqs = node_copy.get("prerequisites", [])
            enriched_prereqs = []
            has_unmet_prereq = False
            for p in raw_prereqs:
                p_name = p.get("name") if isinstance(p, dict) else str(p)
                met = p_name.lower() in verified_skills_lower
                if not met:
                    has_unmet_prereq = True
                enriched_prereqs.append({
                    "name": p_name,
                    "met": met
                })
            node_copy["prerequisites"] = enriched_prereqs
            node_name = node_copy.get("name", "")
            
            if node_name.lower() in verified_skills_lower:
                node_copy["status"] = "completed"
            elif has_unmet_prereq:
                node_copy["status"] = "blocked"
            else:
                # Keep existing focus or recommended status
                current_status = str(node_copy.get("status", "recommended")).lower()
                node_copy["status"] = current_status if current_status in ["focus", "recommended"] else "recommended"
                
            enriched_roadmap.append(node_copy)

        return {
            "profile": profile_data,
            "skill_alignment": {
                "target_role": profile_data["target_role"],
                "target_company": profile_data["target_company"],
                "matched_skills": matched_skills,
                "missing_skills": missing_skills,
                "coverage_percentage": coverage_pct
            },
            "prioritized_gaps": data.get("prioritized_gaps", []),
            "learning_roadmap": enriched_roadmap,
            "recommendations": data.get("recommendations", []),
            "ai_synthesis": data.get("ai_synthesis")
        }

    async def generate_dashboard_recommendation(
        self, user_id: int, db: AsyncSession, force_refresh: bool = False
    ) -> Dict[str, Any]:
        import hashlib

        # 1. Fetch Profile & target role
        res_prof = await db.execute(select(Profile).filter(Profile.user_id == user_id))
        profile = res_prof.scalars().first()
        target_role = profile.target_role if profile else None

        # 2. Fetch Latest Resume & ATS Score
        res_resumes = await db.execute(
            select(Resume)
            .filter(Resume.user_id == user_id)
            .order_by(Resume.created_at.desc())
        )
        resumes = list(res_resumes.scalars().all())
        latest_resume = resumes[0] if resumes else None

        ats_score = None
        ats_gaps = []
        if latest_resume and target_role and latest_resume.ats_analysis:
            role_key = target_role.strip().lower()
            analysis = latest_resume.ats_analysis.get(role_key)
            if not analysis:
                analyses = list(latest_resume.ats_analysis.values())
                if analyses:
                    analysis = analyses[0]
            if analysis and isinstance(analysis, dict):
                ats_score = analysis.get("overall_ats_score")
                ats_gaps = [m.get("keyword") for m in analysis.get("missing_keywords", []) if m.get("keyword")]

        # 3. Interview Performance
        res_interviews = await db.execute(
            select(InterviewSession)
            .filter(InterviewSession.user_id == user_id)
            .options(selectinload(InterviewSession.feedbacks))
        )
        interviews = list(res_interviews.scalars().all())
        completed_interviews = [i for i in interviews if i.is_completed]
        
        avg_interview_score = 0.0
        scores = []
        for i in completed_interviews:
            s_score = 0.0
            if i.feedback and isinstance(i.feedback, dict):
                s_score = float(i.feedback.get("overall_score", 0.0))
            elif i.feedbacks:
                s_score = float(i.feedbacks[0].overall_score)
            if s_score > 0:
                scores.append(s_score)
        if scores:
            avg_interview_score = round(sum(scores) / len(scores), 1)

        # 4. Applications Count
        res_apps = await db.execute(select(Application).filter(Application.user_id == user_id))
        apps = list(res_apps.scalars().all())
        active_apps_count = len(apps)

        # Calculate state hash to prevent duplicate LLM calls
        state_str = f"{target_role}:{len(resumes)}:{len(completed_interviews)}:{active_apps_count}:{ats_score or 0}"
        state_hash = hashlib.md5(state_str.encode("utf-8")).hexdigest()

        # Check preferences cache
        if profile and profile.preferences and not force_refresh:
            cached_data = profile.preferences.get("dashboard_recommendation_cache")
            if isinstance(cached_data, dict) and cached_data.get("state_hash") == state_hash:
                rec = cached_data.get("recommendation")
                if rec and isinstance(rec, dict) and "title" in rec:
                    logger.info("Serving dashboard recommendation from cache.")
                    return rec

        # Build career snapshot for LLM
        career_snapshot = {
            "has_resume": latest_resume is not None,
            "resume_file_name": latest_resume.file_name if latest_resume else None,
            "target_role": target_role,
            "ats_score": ats_score,
            "ats_gaps": ats_gaps,
            "interview_sessions_count": len(completed_interviews),
            "average_interview_score": avg_interview_score,
            "active_applications_count": active_apps_count,
            "skills": [s.title() for s in (profile.skills_json.get("skills", []) if profile and profile.skills_json else [])]
        }

        # Safe programmatic fallbacks if API routing fails or if there is not enough data
        fallback_rec = {
            "title": "Upload Your Resume",
            "explanation": "Upload your latest resume to establish a career intelligence baseline.",
            "supporting_reasons": [
                "No resume has been parsed in the system yet.",
                "ATS alignment scoring is currently locked."
            ],
            "expected_benefit": "Unlocks ATS score mapping, missing keyword gaps, and practice roadmaps.",
            "route": "/resume"
        }

        if not latest_resume:
            pass # Keep upload resume fallback
        elif not target_role:
            fallback_rec = {
                "title": "Configure Target Role",
                "explanation": "Select your target career path to map profile compatibility.",
                "supporting_reasons": [
                    "Resume is parsed, but target role is unconfigured.",
                    "ATS requirements cannot be synthesized without a target role."
                ],
                "expected_benefit": "Activates custom keyword scanning and skill roadmaps.",
                "route": "/resume"
            }
        elif len(completed_interviews) == 0:
            fallback_rec = {
                "title": "Complete First Mock Interview",
                "explanation": "Trigger an AI mock session to evaluate technical response pacing and clarity.",
                "supporting_reasons": [
                    f"Profile is analyzed for {target_role}, but interview readiness is currently --/100.",
                    "Practicing technical responses provides immediate confidence and filler-word metrics."
                ],
                "expected_benefit": "Unlocks interview score trend metrics on the dashboard.",
                "route": "/interviews"
            }
        elif ats_gaps:
            fallback_rec = {
                "title": "Bridge Priority Skill Gaps",
                "explanation": f"Acquire missing capabilities identified for {target_role}.",
                "supporting_reasons": [
                    f"ATS scan identified {len(ats_gaps)} missing keywords in your profile.",
                    f"Key missing skills include: {', '.join(ats_gaps[:2])}."
                ],
                "expected_benefit": "Increases ATS score and improves application match alignment.",
                "route": "/skills"
            }
        else:
            fallback_rec = {
                "title": "Consult A.C.E. Career Agent",
                "explanation": "Explore custom market trends, company insights, and targeted strategies with A.C.E.",
                "supporting_reasons": [
                    f"Your profiles shows alignment with {target_role}.",
                    "A.C.E. agent can help identify companies matching your tech stack."
                ],
                "expected_benefit": "Enables personalized company outreach plans.",
                "route": "/career"
            }

        prompt = (
            "You are an expert career intelligence engine named A.C.E. (Autonomous Career Engine).\n"
            "Based strictly on the candidate's career data snapshot below, generate a high-priority, data-grounded next step recommendation.\n\n"
            f"Candidate Data Snapshot:\n{json.dumps(career_snapshot, indent=2)}\n\n"
            "Rules:\n"
            "1. Grounding: Do not invent any achievements, scores, completed interviews, skills, or applications. If the candidate has 0 applications, do not say 'review your 5 active applications'.\n"
            "2. Missing Data: If candidate has no target role configured or no resume uploaded, identify this missing data explicitly. Recommend setting a target role or uploading a resume.\n"
            "3. Action Route: Provide the exact frontend destination route that maps to the action. It MUST be one of:\n"
            "   - '/resume' (if they need to upload a resume or set their target role)\n"
            "   - '/skills' (if they have skill gaps to learn/review)\n"
            "   - '/interviews' (if they need to complete mock sessions or improve their interview score)\n"
            "   - '/applications' (if they need to track/apply for jobs)\n"
            "   - '/career' (if they need to explore options or consult the A.C.E. Agent)\n"
            "4. Return ONLY a valid JSON object matching the JSON Schema below. No other text, no markdown block formatting (like ```json), just raw JSON.\n\n"
            "JSON Schema:\n"
            "{\n"
            "  \"title\": \"The single highest-priority next action title (max 60 chars)\",\n"
            "  \"explanation\": \"A concise explanation of why this is the best current step (max 150 chars)\",\n"
            "  \"supporting_reasons\": [\"2-3 concrete reasons based strictly on the snapshot data\"],\n"
            "  \"expected_benefit\": \"The expected career benefit or unlocked metric (max 100 chars)\",\n"
            "  \"route\": \"/resume or /skills or /interviews or /applications or /career\"\n"
            "}"
        )

        try:
            res_text = await generate_content_with_routing(prompt=prompt, response_mime_type="application/json")
            cleaned_json = res_text.strip()
            if cleaned_json.startswith("```"):
                lines = cleaned_json.splitlines()
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].startswith("```"):
                    lines = lines[:-1]
                cleaned_json = "\n".join(lines).strip()

            rec_data = json.loads(cleaned_json)
            if isinstance(rec_data, dict) and "title" in rec_data and "route" in rec_data:
                # Save to cache
                if profile:
                    profile.preferences = dict(profile.preferences)
                    profile.preferences["dashboard_recommendation_cache"] = {
                        "state_hash": state_hash,
                        "recommendation": rec_data
                    }
                    db.add(profile)
                    await db.commit()
                return rec_data
        except Exception as e:
            logger.error(f"Failed to generate dynamic recommendation via LLM: {e}")

        # Fallback to safe computed recommendation
        if profile:
            profile.preferences = dict(profile.preferences)
            profile.preferences["dashboard_recommendation_cache"] = {
                "state_hash": state_hash,
                "recommendation": fallback_rec
            }
            db.add(profile)
            await db.commit()
        return fallback_rec

career_intelligence_service = CareerIntelligenceService()
