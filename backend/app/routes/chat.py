from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.utils.dependencies import get_current_user, require_role
from app.utils.jwt import verify_token
import json

router = APIRouter(prefix="/chat", tags=["chat"])

class MensajeBody(BaseModel):
    mensaje: str

class ConnectionManager:
    def __init__(self):
        self.active: dict[int, list[WebSocket]] = {}

    async def connect(self, pedido_id: int, ws: WebSocket):
        await ws.accept()
        if pedido_id not in self.active:
            self.active[pedido_id] = []
        self.active[pedido_id].append(ws)

    def disconnect(self, pedido_id: int, ws: WebSocket):
        if pedido_id in self.active:
            self.active[pedido_id] = [c for c in self.active[pedido_id] if c != ws]
            if not self.active[pedido_id]:
                del self.active[pedido_id]

    async def broadcast(self, pedido_id: int, data: str):
        if pedido_id not in self.active:
            return
        for ws in self.active[pedido_id][:]:
            try:
                await ws.send_text(data)
            except Exception:
                self.disconnect(pedido_id, ws)

manager = ConnectionManager()

def _get_uid(current_user: dict) -> int:
    uid = current_user.get("id") or current_user.get("sub")
    if not uid:
        raise HTTPException(status_code=401, detail="No se pudo identificar al usuario")
    return int(uid)

def _validar_acceso_chat(db: Session, pedido_id: int, user_id: int, user_tipo: str):
    pedido = db.execute(
        text("SELECT id_cliente, estado_entrega FROM pedidos WHERE id_pedido = :pid"),
        {"pid": pedido_id},
    ).fetchone()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    if pedido.estado_entrega != "en_camino":
        raise HTTPException(status_code=400, detail="El chat solo está disponible cuando el pedido está en camino")
    if user_tipo == "cliente" and pedido.id_cliente != user_id:
        raise HTTPException(status_code=403, detail="No tienes acceso a este pedido")
    if user_tipo == "empleado":
        asignado = db.execute(
            text("SELECT id FROM pedido_empleado WHERE id_pedido = :pid AND id_empleado = :uid"),
            {"pid": pedido_id, "uid": user_id},
        ).fetchone()
        if not asignado:
            raise HTTPException(status_code=403, detail="No tienes este pedido asignado")

def _serializar(row):
    d = dict(row._mapping)
    if d.get("fecha_creacion"):
        d["fecha_creacion"] = d["fecha_creacion"].isoformat()
    return d

@router.get("/{pedido_id}")
def obtener_mensajes(
    pedido_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tipo = current_user.get("tipo_usuario")
    uid = _get_uid(current_user)
    _validar_acceso_chat(db, pedido_id, uid, tipo)

    rows = db.execute(
        text("""
            SELECT id, id_pedido, remitente_id, remitente_tipo, mensaje, fecha_creacion, leido
            FROM mensajes_chat
            WHERE id_pedido = :pid
            ORDER BY fecha_creacion ASC
        """),
        {"pid": pedido_id},
    ).fetchall()

    return {"mensajes": [_serializar(r) for r in rows]}

@router.post("/{pedido_id}")
def enviar_mensaje(
    pedido_id: int,
    body: MensajeBody,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not body.mensaje.strip():
        raise HTTPException(status_code=400, detail="El mensaje no puede estar vacío")

    tipo = current_user.get("tipo_usuario")
    uid = _get_uid(current_user)
    _validar_acceso_chat(db, pedido_id, uid, tipo)

    db.execute(
        text("""
            INSERT INTO mensajes_chat (id_pedido, remitente_id, remitente_tipo, mensaje)
            VALUES (:pid, :uid, :tipo, :msg)
        """),
        {"pid": pedido_id, "uid": uid, "tipo": tipo, "msg": body.mensaje.strip()},
    )
    db.commit()

    if tipo == "empleado":
        receptor_tipo = "cliente"
    else:
        receptor_tipo = "empleado"

    return {"success": True, "receptor_tipo": receptor_tipo}

@router.put("/{pedido_id}/leer")
def marcar_leido(
    pedido_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tipo = current_user.get("tipo_usuario")
    uid = _get_uid(current_user)
    _validar_acceso_chat(db, pedido_id, uid, tipo)

    otro_tipo = "empleado" if tipo == "cliente" else "cliente"

    db.execute(
        text("""
            UPDATE mensajes_chat SET leido = TRUE
            WHERE id_pedido = :pid AND remitente_tipo = :otro AND leido = FALSE
        """),
        {"pid": pedido_id, "otro": otro_tipo},
    )
    db.commit()

    return {"success": True}

@router.websocket("/ws/{pedido_id}")
async def chat_websocket(
    ws: WebSocket,
    pedido_id: int,
    token: str = Query(...),
    db: Session = Depends(get_db),
):
    payload = verify_token(token)
    if not payload:
        await ws.close(code=4001, reason="Token inválido")
        return

    tipo = payload.get("tipo_usuario")
    uid = int(payload.get("id") or payload.get("sub", 0))

    try:
        _validar_acceso_chat(db, pedido_id, uid, tipo)
    except HTTPException as e:
        await ws.close(code=4003, reason=e.detail)
        return

    await manager.connect(pedido_id, ws)

    try:
        while True:
            raw = await ws.receive_text()
            data = json.loads(raw)
            msg_text = data.get("mensaje", "").strip()
            if not msg_text:
                continue

            db.execute(
                text("""
                    INSERT INTO mensajes_chat (id_pedido, remitente_id, remitente_tipo, mensaje)
                    VALUES (:pid, :uid, :tipo, :msg)
                """),
                {"pid": pedido_id, "uid": uid, "tipo": tipo, "msg": msg_text},
            )
            db.commit()

            row = db.execute(
                text("""
                    SELECT id, id_pedido, remitente_id, remitente_tipo, mensaje,
                           fecha_creacion, leido
                    FROM mensajes_chat
                    WHERE id_pedido = :pid
                    ORDER BY fecha_creacion DESC
                    LIMIT 1
                """),
                {"pid": pedido_id},
            ).fetchone()

            if row:
                msg_data = _serializar(row)
                await manager.broadcast(pedido_id, json.dumps(msg_data, ensure_ascii=False))

    except WebSocketDisconnect:
        manager.disconnect(pedido_id, ws)
    except Exception:
        manager.disconnect(pedido_id, ws)
