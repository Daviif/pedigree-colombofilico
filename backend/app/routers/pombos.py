from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload

from app.acesso import condicao_visivel, exigir_edicao
from app.auth import usuario_atual
from app.database import get_db
from app.genealogia import (
    exigir_sem_filhos,
    travar_plantel,
    validar_genitor,
    validar_mudanca_de_sexo,
)
from app.models import Pombo, Proprietario, Resultado, Sexo, StatusPombo, Usuario
from app.pedigree import montar_arvore
from app.schemas import ArvoreNo, IrmaosResponse, PomboCreate, PomboDetail, PomboRead, PomboUpdate

router = APIRouter(prefix="/pombos", tags=["pombos"])

_OPCOES_CARREGAMENTO = (
    joinedload(Pombo.dono),
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
    usuario_id: int | None = None,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(usuario_atual),
):
    """Lista os pombos que o usuário pode ver: os dele, os dos plantéis
    compartilhados com ele (ou todos, se for admin). `usuario_id` restringe a
    um plantel só."""
    stmt = select(Pombo).options(*_OPCOES_CARREGAMENTO).where(
        condicao_visivel(Pombo.usuario_id, usuario)
    )
    if usuario_id:
        stmt = stmt.where(Pombo.usuario_id == usuario_id)
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


def buscar_pombo_ou_404(
    pombo_id: int, db: Session, usuario: Usuario, editar: bool = False
) -> Pombo:
    """Pombos de plantéis que o usuário não pode ver respondem 404, como se não
    existissem; os que ele só pode ver respondem 403 quando `editar`."""
    pombo = db.scalars(
        select(Pombo)
        .options(*_OPCOES_CARREGAMENTO)
        .where(Pombo.id == pombo_id, condicao_visivel(Pombo.usuario_id, usuario))
    ).first()
    if pombo is None:
        raise HTTPException(status_code=404, detail="Pombo não encontrado")
    if editar:
        exigir_edicao(pombo.usuario_id, usuario)
    return pombo


def _validar_vinculos(
    dados: PomboCreate | PomboUpdate, atual: Pombo | None, dono_id: int, db: Session
) -> None:
    """Pai, mãe e proprietário precisam ser do mesmo plantel do pombo (RG-08); para usar
    um pombo de um plantel compartilhado como pai/mãe, copie-o antes. Demais regras em
    app/genealogia.py. `atual` é None no cadastro."""
    pombo_id = atual.id if atual else None
    mudou_pai = atual is None or dados.pai_id != atual.pai_id
    mudou_mae = atual is None or dados.mae_id != atual.mae_id
    mudou_sexo = atual is not None and dados.sexo != atual.sexo
    if (mudou_pai and dados.pai_id) or (mudou_mae and dados.mae_id) or mudou_sexo:
        travar_plantel(dono_id, db)  # RG-03, antes de ler a ascendência e os filhos
    validar_genitor("pai", dados.pai_id, pombo_id, dados.anilha, dono_id, mudou_pai, db)
    validar_genitor("mae", dados.mae_id, pombo_id, dados.anilha, dono_id, mudou_mae, db)
    if atual is not None:
        validar_mudanca_de_sexo(atual, dados.sexo, db)  # RG-06
    if dados.proprietario_id is not None:
        proprietario = db.get(Proprietario, dados.proprietario_id)
        if proprietario is None or proprietario.usuario_id != dono_id:
            raise HTTPException(status_code=400, detail="Proprietário informado não existe")


def _anilha_em_uso(anilha: str, dono_id: int, db: Session, exceto_id: int | None = None) -> bool:
    stmt = select(Pombo.id).where(Pombo.usuario_id == dono_id, Pombo.anilha == anilha)
    if exceto_id is not None:
        stmt = stmt.where(Pombo.id != exceto_id)
    return db.scalar(stmt) is not None


@router.post("", response_model=PomboRead, status_code=201)
def criar_pombo(
    dados: PomboCreate, db: Session = Depends(get_db), usuario: Usuario = Depends(usuario_atual)
):
    if _anilha_em_uso(dados.anilha, usuario.id, db):
        raise HTTPException(status_code=400, detail="Já existe um pombo com essa anilha")
    _validar_vinculos(dados, None, usuario.id, db)

    pombo = Pombo(usuario_id=usuario.id, **dados.model_dump())
    db.add(pombo)
    db.commit()
    return buscar_pombo_ou_404(pombo.id, db, usuario)


@router.get("/{pombo_id}", response_model=PomboDetail)
def obter_pombo(
    pombo_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(usuario_atual)
):
    return buscar_pombo_ou_404(pombo_id, db, usuario)


