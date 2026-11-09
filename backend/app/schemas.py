import re
from datetime import date, datetime
from typing import Annotated

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field, StringConstraints, field_validator

from app.models import Sexo, StatusPombo


# ---------- Tipos de entrada (RV-xx em docs/requisitos.md) ----------
# Só nos schemas de entrada: registros antigos fora do padrão continuam sendo lidos.


def _vazio_vira_none(valor):
    if isinstance(valor, str):
        valor = valor.strip()
        return valor or None
    return valor


def TextoOpcional(maximo: int):
    """Texto opcional: espaços nas pontas removidos, vazio vira None, até `maximo` caracteres."""
    return Annotated[
        Annotated[str, StringConstraints(max_length=maximo)] | None,
        BeforeValidator(_vazio_vira_none),
    ]


def TextoObrigatorio(maximo: int):
    return Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=maximo)]


OBSERVACOES_MAX = 5000


# ---------- Proprietario ----------


class ProprietarioBase(BaseModel):
    nome: str
    colombodromo: str | None = None
    endereco: str | None = None
    telefone: str | None = None
    email: str | None = None
    observacoes: str | None = None


class ProprietarioInput(ProprietarioBase):
    nome: TextoObrigatorio(200)
    colombodromo: TextoOpcional(200) = None
    endereco: TextoOpcional(300) = None
    telefone: TextoOpcional(50) = None
    email: TextoOpcional(200) = None
    observacoes: TextoOpcional(OBSERVACOES_MAX) = None


class ProprietarioCreate(ProprietarioInput):
    pass


class ProprietarioUpdate(ProprietarioInput):
    pass


