"""Regras genealógicas RG-xx (docs/requisitos.md). Cada teste cita a regra."""

from concurrent.futures import ThreadPoolExecutor

from sqlalchemy import update

from app.models import Pombo, Sexo
from tests.conftest import TestingSessionLocal


def _p(client, anilha, **extra):
    r = client.post("/pombos", json={"anilha": anilha, **extra})
    assert r.status_code == 201, r.text
    return r.json()


def _editar(client, pombo, **mudancas):
    atual = client.get(f"/pombos/{pombo['id']}").json()
    campos = ("anilha", "sexo", "cor", "status", "observacoes", "origem", "proprietario_id", "pai_id", "mae_id")
    dados = {c: atual[c] for c in campos} | mudancas
    return client.put(f"/pombos/{pombo['id']}", json=dados)


def _gravar_direto(pombo_id, **campos):
    """Simula registro antigo, gravado antes das regras."""
    with TestingSessionLocal() as db:
        db.execute(update(Pombo).where(Pombo.id == pombo_id).values(**campos))
        db.commit()


# RG-01
def test_rg01_pombo_nao_e_pai_de_si_mesmo(client):
    a = _p(client, "1", sexo="M")
    assert _editar(client, a, pai_id=a["id"]).status_code == 400
    assert _editar(client, a, mae_id=a["id"]).status_code == 400


# RG-02
def test_rg02_ciclo_de_duas_geracoes(client):
    a = _p(client, "1", sexo="M")
    b = _p(client, "2", sexo="M", pai_id=a["id"])
    r = _editar(client, a, pai_id=b["id"])
    assert r.status_code == 400
    assert "ancestral de si mesmo" in r.json()["detail"]


def test_rg02_ciclo_de_tres_geracoes_pela_mae(client):
    a = _p(client, "1", sexo="F")
    b = _p(client, "2", sexo="F", mae_id=a["id"])
    c = _p(client, "3", sexo="F", mae_id=b["id"])
    assert _editar(client, a, mae_id=c["id"]).status_code == 400


def test_rg02_ciclo_de_seis_geracoes_misturando_pai_e_mae(client):
    raiz = _p(client, "100", sexo="M")
    atual = raiz
    for i in range(6):
        atual = _p(client, f"10{i + 1}", sexo="F" if i % 2 else "M",
                   **({"mae_id": atual["id"]} if atual["sexo"] == "F" else {"pai_id": atual["id"]}))
    papel = "pai_id" if atual["sexo"] == "M" else "mae_id"
    assert _editar(client, raiz, **{papel: atual["id"]}).status_code == 400


def test_rg02_consanguinidade_continua_permitida(client):
    avo = _p(client, "1", sexo="M")
    pai = _p(client, "2", sexo="M", pai_id=avo["id"])
    mae = _p(client, "3", sexo="F", pai_id=avo["id"])
    filho = _p(client, "4", pai_id=pai["id"], mae_id=mae["id"])
    assert client.get(f"/pombos/{filho['id']}/arvore").status_code == 200


def test_rg02_termina_mesmo_com_ciclo_antigo_no_banco(client):
    a = _p(client, "1", sexo="M")
    b = _p(client, "2", sexo="M", pai_id=a["id"])
    _gravar_direto(a["id"], pai_id=b["id"])  # ciclo antigo
    c = _p(client, "3", sexo="M")
    # ler a ascendência de b (que está num ciclo) não pode travar
    assert _editar(client, c, pai_id=b["id"]).status_code == 200


# RG-03
def test_rg03_edicoes_simultaneas_nao_fecham_ciclo(client):
    for rodada in range(5):
        a = _p(client, f"{rodada}1", sexo="M")
        b = _p(client, f"{rodada}2", sexo="M")
        with ThreadPoolExecutor(2) as ex:
            r1 = ex.submit(_editar, client, a, pai_id=b["id"])
            r2 = ex.submit(_editar, client, b, pai_id=a["id"])
            codigos = sorted([r1.result().status_code, r2.result().status_code])
        assert codigos == [200, 400], codigos


# RG-04
def test_rg04_pai_femea_e_mae_macho_bloqueados(client):
    f = _p(client, "1", sexo="F")
    m = _p(client, "2", sexo="M")
    r = client.post("/pombos", json={"anilha": "3", "pai_id": f["id"]})
    assert r.status_code == 400 and "macho" in r.json()["detail"]
    r = client.post("/pombos", json={"anilha": "3", "mae_id": m["id"]})
    assert r.status_code == 400 and "fêmea" in r.json()["detail"]
    filho = _p(client, "4")
    assert _editar(client, filho, pai_id=f["id"]).status_code == 400


def test_rg04_sexo_desconhecido_sempre_aceito(client):
    d1 = _p(client, "1", sexo="DESCONHECIDO")
    d2 = _p(client, "2", sexo="DESCONHECIDO")
    _p(client, "3", pai_id=d1["id"], mae_id=d2["id"])


