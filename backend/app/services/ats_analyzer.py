import json
import logging
import re
from typing import Dict, Any, Optional, List
from app.core.llm_router import generate_content_with_routing
from app.services.nlp_service import production_nlp_service

logger = logging.getLogger(__name__)

# ACE's centralized ATS scoring methodology configuration.
ACE_SCORING_METHODOLOGY = {
    "category_weights": {
        "ats_structure_formatting": 0.20,
        "skills_keyword_coverage": 0.25,
        "experience_impact": 0.25,
        "projects_portfolio": 0.15,
        "role_alignment": 0.15
    },
    "evidence_strength_scores": {
        "strong": 100.0,
        "partial": 60.0,
        "weak": 30.0,
        "missing": 0.0
    },
    "importance_weights": {
        "mandatory": 1.2,
        "normal": 1.0,
        "preferred": 0.8
    },
    "quality_dimension_scores": {
        "strong": 10.0,
        "partial": 6.0,
        "weak": 2.0,
        "missing": 0.0
    },
    "penalties": {
        "excessive_length": 15,
        "duplicate_section": 10,
        "formatting_deficiency": 5
    }
}

class ATSAnalyzerService:
    async def analyze_resume_ats(
        self,
        raw_text: str,
        parsed_data: Dict[str, Any],
        target_role: Optional[str] = None,
        jd_text: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Computes a production-grade, evidence-driven, explainable ATS analysis.
        Strict Rules:
        - Requirements defined by JD (if supplied) or role inference (if no JD). Candidate resume NEVER generates requirements.
        - Experience & Project scores are strictly derived from evidence quality dimensions. Zero count bonuses.
        - Mathematics strictly bounded 0-100 across all requirements, categories, and final score.
        """
        if not target_role:
            raise ValueError("Target role must be specified.")

        source_type = "supplied_jd" if (jd_text and jd_text.strip()) else "role_inference"

        # ─── 1. OBJECTIVE LOCAL NLP FEATURE EXTRACTION ───
        nlp_features = await production_nlp_service.extract_linguistic_features(raw_text)
        action_verbs = nlp_features.get("action_verbs", [])
        quantifiable_metrics = nlp_features.get("quantifiable_metrics", [])
        noun_chunks = nlp_features.get("noun_chunks", [])
        word_count = len(raw_text.split())

        # ─── 2. ISOLATED ROLE INFERENCE REQUIREMENT GENERATION (NO RESUME CONTEXT) ───
        fixed_requirements_json = None
        if source_type == "role_inference":
            role_req_prompt = f"""You are a Staff Technical Recruiter. Extract 5-8 core technical requirements and industry expectations for the target role: "{target_role}".
Do NOT reference any candidate or resume. Focus strictly on independent industry standard requirements for "{target_role}".

Return ONLY valid JSON format matching this schema:
{{
  "requirements": [
    {{
      "requirement_id": "req_1",
      "requirement_text": "Core technical requirement description for {target_role}",
      "normalized_skill": "skill_name",
      "category": "technical_skill",
      "importance": "mandatory",
      "supporting_jd_evidence": "Standard industry expectation for {target_role}"
    }}
  ]
}}
Do not add markdown code fences.
"""
            try:
                role_req_res = await generate_content_with_routing(
                    prompt=role_req_prompt,
                    response_mime_type="application/json",
                    timeout=15.0
                )
                fixed_requirements_json = json.loads(self._clean_json(role_req_res))
            except Exception as e:
                logger.warning(f"Isolated role requirement generation failed ({e}).")

        # ─── 3. STRUCTURED LLM EVALUATION CONTRACT ───
        if source_type == "supplied_jd":
            jd_instruction = f"Target Job Description:\n{jd_text}\nExtract core requirements ONLY from this Job Description."
        elif fixed_requirements_json and isinstance(fixed_requirements_json, dict) and fixed_requirements_json.get("requirements"):
            req_str = json.dumps(fixed_requirements_json.get("requirements"))
            jd_instruction = f"Audit candidate's resume against these FIXED independent target role requirements for {target_role}:\n{req_str}\nDO NOT invent new requirements."
        else:
            jd_instruction = f"Extract standard industry expectations and core technical requirements for the role: \"{target_role}\". DO NOT use the candidate's resume text to invent requirements."

        evaluation_prompt = f"""
You are an expert ATS Auditor and Technical Recruiter auditing a candidate's resume for the role: "{target_role}".

{jd_instruction}

Candidate Resume Text:
{raw_text}

Extracted NLP Features (for reference):
- Action Verbs: {json.dumps(action_verbs[:10])}
- Quantifiable Metrics: {json.dumps(quantifiable_metrics[:10])}
- Key Noun Chunks: {json.dumps(noun_chunks[:15])}

Strict Evaluation Rules:
1. Requirements Extraction & Audit:
   - Audit candidate resume against EACH requirement defined for "{target_role}".
   - For each requirement assign:
     - "requirement_id": "req_1", "req_2", etc.
     - "requirement_text": string description
     - "normalized_skill": core skill/keyword name
     - "category": one of ["technical_skill", "tool_platform", "domain_knowledge", "responsibility", "qualification", "soft_skill", "other"]
     - "importance": "mandatory" (must-have), "preferred" (nice-to-have), or "normal"
     - "supporting_jd_evidence": exact excerpt from JD if supplied, or standard role expectation string if role inference.
     - "evidence_strength": "strong", "partial", "weak", or "missing".
     - "supporting_resume_evidence": exact quote from candidate resume (or empty string if missing). DO NOT fabricate quotes.
     - "evidence_reason": concise explanation for assigned strength.
     - "matching_context": context location.
2. Quality Dimensions Audit:
   - Evaluate Experience Quality dimensions: ["responsibility_clarity", "technical_depth", "ownership", "measurable_outcomes_quality", "scale", "business_impact"].
     For each dimension assign evidence_strength ("strong", "partial", "weak", "missing"), evidence_excerpt, and reasoning.
   - Evaluate Project Quality dimensions: ["project_relevance", "technical_depth", "problem_complexity", "implementation_evidence", "measurable_outcome_quality", "ownership"].
     For each dimension assign evidence_strength ("strong", "partial", "weak", "missing"), evidence_excerpt, and reasoning.
3. Formatting & Structural Deficiencies:
   - Identify any formatting issues, unparseable elements, broken text, or missing critical sections.

Return ONLY a valid JSON object matching this schema:
{{
  "requirements": [
    {{
      "requirement_id": "req_1",
      "requirement_text": "text",
      "normalized_skill": "skill_name",
      "category": "technical_skill",
      "importance": "mandatory",
      "supporting_jd_evidence": "quote",
      "evidence_strength": "strong",
      "supporting_resume_evidence": "resume quote",
      "evidence_reason": "explanation",
      "matching_context": "context section"
    }}
  ],
  "structural_deficiencies": [],
  "experience_quality": [
    {{
      "dimension": "responsibility_clarity",
      "evidence_excerpt": "quote",
      "evidence_strength": "strong",
      "reasoning": "reasoning"
    }}
  ],
  "experience_deficiencies": [],
  "project_quality": [
    {{
      "dimension": "project_relevance",
      "evidence_excerpt": "quote",
      "evidence_strength": "strong",
      "reasoning": "reasoning"
    }}
  ],
  "project_deficiencies": [],
  "actionable_improvements": [
    {{
      "problem": "gap description",
      "evidence": "evidence detail",
      "recommendation": "actionable fix",
      "importance": "high"
    }}
  ]
}}
Do not add markdown fences outside the JSON.
"""
        eval_data = None
        try:
            eval_res = await generate_content_with_routing(
                prompt=evaluation_prompt,
                response_mime_type="application/json",
                timeout=20.0
            )
            eval_data = json.loads(self._clean_json(eval_res))
        except Exception as e:
            logger.warning(f"LLM Single-Pass Evaluation unavailable ({e}).")

        # ─── 3. DEGRADED / FAILURE BEHAVIOR ───
        if not eval_data or not isinstance(eval_data, dict) or "requirements" not in eval_data or not eval_data["requirements"]:
            logger.error("LLM evaluation unreachable and no valid requirement data available. Returning analysis_unavailable.")
            return self._build_unavailable_response(target_role)

        req_evals = eval_data.get("requirements", [])

        # ─── 4. DETERMINISTIC PYTHON SCORING CORE ───

        # --- Category A: ATS Structure & Formatting (Weight: 20%) ---
        personal_info = parsed_data.get("personal_info", {})
        has_name = bool(personal_info.get("name"))
        has_email = bool(personal_info.get("email"))
        has_phone = bool(personal_info.get("phone"))

        contact_score = 0
        struct_evidences = []
        if has_name:
            contact_score += 10
            struct_evidences.append("Candidate name identified")
        if has_email:
            contact_score += 10
            struct_evidences.append("Contact email identified")
        if has_phone:
            contact_score += 10
            struct_evidences.append("Contact phone number identified")

        sections_found = []
        if parsed_data.get("work_experience"): sections_found.append("Work Experience")
        if parsed_data.get("skills"): sections_found.append("Skills")
        if parsed_data.get("education"): sections_found.append("Education")
        if parsed_data.get("projects"): sections_found.append("Projects")
        if parsed_data.get("summary"): sections_found.append("Summary")

        section_score = 0
        if "Work Experience" in sections_found: section_score += 25
        if "Skills" in sections_found: section_score += 25
        if "Education" in sections_found: section_score += 10
        if "Projects" in sections_found: section_score += 10

        if sections_found:
            struct_evidences.append(f"Standard sections validated: {', '.join(sections_found)}")

        word_count_score = 10 if (150 <= word_count <= 2000) else 0
        if word_count_score == 10:
            struct_evidences.append("Word count is within optimal guidelines")

        struct_score_base = min(100, contact_score + section_score)

        # Genuine Duplicate Section Header Detection
        duplicates_count = self._detect_duplicate_section_headers(raw_text)

        struct_provenance = {
            "inputs": {
                "has_name": has_name,
                "has_email": has_email,
                "has_phone": has_phone,
                "sections_found": sections_found,
                "word_count": word_count,
                "duplicate_sections_detected": duplicates_count
            },
            "formula_components": {
                "contact_score": contact_score,
                "section_score": section_score,
                "word_count_score": word_count_score
            },
            "methodology": "ACE Structure Verification Matrix"
        }

        # --- Category B: Skills & Keyword Coverage (Weight: 25%) ---
        req_matrix = []
        matched_kw = []
        weak_kw = []
        missing_kw = []

        total_weighted_score = 0.0
        total_importance_weight = 0.0

        for item in req_evals:
            req_id = item.get("requirement_id", f"req_{len(req_matrix)+1}")
            req_text = item.get("requirement_text", item.get("requirement", ""))
            norm_skill = item.get("normalized_skill", req_text)
            category = item.get("category", "technical_skill")
            importance = item.get("importance", "normal")
            strength = item.get("evidence_strength", "missing")
            
            resume_quote = item.get("supporting_resume_evidence", "") if strength != "missing" else ""
            reason = item.get("evidence_reason", item.get("explanation", ""))
            context = item.get("matching_context", "")

            # Strict 0-100 requirement score based on evidence strength
            base_score = ACE_SCORING_METHODOLOGY["evidence_strength_scores"].get(strength, 0.0)
            req_score = min(max(base_score, 0.0), 100.0)

            imp_weight = ACE_SCORING_METHODOLOGY["importance_weights"].get(importance, 1.0)
            total_weighted_score += (req_score * imp_weight)
            total_importance_weight += imp_weight

            req_info = {
                "requirement_id": req_id,
                "requirement": req_text,
                "normalized_skill": norm_skill,
                "category": category,
                "importance": importance,
                "source_type": source_type,
                "evidence_strength": strength,
                "requirement_score": round(req_score, 2),
                "supporting_jd_evidence": item.get("supporting_jd_evidence", ""),
                "supporting_resume_evidence": resume_quote,
                "evidence_reason": reason,
                "matching_context": context,
                "explicit_resume_evidence": resume_quote,
                "contextual_evidence": context,
                "explanation": reason,
                "keyword_match": strength in ["strong", "partial"],
                "semantic_similarity": round(req_score, 2)
            }
            req_matrix.append(req_info)

            if strength == "strong":
                matched_kw.append(norm_skill)
            elif strength in ["partial", "weak"]:
                weak_kw.append(norm_skill)
            else:
                missing_kw.append({
                    "keyword": norm_skill,
                    "requirement": req_text,
                    "category": category,
                    "priority": "high" if importance == "mandatory" else "medium",
                    "where_it_matters": reason or f"Required for {target_role}.",
                    "source_type": source_type
                })

        # Normalized weighted average for Category B (strictly bounded [0, 100])
        skills_score = int(round(total_weighted_score / total_importance_weight)) if total_importance_weight > 0 else 0
        skills_score = min(max(skills_score, 0), 100)

        skills_provenance = {
            "total_requirements": len(req_matrix),
            "strong_count": len(matched_kw),
            "partial_weak_count": len(weak_kw),
            "missing_count": len(missing_kw),
            "formula": "sum(req_score * importance_weight) / sum(importance_weight)",
            "importance_weights": ACE_SCORING_METHODOLOGY["importance_weights"],
            "evidence_strength_scores": ACE_SCORING_METHODOLOGY["evidence_strength_scores"]
        }

        # --- Category C: Experience & Impact (Weight: 25%) ---
        # NO arbitrary count bonuses (+30 count bonus removed). Quality dimension derived strictly.
        exp_quality = eval_data.get("experience_quality", [])
        expected_exp_dims = ["responsibility_clarity", "technical_depth", "ownership", "measurable_outcomes_quality", "scale", "business_impact"]
        
        exp_dim_scores = {dim: 0.0 for dim in expected_exp_dims}
        exp_dim_excerpts = {dim: "" for dim in expected_exp_dims}

        if isinstance(exp_quality, list):
            for item in exp_quality:
                dim = item.get("dimension")
                strength = item.get("evidence_strength", "missing")
                excerpt = item.get("evidence_excerpt", "")
                score_val = ACE_SCORING_METHODOLOGY["quality_dimension_scores"].get(strength, 0.0)
                if dim in expected_exp_dims:
                    exp_dim_scores[dim] = score_val
                    exp_dim_excerpts[dim] = excerpt if strength != "missing" else ""

        # Pure quality dimension average (max sum is 60 -> scaled to 100 max)
        exp_q_sum = sum(exp_dim_scores.values())
        exp_score_base = int(round((exp_q_sum / 60.0) * 100)) if expected_exp_dims else 0
        exp_score_base = min(max(exp_score_base, 0), 100)

        work_exps = parsed_data.get("work_experience", [])
        exp_evidences = [f"Evaluated {len(work_exps)} work experience entries against quality dimensions."] if work_exps else ["No work experience entries detected."]

        exp_provenance = {
            "inputs": {
                "work_experiences_count": len(work_exps),
                "action_verbs_count": len(action_verbs),
                "quantifiable_metrics_count": len(quantifiable_metrics)
            },
            "dimension_scores": exp_dim_scores,
            "dimension_excerpts": exp_dim_excerpts,
            "formula": "(sum(dimension_scores) / 60.0) * 100",
            "quality_dimension_scores": ACE_SCORING_METHODOLOGY["quality_dimension_scores"]
        }

        # --- Category D: Projects & Portfolio (Weight: 15%) ---
        # NO arbitrary count bonuses (+30 count bonus removed, +10 portfolio link bonus removed).
        proj_quality = eval_data.get("project_quality", [])
        expected_proj_dims = ["project_relevance", "technical_depth", "problem_complexity", "implementation_evidence", "measurable_outcome_quality", "ownership"]
        
        proj_dim_scores = {dim: 0.0 for dim in expected_proj_dims}
        proj_dim_excerpts = {dim: "" for dim in expected_proj_dims}

        if isinstance(proj_quality, list):
            for item in proj_quality:
                dim = item.get("dimension")
                strength = item.get("evidence_strength", "missing")
                excerpt = item.get("evidence_excerpt", "")
                score_val = ACE_SCORING_METHODOLOGY["quality_dimension_scores"].get(strength, 0.0)
                if dim in expected_proj_dims:
                    proj_dim_scores[dim] = score_val
                    proj_dim_excerpts[dim] = excerpt if strength != "missing" else ""

        proj_q_sum = sum(proj_dim_scores.values())
        proj_score_base = int(round((proj_q_sum / 60.0) * 100)) if expected_proj_dims else 0
        proj_score_base = min(max(proj_score_base, 0), 100)

        projects = parsed_data.get("projects", [])
        proj_evidences = [f"Evaluated {len(projects)} technical projects against quality dimensions."] if projects else ["No technical projects detected."]

        proj_provenance = {
            "inputs": {
                "projects_count": len(projects)
            },
            "dimension_scores": proj_dim_scores,
            "dimension_excerpts": proj_dim_excerpts,
            "formula": "(sum(dimension_scores) / 60.0) * 100",
            "quality_dimension_scores": ACE_SCORING_METHODOLOGY["quality_dimension_scores"]
        }

        # --- Category E: Target Role Alignment (Weight: 15%) ---
        coverage_pct = 0.0
        if req_matrix:
            strong_partial_count = len([r for r in req_matrix if r["evidence_strength"] in ["strong", "partial"]])
            coverage_pct = (strong_partial_count / len(req_matrix)) * 100.0

        # Compute Semantic Vector Alignment locally
        all_targets = [r["requirement"] for r in req_matrix[:5]]
        sim_results = await production_nlp_service.compute_batch_semantic_similarity(raw_text, all_targets) if all_targets else []
        sem_sim_avg = (sum(s.get("cosine_similarity_score", 0.0) for s in sim_results) / len(sim_results)) * 100.0 if sim_results else 0.0

        exp_rel_pct = (exp_dim_scores.get("responsibility_clarity", 0.0) / 10.0) * 100.0
        proj_rel_pct = (proj_dim_scores.get("project_relevance", 0.0) / 10.0) * 100.0
        relevance_pct = (exp_rel_pct * 0.6) + (proj_rel_pct * 0.4)

        alignment_score = int(round(
            (coverage_pct * 0.50) +
            (sem_sim_avg * 0.30) +
            (relevance_pct * 0.20)
        ))
        alignment_score = min(max(alignment_score, 0), 100)

        alignment_provenance = {
            "inputs": {
                "coverage_percentage": round(coverage_pct, 2),
                "semantic_similarity_percentage": round(sem_sim_avg, 2),
                "relevance_percentage": round(relevance_pct, 2)
            },
            "formula": "coverage_pct * 0.50 + sem_sim_avg * 0.30 + relevance_pct * 0.20",
            "methodology": "ACE Dynamic Role Alignment Matrix"
        }

        # ─── 5. INDEPENDENT PENALTIES (NO DOUBLE-COUNTING) ───
        penalties_list = []
        if word_count > 2000:
            penalties_list.append({
                "name": "Excessive Resume Length",
                "description": f"Resume length ({word_count} words) exceeds optimal threshold of 2000 words.",
                "score_deduction": ACE_SCORING_METHODOLOGY["penalties"]["excessive_length"]
            })
        if duplicates_count > 0:
            penalties_list.append({
                "name": "Duplicate Section Headers",
                "description": f"Detected {duplicates_count} duplicate section header(s) in document layout.",
                "score_deduction": duplicates_count * ACE_SCORING_METHODOLOGY["penalties"]["duplicate_section"]
            })

        struct_deficiencies = eval_data.get("structural_deficiencies", [])
        if struct_deficiencies:
            struct_str_list = [x.get('reasoning', str(x)) if isinstance(x, dict) else str(x) for x in struct_deficiencies]
            penalties_list.append({
                "name": "Structural & Formatting Deficiencies",
                "description": f"Formatting issues identified: {', '.join(struct_str_list)}",
                "score_deduction": len(struct_deficiencies) * ACE_SCORING_METHODOLOGY["penalties"]["formatting_deficiency"]
            })

        total_penalty = sum(p["score_deduction"] for p in penalties_list)

        # ─── 6. FINAL WEIGHTED ATS SCORE CALCULATION ───
        weighted_score = (
            (struct_score_base * ACE_SCORING_METHODOLOGY["category_weights"]["ats_structure_formatting"]) +
            (skills_score * ACE_SCORING_METHODOLOGY["category_weights"]["skills_keyword_coverage"]) +
            (exp_score_base * ACE_SCORING_METHODOLOGY["category_weights"]["experience_impact"]) +
            (proj_score_base * ACE_SCORING_METHODOLOGY["category_weights"]["projects_portfolio"]) +
            (alignment_score * ACE_SCORING_METHODOLOGY["category_weights"]["role_alignment"])
        )

        overall_score = int(round(weighted_score)) - total_penalty
        overall_score = min(max(overall_score, 0), 100)

        confidence = "High" if source_type == "supplied_jd" else "Medium"

        def _to_str_list(items: List[Any]) -> List[str]:
            out = []
            for item in items:
                if isinstance(item, dict):
                    out.append(str(item.get("reasoning", item.get("deficiency", item.get("problem", str(item))))))
                else:
                    out.append(str(item))
            return out

        categories_res = [
            {
                "category_key": "ats_structure_formatting",
                "category_name": "ATS Structure & Formatting",
                "score": struct_score_base,
                "weight_percentage": int(ACE_SCORING_METHODOLOGY["category_weights"]["ats_structure_formatting"] * 100),
                "why_basis": "Measurable contact details, section presence, and word count guidelines.",
                "evidence": "; ".join(struct_evidences) if struct_evidences else "Standard formatting validated.",
                "deficiencies": _to_str_list(struct_deficiencies),
                "provenance_details": struct_provenance,
                "category_score": struct_score_base,
                "weight": ACE_SCORING_METHODOLOGY["category_weights"]["ats_structure_formatting"],
                "weighted_contribution": round(struct_score_base * ACE_SCORING_METHODOLOGY["category_weights"]["ats_structure_formatting"], 2),
                "calculation_inputs": struct_provenance["inputs"]
            },
            {
                "category_key": "skills_keyword_coverage",
                "category_name": "Skills & Keyword Coverage",
                "score": skills_score,
                "weight_percentage": int(ACE_SCORING_METHODOLOGY["category_weights"]["skills_keyword_coverage"] * 100),
                "why_basis": "Normalized weighted score of candidate evidence against JD/role requirements.",
                "evidence": f"Matched {len(matched_kw)} requirements strongly, with {len(weak_kw)} partial/weak matches.",
                "deficiencies": [f"Missing keyword '{item['keyword']}'" for item in missing_kw[:4]],
                "provenance_details": skills_provenance,
                "category_score": skills_score,
                "weight": ACE_SCORING_METHODOLOGY["category_weights"]["skills_keyword_coverage"],
                "weighted_contribution": round(skills_score * ACE_SCORING_METHODOLOGY["category_weights"]["skills_keyword_coverage"], 2),
                "calculation_inputs": skills_provenance
            },
            {
                "category_key": "experience_impact",
                "category_name": "Experience & Quantifiable Impact",
                "score": exp_score_base,
                "weight_percentage": int(ACE_SCORING_METHODOLOGY["category_weights"]["experience_impact"] * 100),
                "why_basis": "Pure quality rating across clarity, technical depth, ownership, scale, and metrics.",
                "evidence": "; ".join(exp_evidences),
                "deficiencies": _to_str_list(eval_data.get("experience_deficiencies", [])),
                "provenance_details": exp_provenance,
                "category_score": exp_score_base,
                "weight": ACE_SCORING_METHODOLOGY["category_weights"]["experience_impact"],
                "weighted_contribution": round(exp_score_base * ACE_SCORING_METHODOLOGY["category_weights"]["experience_impact"], 2),
                "calculation_inputs": exp_provenance["inputs"]
            },
            {
                "category_key": "projects_portfolio",
                "category_name": "Projects & Portfolio",
                "score": proj_score_base,
                "weight_percentage": int(ACE_SCORING_METHODOLOGY["category_weights"]["projects_portfolio"] * 100),
                "why_basis": "Pure quality rating across project relevance, technical depth, and outcomes.",
                "evidence": "; ".join(proj_evidences),
                "deficiencies": _to_str_list(eval_data.get("project_deficiencies", [])),
                "provenance_details": proj_provenance,
                "category_score": proj_score_base,
                "weight": ACE_SCORING_METHODOLOGY["category_weights"]["projects_portfolio"],
                "weighted_contribution": round(proj_score_base * ACE_SCORING_METHODOLOGY["category_weights"]["projects_portfolio"], 2),
                "calculation_inputs": proj_provenance["inputs"]
            },
            {
                "category_key": "role_alignment",
                "category_name": "Target Role Alignment",
                "score": alignment_score,
                "weight_percentage": int(ACE_SCORING_METHODOLOGY["category_weights"]["role_alignment"] * 100),
                "why_basis": "Weighted combination of requirement coverage, semantic similarity, and experience relevance.",
                "evidence": f"Requirement coverage at {round(coverage_pct, 1)}% with semantic alignment of {round(sem_sim_avg, 1)}%.",
                "deficiencies": [],
                "provenance_details": alignment_provenance,
                "category_score": alignment_score,
                "weight": ACE_SCORING_METHODOLOGY["category_weights"]["role_alignment"],
                "weighted_contribution": round(alignment_score * ACE_SCORING_METHODOLOGY["category_weights"]["role_alignment"], 2),
                "calculation_inputs": alignment_provenance["inputs"]
            }
        ]

        if overall_score >= 80:
            score_level = "Strong"
        elif overall_score >= 60:
            score_level = "Moderate"
        else:
            score_level = "Needs Improvement"

        exec_summary = (
            f"ATS analysis for {target_role} ({source_type}) completed with an overall score of {overall_score}/100 ({score_level}). "
            f"Identified {len(matched_kw)} strong matches and {len(missing_kw)} missing requirements out of {len(req_matrix)} evaluated."
        )

        from datetime import datetime, timezone

        raw_improvements = eval_data.get("actionable_improvements", [])
        filtered_improvements = []
        
        # Calculate exact category contribution derivative for requirement gaps
        total_importance_weight = sum(r.get("importance_weight", 1.0) for r in req_matrix) or 1.0

        for idx, imp in enumerate(raw_improvements):
            problem = imp.get("problem", imp.get("gap", ""))
            impact_str = imp.get("importance", imp.get("impact", "medium")).lower()
            
            # Match requirement skill if present, or assign average category requirement gain
            matching_req = next((r for r in req_matrix if r.get("normalized_skill", "").lower() in problem.lower()), None)
            if matching_req:
                w_i = matching_req.get("importance_weight", 1.0) / total_importance_weight
                curr_s = matching_req.get("requirement_score", 0.0)
                exact_gain = int(round(25.0 * w_i * ((100.0 - curr_s) / 100.0)))
            else:
                w_avg = 1.0 / total_importance_weight
                exact_gain = int(round(25.0 * w_avg * 0.5))
            
            pts_badge = f"+{max(1, exact_gain)} pts"
            
            filtered_improvements.append({
                "problem": problem,
                "evidence": imp.get("evidence", "Missing explicit metric evidence in work history"),
                "why_it_matters": imp.get("why_it_matters", f"Critical for high alignment in {target_role} evaluations."),
                "recommendation": imp.get("recommendation", f"Incorporate quantifiable business impact metrics for {target_role}."),
                "impact": impact_str,
                "potential_pts": pts_badge
            })

        # 2. Derive additional opportunities dynamically from real evaluated requirement & experience gaps
        if len(filtered_improvements) < 3:
            gap_reqs = [r for r in req_matrix if r["evidence_strength"] in ["missing", "weak", "partial"]]
            for r in gap_reqs:
                if len(filtered_improvements) >= 5:
                    break
                prob_title = f"Strengthen {r['normalized_skill']} Evidence"
                if not any(prob_title.lower() in f["problem"].lower() for f in filtered_improvements):
                    g_score = r.get("requirement_score", 0.0)
                    w_i = r.get("importance_weight", 1.0) / total_importance_weight
                    exact_gain = int(round(25.0 * w_i * ((100.0 - g_score) / 100.0)))
                    imp_level = "high" if r.get("importance") == "mandatory" else "medium"
                    filtered_improvements.append({
                        "problem": prob_title,
                        "evidence": r.get("evidence_reason") or f"Insufficient evidence for {r['normalized_skill']} in resume.",
                        "why_it_matters": f"Required for {target_role} alignment ({r['importance']} priority).",
                        "recommendation": f"Add explicit work experience or project details demonstrating {r['normalized_skill']} implementation.",
                        "impact": imp_level,
                        "potential_pts": f"+{max(1, exact_gain)} pts"
                    })

        # 3. Check real experience dimension gaps if still needed
        if len(filtered_improvements) < 3:
            if exp_dim_scores.get("measurable_outcomes_quality", 0) < 6:
                prob_title = "Add Quantifiable Impact Metrics"
                if not any(prob_title.lower() in f["problem"].lower() for f in filtered_improvements):
                    filtered_improvements.append({
                        "problem": prob_title,
                        "evidence": "Work experience entries contain limited numerical benchmark metrics.",
                        "why_it_matters": f"Quantifiable achievements significantly improve experience score for {target_role}.",
                        "recommendation": f"Incorporate specific scale, speed, or revenue metrics into your {target_role} work history.",
                        "impact": "high",
                        "potential_pts": "+8 pts"
                    })

        key_strengths = [r["normalized_skill"] for r in req_matrix if r["evidence_strength"] == "strong"]

        return {
            "target_role": target_role,
            "overall_ats_score": overall_score,
            "score_level": score_level,
            "executive_summary": exec_summary,
            "confidence": confidence,
            "key_strengths": key_strengths[:5],
            "categories": categories_res,
            "evidence_matrix": req_matrix,
            "matched_keywords": matched_kw,
            "weak_keywords": weak_kw,
            "missing_keywords": missing_kw,
            "actionable_improvements": filtered_improvements[:5],
            "career_roadmap": {"immediate_1_2_weeks": [], "short_term_1_2_months": [], "long_term_3_6_months": []},
            "status": "success",
            "penalties": penalties_list,
            "total_penalty": total_penalty,
            "analyzed_at": datetime.now(timezone.utc).isoformat()
        }

    def _detect_duplicate_section_headers(self, raw_text: str) -> int:
        """Inspects document layout text lines for genuine duplicate section header names."""
        known_headers = {"WORK EXPERIENCE", "EXPERIENCE", "SKILLS", "TECHNICAL SKILLS", "EDUCATION", "PROJECTS", "SUMMARY", "PROFESSIONAL SUMMARY"}
        seen_headers = set()
        duplicates = 0
        lines = [line.strip().upper() for line in raw_text.splitlines() if line.strip()]
        for line in lines:
            cleaned = re.sub(r'[^A-Z\s]', '', line).strip()
            if cleaned in known_headers:
                if cleaned in seen_headers:
                    duplicates += 1
                seen_headers.add(cleaned)
        return duplicates

    def _build_unavailable_response(self, target_role: str) -> Dict[str, Any]:
        """Returns the structured fallback response when LLM evaluation fails and no requirement source exists."""
        categories_res = [
            {
                "category_key": "ats_structure_formatting",
                "category_name": "ATS Structure & Formatting",
                "score": None,
                "weight_percentage": 20,
                "why_basis": "Analysis unavailable. Core evidence verification layer was unreachable.",
                "evidence": "Analysis unavailable",
                "deficiencies": [],
                "provenance_details": None,
                "category_score": None,
                "weight": 0.20,
                "weighted_contribution": 0.0,
                "calculation_inputs": None
            },
            {
                "category_key": "skills_keyword_coverage",
                "category_name": "Skills & Keyword Coverage",
                "score": None,
                "weight_percentage": 25,
                "why_basis": "Analysis unavailable. Core evidence verification layer was unreachable.",
                "evidence": "Analysis unavailable",
                "deficiencies": [],
                "provenance_details": None,
                "category_score": None,
                "weight": 0.25,
                "weighted_contribution": 0.0,
                "calculation_inputs": None
            },
            {
                "category_key": "experience_impact",
                "category_name": "Experience & Quantifiable Impact",
                "score": None,
                "weight_percentage": 25,
                "why_basis": "Analysis unavailable. Core evidence verification layer was unreachable.",
                "evidence": "Analysis unavailable",
                "deficiencies": [],
                "provenance_details": None,
                "category_score": None,
                "weight": 0.25,
                "weighted_contribution": 0.0,
                "calculation_inputs": None
            },
            {
                "category_key": "projects_portfolio",
                "category_name": "Projects & Portfolio",
                "score": None,
                "weight_percentage": 15,
                "why_basis": "Analysis unavailable. Core evidence verification layer was unreachable.",
                "evidence": "Analysis unavailable",
                "deficiencies": [],
                "provenance_details": None,
                "category_score": None,
                "weight": 0.15,
                "weighted_contribution": 0.0,
                "calculation_inputs": None
            },
            {
                "category_key": "role_alignment",
                "category_name": "Target Role Alignment",
                "score": None,
                "weight_percentage": 15,
                "why_basis": "Analysis unavailable. Core evidence verification layer was unreachable.",
                "evidence": "Analysis unavailable",
                "deficiencies": [],
                "provenance_details": None,
                "category_score": None,
                "weight": 0.15,
                "weighted_contribution": 0.0,
                "calculation_inputs": None
            }
        ]
        return {
            "target_role": target_role,
            "overall_ats_score": None,
            "score_level": "Unavailable",
            "executive_summary": "Analysis unavailable. Core evidence verification layer was unreachable.",
            "confidence": "Low",
            "key_strengths": [],
            "categories": categories_res,
            "evidence_matrix": [],
            "matched_keywords": [],
            "weak_keywords": [],
            "missing_keywords": [],
            "actionable_improvements": [],
            "career_roadmap": {
                "immediate_1_2_weeks": [],
                "short_term_1_2_months": [],
                "long_term_3_6_months": []
            },
            "status": "analysis_unavailable",
            "penalties": [],
            "total_penalty": 0
        }

    def _clean_json(self, text: str) -> str:
        import re
        text = text.strip()
        if text.startswith("```"):
            lines = text.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            text = "\n".join(lines).strip()

        start_idx = text.find("{")
        end_idx = text.rfind("}")
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            text = text[start_idx:end_idx + 1]

        # Fix trailing commas before closing braces/brackets
        text = re.sub(r",\s*([\]}])", r"\1", text)
        return text

ats_analyzer_service = ATSAnalyzerService()
