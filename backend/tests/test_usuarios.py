"""Regras da tela Usuários (README, seção "Tela Usuários"). Cada teste cita a regra."""

from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.main import app
from app.models import Usuario
from tests.conftest import TestingSessionLocal


def _id(login: str) -> int:
    with TestingSessionLocal() as db:
        return db.scalar(select(Usuario.id).where(Usuario.login == login))


def _logar(login: str, senha: str = "senha-teste") -> TestClient:
    c = TestClient(app, base_url="http://testserver/api")
    resposta = c.post("/auth/login", json={"login": login, "senha": senha})
    assert resposta.status_code == 200, resposta.text
    return c


# Regra 1
def test_so_admin_acessa(client, cliente_de):
    joao = cliente_de("joao")
    assert joao.get("/usuarios").status_code == 403
    assert joao.post("/usuarios", json={"login": "x123", "nome": "X Y", "senha": "12345678"}).status_code == 403
    assert joao.patch(f"/usuarios/{_id('joao')}", json={"admin": True}).status_code == 403
    assert joao.post(f"/usuarios/{_id('admin')}/senha", json={"senha": "12345678"}).status_code == 403
    assert client.get("/usuarios").status_code == 200


# Regra 2
def test_lista_mostra_situacao_acesso_e_total_de_pombos(client, cliente_de):
    joao = cliente_de("joao")
    assert joao.post("/pombos", json={"anilha": "1/2026"}).status_code == 201
    assert joao.post("/pombos", json={"anilha": "2/2026"}).status_code == 201

    lista = {u["login"]: u for u in client.get("/usuarios").json()}
    assert lista["joao"]["total_pombos"] == 2
    assert lista["admin"]["total_pombos"] == 0
    assert lista["joao"]["ativo"] is True
    assert lista["joao"]["admin"] is False
    assert lista["joao"]["ultimo_acesso"] is not None
    assert "senha_hash" not in lista["joao"]


# Regra 3
def test_ultimo_acesso_e_gravado_no_maximo_a_cada_5_minutos(client):
    antigo = datetime.now(UTC) - timedelta(minutes=10)
    recente = datetime.now(UTC) - timedelta(minutes=1)
    with TestingSessionLocal() as db:
        db.get(Usuario, _id("admin")).ultimo_acesso = recente
        db.commit()
    client.get("/pombos")
    with TestingSessionLocal() as db:
        assert db.get(Usuario, _id("admin")).ultimo_acesso == recente  # não regravou

        db.get(Usuario, _id("admin")).ultimo_acesso = antigo
        db.commit()
    client.get("/pombos")
    with TestingSessionLocal() as db:
        assert db.get(Usuario, _id("admin")).ultimo_acesso > recente


# Regra 4
def test_criar_usuario_que_consegue_entrar(client):
    resposta = client.post(
        "/usuarios", json={"login": "  Maria.S ", "nome": " Maria   da Silva ", "senha": "senha-forte"}
    )
    assert resposta.status_code == 201, resposta.text
    assert resposta.json()["login"] == "maria.s"
    assert resposta.json()["nome"] == "Maria da Silva"
    assert resposta.json()["admin"] is False
    _logar("maria.s", "senha-forte")


def test_criar_usuario_valida_login_nome_e_senha(client):
    invalidos = [
        {"login": "ab", "nome": "Ana Lima", "senha": "12345678"},
        {"login": "joão", "nome": "Ana Lima", "senha": "12345678"},
        {"login": "com espaco", "nome": "Ana Lima", "senha": "12345678"},
        {"login": "valido", "nome": "  ", "senha": "12345678"},
        {"login": "valido", "nome": "Ana", "senha": "12345678"},
        {"login": "valido", "nome": "  Ana  ", "senha": "12345678"},
        {"login": "valido", "nome": "Ana Lima", "senha": "1234567"},
    ]
    for dados in invalidos:
        assert client.post("/usuarios", json=dados).status_code == 422, dados


def test_login_repetido_responde_409(client):
    assert client.post("/usuarios", json={"login": "Admin", "nome": "Outro Admin", "senha": "12345678"}).status_code == 409


# Regra 5
def test_editar_nome_e_perfil(client, cliente_de):
    cliente_de("joao")
    resposta = client.patch(f"/usuarios/{_id('joao')}", json={"nome": "João Souza", "admin": True})
    assert resposta.status_code == 200
    assert resposta.json()["nome"] == "João Souza"
    assert resposta.json()["admin"] is True
    # Regra 4 também vale na edição: só o primeiro nome é recusado.
    assert client.patch(f"/usuarios/{_id('joao')}", json={"nome": "João"}).status_code == 422


def test_usuario_inexistente_responde_404(client):
    assert client.patch("/usuarios/99999", json={"nome": "X Y"}).status_code == 404
    assert client.post("/usuarios/99999/senha", json={"senha": "12345678"}).status_code == 404


