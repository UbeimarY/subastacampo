import enum
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class RolUsuario(str, enum.Enum):
    productor = "productor"
    comprador = "comprador"


class EstadoSubasta(str, enum.Enum):
    programada = "programada"
    activa = "activa"
    finalizada = "finalizada"
    cancelada = "cancelada"


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    rol: Mapped[RolUsuario] = mapped_column(Enum(RolUsuario, name="rol_usuario"))
    telefono: Mapped[str | None] = mapped_column(String(20))
    municipio: Mapped[str | None] = mapped_column(String(100))
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    productos: Mapped[list["Producto"]] = relationship(back_populates="productor")
    pujas: Mapped[list["Puja"]] = relationship(back_populates="usuario")


class Producto(Base):
    __tablename__ = "productos"

    id: Mapped[int] = mapped_column(primary_key=True)
    productor_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), index=True)
    nombre: Mapped[str] = mapped_column(String(150))
    descripcion: Mapped[str | None] = mapped_column(Text)
    categoria: Mapped[str] = mapped_column(String(50))
    cantidad: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    unidad: Mapped[str] = mapped_column(String(20))  # kg, arroba, bulto, canastilla
    fecha_cosecha: Mapped[date]
    vida_util_dias: Mapped[int]
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    productor: Mapped["Usuario"] = relationship(back_populates="productos")
    subastas: Mapped[list["Subasta"]] = relationship(back_populates="producto")


class Subasta(Base):
    __tablename__ = "subastas"

    id: Mapped[int] = mapped_column(primary_key=True)
    producto_id: Mapped[int] = mapped_column(ForeignKey("productos.id"), index=True)
    precio_inicial: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    incremento_minimo: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    precio_actual: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    fecha_inicio: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    fecha_fin: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    estado: Mapped[EstadoSubasta] = mapped_column(
        Enum(EstadoSubasta, name="estado_subasta"), default=EstadoSubasta.programada
    )
    extensiones: Mapped[int] = mapped_column(default=0)
    ganador_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"))
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    producto: Mapped["Producto"] = relationship(back_populates="subastas")
    ganador: Mapped["Usuario | None"] = relationship()
    pujas: Mapped[list["Puja"]] = relationship(back_populates="subasta", order_by="Puja.creado_en")


class Puja(Base):
    __tablename__ = "pujas"

    id: Mapped[int] = mapped_column(primary_key=True)
    subasta_id: Mapped[int] = mapped_column(ForeignKey("subastas.id"))
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), index=True)
    monto: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    subasta: Mapped["Subasta"] = relationship(back_populates="pujas")
    usuario: Mapped["Usuario"] = relationship(back_populates="pujas")

    __table_args__ = (Index("ix_pujas_subasta_monto", "subasta_id", "monto"),)