"""Regras genealógicas (RG-xx em docs/requisitos.md e no README)."""

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select, text
from sqlalchemy.orm import Session

from app.models import Pombo, Proprietario, Sexo

# Espaço de chaves das travas consultivas de genealogia (o segundo número é o id do plantel).
_TRAVA_GENEALOGIA = 7101


def travar_plantel(dono_id: int, db: Session) -> None:
    """RG-03: serializa as mudanças de pai/mãe de um plantel até o fim da transação, para
    duas edições simultâneas não fecharem um ciclo que nenhuma das duas via sozinha."""
    db.execute(
        text("SELECT pg_advisory_xact_lock(:espaco, :dono)"),
        {"espaco": _TRAVA_GENEALOGIA, "dono": dono_id},
    )


_ANCESTRAIS = text(
    """
    WITH RECURSIVE ancestrais(id) AS (
        SELECT unnest(ARRAY[pai_id, mae_id]) FROM pombos WHERE id = :pombo_id
        UNION
        SELECT unnest(ARRAY[p.pai_id, p.mae_id]) FROM pombos p JOIN ancestrais a ON p.id = a.id
    )
    SELECT id FROM ancestrais WHERE id IS NOT NULL
    """
)


def ancestrais_ids(pombo_id: int, db: Session) -> set[int]:
    """Ids de todos os ancestrais de `pombo_id`, em qualquer geração. O UNION (sem ALL)
    descarta repetidos, então a consulta termina mesmo se o banco já tiver um ciclo."""
    return set(db.scalars(_ANCESTRAIS, {"pombo_id": pombo_id}))


def _sexo_permitido(papel: str) -> tuple[Sexo, Sexo]:
    return (Sexo.M, Sexo.DESCONHECIDO) if papel == "pai" else (Sexo.F, Sexo.DESCONHECIDO)


def _erro(mensagem: str, codigo: int = status.HTTP_400_BAD_REQUEST) -> HTTPException:
    return HTTPException(status_code=codigo, detail=mensagem)


def validar_genitor(
    papel: str,
    genitor_id: int | None,
    pombo_id: int | None,
    pombo_anilha: str,
    dono_id: int,
    mudou: bool,
    db: Session,
) -> None:
    """Valida o pai (`papel="pai"`) ou a mãe de um pombo. `pombo_id` é None no cadastro.
    `mudou` diz se o vínculo está sendo trocado agora (RG-05)."""
    if genitor_id is None:
        return
    rotulo = "pai" if papel == "pai" else "mãe"
    if genitor_id == pombo_id:  # RG-01
        raise _erro(f"Um pombo não pode ser {rotulo} de si mesmo")
    genitor = db.get(Pombo, genitor_id)
    if genitor is None or genitor.usuario_id != dono_id:  # RG-08
        raise _erro("Pai informado não existe" if papel == "pai" else "Mãe informada não existe")
    if not mudou:  # RG-05: vínculo antigo (mesmo inconsistente) não é revalidado
        return
    if genitor.sexo not in _sexo_permitido(papel):  # RG-04
        exigido = "macho" if papel == "pai" else "fêmea"
        raise _erro(
            f"O {rotulo} precisa ser {exigido} ou de sexo desconhecido "
            f"({genitor.anilha} está cadastrado como {'fêmea' if genitor.sexo == Sexo.F else 'macho'})"
        )
    if pombo_id is not None and pombo_id in ancestrais_ids(genitor_id, db):  # RG-02
        raise _erro(
            f"Esse vínculo faria do pombo {pombo_anilha} ancestral de si mesmo: "
            f"{genitor.anilha} descende de {pombo_anilha}"
        )


def validar_mudanca_de_sexo(pombo: Pombo, novo_sexo: Sexo, db: Session) -> None:
    """RG-06: o sexo não pode passar a contradizer o papel que o pombo já tem."""
    if novo_sexo == pombo.sexo or novo_sexo == Sexo.DESCONHECIDO:
        return
    coluna, papel = (Pombo.pai_id, "pai") if novo_sexo == Sexo.F else (Pombo.mae_id, "mãe")
    filhos = db.scalar(select(func.count()).select_from(Pombo).where(coluna == pombo.id))
    if filhos:
        sexo = "fêmea" if novo_sexo == Sexo.F else "macho"
        raise _erro(f"Este pombo é {papel} de {filhos} pombo(s); não pode ser {sexo}")


def exigir_sem_filhos(pombo: Pombo, db: Session) -> None:
    """RG-09: excluir um pombo que é pai ou mãe de outro é bloqueado."""
    filhos = db.scalars(
        select(Pombo.anilha)
        .where(or_(Pombo.pai_id == pombo.id, Pombo.mae_id == pombo.id))
        .order_by(Pombo.anilha)
    ).all()
    if filhos:
        lista = ", ".join(filhos[:10]) + (f" e mais {len(filhos) - 10}" if len(filhos) > 10 else "")
        raise _erro(
            f"Não é possível excluir: {pombo.anilha} é pai/mãe de {len(filhos)} pombo(s) "
            f"({lista}). Altere o pai/mãe desses pombos antes.",
            status.HTTP_409_CONFLICT,
        )


def exigir_proprietario_sem_uso(proprietario: Proprietario, db: Session) -> None:
    """RG-10: excluir um proprietário que algum pombo usa é bloqueado."""
    em_uso = db.scalar(
        select(func.count()).select_from(Pombo).where(Pombo.proprietario_id == proprietario.id)
    )
    if em_uso:
        raise _erro(
            f"Não é possível excluir: {proprietario.nome} é proprietário de {em_uso} pombo(s).",
            status.HTTP_409_CONFLICT,
        )

