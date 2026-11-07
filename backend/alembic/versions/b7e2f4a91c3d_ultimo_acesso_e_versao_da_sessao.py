"""último acesso e versão da sessão dos usuários

Revision ID: b7e2f4a91c3d
Revises: a3c1d9e7b204
Create Date: 2026-11-07 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b7e2f4a91c3d'
down_revision = 'a3c1d9e7b204'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('usuarios', sa.Column('ultimo_acesso', sa.DateTime(timezone=True), nullable=True))
    # Sessões antigas não têm versão no token e valem como 0: ninguém é deslogado no deploy.
    op.add_column(
        'usuarios', sa.Column('sessao_versao', sa.Integer(), nullable=False, server_default='0')
    )


def downgrade() -> None:
    op.drop_column('usuarios', 'sessao_versao')
    op.drop_column('usuarios', 'ultimo_acesso')
