"""add_full_name_and_preferences_to_profiles

Revision ID: a8d29f8c1e40
Revises: f57cc0e8d430
Create Date: 2026-08-19 19:40:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a8d29f8c1e40'
down_revision: Union[str, Sequence[str], None] = 'f57cc0e8d430'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    """Upgrade schema to add missing full_name and preferences columns to profiles."""
    with op.batch_alter_table('profiles') as batch_op:
        batch_op.add_column(sa.Column('full_name', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('preferences', sa.JSON(), nullable=True, server_default='{}'))

def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('profiles') as batch_op:
        batch_op.drop_column('preferences')
        batch_op.drop_column('full_name')
