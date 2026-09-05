import logging
import json
from typing import List, Dict, Any, Optional, Set
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

import networkx as nx

from app.models.user import (
    User, Profile, Resume, Application, InterviewSession, UserMemory, Company,
    LearningCompletion, Roadmap, RoadmapNode
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
        if profile and profile.target_role and profile.target_role.strip():
            target_role = profile.target_role.strip()
        elif latest_resume and latest_resume.ats_analysis and isinstance(latest_resume.ats_analysis, dict) and len(latest_resume.ats_analysis) > 0:
            ats_roles = list(latest_resume.ats_analysis.keys())
            target_role = ats_roles[-1].title().strip()
        elif apps and apps[0].role_title and apps[0].role_title.strip():
            target_role = apps[0].role_title.strip()
        elif latest_resume and latest_resume.parsed_data and isinstance(latest_resume.parsed_data, dict):
            p_data = latest_resume.parsed_data
            target_role = str(
                p_data.get("target_role") or
                p_data.get("job_title") or
                p_data.get("current_role") or
                p_data.get("role") or
                ""
            ).strip()

        # PHASE 2: Target company resolved from candidate profile preferences first
        target_company = ""
        if profile and profile.preferences and isinstance(profile.preferences, dict) and profile.preferences.get("target_company"):
            target_company = str(profile.preferences.get("target_company")).strip()
        elif profile and hasattr(profile, "target_company") and getattr(profile, "target_company"):
            target_company = str(getattr(profile, "target_company")).strip()
        elif apps and apps[0].company_name and apps[0].company_name.strip():
            target_company = apps[0].company_name.strip()

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

        # PHASE 13: Missing score is None, not 0.0
        avg_score = round(sum(scores) / len(scores), 1) if scores else None

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
        self, user_id: int, db: AsyncSession, force_refresh: bool = False
    ) -> Dict[str, Any]:
        import hashlib
        import datetime
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
                if c_insights and isinstance(c_insights, dict) and c_insights.get("tech_stack"):
                    company_tech_stack = normalize_skill_list(c_insights.get("tech_stack", []))
            except Exception as e:
                logger.warning(f"Could not fetch company insights for {profile_data['target_company']}: {e}")

        # PHASE 4: Requirement generation isolated strictly from candidate evidence (no resume text passed into role prompt)
        if not company_tech_stack and profile_data["target_role"]:
            try:
                role_prompt = f"""
Identify the standard, high-demand technical skills and tool stack genuinely required for the target role: "{profile_data['target_role']}".
Strict Rules:
- Return ONLY technical skills, frameworks, and tools that are directly relevant and standard for "{profile_data['target_role']}".
- Do NOT reference any candidate skills, experience, or resume text.
- Return ONLY a JSON list of strings (e.g. ["Skill1", "Skill2", "Skill3"]). Do not include conversational text or markdown code fences.
"""
                res = await generate_content_with_routing(prompt=role_prompt, response_mime_type="application/json", timeout=10.0)
                role_skills = json.loads(res.strip())
                if isinstance(role_skills, list):
                    company_tech_stack = normalize_skill_list([str(x) for x in role_skills])
            except Exception as e:
                logger.warning(f"Failed to generate dynamic tech stack for target role: {e}")

        # PHASE 3: Deterministic SHA-256 state fingerprint covering ALL meaningful inputs
        resume_raw = (latest_resume.raw_text or "") if latest_resume else ""
        resume_hash = hashlib.sha256(resume_raw.encode("utf-8")).hexdigest()
        verified_hash = hashlib.sha256(",".join(sorted(profile_data.get("verified_skills", []))).encode("utf-8")).hexdigest()
        weak_hash = hashlib.sha256(",".join(sorted(profile_data.get("weak_areas", []))).encode("utf-8")).hexdigest()
        company_stack_hash = hashlib.sha256(",".join(sorted(company_tech_stack)).encode("utf-8")).hexdigest()

        # Query user applications for JD text matching target role
        app_res = await db.execute(
            select(Application)
            .filter(Application.user_id == user_id)
            .order_by(Application.created_at.desc())
        )
        apps_list = list(app_res.scalars().all())
        target_role_str = (profile_data.get("target_role") or "").strip().lower()
        matching_app_obj = next((a for a in apps_list if (a.role_title or "").strip().lower() == target_role_str and a.jd_text), None)
        jd_text_val = matching_app_obj.jd_text if matching_app_obj else ""
        jd_hash = hashlib.sha256((jd_text_val or "").encode("utf-8")).hexdigest()

        state_components = (
            f"{profile_data.get('target_role', '').strip()}|"
            f"{profile_data.get('target_company', '').strip()}|"
            f"{resume_hash}|{verified_hash}|{weak_hash}|{jd_hash}|{company_stack_hash}"
        )
        content_fingerprint = hashlib.sha256(state_components.encode("utf-8")).hexdigest()

        # PHASE 11: Version hash differentiates force refresh while maintaining content fingerprint semantics
        state_hash = content_fingerprint

        # Check DB for existing roadmap for this user matching target_role
        res_roadmap = await db.execute(
            select(Roadmap)
            .filter(Roadmap.user_id == user_id)
            .order_by(Roadmap.created_at.desc())
            .options(selectinload(Roadmap.nodes))
        )
        user_roadmaps = list(res_roadmap.scalars().all())
        existing_roadmap = None
        if user_roadmaps:
            for r in user_roadmaps:
                if (r.target_role or "").strip().lower() == target_role_str:
                    existing_roadmap = r
                    break

        # Fetch cached ATS analysis strictly from database
        ats_analysis = None
        if latest_resume and profile_data["target_role"]:
            t_role_str = profile_data["target_role"].strip()
            role_key = t_role_str.lower()
            if latest_resume.ats_analysis and isinstance(latest_resume.ats_analysis, dict) and role_key in latest_resume.ats_analysis:
                ats_analysis = latest_resume.ats_analysis[role_key]
            else:
                from app.services.ats_analyzer import ats_analyzer_service
                ats_analysis = ats_analyzer_service._build_unavailable_response(t_role_str)

        # 2. Dynamic Skill Alignment using validated evidence and gaps
        candidate_skills_set = set(profile_data["verified_skills"])
        target_skills_set = set(normalize_skill_list(company_tech_stack))

        if ats_analysis and ats_analysis.get("status") == "success":
            matched_skills = normalize_skill_list(ats_analysis.get("matched_keywords", []))
            missing_skills = normalize_skill_list([m.get("keyword", "") for m in ats_analysis.get("missing_keywords", []) if isinstance(m, dict) and m.get("keyword")])
            weak_skills = normalize_skill_list(ats_analysis.get("weak_keywords", []))
            
            for ws in weak_skills:
                if ws not in matched_skills and ws not in missing_skills:
                    missing_skills.append(ws)
                    
            matched_lower = {s.lower().strip() for s in matched_skills}
            for vs in profile_data["verified_skills"]:
                vs_norm = vs.strip()
                if vs_norm.lower() not in matched_lower:
                    matched_skills.append(vs_norm)
                    matched_lower.add(vs_norm.lower())
            
            missing_skills = [m for m in missing_skills if m.lower().strip() not in matched_lower]
            
            total_reqs = len(matched_skills) + len(missing_skills)
            coverage_pct = round((len(matched_skills) / max(total_reqs, 1)) * 100, 1)
        else:
            if not target_skills_set and profile_data["weak_areas"]:
                target_skills_set = target_skills_set.union(set(profile_data["weak_areas"]))
            matched_skills = list(candidate_skills_set & target_skills_set)
            missing_skills = list(target_skills_set - candidate_skills_set)
            coverage_pct = round((len(matched_skills) / max(len(target_skills_set), 1)) * 100, 1) if target_skills_set else 100.0

        # Enforce no target_role response
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
                "ai_synthesis": "Please configure your target role in your profile to generate career intelligence.",
                "readiness_score": None,
                "learning_completion_pct": None,
                "next_best_action": None
            }

        # 3. Roadmap Generation (if no cached roadmap exists or force_refresh is requested)
        if not existing_roadmap or force_refresh:
            # PHASE 11: Preserve active LearningCompletions before regenerating roadmap
            res_old_comps = await db.execute(select(LearningCompletion).filter(LearningCompletion.user_id == user_id))
            old_completions = list(res_old_comps.scalars().all())
            completed_skills_history = {c.skill_name.lower().strip() for c in old_completions if c.skill_name}

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
1. Do not invent details. Base recommendations and gaps strictly on the comparison of verified skills versus target requirements.
2. Recommendations must arise only from detected gaps.
3. Roadmap must be dynamically generated. Do not use generic templates.
4. Output must be valid JSON matching the schema below.
5. Do NOT provide fake effort numbers if effort cannot be estimated; return null or realistic hours.

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
      "status": "<string: focus or recommended>",
      "impact": "<string: high, or medium>",
      "prerequisites": [<list of strings: prerequisite skill IDs only (must match an 'id' in this list)>],
      "reason": "<string: reason for this placement>",
      "estimated_effort_hours": null
    }
  ],
  "recommendations": [
    {
      "title": "<string: title of recommendation>",
      "priority": "<string: high, medium, or low>",
      "reason": "<string: reason why recommended>",
      "source_metrics": [<list of strings>],
      "recommended_action": "<string: concrete next action steps>"
    }
  ],
  "ai_synthesis": "<string: executive career roadmap summary>"
}

