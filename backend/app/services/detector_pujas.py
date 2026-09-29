from datetime import datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Producto, Puja, Subasta, Usuario


def evaluar_puja(
    subasta: Subasta,
    comprador: Usuario,
    segundos_restantes: float,
    extiende: bool,
    momento: datetime,
    db: Session,
) -> tuple[int, list[str]]:
    """Calcula un puntaje de riesgo (0-100) y los motivos, ANTES de guardar la puja."""
    riesgo = 0
    motivos: list[str] = []

    # 1. Momento de la puja
    if segundos_restantes <= 10:
        riesgo += 30
        motivos.append("Puja en los últimos 10 segundos del cierre")
    elif segundos_restantes <= 30:
        riesgo += 15
        motivos.append("Puja en los últimos 30 segundos del cierre")

    # 2. Aparece por primera vez justo al final
    previas = db.scalar(
        select(func.count(Puja.id)).where(Puja.subasta_id == subasta.id, Puja.usuario_id == comprador.id)
    )
    if previas == 0 and segundos_restantes <= 30:
        riesgo += 10
        motivos.append("Primera puja de este usuario en la subasta, justo al final")

    # 3. Extensiones repetidas provocadas por el mismo usuario
    if extiende:
        extensiones_previas = db.scalar(
            select(func.count(Puja.id)).where(
                Puja.subasta_id == subasta.id,
                Puja.usuario_id == comprador.id,
                Puja.extendio_cierre.is_(True),
            )
        )
        if extensiones_previas >= 2:
            riesgo += 25
            motivos.append(f"Ha provocado {extensiones_previas + 1} extensiones del cierre en esta subasta")

    # 4. Cuenta nueva
    if momento - comprador.creado_en < timedelta(hours=24):
        riesgo += 15
        motivos.append("Cuenta creada hace menos de 24 horas")

    # 5. Patrón histórico de pujas de último momento
    total, de_ultimo_momento = db.execute(
        select(
            func.count(Puja.id),
            func.count(Puja.id).filter(Puja.extendio_cierre.is_(True)),
        ).where(Puja.usuario_id == comprador.id)
    ).one()
    if total >= 5 and de_ultimo_momento / total >= 0.7:
        riesgo += 20
        motivos.append(f"El {de_ultimo_momento / total:.0%} de sus pujas históricas son de último momento")

    # 6. Vínculo con el productor (posible puja de complicidad)
    telefono_productor = db.scalar(
        select(Usuario.telefono)
        .join(Producto, Producto.productor_id == Usuario.id)
        .where(Producto.id == subasta.producto_id)
    )
    if comprador.telefono and comprador.telefono == telefono_productor:
        riesgo += 40
        motivos.append("Comparte número de teléfono con el productor (posible puja de complicidad)")

    return min(riesgo, 100), motivos