# RG-05
def test_rg05_registro_antigo_inconsistente_continua_editavel(client):
    f = _p(client, "1", sexo="F")
    filho = _p(client, "2")
    _gravar_direto(filho["id"], pai_id=f["id"])
    r = _editar(client, filho, cor="Azul")
    assert r.status_code == 200, r.text
    assert r.json()["pai"]["id"] == f["id"]


# RG-06
def test_rg06_nao_muda_sexo_contra_o_papel(client):
    pai = _p(client, "1", sexo="M")
    _p(client, "2", pai_id=pai["id"])
    r = _editar(client, pai, sexo="F")
    assert r.status_code == 400 and "é pai de 1" in r.json()["detail"]
    assert _editar(client, pai, sexo="DESCONHECIDO").status_code == 200


def test_rg06_corrigir_registro_antigo_para_o_sexo_certo(client):
    f = _p(client, "1", sexo="F")
    filho = _p(client, "2")
    _gravar_direto(filho["id"], pai_id=f["id"])
    assert _editar(client, f, sexo="M").status_code == 200


# RG-07
def test_rg07_arvore_marca_sexo_inconsistente(client):
    f = _p(client, "1", sexo="F")
    m = _p(client, "2", sexo="F")
    filho = _p(client, "3", mae_id=m["id"])
    _gravar_direto(filho["id"], pai_id=f["id"])
    arvore = client.get(f"/pombos/{filho['id']}/arvore").json()
    assert arvore["pai"]["alerta_sexo"] is True
    assert arvore["mae"]["alerta_sexo"] is False
    assert arvore["alerta_sexo"] is False
    assert client.get(f"/pombos/{filho['id']}/certificado").status_code == 200


# RG-08
def test_rg08_pai_de_outro_plantel(client, cliente_de):
    joao = cliente_de("joao")
    pai_joao = _p(joao, "1", sexo="M")
    assert client.post("/pombos", json={"anilha": "2", "pai_id": pai_joao["id"]}).status_code == 400


# RG-09
def test_rg09_nao_exclui_pombo_com_filhos(client):
    pai = _p(client, "1", sexo="M")
    filho = _p(client, "2", pai_id=pai["id"])
    r = client.delete(f"/pombos/{pai['id']}")
    assert r.status_code == 409
    assert "2" in r.json()["detail"] and "1 pombo" in r.json()["detail"]
    assert client.get(f"/pombos/{filho['id']}").json()["pai_id"] == pai["id"]


def test_rg09_exclui_pombo_sem_filhos_com_resultados(client):
    p = _p(client, "1")
    client.post(f"/pombos/{p['id']}/resultados", json={"competicao": "Prova"})
    assert client.delete(f"/pombos/{p['id']}").status_code == 204
    assert client.get(f"/pombos/{p['id']}").status_code == 404


def test_rg09_lista_ate_dez_filhos(client):
    pai = _p(client, "1", sexo="M")
    for i in range(12):
        _p(client, f"2{i:02d}", pai_id=pai["id"])
    detalhe = client.delete(f"/pombos/{pai['id']}").json()["detail"]
    assert "12 pombo" in detalhe and "e mais 2" in detalhe


# RG-10
def test_rg10_nao_exclui_proprietario_em_uso(client):
    dono = client.post("/proprietarios", json={"nome": "Fulano"}).json()
    p = _p(client, "1", proprietario_id=dono["id"])
    r = client.delete(f"/proprietarios/{dono['id']}")
    assert r.status_code == 409 and "1 pombo" in r.json()["detail"]
    assert client.get(f"/pombos/{p['id']}").json()["proprietario_id"] == dono["id"]
    _editar(client, p, proprietario_id=None)
    assert client.delete(f"/proprietarios/{dono['id']}").status_code == 204


# RG-11
def test_rg11_ancestral_desconhecido_e_ausencia(client):
    p = _p(client, "1")
    arvore = client.get(f"/pombos/{p['id']}/arvore").json()
    assert arvore["pai"] is None and arvore["mae"] is None
    with TestingSessionLocal() as db:
        assert db.query(Pombo).count() == 1


def test_cenario20_consistencia_apos_trocar_o_pai(client):
    p1 = _p(client, "1", sexo="M")
    p2 = _p(client, "2", sexo="M")
    filho = _p(client, "3", pai_id=p1["id"])
    irmao = _p(client, "4", pai_id=p1["id"])
    _editar(client, filho, pai_id=p2["id"])
    assert client.get(f"/pombos/{filho['id']}/arvore").json()["pai"]["anilha"] == "2"
    assert client.get(f"/pombos/{irmao['id']}/irmaos").json()["meios_paternos"] == []
    assert client.get(f"/pombos/{filho['id']}/certificado").status_code == 200


def test_cenario16_pdf_com_genealogia_incompleta(client):
    mae = _p(client, "1", sexo="F")
    so_mae = _p(client, "2", mae_id=mae["id"])
    sem_pais = _p(client, "3")
    for p in (so_mae, sem_pais):
        r = client.get(f"/pombos/{p['id']}/certificado?geracoes=6")
        assert r.status_code == 200 and r.content.startswith(b"%PDF")
