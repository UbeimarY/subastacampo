from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Usuario
from app.schemas import Token, UsuarioCrear, UsuarioRespuesta
from app.security import crear_token, get_usuario_actual, hashear_password, verificar_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/registro", response_model=UsuarioRespuesta, status_code=status.HTTP_201_CREATED)
def registrar(datos: UsuarioCrear, db: Session = Depends(get_db)):
    if db.scalar(select(Usuario).where(Usuario.email == datos.email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Ya existe un usuario con ese email")
    usuario = Usuario(
        **datos.model_dump(exclude={"password"}),
        password_hash=hashear_password(datos.password),
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return usuario


@router.post("/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    usuario = db.scalar(select(Usuario).where(Usuario.email == form.username))
    if not usuario or not verificar_password(form.password, usuario.password_hash):
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Email o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return Token(access_token=crear_token(usuario.id))


@router.get("/me", response_model=UsuarioRespuesta)
def yo(usuario: Usuario = Depends(get_usuario_actual)):
    return usuario