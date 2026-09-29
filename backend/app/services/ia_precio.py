from datetime import date, timedelta
from decimal import Decimal
from functools import lru_cache
from pathlib import Path

import joblib
import pandas as pd
from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Producto, Puja, Subasta
from app.services.subastas import ahora

RUTA_MODELO = Path(__file__).resolve().parents[2] / "ml" / "modelos" / "precio.joblib"
KG_POR_UNIDAD = {"kg": 1.0, "arroba": 12.5, "bulto": 50.0, "canastilla": 20.0, "unidad": 1.0}
DEMANDA_POR_DEFECTO = 3.0


@lru_cache(maxsize=1)
def cargar_modelo() -> dict:
    if not RUTA_MODELO.exists():
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "El modelo de precios no está entrenado. Ejecuta: python -m ml.entrenar",
        )
    return joblib.load(RUTA_MODELO)


def demanda_categoria(categoria: str, db: Session) -> float:
    """Pujas promedio por subasta de esta categoría en los últimos 30 días."""
    pujas_por_subasta = (
        select(func.count(Puja.id).label("n"))
        .select_from(Subasta)
        .join(Producto, Producto.id == Subasta.producto_id)
        .outerjoin(Puja, Puja.subasta_id == Subasta.id)
        .where(Producto.categoria == categoria, Subasta.fecha_inicio >= ahora() - timedelta(days=30))
        .group_by(Subasta.id)
        .subquery()
    )
    promedio = db.scalar(select(func.avg(pujas_por_subasta.c.n)))
    return float(promedio) if promedio is not None else DEMANDA_POR_DEFECTO


def _redondear(valor: float, a: int = 100) -> Decimal:
    return Decimal(int(round(valor / a)) * a)


def sugerir_precio(producto: Producto, db: Session) -> dict:
    modelo = cargar_modelo()

    cantidad_kg = float(producto.cantidad) * KG_POR_UNIDAD.get(producto.unidad, 1.0)
    vence = producto.fecha_cosecha + timedelta(days=producto.vida_util_dias)
    dias_restantes = max(0, (vence - date.today()).days)
    fraccion_vida = min(1.0, dias_restantes / producto.vida_util_dias)
    demanda = demanda_categoria(producto.categoria, db)

    fila = pd.DataFrame([{
        "categoria": producto.categoria,
        "cantidad_kg": cantidad_kg,
        "dias_restantes": dias_restantes,
        "fraccion_vida": fraccion_vida,
        "mes": date.today().month,
        "demanda_categoria": demanda,
    }])[modelo["caracteristicas"]]

    # sorted() garantiza bajo <= medio <= alto aunque los cuantiles se crucen
    bajo, medio, alto = sorted(float(modelo[k].predict(fila)[0]) for k in ("bajo", "medio", "alto"))

    factores = []
    if fraccion_vida < 0.3:
        factores.append(f"Quedan solo {dias_restantes} días de vida útil: conviene un precio más bajo para vender rápido.")
    elif fraccion_vida > 0.8:
        factores.append("El producto está muy fresco, lo que sostiene un buen precio.")
    if demanda >= 5:
        factores.append(f"Alta demanda en {producto.categoria}: {demanda:.1f} pujas promedio por subasta en el último mes.")
    elif demanda <= 2:
        factores.append(f"Demanda baja en {producto.categoria} durante el último mes.")
    if cantidad_kg >= 500:
        factores.append(f"Volumen grande ({cantidad_kg:,.0f} kg): se aplica un descuento por cantidad.")

    return {
        "precio_sugerido": _redondear(medio * cantidad_kg),
        "rango_min": _redondear(bajo * cantidad_kg),
        "rango_max": _redondear(alto * cantidad_kg),
        "precio_por_kg": _redondear(medio, 10),
        "cantidad_kg": round(cantidad_kg, 2),
        "dias_restantes": dias_restantes,
        "demanda_categoria": round(demanda, 1),
        "factores": factores,
        "modelo_version": modelo["version"],
    }
