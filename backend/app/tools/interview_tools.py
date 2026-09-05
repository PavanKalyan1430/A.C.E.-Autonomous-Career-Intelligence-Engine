import json
import logging
import os
from typing import Optional
from pydantic import BaseModel, Field
from langchain_core.tools import tool
from app.core.config import settings
from app.services.nlp_service import production_nlp_service

from app.core.genai import get_genai_client
import asyncio

logger = logging.getLogger(__name__)

class QuestionGenInput(BaseModel):
    role_title: str = Field(description="Target role title e.g. 'Backend Engineer', 'AI Engineer', 'Frontend Engineer'")
    tech_stack_or_jd: Optional[str] = Field(default="", description="Optional tech stack or full job description text")
    difficulty: Optional[str] = Field(default="Medium", description="Selected difficulty level: Easy, Medium, or Hard")
    experience_level: Optional[str] = Field(default="Entry Level", description="Target experience level: Student / Intern, Entry Level, Mid Level, Senior Level")
    num_questions: Optional[int] = Field(default=3, description="Number of unique questions to ask")
    company_name: Optional[str] = Field(default=None, description="Optional target company name e.g. 'Google'")

class AnswerEvalInput(BaseModel):
    question: str = Field(description="The mock interview question asked")
    user_answer: str = Field(description="The candidate's response text")
    role_title: Optional[str] = Field(default=None, description="Target role title for context-aware evaluation")
    difficulty: Optional[str] = Field(default=None, description="Session difficulty for context-aware evaluation")
    experience_level: Optional[str] = Field(default=None, description="Experience level for context-aware evaluation")
    expected_depth: Optional[str] = Field(default=None, description="Expected response depth")
    evaluation_focus: Optional[str] = Field(default=None, description="Key technical area being evaluated")

@tool(args_schema=QuestionGenInput)
async def generate_interview_questions_tool(
    role_title: str,
    tech_stack_or_jd: str = "",
    difficulty: str = "Medium",
    experience_level: str = "Entry Level",
    num_questions: int = 3,
    company_name: Optional[str] = None
) -> str:
    """
    Generates role-specific, difficulty-calibrated technical mock interview questions 100% dynamically via LLM.
    Strictly aligns question scope with target role domain, experience level, and verbal audio constraints.
    """
    normalized_difficulty = (difficulty or "Medium").capitalize()
    if normalized_difficulty not in ["Easy", "Medium", "Hard", "Expert"]:
        normalized_difficulty = "Medium"

    exp_lvl = experience_level or "Entry Level"
    num_q = max(1, min(20, num_questions or 3))

    # Extract keyphrases if tech context is available
    extracted = []
    if tech_stack_or_jd and tech_stack_or_jd.strip():
        try:
            extracted = await production_nlp_service.extract_tfidf_keyphrases(tech_stack_or_jd, top_n=5)
        except Exception:
            extracted = []
    skills = [item["keyphrase"] for item in extracted]

    company_ctx = f" targeting {company_name}" if company_name and company_name.strip() else ""

    prompt = (
        f"You are an expert Technical Interviewer conducting a VERBAL/SPOKEN VOICE INTERVIEW for a candidate applying for a '{role_title}' role{company_ctx}.\n"
        f"Target Experience Level: {exp_lvl}\n"
        f"Selected Difficulty Level: {normalized_difficulty}\n"
        f"Tech Stack / Job Description Context: {tech_stack_or_jd or 'Standard domain practices'}\n"
        f"Relevant Extracted Skills: {', '.join(skills) if skills else 'Core domain skills'}\n\n"
        f"CRITICAL SPOKEN MOCK INTERVIEW CONSTRAINTS:\n"
        f"1. SPOKEN VERBAL FORMAT ONLY (ABSOLUTE RULE):\n"
        f"   - THIS IS A SPOKEN VOICE INTERVIEW. The candidate WILL ANSWER VERBALLY VIA AUDIO.\n"
        f"   - NEVER ask the candidate to write, syntax-implement, or code a function/script/query (e.g. NEVER ask 'Write a Python function...', 'Write a SQL query...', 'Code an algorithm...').\n"
        f"   - ALL questions MUST be phrased conversationally for a spoken response (e.g., 'How would you explain...', 'What approach would you take to...', 'What is the purpose of...', 'How do you handle...').\n\n"
        f"2. EXPERIENCE LEVEL & DIFFICULTY CALIBRATION:\n"
        f"   - Easy / Student: Ask approachable, foundational questions testing core conceptual understanding, basic terminology, or academic/project reasoning.\n"
        f"   - Medium / Entry: Ask practical engineering scenarios, standard conceptual differences, and routine debugging logic.\n"
        f"   - Hard / Mid: Ask complex engineering choices, component trade-offs, and scenario troubleshooting.\n"
        f"   - Expert / Senior (5+ yrs): Ask advanced production architecture decisions, high-scale reliability trade-offs, failure recovery modes, and system design principles.\n\n"
        f"3. DOMAIN BOUNDARY:\n"
        f"   - AI/ML: Python concepts, ML fundamentals, evaluation metrics, model usage, RAG/embeddings.\n"
        f"   - Frontend: JavaScript/TypeScript concepts, React/Vue lifecycle, state management, web performance.\n"
        f"   - Backend: APIs, databases, caching, concurrency concepts, data flow.\n"
        f"   - Data Analyst: SQL concepts, statistics interpretation, data aggregation, dashboard metrics.\n\n"
        f"4. Return JSON with key 'questions' containing a list of EXACTLY {num_q} unique, non-repetitive, spoken verbal question strings."
    )
    from app.core.llm_router import generate_content_with_routing
    res_text = await generate_content_with_routing(
        prompt=prompt,
        response_mime_type="application/json",
        timeout=settings.LLM_QUESTION_TIMEOUT
    )
    data = json.loads(res_text)
    
    raw_q_list = data.get("questions", [])
    clean_questions = []
    for item in raw_q_list:
        if isinstance(item, str):
            clean_questions.append(item)
        elif isinstance(item, dict) and "question" in item:
            clean_questions.append(item["question"])

    if not clean_questions:
        raise ValueError("LLM generation returned no valid questions.")

    data["questions"] = clean_questions[:num_q]
    data["assessed_skills"] = skills
    return json.dumps(data, indent=2)



