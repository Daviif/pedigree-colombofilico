from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import certificado, pombos, proprietarios, resultados


app = FastAPI(title="Sistema de Pedigree Colombófilo")

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
