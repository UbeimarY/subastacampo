from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, computed_field, field_validator

from app.models import RolUsuario


# ---------- Usuarios ----------

class UsuarioCrear(BaseModel):
    nombre: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8)
    rol: RolUsuario
    telefono: str | None = None
    municipio: str | None = None


class UsuarioRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    email: EmailStr
    rol: RolUsuario
    telefono: str | None
    municipio: str | None
    creado_en: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---------- Productos ----------

Categoria = Literal["frutas", "hortalizas", "tuberculos", "granos", "lacteos", "otros"]
Unidad = Literal["kg", "arroba", "bulto", "canastilla", "unidad"]


class ProductoCrear(BaseModel):
    nombre: str = Field(min_length=2, max_length=150)
    descripcion: str | None = None
    categoria: Categoria
    cantidad: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    unidad: Unidad
    fecha_cosecha: date
    vida_util_dias: int = Field(ge=1, le=365)

    @field_validator("fecha_cosecha")
    @classmethod
    def no_en_el_futuro(cls, valor: date) -> date:
        if valor > date.today():
            raise ValueError("La fecha de cosecha no puede estar en el futuro")
        return valor


class ProductoRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    productor_id: int
    nombre: str
    descripcion: str | None
    categoria: str
    cantidad: Decimal
    unidad: str
    fecha_cosecha: date
    vida_util_dias: int
    creado_en: datetime

    @computed_field
    @property
    def dias_restantes(self) -> int:
        vence = self.fecha_cosecha + timedelta(days=self.vida_util_dias)
        return max(0, (vence - date.today()).days)