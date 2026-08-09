import json
import logging
from typing import Dict, Any, List
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.prebuilt import create_react_agent

from app.core.config import settings

# Import Specialized Deterministic Tools from app.tools
from app.tools.resume_tools import parse_resume_document_tool, nlp_semantic_similarity_tool
from app.tools.skill_dag_tools import compute_topological_skill_gap_tool
from app.tools.company_tools import search_company_intelligence_tool
from app.tools.interview_tools import generate_interview_questions_tool, evaluate_star_interview_tool
from app.tools.memory_tools import retrieve_user_memory_tool

logger = logging.getLogger(__name__)

# Master Tool Suite for the Autonomous Agent
TOOLS = [
    parse_resume_document_tool,
    nlp_semantic_similarity_tool,
    compute_topological_skill_gap_tool,
    search_company_intelligence_tool,
    generate_interview_questions_tool,
    evaluate_star_interview_tool,
    retrieve_user_memory_tool
]

# Master System Prompt for Non-Deterministic Reasoning Loop
SYSTEM_PROMPT = (
    "You are A.C.E. (Autonomous Career Intelligence Engine), a Staff AI Career Advisor.\n"
    "You possess specialized Production ML & NLP tools: SentenceTransformers Dense Vector Similarity, "
    "SpaCy POS & STAR Method Evaluator, NetworkX Topological Skill DAG Engine, Live Company Web Search, "
    "and Multi-Format Document Ingestion.\n\n"
    "Guidelines:\n"
    "- Act autonomously: Analyze the user request and decide dynamically which tools to execute and in what order.\n"
    "- Use retrieve_user_memory_tool to fetch user preferences, target salary, and past weak areas.\n"
    "- Use nlp_semantic_similarity_tool for 384-dim dense vector Cosine Distance matching.\n"
    "- Use compute_topological_skill_gap_tool for NetworkX graph prerequisite learning paths.\n"
    "- Use evaluate_star_interview_tool to analyze mock interview responses.\n"
    "- Ground all recommendations in data returned by your tools. Be concise, rigorous, and professional."
)

def build_agent():
    api_key = settings.GEMINI_API_KEY
    if api_key:
        llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            google_api_key=api_key,
            temperature=0.2
        )
        try:
            return create_react_agent(llm, tools=TOOLS, prompt=SYSTEM_PROMPT)
        except TypeError:
            try:
                return create_react_agent(llm, tools=TOOLS, state_modifier=SYSTEM_PROMPT)
            except Exception as e:
                logger.error(f"Error initializing create_react_agent: {e}")
                return create_react_agent(llm, tools=TOOLS)
    else:
        logger.warning("GEMINI_API_KEY not found. Agent running in production NLP fallback mode.")
        return None

agent_executor = build_agent()
