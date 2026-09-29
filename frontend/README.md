# 🌾 SubastaCampo

Plataforma web de **subastas en tiempo real** para que pequeños productores agrícolas vendan su cosecha antes de que se deteriore, sin depender de intermediarios. Incluye **sugerencia de precio con machine learning** y **detección de pujas sospechosas**.

Proyecto final de **Programación Orientada a la Web**, por Ubeimar Lizardo Yepes Portilla.

## El problema

Los pequeños productores tienen poco margen para vender productos perecederos y suelen depender de intermediarios que pagan precios bajos. SubastaCampo permite publicar la cosecha con un tiempo límite para que compradores y restaurantes locales pujen en vivo.

## Funcionalidades

- **Autenticación JWT** con roles de productor y comprador.
- **Publicación de cosecha**: categoría, cantidad, fecha de cosecha y vida útil.
- **Precio sugerido por IA**: un modelo propio predice el precio esperado y un rango probable, con los factores que explican la sugerencia.
- **Subastas en tiempo real**: salas WebSocket; cada puja llega al instante a todos los participantes.
- **Pujas concurrentes seguras**: bloqueo transaccional (`SELECT ... FOR UPDATE`), así no se pierden ni se duplican pujas simultáneas.
- **Anti-francotirador**: una puja en los últimos 2 minutos extiende el cierre.
- **Detección de pujas sospechosas**: puntaje de riesgo explicable (0-100) visible para el productor.
- **Cierre automático** a la hora exacta y aviso al comprador ganador.
- **Reconexión automática** con resincronización del estado completo.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Angular 21 (standalone, signals), SCSS |
| Backend | FastAPI (Python 3.11), WebSockets, SQLAlchemy 2, Alembic |
| Base de datos | PostgreSQL 17 (Docker) |
| IA | scikit-learn (Gradient Boosting con regresión por cuantiles) |

## Módulo de IA

**Sugerencia de precio.** Modelo `GradientBoostingRegressor` que predice el precio por kg a partir de categoría, cantidad, días de vida útil restantes, fracción de vida útil, mes (temporada) y demanda de la categoría. Tres modelos (percentiles 10, 50 y 90) entregan un precio esperado con su rango.

| Métrica (datos de prueba) | Valor |
|---|---|
| MAE del modelo | 194 COP/kg |
| MAE de la línea base (promedio por categoría) | 485 COP/kg |
| Mejora frente a la línea base | 60% |
| R² | 0,933 |
| MAPE | 8,1% |
| Cobertura del rango 10–90% | 78% |

> El dataset inicial es **sintético**, calibrado con precios de referencia por categoría. El pipeline de entrenamiento está listo para reemplazarlo por datos del SIPSA-DANE y por los resultados reales de las subastas de la plataforma.

**Detección de pujas sospechosas.** Sistema de puntuación basado en señales (momento de la puja, extensiones repetidas, antigüedad de la cuenta, patrón histórico y vínculo con el productor). Las pujas se marcan, no se bloquean, y quedan registradas con sus señales para entrenar un modelo cuando existan datos etiquetados.

## Reto técnico: orden de las pujas y Event Loop

- **Backend:** cada puja bloquea la fila de la subasta hasta confirmar la transacción; las pujas simultáneas se procesan en orden. El trabajo con la base de datos corre en un *thread pool* para no bloquear el Event Loop de FastAPI que atiende los WebSockets.
- **Frontend:** al llegar un mensaje (macrotask), el estado se actualiza de forma síncrona e inmediata; el efecto visual se agenda con `requestAnimationFrame`. Los eventos se deduplican y ordenan por id, y un único reloj compartido alimenta todas las cuentas regresivas.

## Estructura

```
subastacampo/
├── backend/
│   ├── app/            # API: routers, servicios, modelos, esquemas, seguridad
│   ├── alembic/        # migraciones de base de datos
│   └── ml/             # generación de datos, entrenamiento y modelo entrenado
├── frontend/           # aplicación Angular
├── database/
└── docker-compose.yml  # PostgreSQL local
```

## Cómo ejecutarlo en local

**Requisitos:** Git, Docker Desktop, Python 3.11+, Node.js LTS y Angular CLI.

**1. Clonar y configurar variables**

```bash
git clone https://github.com/TU_USUARIO/subastacampo.git
cd subastacampo
cp .env.example .env   # en Windows: copy .env.example .env
```

Edita `.env` y define una contraseña y un `JWT_SECRET`. Para generar este último:
`python -c "import secrets; print(secrets.token_hex(32))"`

**2. Base de datos**

```bash
docker compose up -d
```

**3. Backend** (terminal 1)

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # en Linux/Mac: source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

API en `http://localhost:8000`, documentación interactiva en `http://localhost:8000/docs`.

El modelo de IA ya viene entrenado en `ml/modelos/`. Para reentrenarlo:
`python -m ml.generar_datos` y luego `python -m ml.entrenar`.

**4. Frontend** (terminal 2)

```bash
cd frontend
npm install
ng serve
```

Aplicación en `http://localhost:4200`.

## Prueba rápida

1. Registra un **productor** y publica una cosecha desde **Mis productos**; verás la sugerencia de precio de la IA.
2. Crea una subasta de 5 minutos.
3. En una ventana privada, registra un **comprador**, entra a la sala y puja. Abre otra sesión con otro comprador para ver las pujas en tiempo real.

## Estado del proyecto

**Versión `v0.1-avance`**: funcionalidad completa en entorno local.

- [x] Autenticación y roles
- [x] Productos y subastas
- [x] Pujas concurrentes, anti-francotirador y cierre automático
- [x] Tiempo real con WebSockets
- [x] IA: sugerencia de precio y detección de pujas sospechosas
- [x] Frontend: inicio, panel del productor y sala en vivo
- [ ] Despliegue en la nube
- [ ] Presentación final