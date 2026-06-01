from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.utils.dependencies import get_current_user, require_role

router = APIRouter(prefix="/empleado", tags=["empleado"])

ESTADOS_ENTREGA_VALIDOS = ["aceptado", "en_camino", "entregado"]
TRANSICIONES_ENTREGA = {
    "sin_asignar": ["aceptado"],
    "aceptado":    ["en_camino"],
    "en_camino":   ["entregado"],
    "entregado":   [],
}

def get_uid(current_user: dict) -> int:
    uid = current_user.get("id") or current_user.get("sub")
    if not uid:
        raise HTTPException(status_code=401, detail="No se pudo identificar al usuario")
    return int(uid)

# ─── PEDIDOS: DISPONIBLES + ASIGNADOS ────────────────────────

@router.get("/pedidos")
def listar_pedidos(
    current_user: dict = Depends(require_role("empleado")),
    db: Session = Depends(get_db),
):
    uid = get_uid(current_user)

    disponibles = db.execute(
        text("""
            SELECT
                p.id_pedido, p.total, p.estado, p.fecha,
                p.estado_entrega, p.tipo_pedido,
                c.nombre AS cliente_nombre, c.correo AS cliente_email,
                c.telefono AS cliente_telefono, c.direccion AS cliente_direccion,
                ue.direccion_entrega, ue.latitud, ue.longitud,
                ue.referencia, ue.nombre_receptor, ue.telefono_receptor
            FROM pedidos p
            JOIN clientes c ON p.id_cliente = c.id_cliente
            LEFT JOIN ubicacion_entrega ue ON p.id_pedido = ue.id_pedido
            WHERE p.estado_entrega = 'sin_asignar'
              AND p.estado NOT IN ('cancelado')
            ORDER BY p.fecha ASC
        """),
    ).fetchall()

    mis_pedidos = db.execute(
        text("""
            SELECT
                p.id_pedido, p.total, p.estado, p.fecha,
                p.estado_entrega, p.tipo_pedido,
                c.nombre AS cliente_nombre, c.correo AS cliente_email,
                c.telefono AS cliente_telefono, c.direccion AS cliente_direccion,
                ue.direccion_entrega, ue.latitud, ue.longitud,
                ue.referencia, ue.nombre_receptor, ue.telefono_receptor,
                pe.estado AS asignacion_estado, pe.fecha_asignacion
            FROM pedidos p
            JOIN clientes c ON p.id_cliente = c.id_cliente
            JOIN pedido_empleado pe ON p.id_pedido = pe.id_pedido AND pe.id_empleado = :uid
            LEFT JOIN ubicacion_entrega ue ON p.id_pedido = ue.id_pedido
            WHERE p.estado NOT IN ('cancelado')
            ORDER BY pe.fecha_asignacion DESC
        """),
        {"uid": uid},
    ).fetchall()

    def serializar(row):
        d = dict(row._mapping)
        if d.get("fecha"):
            d["fecha"] = d["fecha"].isoformat()
        if d.get("fecha_asignacion"):
            d["fecha_asignacion"] = d["fecha_asignacion"].isoformat()
        return d

    return {
        "disponibles": [serializar(r) for r in disponibles],
        "mis_pedidos": [serializar(r) for r in mis_pedidos],
        "total_disponibles": len(disponibles),
        "total_asignados": len(mis_pedidos),
    }

# ─── ASIGNAR PEDIDO A SÍ MISMO ──────────────────────────────

@router.post("/pedidos/{id_pedido}/asignar")
def asignar_pedido(
    id_pedido: int,
    current_user: dict = Depends(require_role("empleado")),
    db: Session = Depends(get_db),
):
    uid = get_uid(current_user)

    pedido = db.execute(
        text("SELECT * FROM pedidos WHERE id_pedido = :pid"),
        {"pid": id_pedido},
    ).fetchone()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    if pedido.estado_entrega != "sin_asignar":
        raise HTTPException(status_code=400, detail="El pedido ya está asignado o en curso")

    ya_asignado = db.execute(
        text("SELECT id FROM pedido_empleado WHERE id_pedido = :pid AND id_empleado = :uid"),
        {"pid": id_pedido, "uid": uid},
    ).fetchone()
    if ya_asignado:
        raise HTTPException(status_code=400, detail="Ya tienes este pedido asignado")

    db.execute(
        text("""
            INSERT INTO pedido_empleado (id_pedido, id_empleado, estado, fecha_asignacion)
            VALUES (:pid, :uid, 'asignado', NOW())
        """),
        {"pid": id_pedido, "uid": uid},
    )

    db.execute(
        text("""
            UPDATE pedidos SET estado_entrega = 'aceptado'
            WHERE id_pedido = :pid
        """),
        {"pid": id_pedido},
    )

    db.execute(
        text("""
            INSERT INTO pedido_seguimiento (id_pedido, id_empleado, estado_entrega, fecha_inicio)
            VALUES (:pid, :uid, 'aceptado', NOW())
        """),
        {"pid": id_pedido, "uid": uid},
    )

    db.commit()

    return {"success": True, "message": "Pedido asignado correctamente", "estado_entrega": "aceptado"}

# ─── ACTUALIZAR ESTADO DE ENTREGA ────────────────────────────

class EstadoBody(BaseModel):
    estado: str

