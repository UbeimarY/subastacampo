from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models import RolUsuario


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