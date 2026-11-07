"""Limite de tentativas de login RA-xx (docs/requisitos.md). Cada teste cita a regra."""

from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select, update

from app.auth import hash_senha
from app.limite_login import ip_do_cliente
from app.main import app
from app.models import TentativaLogin, Usuario
from tests.conftest import TestingSessionLocal

ERRADA = {"login": "admin", "senha": "errada"}
CERTA = {"login": "admin", "senha": "senha-teste"}


@pytest.fixture
def ip():
    """Permite escolher o IP de origem: ip["atual"] = "1.2.3.4"."""
    estado = {"atual": "10.0.0.1"}
    app.dependency_overrides[ip_do_cliente] = lambda: estado["atual"]
    yield estado
    app.dependency_overrides.pop(ip_do_cliente, None)


def _login(c, dados):
    return c.post("/auth/login", json=dados)


def _envelhecer(minutos):
    with TestingSessionLocal() as db:
        db.execute(update(TentativaLogin).values(criado_em=TentativaLogin.criado_em - timedelta(minutes=minutos)))
        db.commit()


def _criar_usuario(login):
    with TestingSessionLocal() as db:
        db.add(Usuario(login=login, nome=f"{login} Silva", senha_hash=hash_senha("senha-teste")))
        db.commit()


# RA-01
def test_ra01_cinco_falhas_bloqueiam_o_login_mesmo_com_senha_certa(client_anonimo, usuario, ip):
    for _ in range(5):
        assert _login(client_anonimo, ERRADA).status_code == 401
    r = _login(client_anonimo, CERTA)
    assert r.status_code == 429
    assert r.json()["detail"] == "Muitas tentativas de login. Tente de novo em 15 minutos."
    assert 840 < int(r.headers["Retry-After"]) <= 900


def test_ra01_bloqueio_acaba_quando_a_quinta_falha_sai_da_janela(client_anonimo, usuario, ip):
    for _ in range(5):
        _login(client_anonimo, ERRADA)
    _envelhecer(14)
    r = _login(client_anonimo, CERTA)
    assert r.status_code == 429 and "1 minuto." in r.json()["detail"]
    _envelhecer(2)
    assert _login(client_anonimo, CERTA).status_code == 200


def test_ra01_bloqueio_de_um_login_nao_afeta_outro(client_anonimo, usuario, ip):
    _criar_usuario("maria")
    for _ in range(5):
        _login(client_anonimo, ERRADA)
    assert _login(client_anonimo, {"login": "maria", "senha": "senha-teste"}).status_code == 200


def test_ra01_maiusculas_e_espacos_contam_como_o_mesmo_login(client_anonimo, usuario, ip):
    for variante in ["admin", "ADMIN", " Admin ", "admin", "aDmin"]:
        _login(client_anonimo, {"login": variante, "senha": "errada"})
    assert _login(client_anonimo, CERTA).status_code == 429


# RA-02
def test_ra02_vinte_falhas_do_mesmo_ip_bloqueiam_o_ip(client_anonimo, usuario, ip):
    for i in range(20):
        _login(client_anonimo, {"login": f"login{i}", "senha": "x"})  # 1 falha por login
    assert _login(client_anonimo, CERTA).status_code == 429
    ip["atual"] = "10.0.0.2"
    assert _login(client_anonimo, CERTA).status_code == 200


# RA-03
def test_ra03_tentativa_bloqueada_nao_conta_como_falha(client_anonimo, usuario, ip):
    for _ in range(5):
        _login(client_anonimo, ERRADA)
    for _ in range(3):
        assert _login(client_anonimo, ERRADA).status_code == 429
    with TestingSessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(TentativaLogin)) == 5


def test_ra03_logins_certos_simultaneos_nunca_recebem_429(client_anonimo, usuario, ip):
    with ThreadPoolExecutor(10) as ex:
        codigos = list(ex.map(lambda _: _login(client_anonimo, CERTA).status_code, range(10)))
    assert codigos == [200] * 10


def test_ra03_falhas_simultaneas_nao_passam_do_limite(usuario, ip):
    clientes = [TestClient(app, base_url="http://testserver/api") for _ in range(12)]
    with ThreadPoolExecutor(12) as ex:
        codigos = list(ex.map(lambda c: _login(c, ERRADA).status_code, clientes))
    assert codigos.count(401) == 5, codigos  # exatamente 5 senhas testadas
    assert codigos.count(429) == 7, codigos


# RA-04
def test_ra04_login_certo_zera_as_falhas(client_anonimo, usuario, ip):
    for _ in range(4):
        _login(client_anonimo, ERRADA)
    assert _login(client_anonimo, CERTA).status_code == 200
    for _ in range(4):
        assert _login(client_anonimo, ERRADA).status_code == 401
    assert _login(client_anonimo, CERTA).status_code == 200


# RA-05
def test_ra05_login_inexistente_e_desativado_contam_e_respondem_igual(client_anonimo, usuario, ip):
    inexistente = _login(client_anonimo, {"login": "ninguem", "senha": "x"})
    errada = _login(client_anonimo, ERRADA)
    assert inexistente.status_code == errada.status_code == 401
    assert inexistente.json() == errada.json()
    for _ in range(4):
        _login(client_anonimo, {"login": "ninguem", "senha": "x"})
    assert _login(client_anonimo, {"login": "ninguem", "senha": "x"}).status_code == 429

    _criar_usuario("inativo")
    with TestingSessionLocal() as db:
        db.execute(update(Usuario).where(Usuario.login == "inativo").values(ativo=False))
        db.commit()
    r = _login(client_anonimo, {"login": "inativo", "senha": "senha-teste"})
    assert r.status_code == 401 and r.json() == errada.json()


# RA-07
def test_ra07_falhas_com_mais_de_24h_sao_apagadas(client_anonimo, usuario, ip):
    _login(client_anonimo, ERRADA)
    _envelhecer(25 * 60)
    _login(client_anonimo, {"login": "outro", "senha": "x"})
    with TestingSessionLocal() as db:
        assert db.scalars(select(TentativaLogin.login)).all() == ["outro"]


# RA-08
def test_ra08_admin_ve_e_desbloqueia(client, ip):
    _criar_usuario("joao")
    anonimo = TestClient(app, base_url="http://testserver/api")
    for _ in range(5):
        _login(anonimo, {"login": "joao", "senha": "errada"})
    lista = {u["login"]: u for u in client.get("/usuarios").json()}
    assert lista["joao"]["bloqueado"] is True and lista["admin"]["bloqueado"] is False

    joao_id = lista["joao"]["id"]
    assert client.post(f"/usuarios/{joao_id}/desbloquear").status_code == 204
    assert next(u for u in client.get("/usuarios").json() if u["login"] == "joao")["bloqueado"] is False
    assert _login(anonimo, {"login": "joao", "senha": "senha-teste"}).status_code == 200


def test_ra08_redefinir_senha_desbloqueia(client, ip):
    _criar_usuario("joao")
    anonimo = TestClient(app, base_url="http://testserver/api")
    for _ in range(5):
        _login(anonimo, {"login": "joao", "senha": "errada"})
    joao_id = next(u["id"] for u in client.get("/usuarios").json() if u["login"] == "joao")
    client.post(f"/usuarios/{joao_id}/senha", json={"senha": "nova-senha-1"})
    assert _login(anonimo, {"login": "joao", "senha": "nova-senha-1"}).status_code == 200


def test_ra08_so_admin_desbloqueia(cliente_de):
    joao = cliente_de("joao")
    assert joao.post("/usuarios/1/desbloquear").status_code == 403
