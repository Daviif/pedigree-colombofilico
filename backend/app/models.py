import enum

from sqlalchemy import Boolean, Enum, ForeignKey, Integer, String, Text, UniqueConstraint
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
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False, index=True)
    nome: Mapped[str] = mapped_column(String(200), nullable=False)
    colombodromo: Mapped[str | None] = mapped_column(String(200))
    endereco: Mapped[str | None] = mapped_column(String(300))
    telefone: Mapped[str | None] = mapped_column(String(50))
    email: Mapped[str | None] = mapped_column(String(200))
    observacoes: Mapped[str | None] = mapped_column(Text)

    pombos: Mapped[list["Pombo"]] = relationship(back_populates="proprietario")


class Pombo(Base):
    __tablename__ = "pombos"
    # A mesma anilha pode existir em plantéis diferentes (ex.: o mesmo
    # reprodutor cadastrado por dois criadores), mas não duas vezes no mesmo.
    __table_args__ = (UniqueConstraint("usuario_id", "anilha", name="uq_pombos_usuario_anilha"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False, index=True)
    dono: Mapped["Usuario"] = relationship()
    anilha: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
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


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    login: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    nome: Mapped[str] = mapped_column(String(200), nullable=False)
    senha_hash: Mapped[str] = mapped_column(String(200), nullable=False)
    admin: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")


class Compartilhamento(Base):
    """O dono libera o plantel inteiro (inclusive pombos cadastrados depois)
    para o convidado ver, só para leitura."""

    __tablename__ = "compartilhamentos"
    __table_args__ = (UniqueConstraint("dono_id", "convidado_id", name="uq_compartilhamento"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    dono_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False, index=True)
    convidado_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False, index=True)

    dono: Mapped[Usuario] = relationship(foreign_keys=[dono_id])
    convidado: Mapped[Usuario] = relationship(foreign_keys=[convidado_id])
