from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, Query
from fastapi.responses import HTMLResponse, Response
from jinja2 import Environment, FileSystemLoader
from sqlalchemy.orm import Session

from app.database import get_db
from app.pedigree import montar_arvore
from app.routers.pombos import buscar_pombo_ou_404

router = APIRouter(prefix="/pombos", tags=["certificado"])

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "pdf" / "templates"
_env = Environment(loader=FileSystemLoader(TEMPLATES_DIR))


def _renderizar_html(pombo_id: int, geracoes: int, db: Session) -> tuple[str, str]:
    pombo = buscar_pombo_ou_404(pombo_id, db)
    arvore = montar_arvore(pombo, geracoes)
    template = _env.get_template("certificado.html")
    html_str = template.render(pombo=pombo, arvore=arvore, gerado_em=datetime.now())
    return html_str, pombo.anilha


@router.get("/{pombo_id}/certificado")
def gerar_certificado(
    pombo_id: int, geracoes: int = Query(default=4, ge=1, le=6), db: Session = Depends(get_db)
):
    # Import tardio: WeasyPrint depende de bibliotecas nativas (GTK/Pango/Cairo)
    # que não fazem parte do build desktop (PyInstaller); mantendo o import
    # aqui dentro, o módulo continua importável mesmo sem essa dependência.
    from weasyprint import HTML

    html_str, anilha = _renderizar_html(pombo_id, geracoes, db)
    pdf_bytes = HTML(string=html_str, base_url=str(TEMPLATES_DIR)).write_pdf()

    filename = f"pedigree-{anilha.replace('/', '-')}.pdf"
    return Response(
        content=bytes(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{pombo_id}/certificado-html", response_class=HTMLResponse)
def gerar_certificado_html(
    pombo_id: int, geracoes: int = Query(default=4, ge=1, le=6), db: Session = Depends(get_db)
):
    """Mesma árvore do certificado, como página HTML pronta para impressão
    (usada pelo app desktop, que não tem o WeasyPrint disponível: o usuário
    imprime com Ctrl+P / "Microsoft Print to PDF")."""
    html_str, _ = _renderizar_html(pombo_id, geracoes, db)
    return HTMLResponse(content=html_str)
