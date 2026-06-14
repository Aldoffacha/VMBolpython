from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import text
import os, uuid, shutil
from typing import Optional

from app.database import get_db
from app.models.user import Producto
from app.utils.dependencies import require_role
from app.utils.tipo_cambio import get_tipo_cambio

router = APIRouter(prefix="/admin/productos", tags=["admin-productos"])

UPLOAD_DIR = "uploads/productos"
os.makedirs(UPLOAD_DIR, exist_ok=True)

CATEGORIAS = [
  "gaming", "audio", "celulares", "computadoras", "fotografia",
  "ropa_hombre", "ropa_mujer", "calzado", "accesorios",
  "cocina", "dormitorio", "decoracion",
  "fitness", "futbol", "outdoor",
  "juguetes", "libros", "otros",
]


def registrar_auditoria(db, current_user):
    uid  = current_user.get("sub") or current_user.get("id") or 0
    tipo = current_user.get("tipo_usuario") or "administrador"
    db.execute(text("SET LOCAL app.usuario_id = :uid"),   {"uid":  int(uid)})
    db.execute(text("SET LOCAL app.tipo_usuario = :tipo"), {"tipo": tipo})
@router.get("")
def get_productos(
    pagina: int = Query(default=1, ge=1),
    por_pagina: int = Query(default=9),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("administrador"))
):
    query = db.query(Producto).filter(Producto.estado == 1)
    total = query.count()
    total_paginas = -(-total // por_pagina)
    offset = (pagina - 1) * por_pagina
    productos = query.order_by(Producto.id_producto.desc()).offset(offset).limit(por_pagina).all()

    return {
        "productos": [
            {
                "id_producto":    p.id_producto,
                "nombre":         p.nombre,
                "descripcion":    p.descripcion or "",
                "precio":         float(p.precio),
                "stock":          p.stock,
                "imagen":         p.imagen or "",
                "categoria":      p.categoria,
                "fecha_registro": p.fecha_registro.strftime("%d/%m/%Y"),
                "tipo_cambio":    float(p.tipo_cambio or 9.17),
            }
            for p in productos
        ],
        "total": total,
        "total_paginas": total_paginas,
        "pagina_actual": pagina,
    }


@router.post("")
async def crear_producto(
    nombre:      str           = Form(...),
    descripcion: str           = Form(""),
    precio:      float         = Form(...),
    stock:       int           = Form(0),
    categoria:   str           = Form("otros"),
    imagen:      Optional[UploadFile] = File(None),
    db:          Session       = Depends(get_db),
    current_user: dict         = Depends(require_role("administrador"))
):
    nombre_imagen = ""
    if imagen and imagen.filename:
        ext = imagen.filename.rsplit(".", 1)[-1].lower()
        if ext not in {"jpg", "jpeg", "png", "gif", "webp"}:
            raise HTTPException(status_code=400, detail="Formato de imagen no soportado. Use JPG, PNG, GIF o WEBP")
        nombre_imagen = f"{uuid.uuid4().hex}.{ext}"
        ruta = os.path.join(UPLOAD_DIR, nombre_imagen)
        with open(ruta, "wb") as f:
            shutil.copyfileobj(imagen.file, f)

    tc = get_tipo_cambio(db)
    nuevo = Producto(
        nombre=nombre, descripcion=descripcion,
        precio=precio, stock=stock,
        imagen=nombre_imagen, categoria=categoria,
        tipo_cambio=tc,
    )
    db.add(nuevo)
    registrar_auditoria(db, current_user)  # ← auditoría
    db.commit()
    db.refresh(nuevo)
    return {"mensaje": "Producto creado exitosamente", "id": nuevo.id_producto}


@router.put("/{id_producto}")
async def editar_producto(
    id_producto:   int,
    nombre:        str           = Form(...),
    descripcion:   str           = Form(""),
    precio:        float         = Form(...),
    stock:         int           = Form(0),
    categoria:     str           = Form("otros"),
    imagen_actual: str           = Form(""),
    imagen:        Optional[UploadFile] = File(None),
    db:            Session       = Depends(get_db),
    current_user:  dict          = Depends(require_role("administrador"))
):
    producto = db.query(Producto).filter(Producto.id_producto == id_producto).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    nombre_imagen = imagen_actual
    if imagen and imagen.filename:
        if imagen_actual:
            ruta_anterior = os.path.join(UPLOAD_DIR, imagen_actual)
            if os.path.exists(ruta_anterior):
                os.remove(ruta_anterior)
        ext = imagen.filename.rsplit(".", 1)[-1].lower()
        nombre_imagen = f"{uuid.uuid4().hex}.{ext}"
        ruta = os.path.join(UPLOAD_DIR, nombre_imagen)
        with open(ruta, "wb") as f:
            shutil.copyfileobj(imagen.file, f)

    if stock > producto.stock:
        producto.tipo_cambio = get_tipo_cambio(db)

    producto.nombre      = nombre
    producto.descripcion = descripcion
    producto.precio      = precio
    producto.stock       = stock
    producto.categoria   = categoria
    producto.imagen      = nombre_imagen

    registrar_auditoria(db, current_user)  # ← auditoría
    db.commit()
    return {"mensaje": "Producto actualizado exitosamente"}


@router.delete("/{id_producto}")
def eliminar_producto(
    id_producto:  int,
    db:           Session = Depends(get_db),
    current_user: dict    = Depends(require_role("administrador"))
):
    producto = db.query(Producto).filter(Producto.id_producto == id_producto).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    if producto.imagen:
        ruta = os.path.join(UPLOAD_DIR, producto.imagen)
        if os.path.exists(ruta):
            os.remove(ruta)

    producto.estado = 0
    registrar_auditoria(db, current_user)  # ← auditoría
    db.commit()
    return {"mensaje": "Producto eliminado exitosamente"}