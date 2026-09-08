from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Pombo, Sexo, StatusPombo
from app.pedigree import montar_arvore
from app.schemas import ArvoreNo, IrmaosResponse, PomboCreate, PomboDetail, PomboRead, PomboUpdate

router = APIRouter(prefix="/pombos", tags=["pombos"])

_OPCOES_CARREGAMENTO = (
    joinedload(Pombo.proprietario),
    joinedload(Pombo.pai),
    joinedload(Pombo.mae),
)


@router.get("", response_model=list[PomboRead])
def listar_pombos(
    anilha: str | None = None,
    cor: str | None = None,
    sexo: Sexo | None = None,
    status: StatusPombo | None = None,
    proprietario_id: int | None = None,
    db: Session = Depends(get_db),
):
    stmt = select(Pombo).options(*_OPCOES_CARREGAMENTO)
    if anilha:
        stmt = stmt.where(Pombo.anilha.ilike(f"%{anilha}%"))
    if cor:
        stmt = stmt.where(Pombo.cor.ilike(f"%{cor}%"))
    if sexo:
        stmt = stmt.where(Pombo.sexo == sexo)
    if status:
        stmt = stmt.where(Pombo.status == status)
    if proprietario_id:
        stmt = stmt.where(Pombo.proprietario_id == proprietario_id)
    stmt = stmt.order_by(Pombo.anilha)
    return db.scalars(stmt).unique().all()


def buscar_pombo_ou_404(pombo_id: int, db: Session) -> Pombo:
    pombo = db.scalars(
        select(Pombo).options(*_OPCOES_CARREGAMENTO).where(Pombo.id == pombo_id)
    ).first()
    if pombo is None:
        raise HTTPException(status_code=404, detail="Pombo não encontrado")
    return pombo


def _validar_pais(dados: PomboCreate | PomboUpdate, pombo_id: int | None, db: Session) -> None:
    if dados.pai_id is not None:
        if dados.pai_id == pombo_id:
            raise HTTPException(status_code=400, detail="Um pombo não pode ser pai de si mesmo")
        if db.get(Pombo, dados.pai_id) is None:
            raise HTTPException(status_code=400, detail="Pai informado não existe")
    if dados.mae_id is not None:
        if dados.mae_id == pombo_id:
            raise HTTPException(status_code=400, detail="Um pombo não pode ser mãe de si mesmo")
        if db.get(Pombo, dados.mae_id) is None:
            raise HTTPException(status_code=400, detail="Mãe informada não existe")


@router.post("", response_model=PomboRead, status_code=201)
def criar_pombo(dados: PomboCreate, db: Session = Depends(get_db)):
    if db.scalar(select(Pombo).where(Pombo.anilha == dados.anilha)):
        raise HTTPException(status_code=400, detail="Já existe um pombo com essa anilha")
    _validar_pais(dados, None, db)

    pombo = Pombo(**dados.model_dump())
    db.add(pombo)
    db.commit()
    return buscar_pombo_ou_404(pombo.id, db)


@router.get("/{pombo_id}", response_model=PomboDetail)
def obter_pombo(pombo_id: int, db: Session = Depends(get_db)):
    return buscar_pombo_ou_404(pombo_id, db)


@router.put("/{pombo_id}", response_model=PomboRead)
def atualizar_pombo(pombo_id: int, dados: PomboUpdate, db: Session = Depends(get_db)):
    pombo = buscar_pombo_ou_404(pombo_id, db)

    outro = db.scalar(select(Pombo).where(Pombo.anilha == dados.anilha, Pombo.id != pombo_id))
    if outro:
        raise HTTPException(status_code=400, detail="Já existe um pombo com essa anilha")
    _validar_pais(dados, pombo_id, db)

    for campo, valor in dados.model_dump().items():
        setattr(pombo, campo, valor)
    db.commit()
    return buscar_pombo_ou_404(pombo_id, db)


@router.delete("/{pombo_id}", status_code=204)
def remover_pombo(pombo_id: int, db: Session = Depends(get_db)):
    pombo = buscar_pombo_ou_404(pombo_id, db)
    db.delete(pombo)
    db.commit()


@router.get("/{pombo_id}/arvore", response_model=ArvoreNo)
def obter_arvore(pombo_id: int, geracoes: int = Query(default=4, ge=1, le=6), db: Session = Depends(get_db)):
    pombo = buscar_pombo_ou_404(pombo_id, db)
    return montar_arvore(pombo, geracoes)


@router.get("/{pombo_id}/irmaos", response_model=IrmaosResponse)
def obter_irmaos(pombo_id: int, db: Session = Depends(get_db)):
    """Lista irmãos (mesmo pai e mesma mãe) e meios-irmãos (mesmo pai OU mesma
    mãe, mas não ambos) de um pombo."""
    pombo = buscar_pombo_ou_404(pombo_id, db)

    resposta = IrmaosResponse()
    if pombo.pai_id is None and pombo.mae_id is None:
        return resposta

    condicoes = []
    if pombo.pai_id is not None:
        condicoes.append(Pombo.pai_id == pombo.pai_id)
    if pombo.mae_id is not None:
        condicoes.append(Pombo.mae_id == pombo.mae_id)

    candidatos = db.scalars(
        select(Pombo).where(Pombo.id != pombo_id, or_(*condicoes))
    ).all()

    for candidato in candidatos:
        mesmo_pai = pombo.pai_id is not None and candidato.pai_id == pombo.pai_id
        mesma_mae = pombo.mae_id is not None and candidato.mae_id == pombo.mae_id
        if mesmo_pai and mesma_mae:
            resposta.completos.append(candidato)
        elif mesmo_pai:
            resposta.meios_paternos.append(candidato)
        elif mesma_mae:
            resposta.meios_maternos.append(candidato)

    return resposta
