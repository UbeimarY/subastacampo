import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.realtime import gestor
from app.routers import auth, productos, subastas, tiempo_real
from app.services.subastas import cerrar_vencidas

logger = logging.getLogger("subastacampo")


async def vigilar_cierres() -> None:
    """Cada segundo cierra las subastas vencidas y avisa a sus salas."""
    while True:
        try:
            eventos = await run_in_threadpool(cerrar_vencidas)
            for evento in eventos:
                await gestor.difundir(evento["subasta"]["id"], evento)
        except Exception:
            logger.exception("Error al cerrar subastas vencidas")
        await asyncio.sleep(1)


@asynccontextmanager
async def lifespan(app: FastAPI):
    tarea = asyncio.create_task(vigilar_cierres())
    yield
    tarea.cancel()


app = FastAPI(title="SubastaCampo API", version="0.1.0", lifespan=lifespan)
app.include_router(auth.router)
app.include_router(productos.router)
app.include_router(subastas.router)
app.include_router(tiempo_real.router)


@app.get("/health")
def health(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ok", "database": "conectada"}