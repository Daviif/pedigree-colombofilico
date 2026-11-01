"""dono dos pombos e proprietarios, e compartilhamento de plantel

Revision ID: a3c1d9e7b204
Revises: 6bacf5f465cd
Create Date: 2026-11-01 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a3c1d9e7b204'
down_revision = '6bacf5f465cd'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    admin_id = conn.scalar(sa.text("SELECT min(id) FROM usuarios WHERE admin"))
    tem_dados = conn.scalar(
        sa.text("SELECT EXISTS (SELECT 1 FROM pombos) OR EXISTS (SELECT 1 FROM proprietarios)")
    )
    if tem_dados and admin_id is None:
        raise RuntimeError(
            "Há pombos cadastrados mas nenhum usuário admin para ficar com eles. "
            "Crie um com: python -m app.criar_usuario LOGIN --admin"
        )

    # Tudo o que já existe passa a ser do (primeiro) admin.
    for tabela in ("pombos", "proprietarios"):
        op.add_column(tabela, sa.Column('usuario_id', sa.Integer(), nullable=True))
        if admin_id is not None:
            conn.execute(sa.text(f"UPDATE {tabela} SET usuario_id = :id"), {"id": admin_id})
        op.alter_column(tabela, 'usuario_id', nullable=False)
        op.create_foreign_key(f'{tabela}_usuario_id_fkey', tabela, 'usuarios', ['usuario_id'], ['id'])
        op.create_index(op.f(f'ix_{tabela}_usuario_id'), tabela, ['usuario_id'])

    # Anilha deixa de ser única no sistema todo e passa a ser única por plantel.
    op.drop_index('ix_pombos_anilha', table_name='pombos')
    op.create_index(op.f('ix_pombos_anilha'), 'pombos', ['anilha'], unique=False)
    op.create_unique_constraint('uq_pombos_usuario_anilha', 'pombos', ['usuario_id', 'anilha'])

    op.create_table('compartilhamentos',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('dono_id', sa.Integer(), nullable=False),
    sa.Column('convidado_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['convidado_id'], ['usuarios.id'], ),
    sa.ForeignKeyConstraint(['dono_id'], ['usuarios.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('dono_id', 'convidado_id', name='uq_compartilhamento')
    )
    op.create_index(op.f('ix_compartilhamentos_convidado_id'), 'compartilhamentos', ['convidado_id'], unique=False)
    op.create_index(op.f('ix_compartilhamentos_dono_id'), 'compartilhamentos', ['dono_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_compartilhamentos_dono_id'), table_name='compartilhamentos')
    op.drop_index(op.f('ix_compartilhamentos_convidado_id'), table_name='compartilhamentos')
    op.drop_table('compartilhamentos')

    # Falha se a mesma anilha estiver em dois plantéis: resolva antes de voltar.
    op.drop_constraint('uq_pombos_usuario_anilha', 'pombos', type_='unique')
    op.drop_index(op.f('ix_pombos_anilha'), table_name='pombos')
    op.create_index('ix_pombos_anilha', 'pombos', ['anilha'], unique=True)

    for tabela in ("proprietarios", "pombos"):
        op.drop_index(op.f(f'ix_{tabela}_usuario_id'), table_name=tabela)
        op.drop_constraint(f'{tabela}_usuario_id_fkey', tabela, type_='foreignkey')
        op.drop_column(tabela, 'usuario_id')
