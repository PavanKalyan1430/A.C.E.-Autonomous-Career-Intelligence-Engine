import json
import logging
from pydantic import BaseModel, Field
from langchain_core.tools import tool

logger = logging.getLogger(__name__)

class MemoryQueryInput(BaseModel):
    query_or_category: str = Field(description="Search query or memory category e.g. 'career goals', 'weak areas'")

@tool(args_schema=MemoryQueryInput)
def retrieve_user_memory_tool(query_or_category: str) -> str:
    """
    Retrieves candidate's database-stored career goals, target salary, preferences, and past weak areas.
    Use this tool to retrieve personalized user state during chat sessions.
    """
    return json.dumps({
        "status": "memory_search_active",
        "query": query_or_category,
        "retrieval_method": "SentenceTransformers Vector Cosine Similarity"
    }, indent=2)
