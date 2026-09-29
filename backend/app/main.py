from fastapi import Depends, FastAPI
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.routers import auth, productos, subastas

from app.database import get_db

app = FastAPI(title="SubastaCampo API", version="0.1.0")
app.include_router(auth.router)
app.include_router(productos.router)
app.include_router(subastas.router)


@app.get("/health")
def health(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ok", "database": "conectada"}