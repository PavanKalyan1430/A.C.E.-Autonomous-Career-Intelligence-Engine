from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, cast, Integer
import datetime

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User, Application, InterviewSession, ApplicationStatus

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/dashboard")
async def get_dashboard_metrics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # 1. Real Application status counts from database
    app_result = await db.execute(
        select(Application.status, func.count(Application.id))
        .filter(Application.user_id == current_user.id)
        .group_by(Application.status)
    )
    status_counts = {status: count for status, count in app_result.all()}
    for status in ApplicationStatus:
        status_counts.setdefault(status.value, 0)

    # 2. Real Average mock interview score from completed sessions
    interview_result = await db.execute(
        select(func.avg(cast(InterviewSession.feedback["score"].astext, Integer)))
        .filter(InterviewSession.user_id == current_user.id, InterviewSession.is_completed == True)
    )
    avg_score = interview_result.scalar()

    # 3. Real Total Interview Session count
    session_result = await db.execute(
        select(func.count(InterviewSession.id))
        .filter(InterviewSession.user_id == current_user.id)
    )
    total_sessions = session_result.scalar() or 0

    # 4. Dynamic Monthly Timeline Aggregation from DB timestamps
    six_months_ago = datetime.datetime.utcnow() - datetime.timedelta(days=180)
    
    is_postgresql = False
    try:
        if db.bind and "postgresql" in db.bind.dialect.name:
            is_postgresql = True
    except Exception:
        pass

    if is_postgresql:
        app_date_expr = func.to_char(Application.created_at, 'YYYY-MM')
        int_date_expr = func.to_char(InterviewSession.created_at, 'YYYY-MM')
    else:
        app_date_expr = func.strftime('%Y-%m', Application.created_at)
        int_date_expr = func.strftime('%Y-%m', InterviewSession.created_at)

    monthly_apps_res = await db.execute(
        select(app_date_expr, func.count(Application.id))
        .filter(Application.user_id == current_user.id, Application.created_at >= six_months_ago)
        .group_by(app_date_expr)
    )
    monthly_apps = {month: count for month, count in monthly_apps_res.all() if month}

    monthly_interviews_res = await db.execute(
        select(int_date_expr, func.count(InterviewSession.id))
        .filter(InterviewSession.user_id == current_user.id, InterviewSession.created_at >= six_months_ago)
        .group_by(int_date_expr)
    )
    monthly_interviews = {month: count for month, count in monthly_interviews_res.all() if month}

    # Combine dynamic month keys
    all_months = sorted(list(set(list(monthly_apps.keys()) + list(monthly_interviews.keys()))))
    activity_timeline = [
        {
            "month": month,
            "applications": monthly_apps.get(month, 0),
            "interviews": monthly_interviews.get(month, 0)
        }
        for month in all_months
    ]

    return {
        "funnel": status_counts,
        "average_interview_score": round(float(avg_score), 1) if avg_score is not None else 0.0,
        "total_sessions": total_sessions,
        "activity_timeline": activity_timeline
    }
