"""Cria um usuário (ou troca a senha de um existente).

Uso: python -m app.criar_usuario LOGIN --nome "Nome Completo" [--admin]
"""

import argparse
import getpass
import sys

from sqlalchemy import select

from app.auth import hash_senha
from app.database import SessionLocal
from app.models import Usuario


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("login")
    parser.add_argument("--nome", help="nome exibido no site (padrão: o próprio login)")
    parser.add_argument("--admin", action="store_true")
    args = parser.parse_args()

    login = args.login.strip().lower()
    senha = getpass.getpass("Senha: ")
    if len(senha) < 8:
        sys.exit("A senha precisa ter pelo menos 8 caracteres.")
    if getpass.getpass("Repita a senha: ") != senha:
        sys.exit("As senhas não conferem.")

    with SessionLocal() as db:
        usuario = db.scalar(select(Usuario).where(Usuario.login == login))
        if usuario:
            usuario.senha_hash = hash_senha(senha)
            acao = "Senha atualizada"
        else:
            usuario = Usuario(login=login, nome=args.nome or login, senha_hash=hash_senha(senha))
            db.add(usuario)
            acao = "Usuário criado"
        if args.nome:
            usuario.nome = args.nome
        if args.admin:
            usuario.admin = True
        db.commit()
    print(f"{acao}: {login}")


if __name__ == "__main__":
    main()
