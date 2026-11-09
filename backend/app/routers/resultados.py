from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import usuario_atual
from app.database import get_db
from app.models import Pombo, Resultado, Usuario
from app.routers.pombos import buscar_pombo_ou_404
from app.schemas import ResultadoCreate, ResultadoRead, ResultadoRecente, ResultadoUpdate

router = APIRouter(prefix="/pombos/{pombo_id}/resultados", tags=["resultados"])
# Rota própria (fora de /pombos) para não colidir com /pombos/{pombo_id}.
router_recentes = APIRouter(prefix="/resultados", tags=["resultados"])


@router_recentes.get("/recentes", response_model=list[ResultadoRecente])
def resultados_recentes(
    limite: int = Query(default=5, ge=1, le=20),
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(usuario_atual),
):
    """IN-04: últimos resultados do PRÓPRIO plantel (também para o admin), para o Início."""
    stmt = (
        select(Resultado.id, Resultado.pombo_id, Pombo.anilha, Resultado.ano, Resultado.competicao, Resultado.colocacao)
        .join(Pombo, Pombo.id == Resultado.pombo_id)
        .where(Pombo.usuario_id == usuario.id)
        .order_by(Resultado.ano.desc().nullslast(), Resultado.id.desc())
        .limit(limite)
    )
    return [ResultadoRecente(**linha._mapping) for linha in db.execute(stmt)]


@router.get("", response_model=list[ResultadoRead])
def listar_resultados(
    pombo_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(usuario_atual)
):
    buscar_pombo_ou_404(pombo_id, db, usuario)
    stmt = (
        select(Resultado)
        .where(Resultado.pombo_id == pombo_id)
        .order_by(Resultado.ano.desc().nullslast())
    )
    return db.scalars(stmt).all()


@router.post("", response_model=ResultadoRead, status_code=201)
def criar_resultado(
    pombo_id: int,
    dados: ResultadoCreate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(usuario_atual),
):
    buscar_pombo_ou_404(pombo_id, db, usuario, editar=True)
    resultado = Resultado(pombo_id=pombo_id, **dados.model_dump())
    db.add(resultado)
    db.commit()
    db.refresh(resultado)
    return resultado


def _buscar_resultado_ou_404(
    pombo_id: int, resultado_id: int, db: Session, usuario: Usuario
) -> Resultado:
    buscar_pombo_ou_404(pombo_id, db, usuario, editar=True)
    resultado = db.scalars(
        select(Resultado).where(Resultado.id == resultado_id, Resultado.pombo_id == pombo_id)
    ).first()
    if resultado is None:
        raise HTTPException(status_code=404, detail="Resultado não encontrado")
    return resultado


@router.put("/{resultado_id}", response_model=ResultadoRead)
def atualizar_resultado(
    pombo_id: int,
    resultado_id: int,
    dados: ResultadoUpdate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(usuario_atual),
):
    resultado = _buscar_resultado_ou_404(pombo_id, resultado_id, db, usuario)
    for campo, valor in dados.model_dump().items():
        setattr(resultado, campo, valor)
    db.commit()
    db.refresh(resultado)
    return resultado


@router.delete("/{resultado_id}", status_code=204)
def remover_resultado(
    pombo_id: int,
    resultado_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(usuario_atual),
):
    resultado = _buscar_resultado_ou_404(pombo_id, resultado_id, db, usuario)
    db.delete(resultado)
    db.commit()
