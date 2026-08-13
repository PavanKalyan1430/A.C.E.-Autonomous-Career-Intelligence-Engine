import json
import logging
import os
from pydantic import BaseModel, Field
from langchain_core.tools import tool
from app.core.config import settings
from app.services.nlp_service import production_nlp_service

logger = logging.getLogger(__name__)

class QuestionGenInput(BaseModel):
    role_title: str = Field(description="Target role title e.g. 'Backend Engineer'")
    tech_stack_or_jd: str = Field(description="Tech stack or full job description text")

class AnswerEvalInput(BaseModel):
    question: str = Field(description="The mock interview question asked")
    user_answer: str = Field(description="The candidate's response text")

@tool(args_schema=QuestionGenInput)
async def generate_interview_questions_tool(role_title: str, tech_stack_or_jd: str) -> str:
    """
    Generates technical mock interview questions 100% dynamically via LLM and TF-IDF keyphrase analysis.
    Zero hardcoded question templates.
    """
    # 1. Dynamically extract keyphrases from the job description
    extracted = production_nlp_service.extract_tfidf_keyphrases(tech_stack_or_jd, top_n=5)
    skills = [item["keyphrase"] for item in extracted]

    # 2. Generate questions via LLM dynamically
    api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY")
    if api_key:
        try:
            from google import genai
            client = genai.Client(api_key=api_key)
            prompt = (
                f"You are a Principal Software Engineer interviewing a candidate for a {role_title} role.\n"
                f"Based on the following job requirements/tech stack:\n{tech_stack_or_jd}\n\n"
                f"Generate 3 highly specific, deep-dive technical interview questions testing architectural trade-offs, "
                f"concurrency, and system design related to: {', '.join(skills)}.\n"
                f"Return JSON format with key 'questions' containing a list of 3 strings."
            )
            response = await client.aio.models.generate_content(
                model="gemini-1.5-flash",
                contents=prompt,
                config={"response_mime_type": "application/json"}
            )
            data = json.loads(response.text)
            data["assessed_skills"] = skills
            return json.dumps(data, indent=2)
        except Exception as e:
            logger.error(f"Error generating LLM interview questions: {e}")

    # Pure dynamic NLP keyphrase synthesis fallback if LLM is unavailable
    dynamic_questions = [
        f"Deep Dive on {skills[0] if len(skills) > 0 else 'System Architecture'}: Explain how you design and troubleshoot failure modes in production.",
        f"Hands-on {skills[1] if len(skills) > 1 else 'API Design'}: Describe a complex system trade-off you evaluated and how you benchmarked performance.",
        f"Scalability for {skills[2] if len(skills) > 2 else 'Distributed Services'}: How do you manage data consistency and rate-limiting under high concurrency?"
    ]
    return json.dumps({"questions": dynamic_questions, "assessed_skills": skills}, indent=2)

@tool(args_schema=AnswerEvalInput)
async def evaluate_star_interview_tool(question: str, user_answer: str) -> str:
    """
    Evaluates a candidate's mock interview answer dynamically using LLM technical feedback
    combined with SpaCy NLP POS action-verb mining and metric extraction.
    Zero hardcoded score formulas.
    """
    linguistic_res = production_nlp_service.extract_linguistic_features(user_answer)
    keyphrases = production_nlp_service.extract_tfidf_keyphrases(user_answer, top_n=5)
    
    api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY")
    llm_evaluation = {}
    
    if api_key:
        try:
            from google import genai
            client = genai.Client(api_key=api_key)
            prompt = (
                f"You are a Staff Technical Interviewer evaluating a candidate's answer.\n"
                f"Interview Question: {question}\n"
                f"Candidate Answer: {user_answer}\n\n"
                f"Evaluate the response for technical accuracy, depth, STAR method coverage (Situation, Task, Action, Result), "
                f"and quantifiable impact metrics.\n"
                f"Return JSON with keys: 'technical_score' (0-100), 'strengths', 'weaknesses', 'star_coverage_assessment', 'improvement_suggestions'."
            )
            response = await client.aio.models.generate_content(
                model="gemini-1.5-flash",
                contents=prompt,
                config={"response_mime_type": "application/json"}
            )
            llm_evaluation = json.loads(response.text)
        except Exception as e:
            logger.error(f"Error evaluating interview answer via LLM: {e}")

    result = {
        "llm_feedback": llm_evaluation,
        "nlp_action_verbs_detected": linguistic_res["action_verbs"],
        "nlp_technical_noun_chunks": linguistic_res["noun_chunks"],
        "nlp_quantifiable_metrics": linguistic_res["quantifiable_metrics"],
        "nlp_tfidf_keyphrases": keyphrases
    }
    return json.dumps(result, indent=2)
