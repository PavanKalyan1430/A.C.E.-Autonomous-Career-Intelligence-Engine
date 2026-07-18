from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User, Application, InterviewSession

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/dashboard")
async def get_dashboard_metrics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # 1. Application status counts
    app_result = await db.execute(
        select(Application.status, func.count(Application.id))
        .filter(Application.user_id == current_user.id)
        .group_by(Application.status)
    )
    status_counts = {status: count for status, count in app_result.all()}
    
    # Fill in default zeros for common statuses
    for status in ["applied", "interview", "offer", "rejected"]:
        status_counts.setdefault(status, 0)
        
    # 2. Average mock interview score
    interview_result = await db.execute(
        select(func.avg(InterviewSession.feedback["score"].cast(func.Integer)))
        .filter(InterviewSession.user_id == current_user.id, InterviewSession.is_completed == True)
    )
    avg_score = interview_result.scalar() or 0
    
    # 3. Interview session count
    session_result = await db.execute(
        select(func.count(InterviewSession.id))
        .filter(InterviewSession.user_id == current_user.id)
    )
    total_sessions = session_result.scalar() or 0

    # 4. Mock activity dataset for rendering line graphs
    activity_timeline = [
        {"month": "Jan", "applications": 2, "interviews": 1},
        {"month": "Feb", "applications": 5, "interviews": 2},
        {"month": "Mar", "applications": status_counts.get("applied", 0), "interviews": total_sessions}
    ]

    return {
        "funnel": status_counts,
        "average_interview_score": round(float(avg_score), 1) if avg_score else 75.0,
        "total_sessions": total_sessions,
        "activity_timeline": activity_timeline
    }