class ProprietarioRead(ProprietarioBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


# ---------- Resultado ----------


class ResultadoBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ano: int | None = None
    competicao: str
    distancia_km: int | None = None
    colocacao: str | None = None
    premio: str | None = None
    observacao: str | None = None


class ResultadoInput(ResultadoBase):
    ano: int | None = None
    competicao: TextoObrigatorio(200)
    distancia_km: Annotated[int, Field(ge=0, le=5000)] | None = None
    colocacao: TextoOpcional(100) = None
    premio: TextoOpcional(200) = None
    observacao: TextoOpcional(OBSERVACOES_MAX) = None

    @field_validator("ano")
    @classmethod
    def validar_ano(cls, valor: int | None) -> int | None:
        limite = date.today().year + 1
        if valor is not None and not 1900 <= valor <= limite:
            raise ValueError(f"O ano deve estar entre 1900 e {limite}")
        return valor


class ResultadoCreate(ResultadoInput):
    pass


class ResultadoUpdate(ResultadoInput):
    pass


class ResultadoRecente(BaseModel):
    """Resultado com a anilha do pombo, para a lista do Início (IN-04)."""

    id: int
    pombo_id: int
    anilha: str
    ano: int | None = None
    competicao: str
    colocacao: str | None = None


class ResultadoRead(ResultadoBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    pombo_id: int


# ---------- Pombo ----------


class PomboBase(BaseModel):
    anilha: str
    sexo: Sexo = Sexo.DESCONHECIDO
    cor: str | None = None
    status: StatusPombo = StatusPombo.ATIVO
    observacoes: str | None = None
    origem: str | None = None
    proprietario_id: int | None = None
    pai_id: int | None = None
    mae_id: int | None = None


class PomboInput(PomboBase):
    """Regras aplicadas só no que entra pela API; pombos antigos fora do
    padrão continuam sendo listados normalmente."""

    anilha: Annotated[str, StringConstraints(max_length=50)]
    cor: TextoOpcional(100) = None
    observacoes: TextoOpcional(OBSERVACOES_MAX) = None
    origem: TextoOpcional(200) = None

    @field_validator("anilha")
    @classmethod
    def validar_anilha(cls, valor: str) -> str:
        if not re.fullmatch(r"[0-9/]+", valor):
            raise ValueError("A anilha deve conter apenas números e /")
        return valor

    @field_validator("cor")
    @classmethod
    def capitalizar_cor(cls, valor: str | None) -> str | None:
        if valor:
            valor = valor.strip()
            valor = valor[:1].upper() + valor[1:]
        return valor or None


class PomboCreate(PomboInput):
    pass


class PomboUpdate(PomboInput):
    pass


class PomboSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    anilha: str
    sexo: Sexo
    cor: str | None = None


class PomboRead(PomboBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    usuario_id: int
    dono: "UsuarioResumo"
    proprietario: ProprietarioRead | None = None
    pai: PomboSummary | None = None
    mae: PomboSummary | None = None


class PomboDetail(PomboRead):
    resultados: list[ResultadoRead] = []


# ---------- Irmaos ----------


class IrmaosResponse(BaseModel):
    completos: list[PomboSummary] = []
    meios_paternos: list[PomboSummary] = []
    meios_maternos: list[PomboSummary] = []


# ---------- Arvore genealogica ----------


class ArvoreNo(BaseModel):
    id: int | None = None
    anilha: str | None = None
    sexo: Sexo | None = None
    cor: str | None = None
    origem: str | None = None
    observacoes: str | None = None
    proprietario_nome: str | None = None
    duplicado: bool = False
    # RG-07: pai fêmea ou mãe macho (registros antigos)
    alerta_sexo: bool = False
    grau_parentesco: str | None = None
    resultados: list[ResultadoBase] = []
    pai: "ArvoreNo | None" = None
    mae: "ArvoreNo | None" = None


# ---------- Usuario ----------


class UsuarioResumo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str


class UsuarioRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    login: str
    nome: str
    admin: bool


# ---------- Gestão de usuários (admin) ----------


class UsuarioAdminRead(UsuarioRead):
    ativo: bool
    ultimo_acesso: datetime | None = None
    total_pombos: int = 0
    bloqueado: bool = False  # RA-08: muitas senhas erradas nos últimos 15 minutos


SENHA_MAX_BYTES = 72  # limite do bcrypt (RV-06)


def _validar_senha(valor: str) -> str:
    if len(valor) < 8:
        raise ValueError("A senha precisa ter pelo menos 8 caracteres")
    if len(valor.encode()) > SENHA_MAX_BYTES:
        raise ValueError("A senha pode ter no máximo 72 caracteres (menos se tiver acentos)")
    return valor


def _validar_nome(valor: str) -> str:
    valor = " ".join(valor.split())
    if len(valor.split()) < 2:
        raise ValueError("Informe o nome completo (nome e sobrenome)")
    if len(valor) > 200:
        raise ValueError("O nome pode ter no máximo 200 caracteres")
    return valor


class UsuarioCreate(BaseModel):
    login: str
    nome: str
    senha: str
    admin: bool = False

    @field_validator("login")
    @classmethod
    def validar_login(cls, valor: str) -> str:
        valor = valor.strip().lower()
        if not re.fullmatch(r"[a-z0-9._-]{3,50}", valor):
            raise ValueError(
                "O login deve ter de 3 a 50 caracteres: letras sem acento, números, ponto, _ ou -"
            )
        return valor

    _nome = field_validator("nome")(_validar_nome)
    _senha = field_validator("senha")(_validar_senha)


class UsuarioUpdate(BaseModel):
    nome: str | None = None
    admin: bool | None = None
    ativo: bool | None = None

    _nome = field_validator("nome")(lambda v: None if v is None else _validar_nome(v))


class SenhaInput(BaseModel):
    senha: str

    _senha = field_validator("senha")(_validar_senha)


# ---------- Compartilhamento ----------


class CompartilharInput(BaseModel):
    login: str


class UsuarioComLogin(UsuarioResumo):
    # O login diferencia pessoas com o mesmo nome.
    login: str


class CompartilhamentosResponse(BaseModel):
    # usuários que veem o meu plantel
    concedidos: list[UsuarioComLogin] = []
    # usuários cujo plantel eu vejo
    recebidos: list[UsuarioComLogin] = []
