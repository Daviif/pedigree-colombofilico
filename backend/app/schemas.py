import re
from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator

from app.models import Sexo, StatusPombo


# ---------- Proprietario ----------


class ProprietarioBase(BaseModel):
    nome: str
    colombodromo: str | None = None
    endereco: str | None = None
    telefone: str | None = None
    email: str | None = None
    observacoes: str | None = None


class ProprietarioCreate(ProprietarioBase):
    pass


class ProprietarioUpdate(ProprietarioBase):
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


class ResultadoCreate(ResultadoBase):
    pass


class ResultadoUpdate(ResultadoBase):
    pass


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


def _validar_senha(valor: str) -> str:
    if len(valor) < 8:
        raise ValueError("A senha precisa ter pelo menos 8 caracteres")
    return valor


def _validar_nome(valor: str) -> str:
    valor = " ".join(valor.split())
    if len(valor.split()) < 2:
        raise ValueError("Informe o nome completo (nome e sobrenome)")
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
