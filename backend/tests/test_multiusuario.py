def _criar_pombo(client, anilha, **extra):
    resposta = client.post("/pombos", json={"anilha": anilha, "sexo": "M", **extra})
    assert resposta.status_code == 201, resposta.text
    return resposta.json()


def _anilhas(client, **params):
    return [p["anilha"] for p in client.get("/pombos", params=params).json()]


def test_usuario_ve_so_os_proprios_pombos(cliente_de):
    joao = cliente_de("joao")
    maria = cliente_de("maria")
    pombo = _criar_pombo(joao, "1001")
    _criar_pombo(maria, "2001")

    assert _anilhas(joao) == ["1001"]
    assert _anilhas(maria) == ["2001"]
    assert maria.get(f"/pombos/{pombo['id']}").status_code == 404
    assert maria.get(f"/pombos/{pombo['id']}/arvore").status_code == 404
    assert maria.get(f"/pombos/{pombo['id']}/certificado").status_code == 404
    assert maria.delete(f"/pombos/{pombo['id']}").status_code == 404


def test_mesma_anilha_em_planteis_diferentes(cliente_de):
    joao = cliente_de("joao")
    maria = cliente_de("maria")
    _criar_pombo(joao, "1001")
    _criar_pombo(maria, "1001")
    assert joao.post("/pombos", json={"anilha": "1001"}).status_code == 400


def test_nao_vincula_pai_nem_proprietario_de_outro_plantel(cliente_de):
    joao = cliente_de("joao")
    maria = cliente_de("maria")
    pai = _criar_pombo(joao, "1001")
    proprietario = joao.post("/proprietarios", json={"nome": "Fulano"}).json()

    assert maria.post("/pombos", json={"anilha": "2001", "pai_id": pai["id"]}).status_code == 400
    resposta = maria.post("/pombos", json={"anilha": "2001", "proprietario_id": proprietario["id"]})
    assert resposta.status_code == 400
    assert maria.get("/proprietarios").json() == []
    assert maria.get(f"/proprietarios/{proprietario['id']}").status_code == 404


def test_plantel_compartilhado_e_so_leitura(cliente_de):
    joao = cliente_de("joao")
    maria = cliente_de("maria")
    pombo = _criar_pombo(joao, "1001")

    resposta = joao.post("/compartilhamentos", json={"login": "Maria"})
    assert resposta.status_code == 201
    assert [u["nome"] for u in resposta.json()["concedidos"]] == ["Maria"]
    assert [u["nome"] for u in maria.get("/compartilhamentos").json()["recebidos"]] == ["Joao"]
    # O login aparece junto do nome para diferenciar pessoas com o mesmo nome.
    assert [u["login"] for u in resposta.json()["concedidos"]] == ["maria"]
    assert [u["login"] for u in maria.get("/compartilhamentos").json()["recebidos"]] == ["joao"]

    # pombo cadastrado depois do compartilhamento também aparece
    _criar_pombo(joao, "1002")
    assert _anilhas(maria) == ["1001", "1002"]
    detalhe = maria.get(f"/pombos/{pombo['id']}").json()
    assert detalhe["dono"]["nome"] == "Joao"
    assert maria.get(f"/pombos/{pombo['id']}/arvore").status_code == 200

    payload = {"anilha": "1001", "sexo": "F"}
    assert maria.put(f"/pombos/{pombo['id']}", json=payload).status_code == 403
    assert maria.delete(f"/pombos/{pombo['id']}").status_code == 403
    resposta = maria.post(f"/pombos/{pombo['id']}/resultados", json={"competicao": "Prova"})
    assert resposta.status_code == 403

    # o compartilhamento é de mão única
    _criar_pombo(maria, "2001")
    assert _anilhas(joao) == ["1001", "1002"]


