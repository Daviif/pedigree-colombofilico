"""Limite de tentativas de login (RA-xx no README e em docs/requisitos.md)."""

import math
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, Request, status
from sqlalchemy import delete, func, select, text
from sqlalchemy.orm import Session

from app.models import TentativaLogin

JANELA = timedelta(minutes=15)
MAX_FALHAS_LOGIN = 5  # RA-01
MAX_FALHAS_IP = 20  # RA-02
RETENCAO = timedelta(hours=24)  # RA-07
_TRAVA_LOGIN = 7102  # espaço das travas consultivas (genealogia usa 7101)


def ip_do_cliente(request: Request) -> str:
    """RA-06: o uvicorn (--proxy-headers) já põe aqui o IP que o Caddy mandou no
    X-Forwarded-For. Função separada para os testes poderem trocar o IP."""
    return (request.client.host if request.client else "desconhecido")[:45]


def chave(login: str) -> str:
    return login.strip().lower()[:50]


def travar_login(login: str, db: Session) -> None:
    """RA-03: tentativas do mesmo login uma de cada vez, até o fim da transação; assim,
    várias tentativas simultâneas não passam do limite por lerem a contagem juntas."""
    db.execute(
        text("SELECT pg_advisory_xact_lock(:espaco, hashtext(:login))"),
        {"espaco": _TRAVA_LOGIN, "login": login},
    )


def _liberado_em(coluna, valor: str, limite: int, db: Session) -> datetime | None:
    """Se houver `limite` falhas ou mais na janela, devolve quando o bloqueio acaba:
    o momento em que a `limite`-ésima falha mais recente sai da janela."""
    falhas = db.scalars(
        select(TentativaLogin.criado_em)
        .where(coluna == valor, TentativaLogin.criado_em > func.now() - JANELA)
        .order_by(TentativaLogin.criado_em.desc())
        .limit(limite)
    ).all()
    if len(falhas) < limite:
        return None
    return falhas[-1] + JANELA


def exigir_nao_bloqueado(login: str, ip: str, db: Session) -> None:
    """RA-01/02: responde 429 se o login ou o IP estiver bloqueado."""
    liberacoes = [
        t
        for t in (
            _liberado_em(TentativaLogin.login, login, MAX_FALHAS_LOGIN, db),
            _liberado_em(TentativaLogin.ip, ip, MAX_FALHAS_IP, db),
        )
        if t is not None
    ]
    if not liberacoes:
        return
    segundos = max(1, math.ceil((max(liberacoes) - datetime.now(UTC)).total_seconds()))
    minutos = math.ceil(segundos / 60)
    raise HTTPException(
        status.HTTP_429_TOO_MANY_REQUESTS,
        f"Muitas tentativas de login. Tente de novo em {minutos} minuto{'s' if minutos > 1 else ''}.",
        headers={"Retry-After": str(segundos)},
    )


def registrar_falha(login: str, ip: str, db: Session) -> None:
    db.add(TentativaLogin(login=login, ip=ip))
    # RA-07: limpeza barata (índice por data) a cada falha registrada.
    db.execute(delete(TentativaLogin).where(TentativaLogin.criado_em < func.now() - RETENCAO))
    db.commit()


def zerar_falhas(login: str, db: Session) -> None:
    """RA-04 / RA-08: login certo, desbloqueio pelo admin ou senha redefinida."""
    db.execute(delete(TentativaLogin).where(TentativaLogin.login == chave(login)))


def logins_bloqueados(db: Session) -> set[str]:
    """Logins com o bloqueio do RA-01 ativo agora (para a tela Usuários)."""
    return set(
        db.scalars(
            select(TentativaLogin.login)
            .where(TentativaLogin.criado_em > func.now() - JANELA)
            .group_by(TentativaLogin.login)
            .having(func.count() >= MAX_FALHAS_LOGIN)
        )
    )
