from fastapi import Depends, FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.auth import usuario_atual
from app.config import settings
from app.routers import auth, certificado, compartilhamentos, pombos, proprietarios, resultados, usuarios


app = FastAPI(title="Sistema de Pedigree Colombófilo")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# RV-07: mensagens de validação em português, com o nome do campo, no formato 422 do FastAPI.
_ROTULOS = {
    "anilha": "Anilha", "cor": "Cor", "origem": "Origem", "observacoes": "Observações",
    "observacao": "Observação", "nome": "Nome", "colombodromo": "Colombódromo",
    "endereco": "Endereço", "telefone": "Telefone", "email": "E-mail", "competicao": "Competição",
    "ano": "Ano", "distancia_km": "Distância", "colocacao": "Colocação", "premio": "Prêmio",
    "login": "Login", "senha": "Senha", "sexo": "Sexo", "status": "Situação",
}


def _traduzir(erro: dict) -> str:
    ctx = erro.get("ctx") or {}
    tipo = erro["type"]
    if tipo == "value_error":
        return str(erro["msg"]).removeprefix("Value error, ")
    mensagens = {
        "string_too_long": f"no máximo {ctx.get('max_length')} caracteres",
        "string_too_short": "obrigatório" if ctx.get("min_length") == 1 else f"no mínimo {ctx.get('min_length')} caracteres",
        "missing": "obrigatório",
        "greater_than_equal": f"deve ser no mínimo {ctx.get('ge')}",
        "less_than_equal": f"deve ser no máximo {ctx.get('le')}",
        "int_parsing": "deve ser um número inteiro",
        "int_type": "deve ser um número inteiro",
        "enum": "valor inválido",
    }
    texto = mensagens.get(tipo, erro["msg"])
    campo = next((str(p) for p in reversed(erro.get("loc", ())) if isinstance(p, str) and p != "body"), None)
    return f"{_ROTULOS.get(campo, campo)}: {texto}" if campo else texto


@app.exception_handler(RequestValidationError)
async def _validacao_em_portugues(_request: Request, exc: RequestValidationError):
    erros = [{**e, "msg": _traduzir(e)} for e in exc.errors()]
    return JSONResponse(status_code=422, content={"detail": jsonable_encoder(erros)})


app.include_router(auth.router, prefix="/api")

# Todo o resto da API exige usuário logado.
protegido = [Depends(usuario_atual)]
app.include_router(proprietarios.router, prefix="/api", dependencies=protegido)
app.include_router(pombos.router, prefix="/api", dependencies=protegido)
app.include_router(resultados.router, prefix="/api", dependencies=protegido)
app.include_router(resultados.router_recentes, prefix="/api", dependencies=protegido)
app.include_router(certificado.router, prefix="/api", dependencies=protegido)
app.include_router(compartilhamentos.router, prefix="/api", dependencies=protegido)
app.include_router(usuarios.router, prefix="/api", dependencies=protegido)


@app.get("/api/health")
def health():
    return {"status": "ok"}
