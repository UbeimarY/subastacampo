from datetime import datetime, timedelta, timezone
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import EstadoSubasta, Puja, Subasta, Usuario

VENTANA_EXTENSION = timedelta(minutes=2)


def ahora() -> datetime:
    return datetime.now(timezone.utc)


def cerrar_si_vencida(subasta: Subasta, db: Session) -> bool:
    """Si la subasta ya venció, la finaliza y asigna ganador. Devuelve True si la cerró."""
    if subasta.estado != EstadoSubasta.activa or ahora() < subasta.fecha_fin:
        return False
    mejor = db.scalar(
        select(Puja)
        .where(Puja.subasta_id == subasta.id)
        .order_by(Puja.monto.desc(), Puja.creado_en.asc())
        .limit(1)
    )
    subasta.estado = EstadoSubasta.finalizada
    subasta.ganador_id = mejor.usuario_id if mejor else None
    return True


def registrar_puja(subasta_id: int, comprador: Usuario, monto: Decimal, db: Session) -> Puja:
    # FOR UPDATE: bloquea la fila hasta el commit; pujas simultáneas esperan su turno
    subasta = db.scalar(select(Subasta).where(Subasta.id == subasta_id).with_for_update())
    if subasta is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Subasta no encontrada")

    if cerrar_si_vencida(subasta, db):
        db.commit()
        raise HTTPException(status.HTTP_409_CONFLICT, "La subasta ya finalizó")
    if subasta.estado != EstadoSubasta.activa:
        raise HTTPException(status.HTTP_409_CONFLICT, "La subasta no está activa")

    hay_pujas = db.scalar(select(Puja.id).where(Puja.subasta_id == subasta.id).limit(1)) is not None
    minimo = subasta.precio_actual + subasta.incremento_minimo if hay_pujas else subasta.precio_inicial
    if monto < minimo:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"La puja mínima en este momento es {minimo}")

    puja = Puja(subasta_id=subasta.id, usuario_id=comprador.id, monto=monto)
    db.add(puja)
    subasta.precio_actual = monto

    # Anti-francotirador: garantiza 2 minutos después de una puja de último momento
    if subasta.fecha_fin - ahora() <= VENTANA_EXTENSION:
        subasta.fecha_fin = ahora() + VENTANA_EXTENSION
        subasta.extensiones += 1

    db.commit()
    db.refresh(puja)
    return puja