@router.put("/{pombo_id}", response_model=PomboRead)
def atualizar_pombo(
    pombo_id: int,
    dados: PomboUpdate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(usuario_atual),
):
    pombo = buscar_pombo_ou_404(pombo_id, db, usuario, editar=True)

    if _anilha_em_uso(dados.anilha, pombo.usuario_id, db, exceto_id=pombo_id):
        raise HTTPException(status_code=400, detail="Já existe um pombo com essa anilha")
    _validar_vinculos(dados, pombo, pombo.usuario_id, db)

    for campo, valor in dados.model_dump().items():
        setattr(pombo, campo, valor)
    db.commit()
    return buscar_pombo_ou_404(pombo_id, db, usuario)


@router.delete("/{pombo_id}", status_code=204)
def remover_pombo(
    pombo_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(usuario_atual)
):
    pombo = buscar_pombo_ou_404(pombo_id, db, usuario, editar=True)
    exigir_sem_filhos(pombo, db)  # RG-09
    db.delete(pombo)
    db.commit()


def _proprietario_no_plantel(origem: Proprietario, dono_id: int, db: Session) -> Proprietario:
    """Reaproveita o proprietário de mesmo nome do plantel de destino ou cria
    uma cópia dele."""
    existente = db.scalar(
        select(Proprietario).where(
            Proprietario.usuario_id == dono_id, Proprietario.nome.ilike(origem.nome)
        )
    )
    if existente:
        return existente
    copia = Proprietario(
        usuario_id=dono_id,
        nome=origem.nome,
        colombodromo=origem.colombodromo,
        endereco=origem.endereco,
        telefone=origem.telefone,
        email=origem.email,
        observacoes=origem.observacoes,
    )
    db.add(copia)
    db.flush()
    return copia


def _copiar(origem: Pombo, dono_id: int, db: Session, copiados: dict[int, Pombo]) -> Pombo:
    if origem.id in copiados:
        return copiados[origem.id]
    # Ancestral que o destino já tem cadastrado (mesma anilha) é reaproveitado
    # em vez de duplicado.
    existente = db.scalar(
        select(Pombo).where(Pombo.usuario_id == dono_id, Pombo.anilha == origem.anilha)
    )
    if existente:
        copiados[origem.id] = existente
        return existente

    copia = Pombo(
        usuario_id=dono_id,
        anilha=origem.anilha,
        sexo=origem.sexo,
        cor=origem.cor,
        status=origem.status,
        observacoes=origem.observacoes,
        origem=origem.origem,
        resultados=[
            Resultado(
                ano=r.ano,
                competicao=r.competicao,
                distancia_km=r.distancia_km,
                colocacao=r.colocacao,
                premio=r.premio,
                observacao=r.observacao,
            )
            for r in origem.resultados
        ],
    )
    if origem.proprietario:
        copia.proprietario = _proprietario_no_plantel(origem.proprietario, dono_id, db)
    db.add(copia)
    copiados[origem.id] = copia
    if origem.pai:
        copia.pai = _copiar(origem.pai, dono_id, db, copiados)
    if origem.mae:
        copia.mae = _copiar(origem.mae, dono_id, db, copiados)
    return copia


@router.post("/{pombo_id}/copiar", response_model=PomboRead, status_code=201)
def copiar_pombo(
    pombo_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(usuario_atual)
):
    """Copia um pombo de outro plantel (com todos os ancestrais e resultados)
    para o plantel do usuário. A cópia é independente: mudanças feitas depois
    no original não chegam a ela."""
    pombo = buscar_pombo_ou_404(pombo_id, db, usuario)
    if pombo.usuario_id == usuario.id:
        raise HTTPException(status_code=400, detail="Este pombo já é do seu plantel")
    if _anilha_em_uso(pombo.anilha, usuario.id, db):
        raise HTTPException(
            status_code=400, detail="Você já tem um pombo com essa anilha no seu plantel"
        )

    copia = _copiar(pombo, usuario.id, db, {})
    db.commit()
    return buscar_pombo_ou_404(copia.id, db, usuario)


@router.get("/{pombo_id}/arvore", response_model=ArvoreNo)
def obter_arvore(
    pombo_id: int,
    geracoes: int = Query(default=4, ge=1, le=6),
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(usuario_atual),
):
    pombo = buscar_pombo_ou_404(pombo_id, db, usuario)
    return montar_arvore(pombo, geracoes)


@router.get("/{pombo_id}/irmaos", response_model=IrmaosResponse)
def obter_irmaos(
    pombo_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(usuario_atual)
):
    """Lista irmãos (mesmo pai e mesma mãe) e meios-irmãos (mesmo pai OU mesma
    mãe, mas não ambos) de um pombo."""
    pombo = buscar_pombo_ou_404(pombo_id, db, usuario)

    resposta = IrmaosResponse()
    if pombo.pai_id is None and pombo.mae_id is None:
        return resposta

    condicoes = []
    if pombo.pai_id is not None:
        condicoes.append(Pombo.pai_id == pombo.pai_id)
    if pombo.mae_id is not None:
        condicoes.append(Pombo.mae_id == pombo.mae_id)

    candidatos = db.scalars(
        select(Pombo).where(
            Pombo.id != pombo_id, Pombo.usuario_id == pombo.usuario_id, or_(*condicoes)
        )
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
