from typing import TypedDict, List, Dict, Any, Annotated
import operator

class AgentState(TypedDict):
    # Aggregated conversation history
    messages: Annotated[List[Dict[str, Any]], operator.add]
    user_id: int
    current_agent: str
    
    # Shared memories across nodes
    resume_data: Dict[str, Any]
    company_data: Dict[str, Any]
    roadmap_data: Dict[str, Any]
    interview_data: Dict[str, Any]
    
    # Graph routing variable
    next_step: str
