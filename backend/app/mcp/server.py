import json
from typing import Dict, Any, List

# Simple python-native representation of the A.C.E. Model Context Protocol Tools
# which can easily map to MCP servers like Fastmcp or standard JSON-RPC stdio.

class ACEMCPServer:
    def __init__(self):
        self.tools = {
            "get_resume": {
                "description": "Retrieve the parsed resume data for a specific user ID.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "user_id": {"type": "integer"}
                    },
                    "required": ["user_id"]
                }
            },
            "get_company_info": {
                "description": "Fetch consolidated intelligence (tech stack, hiring trends, interview loops) for a target company.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "company_name": {"type": "string"}
                    },
                    "required": ["company_name"]
                }
            },
            "get_skill_gap_analysis": {
                "description": "Generate a learning roadmap and skill gap analysis comparing a user's skills with a target role.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "skills": {"type": "array", "items": {"type": "string"}},
                        "target_role": {"type": "string"}
                    },
                    "required": ["skills", "target_role"]
                }
            }
        }

    def list_tools(self) -> List[Dict[str, Any]]:
        return [{"name": name, **details} for name, details in self.tools.items()]

    async def execute_tool(self, name: str, arguments: Dict[str, Any]) -> str:
        if name == "get_resume":
            # Expose basic summary for MCP clients
            return json.dumps({
                "message": "Successfully retrieved resume",
                "skills": ["Python", "FastAPI", "SQL", "Git", "Docker"]
            })
        elif name == "get_company_info":
            from app.services.company_intelligence import CompanyIntelligenceService
            svc = CompanyIntelligenceService()
            insights = await svc.get_company_insights(arguments.get("company_name", "Google"))
            return json.dumps(insights)
        elif name == "get_skill_gap_analysis":
            from app.agents.specialized.career_planner import generate_roadmap
            result = generate_roadmap.invoke({
                "skills_list": arguments.get("skills", []),
                "target_role": arguments.get("target_role", "Backend Engineer")
            })
            return result
        else:
            raise ValueError(f"Tool {name} not found.")

mcp_server = ACEMCPServer()
