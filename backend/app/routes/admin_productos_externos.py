from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.utils.dependencies import require_role
from app.utils.tipo_cambio import get_tipo_cambio

router = APIRouter(prefix="/admin/productos-externos", tags=["admin-productos-externos"])


def registrar_auditoria(db, current_user):
    uid  = current_user.get("sub") or current_user.get("id") or 0
    tipo = current_user.get("tipo_usuario") or "administrador"
    db.execute(text("SET LOCAL app.usuario_id = :uid"),   {"uid":  int(uid)})
    db.execute(text("SET LOCAL app.tipo_usuario = :tipo"), {"tipo": tipo})

class ProductoExternoBody(BaseModel):
    nombre:      str
    precio:      float
    descripcion: str
    categoria:   str
    peso:        Optional[float] = 0.5
    enlace:      str
    imagen:      Optional[str]  = ""
    plataforma:  Optional[str]  = "amazon"
    destacado:   Optional[int]  = 1
    estado:      Optional[int]  = 1


@router.get("")
def listar_productos_externos(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("administrador")),
):
    rows = db.execute(text("""
        SELECT id_producto_exterior, nombre, descripcion, precio, peso,
               categoria, plataforma, enlace, imagen, destacado, estado,
               fecha_agregado, tipo_cambio
        FROM productos_exterior
        ORDER BY fecha_agregado DESC
        LIMIT 100
    """)).fetchall()

    productos = []
    for r in rows:
        d = dict(r._mapping)
        if d.get("fecha_agregado"):
            d["fecha_agregado"] = str(d["fecha_agregado"])
        productos.append(d)

    return {"productos": productos, "total": len(productos)}


@router.post("")
def crear_producto_externo(
    body: ProductoExternoBody,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("administrador")),
):
    plataforma = body.plataforma
    if body.enlace:
        if "amazon" in body.enlace.lower():   plataforma = "amazon"
        elif "ebay" in body.enlace.lower():   plataforma = "ebay"

    tc = get_tipo_cambio(db)
    result = db.execute(text("""
        INSERT INTO productos_exterior
            (nombre, descripcion, precio, peso, categoria, plataforma,
             enlace, imagen, destacado, estado, fecha_agregado, tipo_cambio)
        VALUES
            (:nombre, :descripcion, :precio, :peso, :categoria, :plataforma,
             :enlace, :imagen, :destacado, :estado, NOW(), :tc)
        RETURNING id_producto_exterior
    """), {
        "nombre": body.nombre, "descripcion": body.descripcion,
        "precio": body.precio, "peso": body.peso or 0.5,
        "categoria": body.categoria, "plataforma": plataforma,
        "enlace": body.enlace, "imagen": body.imagen or "",
        "destacado": body.destacado if body.destacado is not None else 1,
        "estado": body.estado if body.estado is not None else 1,
        "tc": tc,
    }).fetchone()

    registrar_auditoria(db, current_user)  # ← auditoría
    db.commit()

    return {"success": True, "message": "Producto externo creado correctamente",
            "id_producto_exterior": result.id_producto_exterior}


@router.put("/{id_producto_exterior}")
def actualizar_producto_externo(
    id_producto_exterior: int,
    body: ProductoExternoBody,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("administrador")),
):
    existe = db.execute(
        text("SELECT id_producto_exterior FROM productos_exterior WHERE id_producto_exterior = :id"),
        {"id": id_producto_exterior}
    ).fetchone()
    if not existe:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    plataforma = body.plataforma or "amazon"
    if body.enlace:
        if "amazon" in body.enlace.lower():   plataforma = "amazon"
        elif "ebay" in body.enlace.lower():   plataforma = "ebay"

    tc = get_tipo_cambio(db)
    db.execute(text("""
        UPDATE productos_exterior SET
            nombre=:nombre, descripcion=:descripcion, precio=:precio,
            peso=:peso, categoria=:categoria, plataforma=:plataforma,
            enlace=:enlace, imagen=:imagen, destacado=:destacado,
            estado=:estado, fecha_actualizacion=NOW(), tipo_cambio=:tc
        WHERE id_producto_exterior = :id
    """), {
        "id": id_producto_exterior,
        "nombre": body.nombre, "descripcion": body.descripcion,
        "precio": body.precio, "peso": body.peso or 0.5,
        "categoria": body.categoria, "plataforma": plataforma,
        "enlace": body.enlace, "imagen": body.imagen or "",
        "destacado": body.destacado if body.destacado is not None else 1,
        "estado": body.estado if body.estado is not None else 1,
        "tc": tc,
    })

    registrar_auditoria(db, current_user)  # ← auditoría
    db.commit()

    return {"success": True, "message": "Producto actualizado correctamente"}


@router.delete("/{id_producto_exterior}")
def eliminar_producto_externo(
    id_producto_exterior: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("administrador")),
):
    existe = db.execute(
        text("SELECT id_producto_exterior FROM productos_exterior WHERE id_producto_exterior = :id"),
        {"id": id_producto_exterior}
    ).fetchone()
    if not existe:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    db.execute(
        text("UPDATE productos_exterior SET estado = 0 WHERE id_producto_exterior = :id"),
        {"id": id_producto_exterior}
    )

    registrar_auditoria(db, current_user)  # ← auditoría
    db.commit()

    return {"success": True, "message": "Producto eliminado correctamente"}