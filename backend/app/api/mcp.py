from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List

from app.api.deps import get_current_user
from app.models.user import User
from app.mcp.server import mcp_server

router = APIRouter(prefix="/mcp", tags=["mcp"])

class ToolExecuteRequest(BaseModel):
    name: str
    arguments: Dict[str, Any]

@router.get("/tools")
def list_mcp_tools(current_user: User = Depends(get_current_user)):
    return mcp_server.list_tools()

@router.post("/execute")
async def execute_mcp_tool(
    payload: ToolExecuteRequest,
    current_user: User = Depends(get_current_user)
):
    try:
        result = await mcp_server.execute_tool(payload.name, payload.arguments)
        return {"result": json.loads(result)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

import json
