from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import COOKIE_SESSAO, DURACAO_SESSAO, criar_token, usuario_atual, verificar_senha
from app.config import settings
from app.database import get_db
from app.models import Usuario
from app.schemas import UsuarioRead

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginInput(BaseModel):
    login: str
    senha: str


@router.post("/login", response_model=UsuarioRead)
def login(dados: LoginInput, response: Response, db: Session = Depends(get_db)):
    usuario = db.scalar(select(Usuario).where(Usuario.login == dados.login.strip().lower()))
    if not verificar_senha(dados.senha, usuario.senha_hash if usuario else None) or not usuario.ativo:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Usuário ou senha incorretos.")

    response.set_cookie(
        COOKIE_SESSAO,
        criar_token(usuario),
        max_age=int(DURACAO_SESSAO.total_seconds()),
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
    )
    return usuario


@router.post("/logout", status_code=204)
def logout(response: Response):
    response.delete_cookie(COOKIE_SESSAO, httponly=True, secure=settings.cookie_secure, samesite="lax")


@router.get("/me", response_model=UsuarioRead)
def me(usuario: Usuario = Depends(usuario_atual)):
    return usuario
