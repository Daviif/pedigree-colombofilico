def _criar_pombo(client, anilha, **extra):
    payload = {"anilha": anilha, "sexo": "M", "cor": "Azul", **extra}
    resposta = client.post("/pombos", json=payload)
    assert resposta.status_code == 201, resposta.text
    return resposta.json()


def test_criar_pombo_simples(client):
    pombo = _criar_pombo(client, "0001")
    assert pombo["anilha"] == "0001"
    assert pombo["pai"] is None
    assert pombo["mae"] is None


def test_nao_permite_anilha_duplicada(client):
    _criar_pombo(client, "0001")
    resposta = client.post("/pombos", json={"anilha": "0001", "sexo": "M"})
    assert resposta.status_code == 400


def test_vincula_pai_e_mae(client):
    pai = _criar_pombo(client, "PAI-1", sexo="M")
    mae = _criar_pombo(client, "MAE-1", sexo="F")
    filho = _criar_pombo(client, "FILHO-1", pai_id=pai["id"], mae_id=mae["id"])

    assert filho["pai"]["anilha"] == "PAI-1"
    assert filho["mae"]["anilha"] == "MAE-1"


def test_pai_inexistente_retorna_erro(client):
    resposta = client.post("/pombos", json={"anilha": "X", "pai_id": 9999})
    assert resposta.status_code == 400


def test_arvore_recursiva_com_deteccao_de_duplicata(client):
    avo = _criar_pombo(client, "AVO-1", sexo="M")
    ava = _criar_pombo(client, "AVA-1", sexo="F")
    pai = _criar_pombo(client, "PAI-1", sexo="M", pai_id=avo["id"], mae_id=ava["id"])
    # mãe compartilha o mesmo avô paterno (consanguinidade proposital)
    mae = _criar_pombo(client, "MAE-1", sexo="F", pai_id=avo["id"])
    filho = _criar_pombo(client, "FILHO-1", pai_id=pai["id"], mae_id=mae["id"])

    resposta = client.get(f"/pombos/{filho['id']}/arvore?geracoes=4")
    assert resposta.status_code == 200
    arvore = resposta.json()

    assert arvore["anilha"] == "FILHO-1"
    assert arvore["pai"]["anilha"] == "PAI-1"
    assert arvore["pai"]["pai"]["anilha"] == "AVO-1"
    assert arvore["mae"]["pai"]["anilha"] == "AVO-1"
    # o avô paterno aparece duas vezes na árvore -> sinalizado como duplicado
    assert arvore["pai"]["pai"]["duplicado"] is True
    assert arvore["mae"]["pai"]["duplicado"] is True


def test_listar_pombos_filtra_por_status(client):
    _criar_pombo(client, "A1", status="ATIVO")
    _criar_pombo(client, "R1", status="REPRODUTOR")

    resposta = client.get("/pombos?status=REPRODUTOR")
    assert resposta.status_code == 200
    anilhas = [p["anilha"] for p in resposta.json()]
    assert anilhas == ["R1"]


def test_irmaos_completos_e_meios_irmaos(client):
    pai = _criar_pombo(client, "PAI-1", sexo="M")
    mae = _criar_pombo(client, "MAE-1", sexo="F")
    outra_mae = _criar_pombo(client, "MAE-2", sexo="F")
    outro_pai = _criar_pombo(client, "PAI-2", sexo="M")

    filho = _criar_pombo(client, "FILHO-1", pai_id=pai["id"], mae_id=mae["id"])
    irmao_completo = _criar_pombo(client, "FILHO-2", pai_id=pai["id"], mae_id=mae["id"])
    meio_irmao_paterno = _criar_pombo(client, "FILHO-3", pai_id=pai["id"], mae_id=outra_mae["id"])
    meio_irmao_materno = _criar_pombo(client, "FILHO-4", pai_id=outro_pai["id"], mae_id=mae["id"])
    sem_parentesco = _criar_pombo(client, "FILHO-5", pai_id=outro_pai["id"], mae_id=outra_mae["id"])

    resposta = client.get(f"/pombos/{filho['id']}/irmaos")
    assert resposta.status_code == 200
    dados = resposta.json()

    assert [p["anilha"] for p in dados["completos"]] == ["FILHO-2"]
    assert [p["anilha"] for p in dados["meios_paternos"]] == ["FILHO-3"]
    assert [p["anilha"] for p in dados["meios_maternos"]] == ["FILHO-4"]

    todas_anilhas = {p["anilha"] for grupo in dados.values() for p in grupo}
    assert "FILHO-5" not in todas_anilhas
    assert irmao_completo["anilha"] not in dados["meios_paternos"]
    assert meio_irmao_paterno and meio_irmao_materno and sem_parentesco  # usados acima


