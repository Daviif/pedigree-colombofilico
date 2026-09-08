"""Script pontual: copia os dados do Postgres (dev) para um arquivo SQLite
"semente" que vai embutido no app desktop, para o tio já abrir o programa
com os pombos dele cadastrados.

Uso: python -m desktop.export_sqlite
(rodar de dentro de backend/, com o Postgres do docker-compose no ar)
"""

from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.database import Base
from app.models import Pombo, Proprietario, Resultado

DESTINO = Path(__file__).resolve().parent / "pedigree-inicial.db"


def main() -> None:
    origem_engine = create_engine(settings.database_url)
    OrigemSessao = sessionmaker(bind=origem_engine)

    DESTINO.unlink(missing_ok=True)
    destino_engine = create_engine(f"sqlite:///{DESTINO}")
    Base.metadata.create_all(bind=destino_engine)
    DestinoSessao = sessionmaker(bind=destino_engine)

    with OrigemSessao() as origem, DestinoSessao() as destino:
        proprietarios = origem.query(Proprietario).all()
        for p in proprietarios:
            destino.merge(
                Proprietario(
                    id=p.id,
                    nome=p.nome,
                    colombodromo=p.colombodromo,
                    endereco=p.endereco,
                    telefone=p.telefone,
                    email=p.email,
                    observacoes=p.observacoes,
                )
            )
        destino.commit()

        pombos = origem.query(Pombo).all()
        for pombo in pombos:
            destino.merge(
                Pombo(
                    id=pombo.id,
                    anilha=pombo.anilha,
                    sexo=pombo.sexo,
                    cor=pombo.cor,
                    status=pombo.status,
                    observacoes=pombo.observacoes,
                    origem=pombo.origem,
                    proprietario_id=pombo.proprietario_id,
                    pai_id=pombo.pai_id,
                    mae_id=pombo.mae_id,
                )
            )
        destino.commit()

        resultados = origem.query(Resultado).all()
        for r in resultados:
            destino.merge(
                Resultado(
                    id=r.id,
                    pombo_id=r.pombo_id,
                    ano=r.ano,
                    competicao=r.competicao,
                    distancia_km=r.distancia_km,
                    colocacao=r.colocacao,
                    premio=r.premio,
                    observacao=r.observacao,
                )
            )
        destino.commit()

    print(f"OK: {len(proprietarios)} proprietários, {len(pombos)} pombos, {len(resultados)} resultados -> {DESTINO}")


if __name__ == "__main__":
    main()
