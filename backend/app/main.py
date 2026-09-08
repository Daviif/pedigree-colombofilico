from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
from app.routers import certificado, pombos, proprietarios, resultados


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    # Idempotente: no Postgres (dev) as tabelas já existem, isso é um no-op.
    # No SQLite do app desktop, cria o schema do zero no primeiro uso.
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="Sistema de Pedigree Colombófilo", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(proprietarios.router, prefix="/api")
app.include_router(pombos.router, prefix="/api")
app.include_router(resultados.router, prefix="/api")
app.include_router(certificado.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}