def test_irmaos_vazio_quando_sem_pai_e_mae(client):
    pombo = _criar_pombo(client, "SOLO-1")
    resposta = client.get(f"/pombos/{pombo['id']}/irmaos")
    assert resposta.json() == {"completos": [], "meios_paternos": [], "meios_maternos": []}


def test_resultados_do_pombo(client):
    pombo = _criar_pombo(client, "0001")
    resposta = client.post(
        f"/pombos/{pombo['id']}/resultados",
        json={"ano": 2020, "competicao": "Prova X", "colocacao": "1º"},
    )
    assert resposta.status_code == 201

    resposta = client.get(f"/pombos/{pombo['id']}/resultados")
    assert len(resposta.json()) == 1
    assert resposta.json()[0]["competicao"] == "Prova X"


def test_gerar_certificado_pdf(client):
    pai = _criar_pombo(client, "PAI-1", sexo="M")
    mae = _criar_pombo(client, "MAE-1", sexo="F")
    filho = _criar_pombo(client, "FILHO-1", pai_id=pai["id"], mae_id=mae["id"])

    resposta = client.get(f"/pombos/{filho['id']}/certificado")
    assert resposta.status_code == 200
    assert resposta.headers["content-type"] == "application/pdf"
    assert resposta.content.startswith(b"%PDF")


def test_gerar_certificado_html(client):
    pai = _criar_pombo(client, "PAI-1", sexo="M")
    mae = _criar_pombo(client, "MAE-1", sexo="F")
    filho = _criar_pombo(client, "FILHO-1", pai_id=pai["id"], mae_id=mae["id"])

    resposta = client.get(f"/pombos/{filho['id']}/certificado-html")
    assert resposta.status_code == 200
    assert "text/html" in resposta.headers["content-type"]
    assert "FILHO-1" in resposta.text
    assert "window.print()" in resposta.text


def test_arvore_inclui_grau_de_parentesco(client):
    bisavo_paterno = _criar_pombo(client, "BISAVO-PAT")
    avo_paterno = _criar_pombo(client, "AVO-PAT", pai_id=bisavo_paterno["id"])
    pai = _criar_pombo(client, "PAI-1", pai_id=avo_paterno["id"])
    mae = _criar_pombo(client, "MAE-1", sexo="F")
    filho = _criar_pombo(client, "FILHO-1", pai_id=pai["id"], mae_id=mae["id"])

    arvore = client.get(f"/pombos/{filho['id']}/arvore?geracoes=4").json()

    assert arvore["grau_parentesco"] is None
    assert arvore["pai"]["grau_parentesco"] == "Pai"
    assert arvore["mae"]["grau_parentesco"] == "Mãe"
    assert arvore["pai"]["pai"]["grau_parentesco"] == "Avô"
    assert arvore["pai"]["pai"]["pai"]["grau_parentesco"] == "Bisavô"


def test_arvore_inclui_resultados_dos_ancestrais(client):
    pai = _criar_pombo(client, "PAI-1", sexo="M")
    filho = _criar_pombo(client, "FILHO-1", pai_id=pai["id"])

    client.post(
        f"/pombos/{pai['id']}/resultados",
        json={"ano": 2019, "competicao": "Prova Antiga", "colocacao": "3º"},
    )
    client.post(
        f"/pombos/{pai['id']}/resultados",
        json={"ano": 2021, "competicao": "Prova Nova", "colocacao": "1º"},
    )

    resposta = client.get(f"/pombos/{filho['id']}/arvore?geracoes=2")
    arvore = resposta.json()

    assert arvore["resultados"] == []
    resultados_pai = arvore["pai"]["resultados"]
    assert [r["ano"] for r in resultados_pai] == [2021, 2019]
