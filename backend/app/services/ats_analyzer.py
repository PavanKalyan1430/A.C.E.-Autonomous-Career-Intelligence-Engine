import json
import logging
import re
from typing import Dict, Any, Optional, List
from app.core.llm_router import generate_content_with_routing
from app.services.nlp_service import production_nlp_service

logger = logging.getLogger(__name__)

# ACE's scoring methodology configuration.
# Do not describe these as universal ATS industry standards.
# These parameters are not modifiable by the LLM.
ACE_SCORING_METHODOLOGY = {
    "category_weights": {
        "ats_structure_formatting": 0.20,
        "skills_keyword_coverage": 0.25,
        "experience_impact": 0.25,
        "projects_portfolio": 0.15,
        "role_alignment": 0.15
    },
    "evidence_strength_weights": {
        "strong": 1.0,
        "partial": 0.6,
        "weak": 0.3,
        "missing": 0.0
    },
    "importance_multipliers": {
        "high": 1.2,
        "medium": 1.0,
        "low": 0.8
    },
    "match_factor_weights": {
        "semantic_similarity": 0.7,
        "keyword_match": 0.3
    },
    "quality_dimension_scores": {
        "strong": 10,
        "partial": 6,
        "weak": 2,
        "missing": 0
    },
    "penalties": {
        "deficiency_penalty": 5,
        "duplicate_section_penalty": 10,
        "excessive_length_penalty": 15
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
        Scores are calculated programmatically in Python strictly based on a
        structured evidence matrix, objective SpaCy/TF-IDF metrics, and LLM-validated quality signals.
        """
        if not target_role:
            raise ValueError("Target role must be specified.")

        # ─── 1. TARGET REQUIREMENT EXTRACTION (JD / Inference Grounded) ───
        requirements_prompt = f"""
Identify the standard required technical skills, core keywords, and standard expectations for the role: "{target_role}".
"""
        if jd_text:
            requirements_prompt = f"""
Identify the required technical skills, core keywords, and expectations for the role: "{target_role}" based on the following Job Description:
{jd_text}
"""
        requirements_prompt += """
Return ONLY a valid JSON object matching this schema:
{
  "required_skills": ["skill1", "skill2", "skill3", "skill4", "skill5"],
  "core_keywords": ["keyword1", "keyword2", "keyword3"],
  "description": "brief description of standard expectations",
  "source": "jd" or "role_inference"
}
Do not add markdown fences or explanations.
"""
        source = "role_inference"
        try:
            req_res = await generate_content_with_routing(
                prompt=requirements_prompt,
                response_mime_type="application/json",
                timeout=15.0
            )
            req_data = json.loads(self._clean_json(req_res))
            required_skills = req_data.get("required_skills", [])
            core_keywords = req_data.get("core_keywords", [])
            role_description = req_data.get("description", f"Expectations for {target_role}.")
            source = req_data.get("source", "role_inference")
            if jd_text and source != "jd":
                source = "jd"
        except Exception as e:
            logger.error(f"Failed to extract requirements: {e}. Falling back to dynamic TF-IDF.")
            # Fallback requirement extraction
            required_skills = [kp["keyphrase"] for kp in await production_nlp_service.extract_tfidf_keyphrases(raw_text, top_n=5)]
            core_keywords = required_skills
            role_description = f"Standard expectations for {target_role}."

        # Guarantee requirements source_type is determined correctly
        source_type = "supplied_jd" if jd_text else "role_inference"

        # ─── 2. OBJECTIVE NLP & SEMANTIC SIMILARITY MATCHING ───
        nlp_features = await production_nlp_service.extract_linguistic_features(raw_text)
        action_verbs = nlp_features.get("action_verbs", [])
        quantifiable_metrics = nlp_features.get("quantifiable_metrics", [])
        noun_chunks = nlp_features.get("noun_chunks", [])
        word_count = len(raw_text.split())

        skills_eval_input = []
        for skill in required_skills:
            sim_res = await production_nlp_service.compute_semantic_similarity(raw_text, skill)
            skills_eval_input.append({
                "requirement": skill,
                "type": "skill",
                "semantic_similarity": sim_res["cosine_similarity_score"] * 100,
                "keyword_match": any(skill.lower() in t.lower() for t in noun_chunks) or (skill.lower() in raw_text.lower())
            })
        for kw in core_keywords:
            sim_res = await production_nlp_service.compute_semantic_similarity(raw_text, kw)
            skills_eval_input.append({
                "requirement": kw,
                "type": "keyword",
                "semantic_similarity": sim_res["cosine_similarity_score"] * 100,
                "keyword_match": any(kw.lower() in t.lower() for t in noun_chunks) or (kw.lower() in raw_text.lower())
            })

        alignment_sim = await production_nlp_service.compute_semantic_similarity(raw_text, role_description)

        # ─── 3. LLM EVIDENCE VALIDATION & QUALITY REASONING ───
        evaluation_prompt = f"""
You are an expert recruiter auditing a candidate's resume for the role: "{target_role}".
Evaluate the presence and contextual strength of required technical skills and core keywords.

Candidate Resume Text:
{raw_text}

Pre-computed Semantic Similarity and Keyword matches:
{json.dumps(skills_eval_input, indent=2)}

Extracted NLP Features:
- Action Verbs found: {json.dumps(action_verbs)}
- Quantifiable Metrics found: {json.dumps(quantifiable_metrics)}
- Key Noun Chunks found: {json.dumps(noun_chunks)}

Rules for your evaluation:
1. For each requirement, determine its "evidence_strength":
   - "strong": Skill explicitly present and supported by project/experience evidence.
   - "partial": Skill present but weakly supported or only partially aligned.
   - "weak": Skill appears primarily in a skills list with little contextual evidence.
   - "missing": No reliable evidence detected.
2. Provide the "explicit_resume_evidence" (exact quote/excerpt from resume) and "contextual_evidence" (how it was used).
3. Set "llm_validation" (boolean: true if candidate has genuine capability).
4. Evaluate structural/formatting deficiencies (broken links, malformed/duplicate sections, formatting consistency, readability).
5. Evaluate experience descriptions by mapping each of the following dimensions to a detailed evidence validation:
   Dimensions: "responsibility_clarity", "technical_depth", "ownership", "measurable_outcomes_quality", "scale", "business_impact".
   For each experience dimension, provide:
     - "dimension": the name of the dimension
     - "evidence_excerpt": exact quote from the work experience description
     - "evidence_strength": "strong" or "partial" or "weak" or "missing"
     - "reasoning": explanation of why this strength was determined
6. Evaluate projects by mapping each of the following dimensions to a detailed evidence validation:
   Dimensions: "project_relevance", "technical_depth", "problem_complexity", "implementation_evidence", "measurable_outcome_quality", "ownership".
   For each project dimension, provide:
     - "dimension": the name of the dimension
     - "evidence_excerpt": exact quote from the projects description
     - "evidence_strength": "strong" or "partial" or "weak" or "missing"
     - "reasoning": explanation of why this strength was determined
7. Generate actionable improvements ONLY for gaps (partial/weak/missing requirements). Warning: Do not recommend adding a technology unless the candidate has partial/weak evidence for it. No fake achievements.
8. Generate career roadmap items only from prioritized gaps. Category of each item must be exactly one of: "Resume fixes", "Skill development", "Project development", "Interview preparation".

Return ONLY a valid JSON object matching this schema:
{{
  "requirements_evaluation": [
    {{
      "requirement": "name",
      "type": "skill" or "keyword",
      "evidence_strength": "strong" or "partial" or "weak" or "missing",
      "explicit_resume_evidence": "exact quote from resume or empty string",
      "contextual_evidence": "context description",
      "llm_validation": true or false,
      "explanation": "reasoning explanation",
      "priority": "high" or "medium" or "low"
    }}
  ],
  "structural_deficiencies": [],
  "experience_quality": [
    {{
      "dimension": "dimension_name",
      "evidence_excerpt": "exact quote",
      "evidence_strength": "strong" or "partial" or "weak" or "missing",
      "reasoning": "reasoning explanation"
    }}
  ],
  "experience_deficiencies": [],
  "project_quality": [
    {{
      "dimension": "dimension_name",
      "evidence_excerpt": "exact quote",
      "evidence_strength": "strong" or "partial" or "weak" or "missing",
      "reasoning": "reasoning explanation"
    }}
  ],
  "project_deficiencies": [],
  "actionable_improvements": [
    {{
      "gap": "gap description",
      "evidence": "evidence found or missing",
      "importance": "high" or "medium" or "low",
      "recommendation": "recommendation instruction",
      "expected_improvement_area": "improvement target"
    }}
  ],
  "career_roadmap": {{
    "immediate_1_2_weeks": [
      {{
        "title": "action title",
        "action_item": "description",
        "why_recommended": "reason based on gap",
        "priority": "high" or "medium" or "low",
        "roadmap_category": "Resume fixes" or "Skill development" or "Project development" or "Interview preparation"
      }}
    ],
    "short_term_1_2_months": [],
    "long_term_3_6_months": []
  }}
}}
Return ONLY valid JSON matching this schema. Do not add markdown blocks or notes outside the JSON.
"""
        try:
            eval_res = await generate_content_with_routing(
                prompt=evaluation_prompt,
                response_mime_type="application/json",
                timeout=35.0
            )
            eval_data = json.loads(self._clean_json(eval_res))
        except Exception as e:
            logger.error(f"LLM Reasoning failed: {e}. Returning analysis-unavailable state.")
            return self._build_unavailable_response(target_role)

        # Ensure eval_data is parsed correctly, otherwise return unavailable response
        if not isinstance(eval_data, dict) or "requirements_evaluation" not in eval_data:
            logger.error("LLM returned invalid output schema. Returning analysis-unavailable state.")
            return self._build_unavailable_response(target_role)

        # ─── 4. DETERMINISTIC PYTHON SCORING CORE ───
        
        # Category A: ATS Structure & Formatting (Weight: 20%)
        personal_info = parsed_data.get("personal_info", {})
        has_name = bool(personal_info.get("name"))
        has_email = bool(personal_info.get("email"))
        has_phone = bool(personal_info.get("phone"))
        
        # Contact completeness (up to 30 points)
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
            
        # Standard section presence (up to 30 points)
        sections_found = []
        if parsed_data.get("work_experience"): sections_found.append("Work Experience")
        if parsed_data.get("skills"): sections_found.append("Skills")
        if parsed_data.get("education"): sections_found.append("Education")
        if parsed_data.get("projects"): sections_found.append("Projects")
        if parsed_data.get("summary"): sections_found.append("Summary")
        
        # We reward presence of critical core sections, but do not blindly scale up with number of sections
        # Work Experience and Skills are the core requirements
        section_score = 0
        if "Work Experience" in sections_found:
            section_score += 15
        if "Skills" in sections_found:
            section_score += 15
        if sections_found:
            struct_evidences.append(f"Standard sections validated: {', '.join(sections_found)}")
            
        # Parseability (20 points)
        parseability_score = 20 if (has_name and len(sections_found) >= 2) else 5
        if parseability_score == 20:
            struct_evidences.append("Document parseability verified")

        # Readability & formatting consistency (20 points)
        readability_score = 20
        struct_deficiencies = eval_data.get("structural_deficiencies", [])
        
        # Word count guidelines (10 points if 150 <= word_count <= 2000)
        word_count_score = 10 if (150 <= word_count <= 2000) else 0
        if word_count_score == 10:
            struct_evidences.append("Word count is within optimal guidelines")

        # Combine base points (max 110, capped at 100)
        struct_score_base = min(contact_score + section_score + parseability_score + readability_score + word_count_score, 100)

        # Check for malformed / duplicate sections
        duplicates_count = 0
        sections_set = set()
        for s in sections_found:
            if s in sections_set:
                duplicates_count += 1
            sections_set.add(s)

        struct_provenance = {
            "inputs": {
                "has_name": has_name,
                "has_email": has_email,
                "has_phone": has_phone,
                "sections_found": sections_found,
                "word_count": word_count,
                "structural_deficiencies_count": len(struct_deficiencies)
            },
            "formula_components": {
                "contact_score": contact_score,
                "section_score": section_score,
                "parseability_score": parseability_score,
                "readability_score": readability_score,
                "word_count_score": word_count_score
            },
            "methodology": "ACE Structure Verification Matrix"
        }

        # Category B: Skills & Keyword Coverage (Weight: 25%)
        req_evals = eval_data.get("requirements_evaluation", [])
        skills_score = 0
        matched_kw = []
        weak_kw = []
        missing_kw = []
        
        req_matrix = []
        skills_provenance = {}
        if req_evals:
            total_points = 0.0
            for idx, item in enumerate(req_evals):
                req_name = item.get("requirement", "")
                priority = item.get("priority", "medium")
                importance = priority # mapped to priority
                strength = item.get("evidence_strength", "missing")
                
                # Retrieve pre-computed sim and keyword matches
                pre_comp = next((x for x in skills_eval_input if x["requirement"].lower() == req_name.lower()), {"semantic_similarity": 0.0, "keyword_match": False})
                sem_sim = pre_comp["semantic_similarity"]
                kw_match = pre_comp["keyword_match"]
                
                # Retrieve parameters from centralized config
                s_weight = ACE_SCORING_METHODOLOGY["evidence_strength_weights"].get(strength, 0.0)
                
                # If evidence is missing, ensure no evidence score is granted
                if strength == "missing":
                    req_score = 0.0
                else:
                    # Compute raw score based on evidence strength vs keyword/semantic match
                    # strong contextual evidence > skill-list-only (weak) evidence
                    match_factor = (ACE_SCORING_METHODOLOGY["match_factor_weights"]["semantic_similarity"] * (sem_sim / 100.0)) + \
                                   (ACE_SCORING_METHODOLOGY["match_factor_weights"]["keyword_match"] * (1.0 if kw_match else 0.0))
                    # Combined requirement score: 80% strength weight + 20% match factor
                    req_score = 100.0 * (0.8 * s_weight + 0.2 * match_factor)
                
                # Importance multiplier
                i_weight = ACE_SCORING_METHODOLOGY["importance_multipliers"].get(importance, 1.0)
                weighted_req_score = req_score * i_weight
                total_points += min(weighted_req_score, 120.0)
                
                req_info = {
                    "requirement": req_name,
                    "importance": importance,
                    "source_type": source_type,
                    "evidence_strength": strength,
                    "semantic_similarity": round(sem_sim, 2),
                    "keyword_match": kw_match,
                    "explicit_resume_evidence": item.get("explicit_resume_evidence", "") if strength != "missing" else "",
                    "contextual_evidence": item.get("contextual_evidence", "") if strength != "missing" else "",
                    "explanation": item.get("explanation", "")
                }
                req_matrix.append(req_info)
                
                if strength == "strong":
                    matched_kw.append(req_name)
                elif strength in ["partial", "weak"]:
                    weak_kw.append(req_name)
                else:
                    missing_kw.append({
                        "keyword": req_name,
                        "category": "missing",
                        "priority": priority,
                        "where_it_matters": item.get("explanation", "Standard requirement for target role."),
                        "source_type": source_type
                    })
            
            skills_score = int(round(total_points / len(req_evals))) if req_evals else 0
            skills_provenance = {
                "total_requirements": len(req_evals),
                "strong_count": len(matched_kw),
                "partial_weak_count": len(weak_kw),
                "missing_count": len(missing_kw),
                "formula": "sum(min(req_score * importance_multiplier, 120)) / total_requirements",
                "importance_weights": ACE_SCORING_METHODOLOGY["importance_multipliers"],
                "evidence_strength_weights": ACE_SCORING_METHODOLOGY["evidence_strength_weights"],
                "match_factor_weights": ACE_SCORING_METHODOLOGY["match_factor_weights"]
            }
        skills_score = min(max(skills_score, 0), 100)

        # Category C: Experience & Impact (Weight: 25%)
        exp_score_base = 0
        exp_evidences = []
        work_exps = parsed_data.get("work_experience", [])
        
        # Base count points
        exp_score_base += min(len(work_exps), 3) * 10
        if work_exps:
            exp_evidences.append(f"Parsed {len(work_exps)} work experience entries")
            
        # Quality ratings converter (derived strictly from evidence strength lists)
        exp_quality = eval_data.get("experience_quality", [])
        exp_dim_scores = {}
        exp_dim_excerpts = {}
        
        # Default all expected experience dimensions to missing
        expected_exp_dims = ["responsibility_clarity", "technical_depth", "ownership", "measurable_outcomes_quality", "scale", "business_impact"]
        for dim in expected_exp_dims:
            exp_dim_scores[dim] = 0
            exp_dim_excerpts[dim] = ""

        if isinstance(exp_quality, list):
            for item in exp_quality:
                dim = item.get("dimension")
                strength = item.get("evidence_strength", "missing")
                excerpt = item.get("evidence_excerpt", "")
                
                # Derive score from strength
                score_val = ACE_SCORING_METHODOLOGY["quality_dimension_scores"].get(strength, 0)
                if dim in expected_exp_dims:
                    exp_dim_scores[dim] = score_val
                    # Ensure evidence is actually present if strength is not missing
                    exp_dim_excerpts[dim] = excerpt if strength != "missing" else ""
                    
        # Sum of quality dimensions (up to 60 points)
        q_sum = sum(exp_dim_scores.values())
        exp_score_base += q_sum
        
        # NLP evidence validation (verbs & metrics count points)
        exp_score_base += min(len(action_verbs), 5) * 1
        exp_score_base += min(len(quantifiable_metrics), 5) * 1
        if action_verbs:
            exp_evidences.append(f"Validated active impact verbs: {', '.join(action_verbs[:3])}")
            
        exp_deficiencies = eval_data.get("experience_deficiencies", [])
        exp_score_base = min(max(exp_score_base, 0), 100)

        exp_provenance = {
            "inputs": {
                "work_experiences_count": len(work_exps),
                "action_verbs_count": len(action_verbs),
                "quantifiable_metrics_count": len(quantifiable_metrics),
                "deficiencies_count": len(exp_deficiencies)
            },
            "dimension_scores": exp_dim_scores,
            "dimension_excerpts": exp_dim_excerpts,
            "formula": "base_count_score + sum(dimension_scores) + verbs_metrics_score",
            "quality_dimension_weight_mapping": ACE_SCORING_METHODOLOGY["quality_dimension_scores"]
        }

        # Category D: Projects & Portfolio (Weight: 15%)
        proj_score_base = 0
        proj_evidences = []
        projects = parsed_data.get("projects", [])
        
        proj_score_base += min(len(projects), 2) * 15
        if projects:
            proj_evidences.append(f"Parsed {len(projects)} technical projects")
            
        # Quality rating
        proj_quality = eval_data.get("project_quality", [])
        proj_dim_scores = {}
        proj_dim_excerpts = {}
        
        # Default all expected project dimensions to missing
        expected_proj_dims = ["project_relevance", "technical_depth", "problem_complexity", "implementation_evidence", "measurable_outcome_quality", "ownership"]
        for dim in expected_proj_dims:
            proj_dim_scores[dim] = 0
            proj_dim_excerpts[dim] = ""

        if isinstance(proj_quality, list):
            for item in proj_quality:
                dim = item.get("dimension")
                strength = item.get("evidence_strength", "missing")
                excerpt = item.get("evidence_excerpt", "")
                
                score_val = ACE_SCORING_METHODOLOGY["quality_dimension_scores"].get(strength, 0)
                if dim in expected_proj_dims:
                    proj_dim_scores[dim] = score_val
                    proj_dim_excerpts[dim] = excerpt if strength != "missing" else ""

        pq_sum = sum(proj_dim_scores.values())
        proj_score_base += pq_sum
        
        # Portfolio validation
        links = personal_info.get("links", [])
        has_portfolio = any("github.com" in l.lower() or "gitlab.com" in l.lower() for l in links)
        if has_portfolio:
            proj_score_base += 10
            proj_evidences.append("GitHub/GitLab profile identified in contact links")
            
        proj_deficiencies = eval_data.get("project_deficiencies", [])
        proj_score_base = min(max(proj_score_base, 0), 100)

        proj_provenance = {
            "inputs": {
                "projects_count": len(projects),
                "has_portfolio": has_portfolio,
                "deficiencies_count": len(proj_deficiencies)
            },
            "dimension_scores": proj_dim_scores,
            "dimension_excerpts": proj_dim_excerpts,
            "formula": "base_count_score + sum(dimension_scores) + portfolio_bonus",
            "quality_dimension_weight_mapping": ACE_SCORING_METHODOLOGY["quality_dimension_scores"]
        }

        # Category E: Target Role Alignment (Weight: 15%)
        coverage_pct = 0.0
        if req_matrix:
            strong_partial_count = len([r for r in req_matrix if r["evidence_strength"] in ["strong", "partial"]])
            coverage_pct = (strong_partial_count / len(req_matrix)) * 100
            
        sem_alignment = alignment_sim.get("match_percentage", 0.0)
        
        # Calculate experience & project alignment factors directly from quality scores
        exp_rel = exp_dim_scores.get("responsibility_clarity", 0) * 5 # scaled to 50 max
        proj_rel = proj_dim_scores.get("project_relevance", 0) * 5 # scaled to 50 max
        rel_factor = exp_rel * 0.6 + proj_rel * 0.4 # up to 50 max, scale to 100 max by multiplying by 2
        rel_factor_scaled = rel_factor * 2
        
        alignment_score = int(round(
            (coverage_pct * 0.50) +
            (sem_alignment * 0.30) +
            (rel_factor_scaled * 0.20)
        ))
        alignment_score = min(max(alignment_score, 0), 100)

        alignment_provenance = {
            "inputs": {
                "coverage_percentage": round(coverage_pct, 2),
                "semantic_alignment_score": round(sem_alignment, 2),
                "experience_relevance_scaled": exp_rel * 2,
                "project_relevance_scaled": proj_rel * 2
            },
            "formula": "coverage_pct * 0.50 + sem_alignment * 0.30 + rel_factor_scaled * 0.20",
            "methodology": "ACE Dynamic Role Alignment Matrix"
        }

        # Expose Penalties explicitly
        penalties_list = []
        if word_count > 2000:
            penalties_list.append({
                "name": "Excessive Resume Length",
                "description": f"Resume is {word_count} words (optimal range is 150-2000 words).",
                "score_deduction": 15
            })
        if duplicates_count > 0:
            penalties_list.append({
                "name": "Duplicate Sections",
                "description": f"Detected {duplicates_count} duplicate section header(s).",
                "score_deduction": duplicates_count * 10
            })
        if struct_deficiencies:
            penalties_list.append({
                "name": "Structural & Formatting Deficiencies",
                "description": f"Formatting issues identified: {', '.join(struct_deficiencies)}",
                "score_deduction": len(struct_deficiencies) * 5
            })
        if exp_deficiencies:
            penalties_list.append({
                "name": "Experience Deficiencies",
                "description": f"Experience clarity issues identified: {', '.join(exp_deficiencies)}",
                "score_deduction": len(exp_deficiencies) * 5
            })
        if proj_deficiencies:
            penalties_list.append({
                "name": "Project Deficiencies",
                "description": f"Project detail issues identified: {', '.join(proj_deficiencies)}",
                "score_deduction": len(proj_deficiencies) * 5
            })

        total_penalty = sum(p["score_deduction"] for p in penalties_list)

        # Overall Score: Sum of weighted contributions minus documented penalties
        weighted_score = (
            (struct_score_base * ACE_SCORING_METHODOLOGY["category_weights"]["ats_structure_formatting"]) +
            (skills_score * ACE_SCORING_METHODOLOGY["category_weights"]["skills_keyword_coverage"]) +
            (exp_score_base * ACE_SCORING_METHODOLOGY["category_weights"]["experience_impact"]) +
            (proj_score_base * ACE_SCORING_METHODOLOGY["category_weights"]["projects_portfolio"]) +
            (alignment_score * ACE_SCORING_METHODOLOGY["category_weights"]["role_alignment"])
        )
        overall_score = round(weighted_score) - total_penalty
        overall_score = min(max(overall_score, 0), 100)

        # Confidence Rating calculation
        confidence = "High"
        if alignment_sim.get("algorithm") == "TF-IDF Vector Space Cosine Similarity":
            confidence = "Medium"
        if not action_verbs and not quantifiable_metrics:
            confidence = "Low"

        # Final Formatting
        categories_res = [
            {
                "category_key": "ats_structure_formatting",
                "category_name": "ATS Structure & Formatting",
                "score": struct_score_base,
                "weight_percentage": int(ACE_SCORING_METHODOLOGY["category_weights"]["ats_structure_formatting"] * 100),
                "why_basis": "Programmatic verification of header, section parseability, and formatting layout.",
                "evidence": "; ".join(struct_evidences) if struct_evidences else "Standard formatting verified.",
                "deficiencies": struct_deficiencies,
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
                "why_basis": "Calculated programmatically based on requirement importance and semantic strength.",
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
                "why_basis": "Aggregated ratings of technical depth, business impact, active verbs, and metrics.",
                "evidence": "; ".join(exp_evidences) if exp_evidences else "Evaluated work experience quality.",
                "deficiencies": exp_deficiencies,
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
                "why_basis": "Aggregated rating of technical complexity, relevance, and portfolio link verification.",
                "evidence": "; ".join(proj_evidences) if proj_evidences else "Evaluated portfolio projects.",
                "deficiencies": proj_deficiencies,
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
                "evidence": f"Requirement coverage at {round(coverage_pct, 1)}% with semantic alignment of {round(sem_alignment, 1)}%.",
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
            f"Dynamic evidence matrix evaluation for {target_role} completed with a programmatic ATS score of {overall_score}/100 ({score_level}). "
            f"Identified {len(matched_kw)} strong matches and {len(missing_kw)} missing requirements out of {len(req_matrix)} evaluated."
        )

        # Enforce no recommendation / roadmap item is created without a detected gap
        # Extract gaps: partial, weak, or missing requirements
        valid_gaps = [r["requirement"] for r in req_matrix if r["evidence_strength"] in ["partial", "weak", "missing"]]
        
        raw_improvements = eval_data.get("actionable_improvements", [])
        filtered_improvements = []
        for imp in raw_improvements:
            problem = imp.get("gap", imp.get("problem", ""))
            # If the improvement corresponds to a valid detected gap, allow it
            if any(gap.lower() in problem.lower() for gap in valid_gaps):
                filtered_improvements.append({
                    "problem": problem,
                    "evidence": imp.get("evidence", "Missing explicit details"),
                    "why_it_matters": imp.get("why_it_matters", "Critical prerequisite for target role alignment"),
                    "recommendation": imp.get("recommendation", ""),
                    "impact": imp.get("importance", imp.get("impact", "medium"))
                })
        
        raw_roadmap = eval_data.get("career_roadmap", {"immediate_1_2_weeks": [], "short_term_1_2_months": [], "long_term_3_6_months": []})
        filtered_roadmap = {"immediate_1_2_weeks": [], "short_term_1_2_months": [], "long_term_3_6_months": []}
        for phase in ["immediate_1_2_weeks", "short_term_1_2_months", "long_term_3_6_months"]:
            for item in raw_roadmap.get(phase, []):
                why = item.get("why_recommended", "")
                if any(gap.lower() in why.lower() for gap in valid_gaps):
                    filtered_roadmap[phase].append({
                        "title": item.get("title", ""),
                        "action_item": item.get("action_item", ""),
                        "why_recommended": why,
                        "priority": item.get("priority", "medium")
                    })

        key_strengths = [r["requirement"] for r in req_matrix if r["evidence_strength"] == "strong"]

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
            "actionable_improvements": filtered_improvements,
            "career_roadmap": filtered_roadmap,
            "status": "success",
            "penalties": penalties_list,
            "total_penalty": total_penalty
        }

    def _build_unavailable_response(self, target_role: str) -> Dict[str, Any]:
        """Returns the structured fallback response when LLM evaluation fails."""
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
        text = text.strip()
        if text.startswith("```"):
            lines = text.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            text = "\n".join(lines).strip()
        return text

ats_analyzer_service = ATSAnalyzerService()
