"""Regras da "Segurança do certificado PDF" (README)."""

import pytest
from sqlalchemy import select

from app.models import Usuario
from app.routers.certificado import _renderizar_html, bloquear_urls
from tests.conftest import TestingSessionLocal

ANEXO = '<a rel="attachment" href="file:///etc/hostname">anexo</a>'
IMAGEM = '<img src="http://127.0.0.1:1/x.png">'
MALICIOSO = f"<b>negrito</b>{ANEXO}{IMAGEM}"


def _cenario(client) -> int:
    """Pombo com pai, proprietário e resultado, com HTML malicioso em todo campo de texto."""
    dono = client.post(
        "/proprietarios",
        json={
            "nome": f"Fulano {ANEXO}",
            "colombodromo": MALICIOSO,
            "endereco": "Rua A",
            "telefone": "1234",
            "observacoes": MALICIOSO,
        },
    ).json()
    pai = client.post("/pombos", json={"anilha": "1/2020", "sexo": "M", "observacoes": MALICIOSO}).json()
    filho = client.post(
        "/pombos",
        json={
            "anilha": "2/2024",
            "cor": f"Azul {IMAGEM}",
            "observacoes": MALICIOSO,
            "origem": MALICIOSO,
            "pai_id": pai["id"],
            "proprietario_id": dono["id"],
        },
    ).json()
    client.post(f"/pombos/{filho['id']}/resultados", json={"competicao": MALICIOSO, "colocacao": ANEXO})
    client.post(f"/pombos/{pai['id']}/resultados", json={"competicao": MALICIOSO})
    return filho["id"]


def _html(pombo_id: int) -> str:
    with TestingSessionLocal() as db:
        admin = db.scalar(select(Usuario).where(Usuario.login == "admin"))
        html, _ = _renderizar_html(pombo_id, 4, db, admin)
    return html


# Regra 1
def test_texto_do_usuario_aparece_como_texto(client):
    html = _html(_cenario(client))
    assert "<b>negrito" not in html
    assert '<a rel="attachment"' not in html
    assert "<img src=" not in html
    assert "&lt;b&gt;negrito&lt;/b&gt;" in html


def test_texto_normal_continua_legivel(client):
    """O escape não pode estragar o que o próprio template escreve."""
    html = _html(_cenario(client))
    assert "Rua A · 1234" in html  # separador dos contatos do proprietário
    assert "&amp;middot;" not in html
    assert "&amp;mdash;" not in html


# Regras 1 e 2, ponta a ponta: o PDF baixado não embute arquivo nenhum
def test_pdf_nao_embute_arquivos_do_servidor(client):
    resposta = client.get(f"/pombos/{_cenario(client)}/certificado")
    assert resposta.status_code == 200
    assert resposta.content.startswith(b"%PDF")
    assert b"/EmbeddedFile" not in resposta.content


# Regra 2
@pytest.mark.parametrize(
    "url",
    ["file:///etc/hostname", "http://169.254.169.254/latest/meta-data/", "https://exemplo.com/x.css", "data:text/plain,oi"],
)
def test_nenhuma_url_e_buscada(url):
    with pytest.raises(ValueError):
        bloquear_urls(url)
