from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Producto, Usuario
from app.schemas import Categoria, ProductoCrear, ProductoRespuesta
from app.security import get_usuario_actual, requiere_productor

router = APIRouter(prefix="/productos", tags=["productos"])


@router.post("", response_model=ProductoRespuesta, status_code=status.HTTP_201_CREATED)
def crear_producto(
    datos: ProductoCrear,
    productor: Usuario = Depends(requiere_productor),
    db: Session = Depends(get_db),
):
    producto = Producto(**datos.model_dump(), productor_id=productor.id)
    db.add(producto)
    db.commit()
    db.refresh(producto)
    return producto


@router.get("", response_model=list[ProductoRespuesta])
def listar_productos(categoria: Categoria | None = None, db: Session = Depends(get_db)):
    consulta = select(Producto).order_by(Producto.creado_en.desc())
    if categoria:
        consulta = consulta.where(Producto.categoria == categoria)
    return db.scalars(consulta).all()


@router.get("/mios", response_model=list[ProductoRespuesta])
def mis_productos(
    usuario: Usuario = Depends(get_usuario_actual), db: Session = Depends(get_db)
):
    consulta = (
        select(Producto)
        .where(Producto.productor_id == usuario.id)
        .order_by(Producto.creado_en.desc())
    )
    return db.scalars(consulta).all()


@router.get("/{producto_id}", response_model=ProductoRespuesta)
def obtener_producto(producto_id: int, db: Session = Depends(get_db)):
    producto = db.get(Producto, producto_id)
    if producto is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Producto no encontrado")
    return producto