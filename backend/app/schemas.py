from pydantic import BaseModel, ConfigDict

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


class PomboCreate(PomboBase):
    pass


class PomboUpdate(PomboBase):
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
    proprietario_nome: str | None = None
    duplicado: bool = False
    grau_parentesco: str | None = None
    resultados: list[ResultadoBase] = []
    pai: "ArvoreNo | None" = None
    mae: "ArvoreNo | None" = None