@router.put("/pedidos/{id_pedido}/estado")
def actualizar_estado_entrega(
    id_pedido: int,
    body: EstadoBody,
    current_user: dict = Depends(require_role("empleado")),
    db: Session = Depends(get_db),
):
    uid = get_uid(current_user)
    nuevo = body.estado

    if nuevo not in ESTADOS_ENTREGA_VALIDOS:
        raise HTTPException(status_code=400, detail=f"Estado inválido: {nuevo}")

    pedido = db.execute(
        text("SELECT * FROM pedidos WHERE id_pedido = :pid"),
        {"pid": id_pedido},
    ).fetchone()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    asignacion = db.execute(
        text("""
            SELECT * FROM pedido_empleado
            WHERE id_pedido = :pid AND id_empleado = :uid
        """),
        {"pid": id_pedido, "uid": uid},
    ).fetchone()
    if not asignacion:
        raise HTTPException(status_code=403, detail="No tienes este pedido asignado")

    actual = pedido.estado_entrega
    transiciones = TRANSICIONES_ENTREGA.get(actual, [])
    if nuevo not in transiciones:
        raise HTTPException(
            status_code=400,
            detail=f"No se puede cambiar de '{actual}' a '{nuevo}'"
        )

    db.execute(
        text("UPDATE pedidos SET estado_entrega = :est WHERE id_pedido = :pid"),
        {"est": nuevo, "pid": id_pedido},
    )

    if nuevo == "entregado":
        db.execute(
            text("""
                UPDATE pedido_seguimiento
                SET estado_entrega = 'entregado', fecha_entrega = NOW()
                WHERE id_pedido = :pid AND id_empleado = :uid
            """),
            {"pid": id_pedido, "uid": uid},
        )
        db.execute(
            text("UPDATE pedido_empleado SET estado = 'completado' WHERE id_pedido = :pid AND id_empleado = :uid"),
            {"pid": id_pedido, "uid": uid},
        )
    else:
        db.execute(
            text("""
                UPDATE pedido_seguimiento
                SET estado_entrega = :est
                WHERE id_pedido = :pid AND id_empleado = :uid
            """),
            {"est": nuevo, "pid": id_pedido, "uid": uid},
        )

    db.commit()

    return {"success": True, "message": f"Estado actualizado a '{nuevo}'", "estado_entrega": nuevo}

# ─── ENVIAR UBICACIÓN GPS ────────────────────────────────────

class UbicacionBody(BaseModel):
    id_pedido: int
    latitud: float
    longitud: float
    velocidad: Optional[float] = 0
    direccion_movimiento: Optional[float] = None
    precision_gps: Optional[float] = None
    bateria: Optional[int] = None

@router.post("/ubicacion")
def enviar_ubicacion(
    body: UbicacionBody,
    current_user: dict = Depends(require_role("empleado")),
    db: Session = Depends(get_db),
):
    uid = get_uid(current_user)

    db.execute(
        text("""
            INSERT INTO ubicacion_empleado
                (id_empleado, id_pedido, latitud, longitud,
                 activo, velocidad, direccion_movimiento,
                 precision_gps, bateria)
            VALUES
                (:uid, :pid, :lat, :lng, true,
                 :vel, :dir, :prec, :bat)
        """),
        {
            "uid": uid,
            "pid": body.id_pedido,
            "lat": body.latitud,
            "lng": body.longitud,
            "vel": body.velocidad,
            "dir": body.direccion_movimiento,
            "prec": body.precision_gps,
            "bat": body.bateria,
        },
    )

    db.execute(
        text("""
            DELETE FROM ubicacion_empleado_temporal WHERE id_empleado = :uid
        """),
        {"uid": uid},
    )
    db.execute(
        text("""
            INSERT INTO ubicacion_empleado_temporal
                (id_empleado, latitud, longitud)
            VALUES (:uid, :lat, :lng)
        """),
        {"uid": uid, "lat": body.latitud, "lng": body.longitud},
    )

    db.execute(
        text("""
            INSERT INTO empleado_ubicaciones_tracking
                (id_empleado, id_pedido, latitud, longitud)
            VALUES (:uid, :pid, :lat, :lng)
        """),
        {"uid": uid, "pid": body.id_pedido, "lat": body.latitud, "lng": body.longitud},
    )

    db.commit()

    return {"success": True, "message": "Ubicación registrada"}

# ─── PERFIL DEL EMPLEADO ─────────────────────────────────────

@router.get("/perfil")
def obtener_perfil(
    current_user: dict = Depends(require_role("empleado")),
    db: Session = Depends(get_db),
):
    uid = get_uid(current_user)

    empleado = db.execute(
        text("""
            SELECT id_empleado, nombre, correo, telefono, estado, fecha_registro
            FROM empleados WHERE id_empleado = :uid
        """),
        {"uid": uid},
    ).fetchone()
    if not empleado:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    d = dict(empleado._mapping)
    if d.get("fecha_registro"):
        d["fecha_registro"] = d["fecha_registro"].isoformat()

    stats = {}

    stats["pedidos_completados"] = db.execute(
        text("""
            SELECT COUNT(*) FROM pedido_empleado
            WHERE id_empleado = :uid AND estado = 'completado'
        """),
        {"uid": uid},
    ).scalar() or 0

    stats["pedidos_en_curso"] = db.execute(
        text("""
            SELECT COUNT(*) FROM pedido_empleado
            WHERE id_empleado = :uid AND estado = 'asignado'
        """),
        {"uid": uid},
    ).scalar() or 0

    stats["total_asignados"] = db.execute(
        text("""
            SELECT COUNT(*) FROM pedido_empleado
            WHERE id_empleado = :uid
        """),
        {"uid": uid},
    ).scalar() or 0

    stats["total_hoy"] = db.execute(
        text("""
            SELECT COUNT(*) FROM pedido_empleado
            WHERE id_empleado = :uid
              AND DATE(fecha_asignacion) = CURRENT_DATE
        """),
        {"uid": uid},
    ).scalar() or 0

    d["stats"] = stats

    return d
