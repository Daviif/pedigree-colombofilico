"""RO-11: saúde para o monitor externo (docs/requisitos.md)."""
from sqlalchemy.exc import OperationalError

from app.database import get_db
from app.main import app


def test_saude_200_com_banco_e_sem_login(client_anonimo):
    r = client_anonimo.get("/saude")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


class _BancoFora:
    def execute(self, *a, **k):
        raise OperationalError("SELECT 1", {}, Exception("connection refused"))

    def close(self):
        pass


def test_saude_503_quando_o_banco_nao_responde(client_anonimo):
    app.dependency_overrides[get_db] = lambda: (yield _BancoFora())
    r = client_anonimo.get("/saude")
    assert r.status_code == 503
    assert r.json() == {"status": "banco indisponível"}
    assert "refused" not in r.text  # não revela detalhes internos