def test_revogar_e_sair_do_compartilhamento(cliente_de):
    joao = cliente_de("joao")
    maria = cliente_de("maria")
    _criar_pombo(joao, "1001")
    ids = {u: c.get("/auth/me").json()["id"] for u, c in (("joao", joao), ("maria", maria))}

    joao.post("/compartilhamentos", json={"login": "maria"})
    assert joao.delete(f"/compartilhamentos/concedidos/{ids['maria']}").status_code == 204
    assert _anilhas(maria) == []

    joao.post("/compartilhamentos", json={"login": "maria"})
    assert maria.delete(f"/compartilhamentos/recebidos/{ids['joao']}").status_code == 204
    assert _anilhas(maria) == []


def test_compartilhar_com_usuario_inexistente_ou_consigo(cliente_de):
    joao = cliente_de("joao")
    assert joao.post("/compartilhamentos", json={"login": "ninguem"}).status_code == 404
    assert joao.post("/compartilhamentos", json={"login": "joao"}).status_code == 400


def test_copiar_pombo_com_ancestrais(cliente_de):
    joao = cliente_de("joao")
    maria = cliente_de("maria")
    proprietario = joao.post("/proprietarios", json={"nome": "Fulano", "telefone": "123"}).json()
    avo = _criar_pombo(joao, "4001")
    pai = _criar_pombo(joao, "1001", pai_id=avo["id"], proprietario_id=proprietario["id"])
    mae = _criar_pombo(joao, "2001", sexo="F")
    filho = _criar_pombo(joao, "3001", pai_id=pai["id"], mae_id=mae["id"])
    joao.post(f"/pombos/{filho['id']}/resultados", json={"ano": 2025, "competicao": "Prova X"})

    # Maria já tem a mãe cadastrada: ela é reaproveitada em vez de duplicada
    mae_maria = _criar_pombo(maria, "2001", sexo="F")

    assert maria.post(f"/pombos/{filho['id']}/copiar").status_code == 404
    joao.post("/compartilhamentos", json={"login": "maria"})
    resposta = maria.post(f"/pombos/{filho['id']}/copiar")
    assert resposta.status_code == 201, resposta.text
    copia = resposta.json()
    assert copia["id"] != filho["id"]
    assert copia["mae"]["id"] == mae_maria["id"]

    arvore = maria.get(f"/pombos/{copia['id']}/arvore").json()
    assert arvore["pai"]["anilha"] == "1001"
    assert arvore["pai"]["pai"]["anilha"] == "4001"
    assert arvore["pai"]["proprietario_nome"] == "Fulano"
    assert [r["competicao"] for r in arvore["resultados"]] == ["Prova X"]

    meus = maria.get("/pombos", params={"usuario_id": copia["usuario_id"]}).json()
    assert sorted(p["anilha"] for p in meus) == ["1001", "2001", "3001", "4001"]
    assert [p["nome"] for p in maria.get("/proprietarios").json()] == ["Fulano"]

    # a cópia é independente: editar é permitido e não muda o original
    payload = {"anilha": "3001", "sexo": "F", "pai_id": copia["pai_id"], "mae_id": copia["mae_id"]}
    assert maria.put(f"/pombos/{copia['id']}", json=payload).status_code == 200
    assert joao.get(f"/pombos/{filho['id']}").json()["sexo"] == "M"

    # copiar de novo esbarra na anilha já existente
    assert maria.post(f"/pombos/{filho['id']}/copiar").status_code == 400


def test_admin_ve_e_edita_todos(client, cliente_de):
    joao = cliente_de("joao")
    pombo = _criar_pombo(joao, "1001")
    proprietario = joao.post("/proprietarios", json={"nome": "Fulano"}).json()
    _criar_pombo(client, "9001")

    assert _anilhas(client) == ["1001", "9001"]
    assert _anilhas(client, usuario_id=pombo["usuario_id"]) == ["1001"]
    assert client.get("/proprietarios", params={"usuario_id": pombo["usuario_id"]}).json()[0]["nome"] == "Fulano"

    payload = {"anilha": "1001", "sexo": "F", "proprietario_id": proprietario["id"]}
    resposta = client.put(f"/pombos/{pombo['id']}", json=payload)
    assert resposta.status_code == 200
    assert resposta.json()["usuario_id"] == pombo["usuario_id"]

    # o admin não vê os pombos dele pelo João
    assert _anilhas(joao) == ["1001"]
