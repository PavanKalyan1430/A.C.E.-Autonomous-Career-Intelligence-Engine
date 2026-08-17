import json
import logging
from typing import List, Union
from pydantic import BaseModel, Field
from langchain_core.tools import tool
from app.services.nlp_service import production_nlp_service

logger = logging.getLogger(__name__)

class SkillDAGInput(BaseModel):
    candidate_skills: Union[List[str], str] = Field(description="List of candidate skills or JSON string of skills")
    target_job_description: str = Field(description="Target role title or full job description text")

@tool(args_schema=SkillDAGInput)
async def compute_topological_skill_gap_tool(candidate_skills: Union[List[str], str], target_job_description: str) -> str:
    """
    Uses NetworkX Directed Graph algorithms to compute Topological Sort and Shortest Learning Paths.
    """
    try:
        if isinstance(candidate_skills, str) and candidate_skills.startswith("["):
            skills = json.loads(candidate_skills)
        elif isinstance(candidate_skills, list):
            skills = candidate_skills
        else:
            skills = [str(candidate_skills)]
    except Exception:
        skills = [str(candidate_skills)]
        
    result = await production_nlp_service.compute_dynamic_skill_graph_gap(skills, target_job_description)
    return json.dumps(result, indent=2)
