"""add_ats_analysis_to_resumes

Revision ID: a990a53ad970
Revises: a8d29f8c1e40
Create Date: 2026-08-27 13:42:02.654428

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a990a53ad970'
down_revision: Union[str, Sequence[str], None] = 'a8d29f8c1e40'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('interview_feedbacks') as batch_op:
        batch_op.alter_column('overall_score', existing_type=sa.INTEGER(), nullable=False)

    json_type = sa.JSON()
    with op.batch_alter_table('profiles') as batch_op:
        batch_op.alter_column('preferences', existing_type=json_type, nullable=False)

    with op.batch_alter_table('resumes') as batch_op:
        batch_op.add_column(sa.Column('ats_analysis', sa.JSON(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('resumes', 'ats_analysis')
    op.alter_column('profiles', 'preferences',
               existing_type=postgresql.JSON(astext_type=sa.Text()),
               nullable=True,
               existing_server_default=sa.text("'{}'::json"))
    op.add_column('interview_feedbacks', sa.Column('score', sa.INTEGER(), autoincrement=False, nullable=True))
    op.alter_column('interview_feedbacks', 'overall_score',
               existing_type=sa.INTEGER(),
               nullable=True,
               existing_server_default=sa.text('0'))
    # ### end Alembic commands ###
