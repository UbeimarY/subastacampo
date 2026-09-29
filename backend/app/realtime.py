from fastapi import WebSocket


class GestorConexiones:
    """Agrupa las conexiones WebSocket por subasta (una 'sala' por subasta)."""

    def __init__(self) -> None:
        self.salas: dict[int, set[WebSocket]] = {}

    async def conectar(self, subasta_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        self.salas.setdefault(subasta_id, set()).add(websocket)

    def desconectar(self, subasta_id: int, websocket: WebSocket) -> None:
        sala = self.salas.get(subasta_id)
        if sala is None:
            return
        sala.discard(websocket)
        if not sala:
            del self.salas[subasta_id]

    async def difundir(self, subasta_id: int, mensaje: dict) -> None:
        caidas = []
        for websocket in list(self.salas.get(subasta_id, ())):
            try:
                await websocket.send_json(mensaje)
            except Exception:
                caidas.append(websocket)
        for websocket in caidas:
            self.desconectar(subasta_id, websocket)


gestor = GestorConexiones()