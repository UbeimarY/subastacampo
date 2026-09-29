"""Genera un dataset sintético de subastas para entrenar el modelo inicial de precios."""
from pathlib import Path

import numpy as np
import pandas as pd

RUTA = Path(__file__).parent / "datos" / "subastas_entrenamiento.csv"

# Precios de referencia aproximados por kg en COP. Calibrar con datos del SIPSA-DANE.
PRECIO_BASE_KG = {
    "frutas": 3500, "hortalizas": 2500, "tuberculos": 1800,
    "granos": 4500, "lacteos": 5000, "otros": 3000,
}
VIDA_UTIL = {
    "frutas": (5, 20), "hortalizas": (5, 15), "tuberculos": (20, 60),
    "granos": (90, 365), "lacteos": (3, 15), "otros": (7, 60),
}
DESFASE_TEMPORADA = {"frutas": 0, "hortalizas": 3, "tuberculos": 6, "granos": 9, "lacteos": 2, "otros": 5}
KG_POR_UNIDAD = {"kg": 1, "arroba": 12.5, "bulto": 50, "canastilla": 20}


def generar(n: int = 6000, semilla: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(semilla)
    filas = []
    for _ in range(n):
        categoria = str(rng.choice(list(PRECIO_BASE_KG)))
        vmin, vmax = VIDA_UTIL[categoria]
        vida_util = int(rng.integers(vmin, vmax + 1))
        dias_restantes = int(rng.integers(0, vida_util + 1))
        fraccion_vida = dias_restantes / vida_util
        unidad = str(rng.choice(list(KG_POR_UNIDAD)))
        cantidad_kg = int(rng.integers(1, 60)) * KG_POR_UNIDAD[unidad]
        mes = int(rng.integers(1, 13))
        demanda = float(rng.gamma(2.0, 2.0))  # pujas promedio por subasta

        f_temporada = 1 + 0.15 * np.sin(2 * np.pi * (mes + DESFASE_TEMPORADA[categoria]) / 12)
        f_demanda = min(1.25, 0.85 + 0.05 * demanda)
        f_frescura = 0.55 + 0.45 * fraccion_vida ** 0.7
        f_volumen = 1 - 0.06 * np.log10(cantidad_kg)
        ruido = rng.lognormal(0, 0.08)

        precio_kg = PRECIO_BASE_KG[categoria] * f_temporada * f_demanda * f_frescura * f_volumen * ruido
        filas.append({
            "categoria": categoria,
            "cantidad_kg": cantidad_kg,
            "dias_restantes": dias_restantes,
            "fraccion_vida": round(fraccion_vida, 4),
            "mes": mes,
            "demanda_categoria": round(demanda, 2),
            "precio_kg": round(precio_kg, 2),
        })
    return pd.DataFrame(filas)


if __name__ == "__main__":
    df = generar()
    RUTA.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(RUTA, index=False)
    print(f"{len(df)} registros guardados en {RUTA}")
    print(df.groupby("categoria")["precio_kg"].describe().round(0))
    