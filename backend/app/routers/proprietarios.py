from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.acesso import pode_editar
from app.auth import usuario_atual
from app.database import get_db
from app.genealogia import exigir_proprietario_sem_uso
from app.models import Proprietario, Usuario
from app.schemas import ProprietarioCreate, ProprietarioRead, ProprietarioUpdate

router = APIRouter(prefix="/proprietarios", tags=["proprietarios"])


@router.get("", response_model=list[ProprietarioRead])
def listar_proprietarios(
    usuario_id: int | None = None,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(usuario_atual),
):
    """Proprietários do plantel do usuário. O admin pode pedir os de outro
    plantel (`usuario_id`), para editar pombos de lá."""
    dono_id = usuario_id or usuario.id
    if not pode_editar(dono_id, usuario):
        return []
    stmt = select(Proprietario).where(Proprietario.usuario_id == dono_id).order_by(Proprietario.nome)
    return db.scalars(stmt).all()


@router.post("", response_model=ProprietarioRead, status_code=201)
def criar_proprietario(
    dados: ProprietarioCreate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(usuario_atual),
):
    proprietario = Proprietario(usuario_id=usuario.id, **dados.model_dump())
    db.add(proprietario)
    db.commit()
    db.refresh(proprietario)
    return proprietario


def _buscar_ou_404(proprietario_id: int, db: Session, usuario: Usuario) -> Proprietario:
    proprietario = db.get(Proprietario, proprietario_id)
    if proprietario is None or not pode_editar(proprietario.usuario_id, usuario):
        raise HTTPException(status_code=404, detail="Proprietário não encontrado")
    return proprietario


@router.get("/{proprietario_id}", response_model=ProprietarioRead)
def obter_proprietario(
    proprietario_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(usuario_atual)
):
    return _buscar_ou_404(proprietario_id, db, usuario)


@router.put("/{proprietario_id}", response_model=ProprietarioRead)
def atualizar_proprietario(
    proprietario_id: int,
    dados: ProprietarioUpdate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(usuario_atual),
):
    proprietario = _buscar_ou_404(proprietario_id, db, usuario)
    for campo, valor in dados.model_dump().items():
        setattr(proprietario, campo, valor)
    db.commit()
    db.refresh(proprietario)
    return proprietario


@router.delete("/{proprietario_id}", status_code=204)
def remover_proprietario(
    proprietario_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(usuario_atual)
):
    proprietario = _buscar_ou_404(proprietario_id, db, usuario)
    exigir_proprietario_sem_uso(proprietario, db)  # RG-10
    db.delete(proprietario)
    db.commit()
