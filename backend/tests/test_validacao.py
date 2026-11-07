"""Validação de entrada RV-xx (docs/requisitos.md). Nenhuma entrada pode gerar 500."""

from concurrent.futures import ThreadPoolExecutor
from datetime import date
from itertools import count

import pytest

_anilhas = count(1000)


def _pombo(client, **extra):
    return client.post("/pombos", json={"anilha": str(next(_anilhas)), **extra})


def _proprietario(client, **extra):
    return client.post("/proprietarios", json={"nome": "Fulano", **extra})


def _resultado(client, **extra):
    pombo = _pombo(client).json()
    return client.post(f"/pombos/{pombo['id']}/resultados", json={"competicao": "Prova", **extra})


CAMPOS = [  # (função, campo, limite)
    (_pombo, "anilha", 50),
    (_pombo, "cor", 100),
    (_pombo, "origem", 200),
    (_pombo, "observacoes", 5000),
    (_proprietario, "nome", 200),
    (_proprietario, "colombodromo", 200),
    (_proprietario, "endereco", 300),
    (_proprietario, "telefone", 50),
    (_proprietario, "email", 200),
    (_proprietario, "observacoes", 5000),
    (_resultado, "competicao", 200),
    (_resultado, "colocacao", 100),
    (_resultado, "premio", 200),
    (_resultado, "observacao", 5000),
]


# RV-01..04
@pytest.mark.parametrize("criar,campo,limite", CAMPOS, ids=[f"{c[0].__name__}-{c[1]}" for c in CAMPOS])
def test_rv_limite_de_tamanho(client, criar, campo, limite):
    valor = "1" * limite if campo == "anilha" else "a" * limite
    assert criar(client, **{campo: valor}).status_code == 201
    acima = criar(client, **{campo: valor + ("1" if campo == "anilha" else "a")})
    assert acima.status_code == 422, acima.text


def test_rv_espacos_e_vazio_viram_null(client):
    r = _pombo(client, cor="  ", origem="  Belgica  ", observacoes="")
    assert r.status_code == 201
    assert r.json()["cor"] is None and r.json()["origem"] == "Belgica" and r.json()["observacoes"] is None
    r = _proprietario(client, nome="  Ciclano  ", telefone="   ")
    assert r.json()["nome"] == "Ciclano" and r.json()["telefone"] is None


def test_rv_obrigatorios_nao_aceitam_so_espacos(client):
    assert _proprietario(client, nome="   ").status_code == 422
    assert _resultado(client, competicao="  ").status_code == 422


def test_rv04_ano_e_distancia(client):
    proximo = date.today().year + 1
    assert _resultado(client, ano=1900).status_code == 201
    assert _resultado(client, ano=proximo).status_code == 201
    assert _resultado(client, ano=1899).status_code == 422
    assert _resultado(client, ano=proximo + 1).status_code == 422
    assert _resultado(client, ano=99999).status_code == 422
    assert _resultado(client, distancia_km=0).status_code == 201
    assert _resultado(client, distancia_km=5000).status_code == 201
    assert _resultado(client, distancia_km=-5).status_code == 422
    assert _resultado(client, distancia_km=5001).status_code == 422


# RV-05
def test_rv05_mesma_anilha_ao_mesmo_tempo_nao_da_500(client):
    for i in range(5):
        with ThreadPoolExecutor(2) as ex:
            futuros = [ex.submit(_pombo, client, anilha=f"9{i}") for _ in range(2)]
            codigos = sorted(f.result().status_code for f in futuros)
        assert codigos[0] == 201 and codigos[1] in (400, 409), codigos


# RV-06
def test_rv06_senha_longa_no_login_e_senha_errada(client_anonimo, usuario):
    r = client_anonimo.post("/auth/login", json={"login": "admin", "senha": "a" * 100})
    assert r.status_code == 401


def test_rv06_senha_acima_de_72_bytes_recusada(client):
    base = {"login": "novo", "nome": "Novo Usuario"}
    assert client.post("/usuarios", json={**base, "senha": "a" * 72}).status_code == 201
    r = client.post("/usuarios", json={**base, "login": "outro", "senha": "ç" * 37})  # 74 bytes
    assert r.status_code == 422
    novo_id = next(u["id"] for u in client.get("/usuarios").json() if u["login"] == "novo")
    assert client.post(f"/usuarios/{novo_id}/senha", json={"senha": "a" * 73}).status_code == 422


# RV-07
def test_rv07_mensagens_em_portugues_com_o_campo(client):
    msg = _pombo(client, cor="a" * 101).json()["detail"][0]["msg"]
    assert msg == "Cor: no máximo 100 caracteres"
    msg = _proprietario(client, nome="").json()["detail"][0]["msg"]
    assert msg == "Nome: obrigatório"
    msg = _resultado(client, distancia_km=-1).json()["detail"][0]["msg"]
    assert msg == "Distância: deve ser no mínimo 0"
    msg = client.post("/proprietarios", json={}).json()["detail"][0]["msg"]
    assert msg == "Nome: obrigatório"
    msg = _resultado(client, ano=1).json()["detail"][0]["msg"]
    assert msg.startswith("O ano deve estar entre 1900")
