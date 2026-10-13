def test_api_exige_login(client_anonimo):
    assert client_anonimo.get("/pombos").status_code == 401
    assert client_anonimo.get("/auth/me").status_code == 401


def test_health_nao_exige_login(client_anonimo):
    assert client_anonimo.get("/health").status_code == 200


def test_login_senha_errada(client_anonimo, usuario):
    resposta = client_anonimo.post("/auth/login", json={"login": "admin", "senha": "errada"})
    assert resposta.status_code == 401
    assert client_anonimo.get("/pombos").status_code == 401


def test_login_usuario_inexistente(client_anonimo, usuario):
    resposta = client_anonimo.post("/auth/login", json={"login": "ninguem", "senha": "senha-teste"})
    assert resposta.status_code == 401


def test_login_ignora_maiusculas_e_espacos_no_usuario(client_anonimo, usuario):
    resposta = client_anonimo.post("/auth/login", json={"login": " Admin ", "senha": "senha-teste"})
    assert resposta.status_code == 200


def test_login_e_logout(client_anonimo, usuario):
    resposta = client_anonimo.post("/auth/login", json=usuario)
    assert resposta.status_code == 200
    assert resposta.json()["login"] == "admin"
    assert "senha_hash" not in resposta.json()

    assert client_anonimo.get("/auth/me").json()["nome"] == "Admin"
    assert client_anonimo.get("/pombos").status_code == 200

    assert client_anonimo.post("/auth/logout").status_code == 204
    assert client_anonimo.get("/pombos").status_code == 401


def test_token_adulterado_e_rejeitado(client_anonimo, usuario):
    client_anonimo.cookies.set("sessao", "token.invalido.qualquer")
    assert client_anonimo.get("/auth/me").status_code == 401
