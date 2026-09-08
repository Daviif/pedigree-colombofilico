from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Resultado
from app.routers.pombos import buscar_pombo_ou_404
from app.schemas import ResultadoCreate, ResultadoRead, ResultadoUpdate

router = APIRouter(prefix="/pombos/{pombo_id}/resultados", tags=["resultados"])


@router.get("", response_model=list[ResultadoRead])
def listar_resultados(pombo_id: int, db: Session = Depends(get_db)):
    buscar_pombo_ou_404(pombo_id, db)
    stmt = (
        select(Resultado)
        .where(Resultado.pombo_id == pombo_id)
        .order_by(Resultado.ano.desc().nullslast())
    )
    return db.scalars(stmt).all()


@router.post("", response_model=ResultadoRead, status_code=201)
def criar_resultado(pombo_id: int, dados: ResultadoCreate, db: Session = Depends(get_db)):
    buscar_pombo_ou_404(pombo_id, db)
    resultado = Resultado(pombo_id=pombo_id, **dados.model_dump())
    db.add(resultado)
    db.commit()
    db.refresh(resultado)
    return resultado


def _buscar_resultado_ou_404(pombo_id: int, resultado_id: int, db: Session) -> Resultado:
    resultado = db.scalars(
        select(Resultado).where(Resultado.id == resultado_id, Resultado.pombo_id == pombo_id)
    ).first()
    if resultado is None:
        raise HTTPException(status_code=404, detail="Resultado não encontrado")
    return resultado


@router.put("/{resultado_id}", response_model=ResultadoRead)
def atualizar_resultado(
    pombo_id: int, resultado_id: int, dados: ResultadoUpdate, db: Session = Depends(get_db)
):
    resultado = _buscar_resultado_ou_404(pombo_id, resultado_id, db)
    for campo, valor in dados.model_dump().items():
        setattr(resultado, campo, valor)
    db.commit()
    db.refresh(resultado)
    return resultado


@router.delete("/{resultado_id}", status_code=204)
def remover_resultado(pombo_id: int, resultado_id: int, db: Session = Depends(get_db)):
    resultado = _buscar_resultado_ou_404(pombo_id, resultado_id, db)
    db.delete(resultado)
    db.commit()
