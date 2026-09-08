import os

os.environ["DATABASE_URL"] = "postgresql+psycopg://pedigree:pedigree@localhost:5436/pedigree_test"

import psycopg
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

ADMIN_URL = "postgresql://pedigree:pedigree@localhost:5436/postgres"


def _garantir_banco_teste() -> None:
    conn = psycopg.connect(ADMIN_URL, autocommit=True)
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM pg_database WHERE datname = 'pedigree_test'")
            if cur.fetchone() is None:
                cur.execute("CREATE DATABASE pedigree_test")
    finally:
        conn.close()


_garantir_banco_teste()

from app.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402

engine = create_engine(os.environ["DATABASE_URL"])
TestingSessionLocal = sessionmaker(bind=engine)


@pytest.fixture(autouse=True)
def banco_limpo():
    Base.metadata.create_all(engine)
    yield
    Base.metadata.drop_all(engine)


@pytest.fixture
def client():
    def _override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app, base_url="http://testserver/api") as c:
        yield c
    app.dependency_overrides.clear()
