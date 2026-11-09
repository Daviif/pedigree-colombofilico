"""Completar o pedigree pela árvore: PE-01..05 (README)."""

from sqlalchemy import func, select

from app.models import Pombo
from tests.conftest import TestingSessionLocal


def _p(c, anilha, **extra):
    r = c.post("/pombos", json={"anilha": anilha, **extra})
    assert r.status_code == 201, r.text
    return r.json()


def _total():
    with TestingSessionLocal() as db:
        return db.scalar(select(func.count()).select_from(Pombo))


# PE-03 (pombo existente)
def test_pe03_liga_pai_existente(client):
    filho = _p(client, "1/24")
    pai = _p(client, "2/20", sexo="M")
    r = client.post(f"/pombos/{filho['id']}/genitor", json={"papel": "pai", "genitor_id": pai["id"]})
    assert r.status_code == 200, r.text
    assert r.json()["pai"]["anilha"] == "2/20"
    assert client.get(f"/pombos/{filho['id']}/arvore").json()["pai"]["anilha"] == "2/20"


def test_pe03_regras_genealogicas_valem(client):
    filho = _p(client, "1/24", sexo="M")
    neto = _p(client, "3/25", pai_id=filho["id"])
    femea = _p(client, "4/20", sexo="F")
    # ciclo (RG-02)
    r = client.post(f"/pombos/{filho['id']}/genitor", json={"papel": "pai", "genitor_id": neto["id"]})
    assert r.status_code == 400 and "ancestral de si mesmo" in r.json()["detail"]
    # sexo do papel (RG-04)
    r = client.post(f"/pombos/{filho['id']}/genitor", json={"papel": "pai", "genitor_id": femea["id"]})
    assert r.status_code == 400 and "macho" in r.json()["detail"]
    # ele mesmo (RG-01)
    r = client.post(f"/pombos/{filho['id']}/genitor", json={"papel": "pai", "genitor_id": filho["id"]})
    assert r.status_code == 400


def test_pe03_genitor_de_outro_plantel(client, cliente_de):
    joao = cliente_de("joao")
    pai_joao = _p(joao, "9/20", sexo="M")
    filho = _p(client, "1/24")
    r = client.post(f"/pombos/{filho['id']}/genitor", json={"papel": "pai", "genitor_id": pai_joao["id"]})
    assert r.status_code == 400  # RG-08


# PE-04 (pombo novo)
def test_pe04_cadastra_e_liga_com_sexo_do_papel(client):
    filho = _p(client, "1/24")
    r = client.post(f"/pombos/{filho['id']}/genitor", json={"papel": "mae", "novo": {"anilha": "5/20", "cor": "  azul "}})
    assert r.status_code == 200, r.text
    mae = client.get(f"/pombos/{r.json()['mae']['id']}").json()
    assert mae["sexo"] == "F" and mae["cor"] == "Azul" and mae["usuario_id"] == filho["usuario_id"]


def test_pe04_anilha_repetida_ou_invalida_nao_grava_nada(client):
    filho = _p(client, "1/24")
    antes = _total()
    r = client.post(f"/pombos/{filho['id']}/genitor", json={"papel": "pai", "novo": {"anilha": "1/24"}})
    assert r.status_code == 400 and "anilha" in r.json()["detail"]
    r = client.post(f"/pombos/{filho['id']}/genitor", json={"papel": "pai", "novo": {"anilha": "abc"}})
    assert r.status_code == 422
    assert _total() == antes
    assert client.get(f"/pombos/{filho['id']}").json()["pai_id"] is None


def test_pe04_falha_depois_de_criar_desfaz_o_pombo_novo(client, monkeypatch):
    """A recusa acontece DEPOIS do INSERT do pombo novo (flush): nada pode ficar gravado."""
    from fastapi import HTTPException

    import app.routers.pombos as rota

    def recusa(*args, **kwargs):
        raise HTTPException(status_code=400, detail="recusado de propósito")

    filho = _p(client, "1/24")
    antes = _total()
    monkeypatch.setattr(rota, "validar_genitor", recusa)
    r = client.post(f"/pombos/{filho['id']}/genitor", json={"papel": "pai", "novo": {"anilha": "7/20"}})
    assert r.status_code == 400
    assert _total() == antes  # o pombo novo foi desfeito
    with TestingSessionLocal() as db:
        assert db.scalar(select(Pombo).where(Pombo.anilha == "7/20")) is None


# PE-02
def test_pe02_nao_troca_genitor_existente(client):
    pai = _p(client, "2/20", sexo="M")
    outro = _p(client, "3/20", sexo="M")
    filho = _p(client, "1/24", pai_id=pai["id"])
    antes = _total()
    r = client.post(f"/pombos/{filho['id']}/genitor", json={"papel": "pai", "genitor_id": outro["id"]})
    assert r.status_code == 409 and "Editar" in r.json()["detail"]
    r = client.post(f"/pombos/{filho['id']}/genitor", json={"papel": "pai", "novo": {"anilha": "8/20"}})
    assert r.status_code == 409 and _total() == antes
    assert client.get(f"/pombos/{filho['id']}").json()["pai_id"] == pai["id"]


# PE-01
def test_pe01_so_quem_edita(client, cliente_de):
    joao = cliente_de("joao")
    maria = cliente_de("maria")
    filho = _p(joao, "1/24")
    pai = _p(joao, "2/20", sexo="M")
    corpo = {"papel": "pai", "genitor_id": pai["id"]}
    assert maria.post(f"/pombos/{filho['id']}/genitor", json=corpo).status_code == 404
    joao.post("/compartilhamentos", json={"login": "maria"})
    assert maria.post(f"/pombos/{filho['id']}/genitor", json=corpo).status_code == 403
    assert client.post(f"/pombos/{filho['id']}/genitor", json=corpo).status_code == 200  # admin edita tudo


# PE-05
def test_pe05_exatamente_um(client):
    filho = _p(client, "1/24")
    pai = _p(client, "2/20", sexo="M")
    assert client.post(f"/pombos/{filho['id']}/genitor", json={"papel": "pai"}).status_code == 422
    corpo = {"papel": "pai", "genitor_id": pai["id"], "novo": {"anilha": "3/20"}}
    assert client.post(f"/pombos/{filho['id']}/genitor", json=corpo).status_code == 422
    assert client.post(f"/pombos/{filho['id']}/genitor", json={"papel": "avo", "genitor_id": pai["id"]}).status_code == 422
