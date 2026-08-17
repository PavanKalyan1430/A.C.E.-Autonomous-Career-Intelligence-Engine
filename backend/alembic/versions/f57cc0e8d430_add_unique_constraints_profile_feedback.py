"""add_unique_constraints_profile_feedback

Revision ID: f57cc0e8d430
Revises: 5c13fae14884
Create Date: 2026-08-13 23:11:59.391406

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f57cc0e8d430'
down_revision: Union[str, Sequence[str], None] = '5c13fae14884'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('interview_feedbacks') as batch_op:
        batch_op.create_unique_constraint('uq_interview_feedbacks_session_id', ['session_id'])
    with op.batch_alter_table('profiles') as batch_op:
        batch_op.create_unique_constraint('uq_profiles_user_id', ['user_id'])


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('profiles') as batch_op:
        batch_op.drop_constraint('uq_profiles_user_id', type_='unique')
    with op.batch_alter_table('interview_feedbacks') as batch_op:
        batch_op.drop_constraint('uq_interview_feedbacks_session_id', type_='unique')
