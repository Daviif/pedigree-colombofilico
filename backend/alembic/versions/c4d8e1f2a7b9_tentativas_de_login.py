"""tentativas de login (limite de falhas, RA-xx)

Revision ID: c4d8e1f2a7b9
Revises: b7e2f4a91c3d
Create Date: 2026-11-07 18:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c4d8e1f2a7b9'
down_revision = 'b7e2f4a91c3d'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'tentativas_login',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('login', sa.String(50), nullable=False),
        sa.Column('ip', sa.String(45), nullable=False),
        sa.Column('criado_em', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_tentativas_login_login_criado_em', 'tentativas_login', ['login', 'criado_em'])
    op.create_index('ix_tentativas_login_ip_criado_em', 'tentativas_login', ['ip', 'criado_em'])


def downgrade() -> None:
    op.drop_table('tentativas_login')
