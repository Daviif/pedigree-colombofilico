"""Gestão de usuários pelo admin. As regras estão no README (seção "Tela Usuários")."""

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import hash_senha, usuario_atual
from app import limite_login
from app.database import get_db
from app.models import Pombo, Usuario
from app.routers.auth import gravar_cookie_sessao
from app.schemas import SenhaInput, UsuarioAdminRead, UsuarioCreate, UsuarioUpdate


def exigir_admin(usuario: Usuario = Depends(usuario_atual)) -> Usuario:
    if not usuario.admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Só o administrador pode gerenciar usuários.")
    return usuario


router = APIRouter(prefix="/usuarios", tags=["usuarios"], dependencies=[Depends(exigir_admin)])


def _com_total_pombos(db: Session, usuarios: list[Usuario]) -> list[UsuarioAdminRead]:
    totais = dict(
        db.execute(
            select(Pombo.usuario_id, func.count()).group_by(Pombo.usuario_id)
        ).all()
    )
    bloqueados = limite_login.logins_bloqueados(db)
    return [
        UsuarioAdminRead.model_validate(u).model_copy(
            update={"total_pombos": totais.get(u.id, 0), "bloqueado": u.login in bloqueados}
        )
        for u in usuarios
    ]


def _buscar(usuario_id: int, db: Session) -> Usuario:
    usuario = db.get(Usuario, usuario_id)
    if usuario is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuário não encontrado")
    return usuario


@router.get("", response_model=list[UsuarioAdminRead])
def listar_usuarios(db: Session = Depends(get_db)):
    usuarios = db.scalars(select(Usuario).order_by(Usuario.ativo.desc(), Usuario.nome)).all()
    return _com_total_pombos(db, list(usuarios))


@router.post("", response_model=UsuarioAdminRead, status_code=201)
def criar_usuario(dados: UsuarioCreate, db: Session = Depends(get_db)):
    if db.scalar(select(Usuario.id).where(Usuario.login == dados.login)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Já existe um usuário com esse login")
    usuario = Usuario(
        login=dados.login, nome=dados.nome, senha_hash=hash_senha(dados.senha), admin=dados.admin
    )
    db.add(usuario)
    try:
        db.commit()
    except IntegrityError:  # dois cadastros do mesmo login ao mesmo tempo
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Já existe um usuário com esse login")
    return _com_total_pombos(db, [usuario])[0]


@router.patch("/{usuario_id}", response_model=UsuarioAdminRead)
def atualizar_usuario(
    usuario_id: int,
    dados: UsuarioUpdate,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(exigir_admin),
):
    alvo = _buscar(usuario_id, db)
    tira_admin = (dados.admin is False and alvo.admin) or (dados.ativo is False and alvo.ativo and alvo.admin)

    if alvo.id == admin.id and (dados.admin is False or dados.ativo is False):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Você não pode tirar o seu próprio perfil de admin nem se desativar",
        )

    if tira_admin:
        # Trava única: duas mudanças simultâneas que tiram admins esperam uma pela outra,
        # e a segunda já conta com o resultado da primeira.
        db.execute(text("SELECT pg_advisory_xact_lock(hashtext('administradores'))"))
        outros_admins = db.scalar(
            select(func.count())
            .select_from(Usuario)
            .where(Usuario.admin, Usuario.ativo, Usuario.id != alvo.id)
        )
        if not outros_admins:
            db.rollback()
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, "O sistema precisa ter pelo menos um admin ativo"
            )
        db.refresh(alvo)

    if dados.nome is not None:
        alvo.nome = dados.nome
    if dados.admin is not None:
        alvo.admin = dados.admin
    if dados.ativo is not None:
        alvo.ativo = dados.ativo
    db.commit()
    return _com_total_pombos(db, [alvo])[0]


@router.post("/{usuario_id}/senha", status_code=204)
def redefinir_senha(
    usuario_id: int,
    dados: SenhaInput,
    response: Response,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(exigir_admin),
):
    alvo = _buscar(usuario_id, db)
    alvo.senha_hash = hash_senha(dados.senha)
    alvo.sessao_versao += 1  # encerra as sessões abertas
    limite_login.zerar_falhas(alvo.login, db)  # RA-08
    db.commit()
    if alvo.id == admin.id:
        gravar_cookie_sessao(response, alvo)  # o admin continua logado aqui


@router.post("/{usuario_id}/desbloquear", status_code=204)
def desbloquear_login(usuario_id: int, db: Session = Depends(get_db)):
    """RA-08: apaga as falhas de login do usuário (o bloqueio por IP continua)."""
    alvo = _buscar(usuario_id, db)
    limite_login.zerar_falhas(alvo.login, db)
    db.commit()
