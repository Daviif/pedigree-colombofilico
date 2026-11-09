"""IN-04 (README, "Início e lista de pombos"): últimos resultados do próprio plantel."""


def _pombo(c, anilha):
    return c.post("/pombos", json={"anilha": anilha}).json()["id"]


def _resultado(c, pombo_id, **dados):
    r = c.post(f"/pombos/{pombo_id}/resultados", json={"competicao": "Prova", **dados})
    assert r.status_code == 201, r.text


def test_in04_ordem_por_ano_e_depois_pelo_mais_recente(client):
    p = _pombo(client, "1/24")
    _resultado(client, p, competicao="Sem ano")
    _resultado(client, p, ano=2024, competicao="2024 a")
    _resultado(client, p, ano=2025, competicao="2025")
    _resultado(client, p, ano=2024, competicao="2024 b")
    r = client.get("/resultados/recentes")
    assert r.status_code == 200
    assert [x["competicao"] for x in r.json()] == ["2025", "2024 b", "2024 a", "Sem ano"]
    assert r.json()[0]["anilha"] == "1/24" and r.json()[0]["pombo_id"] == p


def test_in04_limite_padrao_5_e_maximo_20(client):
    p = _pombo(client, "1/24")
    for i in range(7):
        _resultado(client, p, ano=2000 + i)
    assert len(client.get("/resultados/recentes").json()) == 5
    assert len(client.get("/resultados/recentes?limite=2").json()) == 2
    assert client.get("/resultados/recentes?limite=0").status_code == 422
    assert client.get("/resultados/recentes?limite=21").status_code == 422


def test_in04_so_do_proprio_plantel_mesmo_compartilhado_ou_admin(client, cliente_de):
    joao = cliente_de("joao")
    pj = _pombo(joao, "9/24")
    _resultado(joao, pj, ano=2025, competicao="do João")
    joao.post("/compartilhamentos", json={"login": "admin"})  # o admin também vê o plantel do João
    assert client.get("/resultados/recentes").json() == []  # admin: só o próprio plantel
    assert [x["competicao"] for x in joao.get("/resultados/recentes").json()] == ["do João"]


def test_in04_exige_login(client_anonimo):
    assert client_anonimo.get("/resultados/recentes").status_code == 401
