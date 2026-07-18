import json
import logging
from typing import Dict, Any, List
from langgraph.graph import StateGraph, END

from app.agents.state import AgentState
from app.agents.specialized.resume_agent import parse_resume_text, match_resume_to_job
from app.agents.specialized.company_agent import get_company_info
from app.agents.specialized.career_planner import generate_roadmap
from app.agents.specialized.interview_coach import generate_interview_questions, evaluate_interview_answer

logger = logging.getLogger(__name__)

# --- Specialized Agent Nodes ---

async def orchestrator_node(state: AgentState) -> Dict[str, Any]:
    """Inspects the query intent and assigns the next specialized agent to execute."""
    messages = state.get("messages", [])
    if not messages:
        return {"next_step": END}
        
    last_message = messages[-1].get("content", "").lower()
    
    # Simple routing logic based on keywords (for the MVP orchestrator node)
    if any(keyword in last_message for keyword in ["resume", "cv", "portfolio", "match"]):
        return {"current_agent": "resume_agent", "next_step": "resume_agent"}
    elif any(keyword in last_message for keyword in ["company", "hiring", "trends", "interview insights"]):
        return {"current_agent": "company_agent", "next_step": "company_agent"}
    elif any(keyword in last_message for keyword in ["roadmap", "skill", "gap", "learn"]):
        return {"current_agent": "career_planner", "next_step": "career_planner"}
    elif any(keyword in last_message for keyword in ["mock", "question", "coach", "answer"]):
        return {"current_agent": "interview_coach", "next_step": "interview_coach"}
    else:
        return {"next_step": END}

async def resume_node(state: AgentState) -> Dict[str, Any]:
    messages = state.get("messages", [])
    query = messages[-1].get("content", "")
    
    # Run parsing or matching tool
    if "match" in query.lower():
        # Match resume against a generic/specific job description
        jd = query.split("match to")[-1] if "match to" in query.lower() else "Software Engineer"
        result = match_resume_to_job.invoke({"resume_json_str": json.dumps(state.get("resume_data", {})), "job_description": jd})
        res_data = json.loads(result)
        return {
            "messages": [{"role": "assistant", "content": f"Resume Match Analysis: {res_data.get('match_score')}% match. Missing skills: {', '.join(res_data.get('missing_skills_detected', []))}."}],
            "next_step": END
        }
    else:
        return {
            "messages": [{"role": "assistant", "content": "I can help you parse your resume or match it with a job description. Please upload a resume file."}],
            "next_step": END
        }

async def company_node(state: AgentState) -> Dict[str, Any]:
    messages = state.get("messages", [])
    query = messages[-1].get("content", "")
    
    # Extract company name
    words = query.split()
    company_name = words[-1] if words else "Google"
    
    result_str = await get_company_info.ainvoke({"company_name": company_name})
    insights = json.loads(result_str)
    
    formatted_msg = (
        f"Company Insights for **{insights.get('company_name')}**:\n"
        f"- **Tech Stack**: {', '.join(insights.get('tech_stack', []))}\n"
        f"- **Interview Process**: {insights.get('interview_process')}\n"
        f"- **Hiring Trends**: {insights.get('hiring_trends')}"
    )
    return {
        "messages": [{"role": "assistant", "content": formatted_msg}],
        "company_data": insights,
        "next_step": END
    }

async def career_planner_node(state: AgentState) -> Dict[str, Any]:
    skills = state.get("resume_data", {}).get("skills", ["Python", "SQL"])
    result_str = generate_roadmap.invoke({"skills_list": skills, "target_role": "Backend Engineer"})
    roadmap = json.loads(result_str)
    
    phases_str = "\n".join([f"**{p.get('phase')}** (Time: {p.get('estimated_time')}): Topics: {', '.join(p.get('topics'))}" for p in roadmap.get("phases", [])])
    formatted_msg = f"Custom Learning Roadmap for target role **{roadmap.get('target_role')}**:\n{phases_str}"
    
    return {
        "messages": [{"role": "assistant", "content": formatted_msg}],
        "roadmap_data": roadmap,
        "next_step": END
    }

async def interview_coach_node(state: AgentState) -> Dict[str, Any]:
    messages = state.get("messages", [])
    query = messages[-1].get("content", "")
    
    if "answer" in query.lower():
        ans = query.split("answer")[-1]
        result_str = evaluate_interview_answer.invoke({"question": "Explain a database query optimization.", "user_answer": ans})
        evaluation = json.loads(result_str)
        formatted_msg = (
            f"Mock Interview Evaluation:\n"
            f"- **Score**: {evaluation.get('score')}/100\n"
            f"- **Strengths**: {evaluation.get('strengths')}\n"
            f"- **Areas for Improvement**: {', '.join(evaluation.get('areas_for_improvement', []))}"
        )
    else:
        result_str = generate_interview_questions.invoke({"role_title": "Backend Engineer", "tech_stack": ["Python", "FastAPI"]})
        questions_data = json.loads(result_str)
        formatted_msg = "Here are mock interview questions to try:\n" + "\n".join([f"{i+1}. {q}" for i, q in enumerate(questions_data.get("questions", []))])
        
    return {
        "messages": [{"role": "assistant", "content": formatted_msg}],
        "next_step": END
    }

# --- Define routing rules ---
def route_next(state: AgentState) -> str:
    return state.get("next_step", END)

# --- Compile Graph ---
workflow = StateGraph(AgentState)

# Add nodes
workflow.add_node("orchestrator", orchestrator_node)
workflow.add_node("resume_agent", resume_node)
workflow.add_node("company_agent", company_node)
workflow.add_node("career_planner", career_planner_node)
workflow.add_node("interview_coach", interview_coach_node)

# Set starting point
workflow.set_entry_point("orchestrator")

# Add conditional routing edges
workflow.add_conditional_edges(
    "orchestrator",
    route_next,
    {
        "resume_agent": "resume_agent",
        "company_agent": "company_agent",
        "career_planner": "career_planner",
        "interview_coach": "interview_coach",
        END: END
    }
)

# Connect specialized nodes back or to end
workflow.add_edge("resume_agent", END)
workflow.add_edge("company_agent", END)
workflow.add_edge("career_planner", END)
workflow.add_edge("interview_coach", END)

agent_app = workflow.compile()
