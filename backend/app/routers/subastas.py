from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import EstadoSubasta, Producto, Subasta, Usuario
from app.realtime import gestor
from app.schemas import PujaCrear, PujaRespuesta, SubastaCrear, SubastaDetalle, SubastaRespuesta
from app.security import requiere_comprador, requiere_productor
from app.services.subastas import ahora, cerrar_si_vencida, registrar_puja

router = APIRouter(prefix="/subastas", tags=["subastas"])


@router.post("", response_model=SubastaRespuesta, status_code=status.HTTP_201_CREATED)
def crear_subasta(
    datos: SubastaCrear,
    productor: Usuario = Depends(requiere_productor),
    db: Session = Depends(get_db),
):
    producto = db.get(Producto, datos.producto_id)
    if producto is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Producto no encontrado")
    if producto.productor_id != productor.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Solo puedes subastar tus propios productos")

    ya_activa = db.scalar(
        select(Subasta.id).where(
            Subasta.producto_id == producto.id, Subasta.estado == EstadoSubasta.activa
        )
    )
    if ya_activa:
        raise HTTPException(status.HTTP_409_CONFLICT, "Este producto ya tiene una subasta activa")

    inicio = ahora()
    subasta = Subasta(
        producto_id=producto.id,
        precio_inicial=datos.precio_inicial,
        incremento_minimo=datos.incremento_minimo,
        precio_actual=datos.precio_inicial,
        fecha_inicio=inicio,
        fecha_fin=inicio + timedelta(minutes=datos.duracion_minutos),
        estado=EstadoSubasta.activa,
    )
    db.add(subasta)
    db.commit()
    db.refresh(subasta)
    return subasta


@router.get("", response_model=list[SubastaRespuesta])
def listar_subastas(estado: EstadoSubasta | None = None, db: Session = Depends(get_db)):
    subastas = db.scalars(select(Subasta).order_by(Subasta.fecha_fin)).all()
    if any([cerrar_si_vencida(s, db) for s in subastas]):
        db.commit()
    if estado:
        subastas = [s for s in subastas if s.estado == estado]
    return subastas


@router.get("/{subasta_id}", response_model=SubastaDetalle)
def obtener_subasta(subasta_id: int, db: Session = Depends(get_db)):
    subasta = db.get(Subasta, subasta_id)
    if subasta is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Subasta no encontrada")
    if cerrar_si_vencida(subasta, db):
        db.commit()
    return subasta


# Función auxiliar: SIN decorador. No es un endpoint.
def _pujar_en_hilo(subasta_id: int, comprador: Usuario, monto, db: Session):
    """Trabajo bloqueante (base de datos). Corre en un hilo aparte, fuera del Event Loop."""
    puja = registrar_puja(subasta_id, comprador, monto, db)
    subasta = db.get(Subasta, subasta_id)
    respuesta = PujaRespuesta.model_validate(puja)
    evento = {
        "tipo": "nueva_puja",
        "puja": respuesta.model_dump(mode="json"),
        "subasta": SubastaRespuesta.model_validate(subasta).model_dump(mode="json"),
    }
    return respuesta, evento


@router.post("/{subasta_id}/pujas", response_model=PujaRespuesta, status_code=status.HTTP_201_CREATED)
async def pujar(
    subasta_id: int,
    datos: PujaCrear,
    comprador: Usuario = Depends(requiere_comprador),
    db: Session = Depends(get_db),
):
    respuesta, evento = await run_in_threadpool(_pujar_en_hilo, subasta_id, comprador, datos.monto, db)
    await gestor.difundir(subasta_id, evento)
    return respuesta