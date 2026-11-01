from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import usuario_atual
from app.database import get_db
from app.models import Compartilhamento, Usuario
from app.schemas import CompartilhamentosResponse, CompartilharInput

router = APIRouter(prefix="/compartilhamentos", tags=["compartilhamentos"])


@router.get("", response_model=CompartilhamentosResponse)
def listar_compartilhamentos(
    db: Session = Depends(get_db), usuario: Usuario = Depends(usuario_atual)
):
    concedidos = db.scalars(
        select(Usuario)
        .join(Compartilhamento, Compartilhamento.convidado_id == Usuario.id)
        .where(Compartilhamento.dono_id == usuario.id)
        .order_by(Usuario.nome)
    ).all()
    recebidos = db.scalars(
        select(Usuario)
        .join(Compartilhamento, Compartilhamento.dono_id == Usuario.id)
        .where(Compartilhamento.convidado_id == usuario.id, Usuario.ativo)
        .order_by(Usuario.nome)
    ).all()
    return CompartilhamentosResponse(concedidos=concedidos, recebidos=recebidos)


@router.post("", response_model=CompartilhamentosResponse, status_code=201)
def compartilhar_plantel(
    dados: CompartilharInput,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(usuario_atual),
):
    """Libera o plantel inteiro do usuário, só para leitura, para outro usuário."""
    convidado = db.scalar(select(Usuario).where(Usuario.login == dados.login.strip().lower()))
    if convidado is None or not convidado.ativo:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    if convidado.id == usuario.id:
        raise HTTPException(status_code=400, detail="Você não pode compartilhar com você mesmo")

    ja_existe = db.scalar(
        select(Compartilhamento).where(
            Compartilhamento.dono_id == usuario.id, Compartilhamento.convidado_id == convidado.id
        )
    )
    if not ja_existe:
        db.add(Compartilhamento(dono_id=usuario.id, convidado_id=convidado.id))
        db.commit()
    return listar_compartilhamentos(db, usuario)


def _remover(dono_id: int, convidado_id: int, db: Session) -> None:
    compartilhamento = db.scalar(
        select(Compartilhamento).where(
            Compartilhamento.dono_id == dono_id, Compartilhamento.convidado_id == convidado_id
        )
    )
    if compartilhamento is None:
        raise HTTPException(status_code=404, detail="Compartilhamento não encontrado")
    db.delete(compartilhamento)
    db.commit()


@router.delete("/concedidos/{convidado_id}", status_code=204)
def revogar(
    convidado_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(usuario_atual)
):
    """O dono deixa de compartilhar o plantel com `convidado_id`."""
    _remover(usuario.id, convidado_id, db)


@router.delete("/recebidos/{dono_id}", status_code=204)
def sair(dono_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(usuario_atual)):
    """O convidado deixa de ver o plantel de `dono_id`."""
    _remover(dono_id, usuario.id, db)
