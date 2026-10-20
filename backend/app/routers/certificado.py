from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from jinja2 import Environment, FileSystemLoader
from sqlalchemy.orm import Session
from weasyprint import HTML

from app.database import get_db
from app.pedigree import montar_arvore
from app.schemas import ArvoreNo
from app.routers.pombos import buscar_pombo_ou_404

router = APIRouter(prefix="/pombos", tags=["certificado"])

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "pdf" / "templates"
_env = Environment(loader=FileSystemLoader(TEMPLATES_DIR))


@dataclass
class Celula:
    tipo: str  # "no", "linha" ou "vazio"
    rowspan: int
    colspan: int = 1
    no: ArvoreNo | None = None
    principal: bool = False
    classes: str = ""
    detalhe: str = "completo"  # "completo", "resumido" ou "minimo", conforme o espaço


def _profundidade(no: ArvoreNo | None) -> int:
    if no is None or (no.pai is None and no.mae is None):
        return 0
    return 1 + max(_profundidade(no.pai), _profundidade(no.mae))


# Altura disponível para a árvore numa página A4 deitada, já descontando
# cabeçalho e rodapé, e o teto por linha para árvores pequenas não esticarem.
ALTURA_ARVORE_MM = 120
ALTURA_MAX_LINHA_MM = 10


def _detalhe(altura_mm: float) -> str:
    if altura_mm >= 14:
        return "completo"
    if altura_mm >= 7:
        return "resumido"
    return "minimo"


def _montar_grade(arvore: ArvoreNo) -> tuple[list[list[Celula]], float]:
    """Distribui a árvore numa tabela: cada geração ocupa uma coluna de caixas,
    separada da próxima por duas colunas de conectores (traço saindo do pombo e
    chave ligando pai e mãe). Cada folha ocupa 2 linhas, assim os pontos onde os
    traços se encontram caem sempre na divisa entre linhas da tabela.

    Devolve as linhas e a altura de cada uma (mm); quanto mais gerações, menos
    informação vai nas caixas das gerações mais distantes para caber na página."""
    geracoes = _profundidade(arvore)
    linhas: list[list[Celula]] = [[] for _ in range(2 ** (geracoes + 1))]
    altura_linha = min(ALTURA_MAX_LINHA_MM, ALTURA_ARVORE_MM / len(linhas))

    def posicionar(no: ArvoreNo | None, nivel: int, inicio: int, altura: int) -> None:
        linhas[inicio].append(
            Celula("no", altura, no=no, principal=nivel == 0, detalhe=_detalhe(altura * altura_linha))
        )
        if nivel == geracoes:
            return
        if no is None or (no.pai is None and no.mae is None):
            linhas[inicio].append(Celula("vazio", altura, colspan=3 * (geracoes - nivel)))
            return
        metade, quarto = altura // 2, altura // 4
        linhas[inicio].append(Celula("linha", metade, classes="linha-baixo"))
        linhas[inicio + metade].append(Celula("linha", metade))
        linhas[inicio].append(Celula("linha", quarto))
        linhas[inicio + quarto].append(Celula("linha", quarto, classes="linha-cima linha-esq"))
        linhas[inicio + metade].append(Celula("linha", quarto, classes="linha-baixo linha-esq"))
        linhas[inicio + metade + quarto].append(Celula("linha", quarto))
        posicionar(no.pai, nivel + 1, inicio, metade)
        posicionar(no.mae, nivel + 1, inicio + metade, metade)

    posicionar(arvore, 0, 0, len(linhas))
    return linhas, altura_linha


def _renderizar_html(pombo_id: int, geracoes: int, db: Session) -> tuple[str, str]:
    pombo = buscar_pombo_ou_404(pombo_id, db)
    arvore = montar_arvore(pombo, geracoes)
    template = _env.get_template("certificado.html")
    grade, altura_linha = _montar_grade(arvore)
    html_str = template.render(
        pombo=pombo, arvore=arvore, grade=grade, altura_linha=altura_linha, gerado_em=datetime.now()
    )
    return html_str, pombo.anilha


@router.get("/{pombo_id}/certificado")
def gerar_certificado(
    pombo_id: int, geracoes: int = Query(default=4, ge=1, le=6), db: Session = Depends(get_db)
):
    html_str, anilha = _renderizar_html(pombo_id, geracoes, db)
    pdf_bytes = HTML(string=html_str, base_url=str(TEMPLATES_DIR)).write_pdf()

    filename = f"pedigree-{anilha.replace('/', '-')}.pdf"
    return Response(
        content=bytes(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

