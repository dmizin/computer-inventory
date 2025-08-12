"""Merge migrations

Revision ID: 81d9590ea559
Revises: eb3165ee5349, b282f9258ac6
Create Date: 2025-08-11 19:49:39.833275

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '81d9590ea559'
down_revision: Union[str, None] = ('eb3165ee5349', 'b282f9258ac6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
