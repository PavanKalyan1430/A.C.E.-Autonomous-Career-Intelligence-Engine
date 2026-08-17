"""rename_score_to_overall_score

Revision ID: 5c13fae14884
Revises: 77cce5d9c29a
Create Date: 2026-08-13 23:02:22.882728

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5c13fae14884'
down_revision: Union[str, Sequence[str], None] = '77cce5d9c29a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Rename column on interview_feedbacks table
    op.alter_column('interview_feedbacks', 'score', new_column_name='overall_score')

    # Migrate JSON keys in interview_sessions feedback column
    bind = op.get_bind()
    sessions = bind.execute(sa.text("SELECT id, feedback FROM interview_sessions")).fetchall()
    for session_id, feedback_str in sessions:
        if feedback_str:
            try:
                import json
                feedback = json.loads(feedback_str) if isinstance(feedback_str, str) else feedback_str
                if feedback and "score" in feedback:
                    feedback["overall_score"] = feedback.pop("score")
                    bind.execute(
                        sa.text("UPDATE interview_sessions SET feedback = :feedback WHERE id = :id"),
                        {"feedback": json.dumps(feedback), "id": session_id}
                    )
            except Exception:
                pass


def downgrade() -> None:
    """Downgrade schema."""
    # Rename column back to score
    op.alter_column('interview_feedbacks', 'overall_score', new_column_name='score')

    # Migrate JSON keys back to score in interview_sessions feedback
    bind = op.get_bind()
    sessions = bind.execute(sa.text("SELECT id, feedback FROM interview_sessions")).fetchall()
    for session_id, feedback_str in sessions:
        if feedback_str:
            try:
                import json
                feedback = json.loads(feedback_str) if isinstance(feedback_str, str) else feedback_str
                if feedback and "overall_score" in feedback:
                    feedback["score"] = feedback.pop("overall_score")
                    bind.execute(
                        sa.text("UPDATE interview_sessions SET feedback = :feedback WHERE id = :id"),
                        {"feedback": json.dumps(feedback), "id": session_id}
                    )
            except Exception:
                pass
