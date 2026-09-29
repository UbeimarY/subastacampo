from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pwdlib import PasswordHash
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import RolUsuario, Usuario

password_hash = PasswordHash.recommended()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
ALGORITMO = "HS256"


def hashear_password(password: str) -> str:
    return password_hash.hash(password)


def verificar_password(password: str, hash_guardado: str) -> bool:
    return password_hash.verify(password, hash_guardado)


def crear_token(usuario_id: int) -> str:
    expira = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    return jwt.encode({"sub": str(usuario_id), "exp": expira}, settings.jwt_secret, algorithm=ALGORITMO)


def get_usuario_actual(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> Usuario:
    error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido o expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITMO])
        usuario_id = int(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError):
        raise error
    usuario = db.get(Usuario, usuario_id)
    if usuario is None:
        raise error
    return usuario

def requiere_productor(usuario: Usuario = Depends(get_usuario_actual)) -> Usuario:
    if usuario.rol != RolUsuario.productor:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Solo los productores pueden realizar esta acción")
    return usuario

def requiere_comprador(usuario: Usuario = Depends(get_usuario_actual)) -> Usuario:
    if usuario.rol != RolUsuario.comprador:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Solo los compradores pueden pujar")
    return usuario