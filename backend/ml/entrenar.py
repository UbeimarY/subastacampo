"""Entrena el modelo de sugerencia de precio y lo guarda en ml/modelos/precio.joblib."""
from datetime import date
from pathlib import Path

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_absolute_percentage_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

BASE = Path(__file__).parent
DATOS = BASE / "datos" / "subastas_entrenamiento.csv"
SALIDA = BASE / "modelos" / "precio.joblib"

CATEGORICAS = ["categoria"]
NUMERICAS = ["cantidad_kg", "dias_restantes", "fraccion_vida", "mes", "demanda_categoria"]
OBJETIVO = "precio_kg"


def crear_pipeline(**params) -> Pipeline:
    preprocesador = ColumnTransformer(
        [("cat", OneHotEncoder(handle_unknown="ignore"), CATEGORICAS)],
        remainder="passthrough",
    )
    modelo = GradientBoostingRegressor(n_estimators=300, max_depth=3, learning_rate=0.05, random_state=42, **params)
    return Pipeline([("pre", preprocesador), ("modelo", modelo)])


def main() -> None:
    df = pd.read_csv(DATOS)
    X, y = df[CATEGORICAS + NUMERICAS], df[OBJETIVO]
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)

    medio = crear_pipeline().fit(X_tr, y_tr)
    bajo = crear_pipeline(loss="quantile", alpha=0.1).fit(X_tr, y_tr)
    alto = crear_pipeline(loss="quantile", alpha=0.9).fit(X_tr, y_tr)

    # Métricas del modelo
    pred = medio.predict(X_te)
    mae = mean_absolute_error(y_te, pred)

    # Línea base: precio promedio de la categoría (lo que haría alguien sin IA)
    promedio_cat = X_tr.assign(y=y_tr).groupby("categoria")["y"].mean()
    mae_base = mean_absolute_error(y_te, X_te["categoria"].map(promedio_cat))

    cobertura = ((y_te >= bajo.predict(X_te)) & (y_te <= alto.predict(X_te))).mean()

    print("=== Evaluación en datos de prueba ===")
    print(f"MAE modelo:        {mae:,.0f} COP/kg")
    print(f"MAE línea base:    {mae_base:,.0f} COP/kg  (promedio por categoría)")
    print(f"Mejora:            {(1 - mae / mae_base):.0%}")
    print(f"R²:                {r2_score(y_te, pred):.3f}")
    print(f"MAPE:              {mean_absolute_percentage_error(y_te, pred):.1%}")
    print(f"Cobertura rango:   {cobertura:.0%}  (esperado cerca de 80%)")

    nombres = medio.named_steps["pre"].get_feature_names_out()
    importancias = medio.named_steps["modelo"].feature_importances_
    print("\n=== Importancia de variables ===")
    for nombre, valor in sorted(zip(nombres, importancias), key=lambda t: -t[1]):
        print(f"{nombre:35s} {valor:.3f}")

    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(
        {
            "medio": medio, "bajo": bajo, "alto": alto,
            "caracteristicas": CATEGORICAS + NUMERICAS,
            "version": date.today().isoformat(),
            "mae_kg": float(mae),
        },
        SALIDA,
    )
    print(f"\nModelo guardado en {SALIDA}")


if __name__ == "__main__":
    main()
    