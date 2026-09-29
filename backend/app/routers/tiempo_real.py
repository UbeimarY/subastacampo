from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.concurrency import run_in_threadpool

from app.database import SessionLocal
from app.models import Subasta
from app.realtime import gestor
from app.schemas import SubastaDetalle
from app.services.subastas import cerrar_si_vencida

router = APIRouter(tags=["tiempo real"])


def _estado_actual(subasta_id: int) -> dict | None:
    with SessionLocal() as db:
        subasta = db.get(Subasta, subasta_id)
        if subasta is None:
            return None
        if cerrar_si_vencida(subasta, db):
            db.commit()
        return SubastaDetalle.model_validate(subasta).model_dump(mode="json")


@router.websocket("/ws/subastas/{subasta_id}")
async def sala_subasta(websocket: WebSocket, subasta_id: int):
    estado = await run_in_threadpool(_estado_actual, subasta_id)
    if estado is None:
        await websocket.accept()
        await websocket.close(code=4404, reason="Subasta no encontrada")
        return

    await gestor.conectar(subasta_id, websocket)
    await websocket.send_json({"tipo": "estado_inicial", "subasta": estado})
    try:
        while True:
            await websocket.receive_text()  # mantiene viva la conexión
    except WebSocketDisconnect:
        gestor.desconectar(subasta_id, websocket)