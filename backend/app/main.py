from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth import usuario_atual
from app.config import settings
from app.routers import auth, certificado, pombos, proprietarios, resultados


app = FastAPI(title="Sistema de Pedigree Colombófilo")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")

# Todo o resto da API exige usuário logado.
protegido = [Depends(usuario_atual)]
app.include_router(proprietarios.router, prefix="/api", dependencies=protegido)
app.include_router(pombos.router, prefix="/api", dependencies=protegido)
app.include_router(resultados.router, prefix="/api", dependencies=protegido)
app.include_router(certificado.router, prefix="/api", dependencies=protegido)


@app.get("/api/health")
def health():
    return {"status": "ok"}