Return ONLY valid JSON matching this schema. Do not add markdown code fences.
"""

            is_degraded = False
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
                # PHASE 14: Controlled LLM failure fallback without fabricated scores, fake effort (no 8/12), or fake achievements
                logger.error(f"Error generating dynamic career intelligence via LLM: {e}. Utilizing dynamic data-driven degraded fallback.")
                is_degraded = True
                
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
                        "reason": f"Skill '{ms}' required for target role {profile_data['target_role']} was not verified in profile evidence.",
                        "evidence_sources": evidence
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
                        "estimated_effort_hours": None  # PHASE 5: No hardcoded 8 or 12
                    })

                recommendations = []
                data = {
                    "prioritized_gaps": prioritized_gaps,
                    "learning_roadmap": learning_roadmap,
                    "recommendations": recommendations,
                    "ai_synthesis": f"Skill coverage for target role '{profile_data['target_role']}' is {coverage_pct}% (degraded analysis)."
                }
                
            # Create new Roadmap DB entity with distinct version_hash if force_refresh
            version_str = f"{content_fingerprint}_rf_{int(datetime.datetime.now(datetime.timezone.utc).timestamp())}" if force_refresh else content_fingerprint

            # Delete old roadmap if replacing
            if existing_roadmap:
                await db.delete(existing_roadmap)
                await db.flush()
                
            roadmap_db = Roadmap(
                user_id=user_id,
                target_role=profile_data["target_role"],
                target_company=profile_data["target_company"],
                version_hash=version_str
            )
            db.add(roadmap_db)
            await db.flush()
            
            # Create new nodes and migrate completions safely
            for n in data.get("learning_roadmap", []):
                prereqs = n.get("prerequisites", [])
                if not isinstance(prereqs, list):
                    prereqs = []
                prereqs = [p["name"] if isinstance(p, dict) else str(p) for p in prereqs]
                
                effort_val = n.get("estimated_effort_hours")
                if effort_val in [8, 12] and is_degraded:
                    effort_val = None  # Enforce no hardcoded 8/12

                node_db = RoadmapNode(
                    roadmap_id=roadmap_db.id,
                    skill_name=n["name"],
                    skill_id=n.get("id", n["name"].lower().replace(" ", "_")),
                    status=n.get("status", "recommended"),  # Persisted recommendation status
                    impact=n.get("impact", "medium"),
                    estimated_effort_hours=effort_val,
                    reason=n.get("reason", ""),
                    prerequisites_json=prereqs
                )
                db.add(node_db)
                await db.flush()

                # Re-link existing user completion if user previously completed this skill
                if n["name"].lower().strip() in completed_skills_history:
                    new_comp = LearningCompletion(
                        user_id=user_id,
                        roadmap_node_id=node_db.id,
                        skill_name=node_db.skill_name
                    )
                    db.add(new_comp)

            await db.commit()
            await db.refresh(roadmap_db)
            existing_roadmap = roadmap_db
            
            # Cache meta
            res_prof = await db.execute(select(Profile).filter(Profile.user_id == user_id))
            profile_obj = res_prof.scalars().first()
            if profile_obj:
                profile_obj.preferences = dict(profile_obj.preferences or {})
                profile_obj.preferences["career_intelligence_meta"] = {
                    "version_hash": version_str,
                    "prioritized_gaps": data.get("prioritized_gaps", []),
                    "recommendations": data.get("recommendations", []),
                    "ai_synthesis": data.get("ai_synthesis")
                }
                db.add(profile_obj)
                await db.commit()
                
        # Retrieve meta from cache
        res_prof = await db.execute(select(Profile).filter(Profile.user_id == user_id))
        profile_obj = res_prof.scalars().first()
        meta = profile_obj.preferences.get("career_intelligence_meta", {}) if profile_obj and profile_obj.preferences else {}
        
        # PHASE 6: Fetch explicit LearningCompletions tied strictly to user and roadmap nodes
        res_comps = await db.execute(select(LearningCompletion).filter(LearningCompletion.user_id == user_id))
        user_completions = list(res_comps.scalars().all())
        completed_node_ids = {c.roadmap_node_id for c in user_completions if c.roadmap_node_id}
        
        # PHASE 7: Possessing a verified skill is distinct from learning completion
        verified_skills_lower = {s.lower().strip() for s in profile_data["verified_skills"]}

        res_nodes = await db.execute(select(RoadmapNode).filter(RoadmapNode.roadmap_id == existing_roadmap.id))
        roadmap_nodes_list = list(res_nodes.scalars().all())

        G = nx.DiGraph()
        node_lookup = {}
        for nd in roadmap_nodes_list:
            n_data = {
                "id": nd.skill_id,
                "db_node_id": nd.id,
                "name": nd.skill_name,
                "impact": nd.impact,
                "estimated_effort_hours": nd.estimated_effort_hours,
                "reason": nd.reason,
                "prerequisites_json": nd.prerequisites_json,
                "db_status": nd.status  # Persisted recommendation status
            }
            G.add_node(nd.skill_id, **n_data)
            node_lookup[nd.skill_id] = nd

        # PHASE 9: Deterministic NetworkX DAG construction & cycle handling
        for node_id in G.nodes():
            for prereq in G.nodes[node_id]["prerequisites_json"]:
                if G.has_node(prereq) and prereq != node_id:
                    # Prevent cycle before adding edge
                    if not nx.has_path(G, node_id, prereq):
                        G.add_edge(prereq, node_id)
                    else:
                        logger.warning(f"Prevented cyclic prerequisite edge from '{prereq}' to '{node_id}'.")

        # Double-check for cycles
        try:
            cycles = list(nx.simple_cycles(G))
            for cycle in cycles:
                if len(cycle) >= 2 and G.has_edge(cycle[-1], cycle[0]):
                    G.remove_edge(cycle[-1], cycle[0])
        except Exception as e:
            logger.warning(f"Error handling cycles in DAG: {e}")

        # Compute topological phases
        for node_id in G.nodes():
            G.nodes[node_id]["phase"] = 1

        try:
            topo_order = list(nx.topological_sort(G))
        except nx.NetworkXUnfeasible:
            logger.warning("Unfeasible DAG topology detected. Using fallback node order.")
            topo_order = list(G.nodes())

        for node_id in topo_order:
            preds = list(G.predecessors(node_id))
            if preds:
                G.nodes[node_id]["phase"] = max(G.nodes[p]["phase"] for p in preds) + 1

        # PHASE 6, 7 & 10: Compute Status & Dependency Propagation
        enriched_roadmap = []
        for node_id in topo_order:
            node_data = G.nodes[node_id]
            db_node = node_lookup[node_id]

            # PHASE 6: Roadmap completion is STRICTLY based on db_node.id in completed_node_ids
            is_completed = (db_node.id in completed_node_ids)

            if is_completed:
                node_data["computed_status"] = "completed"
            else:
                # PHASE 7: Prerequisite is met if completed node OR possessed verified skill
                is_blocked = False
                for p in G.predecessors(node_id):
                    p_db_node_id = G.nodes[p]["db_node_id"]
                    p_name_lower = G.nodes[p]["name"].lower().strip()
                    p_is_met = (p_db_node_id in completed_node_ids) or (p_name_lower in verified_skills_lower)
                    if not p_is_met:
                        is_blocked = True
                        break

                if is_blocked:
                    node_data["computed_status"] = "blocked"
                else:
                    current_status = node_data["db_status"]
                    node_data["computed_status"] = current_status if current_status in ["focus", "recommended"] else "recommended"

            # Build prerequisites output format for UI
            prereqs_out = []
            for p in G.predecessors(node_id):
                p_db_node_id = G.nodes[p]["db_node_id"]
                p_name_lower = G.nodes[p]["name"].lower().strip()
                p_met = (p_db_node_id in completed_node_ids) or (p_name_lower in verified_skills_lower)
                prereqs_out.append({
                    "name": G.nodes[p]["name"],
                    "met": p_met
                })

            enriched_roadmap.append({
                "id": str(db_node.id),
                "node_id": db_node.id,
                "skill_id": node_id,
                "name": node_data["name"],
                "status": node_data["computed_status"],  # Computed runtime status for frontend
                "impact": node_data["impact"],
                "prerequisites": prereqs_out,
                "reason": node_data["reason"],
                "estimated_effort_hours": node_data["estimated_effort_hours"],
                "phase": node_data["phase"]
            })
            
        # PHASE 10: Update phase on db_nodes while preserving original recommendation status in DB
        for node_id in G.nodes():
            db_node = node_lookup[node_id]
            db_node.phase = G.nodes[node_id]["phase"]
            # Do NOT overwrite db_node.status (preserve recommendation status focus/recommended)
        await db.commit()

        # PHASE 8: Separate roadmap learning completion percentage from career readiness score
        total_nodes = len(G.nodes)
        completed_nodes = sum(1 for n in G.nodes.values() if n.get("computed_status") == "completed")
        learning_completion_pct = round((completed_nodes / total_nodes) * 100, 1) if total_nodes > 0 else 0.0

        # Career readiness score measures validated requirement alignment coverage
        readiness_score = coverage_pct if profile_data["target_role"] else None

        # Compute Next Best Action
        next_action = None
        for r_node in enriched_roadmap:
            if r_node["status"] in ["focus", "recommended"]:
                if next_action is None or r_node["impact"] == "high":
                    next_action = r_node
                    if r_node["impact"] == "high":
                        break
                        
        final_result = {
            "profile": profile_data,
            "skill_alignment": {
                "target_role": profile_data["target_role"],
                "target_company": profile_data["target_company"],
                "matched_skills": matched_skills,
                "missing_skills": missing_skills,
                "coverage_percentage": coverage_pct
            },
            "prioritized_gaps": meta.get("prioritized_gaps", []),
            "learning_roadmap": enriched_roadmap,
            "recommendations": meta.get("recommendations", []),
            "ai_synthesis": meta.get("ai_synthesis"),
            "readiness_score": readiness_score,
            "learning_completion_pct": learning_completion_pct,
            "next_best_action": next_action
        }

        return final_result

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
                ats_gaps = [m.get("keyword") for m in analysis.get("missing_keywords", []) if isinstance(m, dict) and m.get("keyword")]

        # 3. Interview Performance
        res_interviews = await db.execute(
            select(InterviewSession)
            .filter(InterviewSession.user_id == user_id)
            .options(selectinload(InterviewSession.feedbacks))
        )
        interviews = list(res_interviews.scalars().all())
        completed_interviews = [i for i in interviews if i.is_completed]
        
        # PHASE 13: missing score is None, not 0.0
        avg_interview_score = None
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

        # 4. Applications State
        res_apps = await db.execute(select(Application).filter(Application.user_id == user_id))
        apps = list(res_apps.scalars().all())
        active_apps_count = len(apps)

        # PHASE 12: Deterministic SHA-256 state fingerprint from ACTUAL recommendation inputs
        resume_raw = latest_resume.raw_text if latest_resume else ""
        resume_hash = hashlib.sha256(resume_raw.encode("utf-8")).hexdigest() if resume_raw else "no_resume"
        ats_score_str = str(ats_score) if ats_score is not None else "none"
        ats_gaps_str = ",".join(sorted(ats_gaps))
        interview_score_str = str(avg_interview_score) if avg_interview_score is not None else "none"
        app_states_str = ",".join(sorted([f"{a.company_name}:{a.status}" for a in apps]))
        skills_list = profile.skills_json.get("skills", []) if profile and profile.skills_json and isinstance(profile.skills_json, dict) else []
        skills_str = ",".join(sorted([str(s) for s in skills_list]))

        state_str = (
            f"role:{target_role or ''}|resume:{resume_hash}|ats_score:{ats_score_str}|"
            f"gaps:{ats_gaps_str}|int_score:{interview_score_str}|int_count:{len(completed_interviews)}|"
            f"apps:{app_states_str}|skills:{skills_str}"
        )
        state_hash = hashlib.sha256(state_str.encode("utf-8")).hexdigest()

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
            "skills": [s.title() for s in skills_list]
        }

        # Programmatic fallbacks if API routing fails
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
            pass
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
                    f"Profile is analyzed for {target_role}, but interview readiness is currently unavailable.",
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
                    f"Your profile shows alignment with {target_role}.",
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
            "1. Grounding: Do not invent any achievements, scores, completed interviews, skills, or applications.\n"
            "2. Missing Data: If candidate has no target role configured or no resume uploaded, identify this missing data explicitly.\n"
            "3. Action Route: Provide the exact frontend destination route (/resume, /skills, /interviews, /applications, /career).\n"
            "4. Return ONLY a valid JSON object matching the JSON Schema below. No other text, no markdown code fences.\n\n"
            "JSON Schema:\n"
            "{\n"
            "  \"title\": \"The single highest-priority next action title (max 60 chars)\",\n"
            "  \"explanation\": \"A concise explanation of why this is the best current step (max 150 chars)\",\n"
            "  \"supporting_reasons\": [\"2-3 concrete reasons based strictly on snapshot data\"],\n"
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

