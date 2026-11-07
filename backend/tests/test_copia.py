"""Cópia entre plantéis RC-xx (docs/requisitos.md). Cada teste cita a regra."""

from sqlalchemy import func, select

from app.models import Pombo, Proprietario, Resultado
from tests.conftest import TestingSessionLocal


def _p(c, anilha, **extra):
    r = c.post("/pombos", json={"anilha": anilha, **extra})
    assert r.status_code == 201, r.text
    return r.json()


def _contagens(usuario_id):
    with TestingSessionLocal() as db:
        return (
            db.scalar(select(func.count()).select_from(Pombo).where(Pombo.usuario_id == usuario_id)),
            db.scalar(select(func.count()).select_from(Proprietario).where(Proprietario.usuario_id == usuario_id)),
            db.scalar(select(func.count()).select_from(Resultado).join(Pombo).where(Pombo.usuario_id == usuario_id)),
        )


def _cenario(cliente_de):
    """João tem filho 501 ← pai 500 (Azul, M) ← avô 400; Maria vê o plantel do João."""
    joao, maria = cliente_de("joao"), cliente_de("maria")
    dono = joao.post("/proprietarios", json={"nome": "Fulano"}).json()
    avo = _p(joao, "400", sexo="M", cor="Branco")
    pai = _p(joao, "500", sexo="M", cor="Azul", pai_id=avo["id"], proprietario_id=dono["id"])
    filho = _p(joao, "501", sexo="F", pai_id=pai["id"])
    joao.post(f"/pombos/{pai['id']}/resultados", json={"competicao": "Prova"})
    joao.post("/compartilhamentos", json={"login": "maria"})
    return joao, maria, filho, pai


# RC-01
def test_rc01_copia_exige_ver_e_nao_da_edicao_do_original(cliente_de):
    joao, maria = cliente_de("joao"), cliente_de("maria")
    p = _p(joao, "1")
    assert maria.post(f"/pombos/{p['id']}/copiar").status_code == 404
    joao.post("/compartilhamentos", json={"login": "maria"})
    assert maria.post(f"/pombos/{p['id']}/copiar").status_code == 201
    assert maria.put(f"/pombos/{p['id']}", json={"anilha": "1", "cor": "Preto"}).status_code == 403


# RC-02
def test_rc02_reaproveita_quando_e_o_mesmo_pombo(cliente_de):
    joao, maria, filho, _ = _cenario(cliente_de)
    meu_pai = _p(maria, "500", sexo="M", cor="  azul ")  # mesma cor, outra grafia
    copia = maria.post(f"/pombos/{filho['id']}/copiar")
    assert copia.status_code == 201, copia.text
    assert copia.json()["pai"]["id"] == meu_pai["id"]
    # quem foi reaproveitado não ganha a ascendência da origem por baixo dos panos
    assert maria.get(f"/pombos/{meu_pai['id']}").json()["pai_id"] is None


def test_rc02_cor_ou_sexo_vazios_nao_impedem(cliente_de):
    joao, maria, filho, _ = _cenario(cliente_de)
    meu_pai = _p(maria, "500", sexo="DESCONHECIDO")  # sem cor
    assert maria.post(f"/pombos/{filho['id']}/copiar").json()["pai"]["id"] == meu_pai["id"]


# RC-03 (o caso que a auditoria encontrou: ligava o pai errado)
def test_rc03_anilha_igual_com_outro_pombo_cancela_tudo(cliente_de):
    joao, maria, filho, _ = _cenario(cliente_de)
    _p(maria, "500", sexo="M", cor="Vermelho")
    _p(maria, "400", sexo="F")  # outro conflito, de sexo
    antes = _contagens(maria.get("/auth/me").json()["id"])
    r = maria.post(f"/pombos/{filho['id']}/copiar")
    assert r.status_code == 409
    detalhe = r.json()["detail"]
    assert "500 (no original: macho, cor Azul; no seu plantel: macho, cor Vermelho)" in detalhe
    # o 400 está acima do 500 conflitante: a cópia nem chegaria nele, então não é conflito
    assert "400 (" not in detalhe
    assert _contagens(maria.get("/auth/me").json()["id"]) == antes  # RC-05


def test_rc03_lista_todos_os_conflitos(cliente_de):
    joao, maria = cliente_de("joao"), cliente_de("maria")
    pai = _p(joao, "10", sexo="M", cor="Azul")
    mae = _p(joao, "20", sexo="F", cor="Azul")
    filho = _p(joao, "30", pai_id=pai["id"], mae_id=mae["id"])
    joao.post("/compartilhamentos", json={"login": "maria"})
    _p(maria, "10", sexo="M", cor="Preto")
    _p(maria, "20", sexo="F", cor="Branco")
    detalhe = maria.post(f"/pombos/{filho['id']}/copiar").json()["detail"]
    assert "10 (no original" in detalhe and "20 (no original" in detalhe


# RC-04
def test_rc04_reaproveitado_com_sexo_errado_para_o_papel(cliente_de):
    joao, maria = cliente_de("joao"), cliente_de("maria")
    pai = _p(joao, "10", sexo="DESCONHECIDO")
    filho = _p(joao, "30", pai_id=pai["id"])
    joao.post("/compartilhamentos", json={"login": "maria"})
    _p(maria, "10", sexo="F")  # compatível com "desconhecido", mas fêmea não pode ser pai
    r = maria.post(f"/pombos/{filho['id']}/copiar")
    assert r.status_code == 409 and "seria pai" in r.json()["detail"]


# RC-05
def test_rc05_copia_completa_quando_nao_ha_conflito(cliente_de):
    joao, maria, filho, pai = _cenario(cliente_de)
    maria_id = maria.get("/auth/me").json()["id"]
    assert _contagens(maria_id) == (0, 0, 0)
    copia = maria.post(f"/pombos/{filho['id']}/copiar").json()
    assert _contagens(maria_id) == (3, 1, 1)  # filho, pai e avô; proprietário; resultado do pai
    arvore = maria.get(f"/pombos/{copia['id']}/arvore").json()
    assert arvore["pai"]["anilha"] == "500" and arvore["pai"]["pai"]["anilha"] == "400"