@tool(args_schema=AnswerEvalInput)
async def evaluate_star_interview_tool(
    question: str,
    user_answer: str,
    role_title: Optional[str] = None,
    difficulty: Optional[str] = None,
    experience_level: Optional[str] = None,
    expected_depth: Optional[str] = None,
    evaluation_focus: Optional[str] = None
) -> str:
    """
    Evaluates a candidate's mock interview answer dynamically using LLM technical feedback
    tailored strictly to the specific question, role level, difficulty, and experience level.
    """
    linguistic_res = await production_nlp_service.extract_linguistic_features(user_answer)
    keyphrases = await production_nlp_service.extract_tfidf_keyphrases(user_answer, top_n=5)
    
    role_context = f"Role: {role_title}\n" if role_title else ""
    diff_context = f"Target Difficulty: {difficulty or 'Medium'}\n" if difficulty else ""
    exp_context = f"Candidate Experience Level: {experience_level or 'Entry Level'}\n" if experience_level else ""
    depth_context = f"Expected Focus: {evaluation_focus or expected_depth}\n" if evaluation_focus or expected_depth else ""

    llm_evaluation = {}
    try:
        prompt = (
            f"You are an expert Technical Interviewer evaluating a candidate's verbal response.\n"
            f"{role_context}{diff_context}{exp_context}{depth_context}"
            f"Interview Question: {question}\n"
            f"Candidate Spoken Answer: {user_answer}\n\n"
            f"EVALUATION INSTRUCTIONS:\n"
            f"1. Evaluate strictly based on the actual question asked, target role, difficulty level, and experience level ({experience_level or 'Entry Level'}).\n"
            f"2. For Student / Intern / Easy questions, evaluate encouragingly for basic understanding, core clarity, and direct concepts. Do NOT penalize missing enterprise architecture, scaling, or deep production internals.\n"
            f"3. For Mid / Senior questions, evaluate problem solving, technical depth, trade-offs, and practical reasoning appropriate for the level.\n"
            f"4. Assess STAR method structure (Situation, Task, Action, Result) and presence of relevant metrics/examples.\n\n"
            f"Return JSON with keys: 'technical_score' (0-100), 'strengths', 'weaknesses', 'star_coverage_assessment', 'improvement_suggestions'."
        )

        from app.core.llm_router import generate_content_with_routing
        res_text = await generate_content_with_routing(
            prompt=prompt,
            response_mime_type="application/json",
            timeout=settings.LLM_EVALUATION_TIMEOUT
        )
        llm_evaluation = json.loads(res_text)
    except Exception as e:
        logger.error(f"Error evaluating interview answer via LLM: {e}")

    result = {
        "evaluation_score": float(llm_evaluation["technical_score"]) if llm_evaluation.get("technical_score") is not None else None,
        "llm_feedback": llm_evaluation,
        "nlp_action_verbs_detected": linguistic_res["action_verbs"],
        "nlp_technical_noun_chunks": linguistic_res["noun_chunks"],
        "nlp_quantifiable_metrics": linguistic_res["quantifiable_metrics"],
        "nlp_tfidf_keyphrases": keyphrases
    }
    return json.dumps(result, indent=2)

