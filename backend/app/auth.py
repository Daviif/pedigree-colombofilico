from datetime import UTC, datetime, timedelta

import bcrypt
import jwt
from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import Usuario

COOKIE_SESSAO = "sessao"
DURACAO_SESSAO = timedelta(days=30)

# Usado para gastar o mesmo tempo quando o login não existe, sem revelar
# por diferença de tempo de resposta quais usuários estão cadastrados.
_HASH_FICTICIO = bcrypt.hashpw(b"x", bcrypt.gensalt()).decode()


def hash_senha(senha: str) -> str:
    return bcrypt.hashpw(senha.encode(), bcrypt.gensalt()).decode()


def verificar_senha(senha: str, senha_hash: str | None) -> bool:
    if senha_hash is None:
        bcrypt.checkpw(senha.encode(), _HASH_FICTICIO.encode())
        return False
    return bcrypt.checkpw(senha.encode(), senha_hash.encode())


def criar_token(usuario: Usuario) -> str:
    payload = {"sub": str(usuario.id), "exp": datetime.now(UTC) + DURACAO_SESSAO}
    return jwt.encode(payload, settings.secret_key, algorithm="HS256")


def usuario_atual(
    sessao: str | None = Cookie(default=None), db: Session = Depends(get_db)
) -> Usuario:
    nao_autenticado = HTTPException(status.HTTP_401_UNAUTHORIZED, "Faça login para continuar.")
    if not sessao:
        raise nao_autenticado
    try:
        payload = jwt.decode(sessao, settings.secret_key, algorithms=["HS256"])
        usuario = db.get(Usuario, int(payload["sub"]))
    except (jwt.PyJWTError, KeyError, ValueError):
        raise nao_autenticado
    if usuario is None or not usuario.ativo:
        raise nao_autenticado
    return usuario
