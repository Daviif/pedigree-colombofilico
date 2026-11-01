"""Quem pode ver e editar o quê.

- Cada usuário vê e edita o próprio plantel.
- Quem recebeu um compartilhamento vê o plantel do dono, só para leitura.
- O admin vê e edita tudo.
"""

from fastapi import HTTPException, status
from sqlalchemy import ColumnElement, or_, select, true

from app.models import Compartilhamento, Usuario


def condicao_visivel(coluna_dono, usuario: Usuario) -> ColumnElement[bool]:
    """Filtro SQL para os registros que `usuario` pode ver, dada a coluna com o
    id do dono (ex.: Pombo.usuario_id)."""
    if usuario.admin:
        return true()
    compartilhados = select(Compartilhamento.dono_id).where(
        Compartilhamento.convidado_id == usuario.id
    )
    return or_(coluna_dono == usuario.id, coluna_dono.in_(compartilhados))


def pode_editar(dono_id: int, usuario: Usuario) -> bool:
    return usuario.admin or dono_id == usuario.id


def exigir_edicao(dono_id: int, usuario: Usuario) -> None:
    if not pode_editar(dono_id, usuario):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Este pombo é de outro plantel: você só pode visualizá-lo."
        )

