from app.models import Pombo
from app.schemas import ArvoreNo

_TERMOS_POR_GERACAO = [
    ("Pai", "Mãe"),
    ("Avô", "Avó"),
    ("Bisavô", "Bisavó"),
    ("Tataravô", "Tataravó"),
]


def _grau_parentesco(geracao: int, via: str | None) -> str | None:
    if geracao == 0 or via is None:
        return None
    idx = geracao - 1
    if idx < len(_TERMOS_POR_GERACAO):
        masculino, feminino = _TERMOS_POR_GERACAO[idx]
        return masculino if via == "pai" else feminino
    return f"Ascendente ({geracao}ª geração)"


def _montar_no(
    pombo: Pombo | None,
    geracoes_restantes: int,
    contagem: dict[str, int],
    geracao: int = 0,
    via: str | None = None,
) -> ArvoreNo | None:
    if pombo is None:
        return None

    contagem[pombo.anilha] = contagem.get(pombo.anilha, 0) + 1

    pai = (
        _montar_no(pombo.pai, geracoes_restantes - 1, contagem, geracao + 1, "pai")
        if geracoes_restantes > 0
        else None
    )
    mae = (
        _montar_no(pombo.mae, geracoes_restantes - 1, contagem, geracao + 1, "mae")
        if geracoes_restantes > 0
        else None
    )
    # ordena pelo ano mais recente primeiro; resultados sem ano ficam por último
    resultados = sorted(pombo.resultados, key=lambda r: (r.ano is None, -(r.ano or 0)))

    return ArvoreNo(
        id=pombo.id,
        anilha=pombo.anilha,
        sexo=pombo.sexo,
        cor=pombo.cor,
        origem=pombo.origem,
        proprietario_nome=pombo.proprietario.nome if pombo.proprietario else None,
        grau_parentesco=_grau_parentesco(geracao, via),
        resultados=resultados,
        pai=pai,
        mae=mae,
    )


def _marcar_duplicados(no: ArvoreNo | None, contagem: dict[str, int]) -> None:
    if no is None:
        return
    if no.anilha and contagem.get(no.anilha, 0) > 1:
        no.duplicado = True
    _marcar_duplicados(no.pai, contagem)
    _marcar_duplicados(no.mae, contagem)


def montar_arvore(pombo: Pombo, geracoes: int = 4) -> ArvoreNo:
    """Monta a árvore genealógica de um pombo subindo `geracoes` gerações de
    ancestrais a partir do pai/mãe, sinalizando anilhas repetidas entre os
    ancestrais (indício de consanguinidade) e o grau de parentesco de cada
    ancestral em relação ao pombo raiz (pai/mãe, avô/avó, bisavô/bisavó,
    tataravô/tataravó, ...)."""
    contagem: dict[str, int] = {}
    raiz = _montar_no(pombo, geracoes, contagem)
    assert raiz is not None
    _marcar_duplicados(raiz, contagem)
    return raiz
