from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from pydantic import BaseModel
from datetime import datetime
import json
from app.database import get_db
from app.models.user import Pedido, PedidoDetalle, Cliente, Producto, Auditoria, Notificacion
from app.utils.dependencies import require_role

router = APIRouter(prefix="/admin/pedidos", tags=["admin-pedidos"])

ESTADOS_VALIDOS = ["pendiente", "pagado", "enviado", "cancelado"]

TRANSICIONES_VALIDAS = {
    "pendiente":  ["pagado", "cancelado"],
    "pagado":     ["enviado"],
    "enviado":    [],
    "cancelado":  ["pendiente"],
}
def registrar_auditoria(db, current_user):
    uid  = current_user.get("sub") or current_user.get("id") or 0
    tipo = current_user.get("tipo_usuario") or "administrador"
    db.execute(text("SET LOCAL app.usuario_id = :uid"),   {"uid":  int(uid)})
    db.execute(text("SET LOCAL app.tipo_usuario = :tipo"), {"tipo": tipo})
# ─────────────────────────────────────────────
#  LISTAR CON FILTRO
# ─────────────────────────────────────────────

@router.get("")
def get_pedidos(
    estado: str = Query(default="todos"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("administrador"))
):
    query = (
        db.query(Pedido, Cliente.nombre.label("cliente_nombre"), Cliente.correo.label("cliente_email"))
        .join(Cliente, Pedido.id_cliente == Cliente.id_cliente)
    )

    if estado != "todos" and estado in ESTADOS_VALIDOS:
        query = query.filter(Pedido.estado == estado)

    pedidos_raw = query.order_by(Pedido.fecha.desc(), Pedido.id_pedido.desc()).all()

    # Contadores
    contadores_raw = (
        db.query(Pedido.estado, func.count(Pedido.id_pedido))
        .group_by(Pedido.estado)
        .all()
    )
    contadores = {"total": 0, "pendiente": 0, "pagado": 0, "enviado": 0, "cancelado": 0}
    for est, cnt in contadores_raw:
        if est in contadores:
            contadores[est] = cnt
            contadores["total"] += cnt

    return {
        "contadores": contadores,
        "pedidos": [
            {
                "id_pedido":         p.Pedido.id_pedido,
                "id_cliente":        p.Pedido.id_cliente,
                "cliente_nombre":    p.cliente_nombre,
                "cliente_email":     p.cliente_email,
                "total":             float(p.Pedido.total),
                "estado":            p.Pedido.estado,
                "fecha":             p.Pedido.fecha.strftime("%d/%m/%Y %H:%M:%S"),
                "siguientes_estados": TRANSICIONES_VALIDAS.get(p.Pedido.estado, []),
            }
            for p in pedidos_raw
        ]
    }


# ─────────────────────────────────────────────
#  DETALLE DE UN PEDIDO
# ─────────────────────────────────────────────

@router.get("/{id_pedido}")
def get_detalle_pedido(
    id_pedido: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("administrador"))
):
    pedido = (
        db.query(Pedido, Cliente.nombre.label("cliente_nombre"), Cliente.correo.label("cliente_email"),
                 Cliente.telefono, Cliente.direccion)
        .join(Cliente, Pedido.id_cliente == Cliente.id_cliente)
        .filter(Pedido.id_pedido == id_pedido)
        .first()
    )
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    # ✅ Usamos raw SQL para traer tipo_producto y datos_externos
    # que el ORM no incluía antes
    detalles = db.execute(
        text("""
            SELECT
                pd.id_detalle,
                pd.cantidad,
                pd.precio,
                pd.tipo_producto,
                pd.datos_externos,
                p.nombre AS producto_nombre
            FROM pedido_detalles pd
            LEFT JOIN productos p ON pd.id_producto = p.id_producto
            WHERE pd.id_pedido = :pid
            ORDER BY pd.id_detalle
        """),
        {"pid": id_pedido}
    ).fetchall()

    productos_lista = []
    for d in detalles:
        tipo      = d.tipo_producto or "local"
        datos_ext = d.datos_externos  # puede ser dict (jsonb) o string

        # Normalizar datos_externos a dict
        if isinstance(datos_ext, str):
            try:
                datos_ext = json.loads(datos_ext)
            except Exception:
                datos_ext = {}
        elif datos_ext is None:
            datos_ext = {}

        # Nombre: si es externo usa datos_externos, si no el nombre del producto local
        if tipo == "externo":
            nombre = datos_ext.get("nombre") or d.producto_nombre or "Producto externo"
        else:
            nombre = d.producto_nombre or f"Producto #{d.id_detalle}"

        productos_lista.append({
            "nombre":          nombre,
            "tipo_producto":   tipo,
            "cantidad":        d.cantidad,
            "precio_unit":     float(d.precio),
            "subtotal":        float(d.cantidad * d.precio),
            # ✅ Datos extra para productos externos
            "datos_externos":  datos_ext,   # dict completo por si el frontend necesita más campos
            "url":             datos_ext.get("url") or datos_ext.get("enlace") or None,
            "plataforma":      datos_ext.get("plataforma") or ("local" if tipo == "local" else "otros"),
        })

    return {
        "pedido": {
            "id_pedido":      pedido.Pedido.id_pedido,
            "id_cliente":     pedido.Pedido.id_cliente,
            "cliente_nombre": pedido.cliente_nombre,
            "cliente_email":  pedido.cliente_email,
            "telefono":       pedido.telefono or "No especificado",
            "direccion":      pedido.direccion or "No especificada",
            "total":          float(pedido.Pedido.total),
            "estado":         pedido.Pedido.estado,
            "fecha":          pedido.Pedido.fecha.strftime("%d/%m/%Y %H:%M:%S"),
        },
        "productos": productos_lista,
    }


# ─────────────────────────────────────────────
#  ACTUALIZAR ESTADO
# ─────────────────────────────────────────────

class CambioEstado(BaseModel):
    estado: str

@router.put("/{id_pedido}/estado")
def actualizar_estado(
    id_pedido: int,
    body: CambioEstado,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("administrador"))
):
    nuevo_estado = body.estado
    if nuevo_estado not in ESTADOS_VALIDOS:
        raise HTTPException(status_code=400, detail="Estado no válido")

    pedido = db.query(Pedido).filter(Pedido.id_pedido == id_pedido).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    if nuevo_estado not in TRANSICIONES_VALIDAS.get(pedido.estado, []):
        raise HTTPException(
            status_code=400,
            detail=f"No se puede cambiar de '{pedido.estado}' a '{nuevo_estado}'"
        )

    estado_anterior = pedido.estado
    pedido.estado = nuevo_estado

    # Notificación al cliente
    try:
        notif = Notificacion(
            id_usuario=pedido.id_cliente,
            tipo_usuario="cliente",
            titulo=f"Estado de tu pedido #{id_pedido} actualizado",
            mensaje=f"Tu pedido #{id_pedido} ha cambiado de estado: {estado_anterior} → {nuevo_estado}",
            tipo="pedido",
        )
        db.add(notif)
    except Exception:
        pass

    # Auditoría
    registrar_auditoria(db, current_user)  # ← auditoría
    db.commit()

    return {"mensaje": f"Pedido #{id_pedido} actualizado a '{nuevo_estado}'", "estado": nuevo_estado}