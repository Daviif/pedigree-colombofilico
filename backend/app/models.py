import enum

from sqlalchemy import Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Sexo(str, enum.Enum):
    M = "M"
    F = "F"
    DESCONHECIDO = "DESCONHECIDO"


class StatusPombo(str, enum.Enum):
    ATIVO = "ATIVO"
    REPRODUTOR = "REPRODUTOR"
    VENDIDO = "VENDIDO"
    FALECIDO = "FALECIDO"


class Proprietario(Base):
    __tablename__ = "proprietarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nome: Mapped[str] = mapped_column(String(200), nullable=False)
    colombodromo: Mapped[str | None] = mapped_column(String(200))
    endereco: Mapped[str | None] = mapped_column(String(300))
    telefone: Mapped[str | None] = mapped_column(String(50))
    email: Mapped[str | None] = mapped_column(String(200))
    observacoes: Mapped[str | None] = mapped_column(Text)

    pombos: Mapped[list["Pombo"]] = relationship(back_populates="proprietario")


class Pombo(Base):
    __tablename__ = "pombos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    anilha: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    sexo: Mapped[Sexo] = mapped_column(Enum(Sexo, name="sexo"), default=Sexo.DESCONHECIDO)
    cor: Mapped[str | None] = mapped_column(String(100))
    status: Mapped[StatusPombo] = mapped_column(
        Enum(StatusPombo, name="status_pombo"), default=StatusPombo.ATIVO
    )
    observacoes: Mapped[str | None] = mapped_column(Text)
    origem: Mapped[str | None] = mapped_column(String(200))

    proprietario_id: Mapped[int | None] = mapped_column(ForeignKey("proprietarios.id"))
    proprietario: Mapped[Proprietario | None] = relationship(back_populates="pombos")

    pai_id: Mapped[int | None] = mapped_column(ForeignKey("pombos.id"))
    mae_id: Mapped[int | None] = mapped_column(ForeignKey("pombos.id"))

    pai: Mapped["Pombo | None"] = relationship(
        remote_side="Pombo.id", foreign_keys=[pai_id], back_populates="filhos_como_pai"
    )
    mae: Mapped["Pombo | None"] = relationship(
        remote_side="Pombo.id", foreign_keys=[mae_id], back_populates="filhos_como_mae"
    )
    filhos_como_pai: Mapped[list["Pombo"]] = relationship(
        foreign_keys=[pai_id], back_populates="pai"
    )
    filhos_como_mae: Mapped[list["Pombo"]] = relationship(
        foreign_keys=[mae_id], back_populates="mae"
    )

    resultados: Mapped[list["Resultado"]] = relationship(
        back_populates="pombo", cascade="all, delete-orphan"
    )


class Resultado(Base):
    __tablename__ = "resultados"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    pombo_id: Mapped[int] = mapped_column(ForeignKey("pombos.id"), nullable=False)
    ano: Mapped[int | None] = mapped_column(Integer)
    competicao: Mapped[str] = mapped_column(String(200), nullable=False)
    distancia_km: Mapped[int | None] = mapped_column(Integer)
    colocacao: Mapped[str | None] = mapped_column(String(100))
    premio: Mapped[str | None] = mapped_column(String(200))
    observacao: Mapped[str | None] = mapped_column(Text)

    pombo: Mapped[Pombo] = relationship(back_populates="resultados")
