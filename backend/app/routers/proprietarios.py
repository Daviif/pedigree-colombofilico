from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Proprietario
from app.schemas import ProprietarioCreate, ProprietarioRead, ProprietarioUpdate

router = APIRouter(prefix="/proprietarios", tags=["proprietarios"])


@router.get("", response_model=list[ProprietarioRead])
def listar_proprietarios(db: Session = Depends(get_db)):
    return db.scalars(select(Proprietario).order_by(Proprietario.nome)).all()


@router.post("", response_model=ProprietarioRead, status_code=201)
def criar_proprietario(dados: ProprietarioCreate, db: Session = Depends(get_db)):
    proprietario = Proprietario(**dados.model_dump())
    db.add(proprietario)
    db.commit()
    db.refresh(proprietario)
    return proprietario


def _buscar_ou_404(proprietario_id: int, db: Session) -> Proprietario:
    proprietario = db.get(Proprietario, proprietario_id)
    if proprietario is None:
        raise HTTPException(status_code=404, detail="Proprietário não encontrado")
    return proprietario


@router.get("/{proprietario_id}", response_model=ProprietarioRead)
def obter_proprietario(proprietario_id: int, db: Session = Depends(get_db)):
    return _buscar_ou_404(proprietario_id, db)


@router.put("/{proprietario_id}", response_model=ProprietarioRead)
def atualizar_proprietario(
    proprietario_id: int, dados: ProprietarioUpdate, db: Session = Depends(get_db)
):
    proprietario = _buscar_ou_404(proprietario_id, db)
    for campo, valor in dados.model_dump().items():
        setattr(proprietario, campo, valor)
    db.commit()
    db.refresh(proprietario)
    return proprietario


@router.delete("/{proprietario_id}", status_code=204)
def remover_proprietario(proprietario_id: int, db: Session = Depends(get_db)):
    proprietario = _buscar_ou_404(proprietario_id, db)
    db.delete(proprietario)
    db.commit()