# Regra 6
def test_desativar_bloqueia_login_e_sessao_aberta_sem_apagar_o_plantel(client, cliente_de):
    joao = cliente_de("joao")
    pombo = joao.post("/pombos", json={"anilha": "1/2026"}).json()

    assert client.patch(f"/usuarios/{_id('joao')}", json={"ativo": False}).status_code == 200
    assert joao.get("/pombos").status_code == 401
    novo = TestClient(app, base_url="http://testserver/api")
    assert novo.post("/auth/login", json={"login": "joao", "senha": "senha-teste"}).status_code == 401

    assert client.patch(f"/usuarios/{_id('joao')}", json={"ativo": True}).status_code == 200
    assert _logar("joao").get(f"/pombos/{pombo['id']}").status_code == 200


def test_dono_desativado_some_do_plantel_compartilhado(client, cliente_de):
    joao = cliente_de("joao")
    maria = cliente_de("maria")
    pombo = joao.post("/pombos", json={"anilha": "1/2026"}).json()
    assert joao.post("/compartilhamentos", json={"login": "maria"}).status_code == 201
    assert maria.get(f"/pombos/{pombo['id']}").status_code == 200

    client.patch(f"/usuarios/{_id('joao')}", json={"ativo": False})
    assert maria.get(f"/pombos/{pombo['id']}").status_code == 404
    assert maria.get("/pombos").json() == []

    client.patch(f"/usuarios/{_id('joao')}", json={"ativo": True})
    assert maria.get(f"/pombos/{pombo['id']}").status_code == 200


# Regra 7
def test_redefinir_senha_encerra_sessoes_e_vale_a_nova(client, cliente_de):
    joao = cliente_de("joao")
    assert client.post(f"/usuarios/{_id('joao')}/senha", json={"senha": "nova-senha-1"}).status_code == 204
    assert joao.get("/pombos").status_code == 401
    novo = TestClient(app, base_url="http://testserver/api")
    assert novo.post("/auth/login", json={"login": "joao", "senha": "senha-teste"}).status_code == 401
    _logar("joao", "nova-senha-1")


def test_redefinir_senha_curta_responde_422(client, cliente_de):
    cliente_de("joao")
    assert client.post(f"/usuarios/{_id('joao')}/senha", json={"senha": "curta"}).status_code == 422


def test_admin_redefine_a_propria_senha_e_continua_logado(client):
    assert client.post(f"/usuarios/{_id('admin')}/senha", json={"senha": "nova-senha-1"}).status_code == 204
    assert client.get("/auth/me").status_code == 200
    _logar("admin", "nova-senha-1")


# Regra 8
def test_admin_nao_tira_o_proprio_perfil_nem_se_desativa(client, cliente_de):
    cliente_de("outro", admin=True)
    eu = _id("admin")
    assert client.patch(f"/usuarios/{eu}", json={"admin": False}).status_code == 400
    assert client.patch(f"/usuarios/{eu}", json={"ativo": False}).status_code == 400
    assert client.patch(f"/usuarios/{eu}", json={"nome": "Novo Nome"}).status_code == 200


# Regra 9. Em sequência, a regra 8 já garante um admin (quem faz a mudança). Só dá para
# zerar os admins com duas mudanças simultâneas, e é isso que a trava impede.
def test_dois_admins_rebaixando_um_ao_outro_ao_mesmo_tempo(client, cliente_de):
    a = cliente_de("ana", admin=True)
    b = cliente_de("bia", admin=True)
    # Deixa ana e bia como os únicos admins ativos.
    assert a.patch(f"/usuarios/{_id('admin')}", json={"admin": False}).status_code == 200

    for _ in range(5):
        with ThreadPoolExecutor(2) as ex:
            r1 = ex.submit(a.patch, f"/usuarios/{_id('bia')}", json={"admin": False})
            r2 = ex.submit(b.patch, f"/usuarios/{_id('ana')}", json={"admin": False})
            codigos = sorted([r1.result().status_code, r2.result().status_code])
        with TestingSessionLocal() as db:
            ativos = db.scalars(select(Usuario).where(Usuario.admin, Usuario.ativo)).all()
            assert len(ativos) >= 1, codigos
            # Restaura os dois como admins para a próxima rodada.
            for u in db.scalars(select(Usuario).where(Usuario.login.in_(["ana", "bia"]))):
                u.admin = True
            db.commit()


def test_sessao_aberta_antes_do_deploy_continua_valendo(client_anonimo, usuario):
    """Tokens emitidos antes da versão da sessão não têm "v": valem como 0, até a 1ª troca de senha."""
    import jwt

    from app.config import settings

    token_antigo = jwt.encode(
        {"sub": str(_id("admin")), "exp": datetime.now(UTC) + timedelta(days=1)},
        settings.secret_key,
        algorithm="HS256",
    )
    client_anonimo.cookies.set("sessao", token_antigo)
    assert client_anonimo.get("/auth/me").status_code == 200

    client_anonimo.post(f"/usuarios/{_id('admin')}/senha", json={"senha": "nova-senha-1"})
    outro = TestClient(app, base_url="http://testserver/api")
    outro.cookies.set("sessao", token_antigo)
    assert outro.get("/auth/me").status_code == 401
