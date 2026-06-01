from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime
from typing import Optional
import json, os, shutil, uuid

from app.database import get_db
from app.models.user import Configuracion, DepositoMiami, TiendaUSA, Auditoria
from app.utils.dependencies import require_role

router = APIRouter(prefix="/admin/configuracion", tags=["admin-configuracion"])

UPLOAD_QR = "uploads/qr"
os.makedirs(UPLOAD_QR, exist_ok=True)


def registrar_auditoria(db, tabla, id_registro, accion, datos_nuevos, datos_anteriores, id_usuario):
    try:
        audit = Auditoria(
            tabla_afectada=tabla,
            id_registro=id_registro,
            accion=accion,
            datos_anteriores=json.dumps(datos_anteriores) if datos_anteriores else None,
            datos_nuevos=json.dumps(datos_nuevos) if datos_nuevos else None,
            id_usuario=id_usuario,
            tipo_usuario="admin",
        )
        db.add(audit)
        db.flush()
    except Exception as e:
        print(f"Error auditoría: {e}")


# ─────────────────────────────────────────────
#  GET - Obtener configuración completa
# ─────────────────────────────────────────────

@router.get("")
def get_configuracion(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("administrador"))
):
    config = db.query(Configuracion).filter(Configuracion.id == 1).first()
    if not config:
        config = Configuracion(
            id=1,
            nombre_empresa="VMBol en Red",
            email_contacto="info@vmbol.com",
            telefono_contacto="+591 777 12345",
            moneda="USD",
        )
        db.add(config)
        db.commit()
        db.refresh(config)

    depositos = db.query(DepositoMiami).filter(DepositoMiami.estado == 1).all()
    tiendas   = db.query(TiendaUSA).filter(TiendaUSA.estado == 1).all()

    return {
        "config": {
            "nombre_empresa":    config.nombre_empresa,
            "email_contacto":    config.email_contacto,
            "telefono_contacto": config.telefono_contacto,
            "moneda":            config.moneda,
            "qr_filename":       config.qr_filename or "",
        },
        "depositos": [
            {
                "id_deposito":    d.id_deposito,
                "nombre_deposito": d.nombre_deposito,
                "direccion":      d.direccion,
                "telefono":       d.telefono,
                "contacto":       d.contacto,
            }
            for d in depositos
        ],
        "tiendas": [
            {
                "id_tienda":     t.id_tienda,
                "nombre_tienda": t.nombre_tienda,
                "url_tienda":    t.url_tienda,
                "tipo":          t.tipo,
            }
            for t in tiendas
        ],
    }


# ─────────────────────────────────────────────
#  PUT - Guardar configuración general
# ─────────────────────────────────────────────

@router.put("/general")
def guardar_general(
    nombre_empresa:    str = Form(...),
    email_contacto:    str = Form(...),
    telefono_contacto: str = Form(...),
    moneda:            str = Form(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("administrador"))
):
    config = db.query(Configuracion).filter(Configuracion.id == 1).first()
    if not config:
        raise HTTPException(404, "Configuración no encontrada")

    anteriores = {
        "nombre_empresa":    config.nombre_empresa,
        "email_contacto":    config.email_contacto,
        "telefono_contacto": config.telefono_contacto,
        "moneda":            config.moneda,
    }

    config.nombre_empresa    = nombre_empresa
    config.email_contacto    = email_contacto
    config.telefono_contacto = telefono_contacto
    config.moneda            = moneda
    
    db.commit()

    try:
        registrar_auditoria(db, "configuracion", 1, "UPDATE",
            datos_nuevos={"nombre_empresa": nombre_empresa},
            datos_anteriores=anteriores,
            id_usuario=current_user.get("id") or 0
        )
    except Exception as e:
        print("Error auditoria:", e)

    return {"ok": True, "mensaje": "Configuración guardada correctamente"}


# ─────────────────────────────────────────────
#  POST - Subir QR
# ─────────────────────────────────────────────

@router.post("/qr")
async def actualizar_qr(
    qr_image: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("administrador"))
):
    allowed = ["image/jpeg", "image/png", "image/webp"]
    if qr_image.content_type not in allowed:
        raise HTTPException(400, "Formato no soportado. Use JPG, PNG o WEBP")

    contenido = await qr_image.read()
    if len(contenido) > 2 * 1024 * 1024:
        raise HTTPException(400, "El archivo supera el límite de 2MB")

    ext      = qr_image.filename.rsplit(".", 1)[-1].lower()
    filename = f"qr_{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(UPLOAD_QR, filename)

    with open(filepath, "wb") as f:
        f.write(contenido)

    config = db.query(Configuracion).filter(Configuracion.id == 1).first()
    if config:
        # Borrar QR anterior si existe
        if config.qr_filename:
            viejo = os.path.join(UPLOAD_QR, config.qr_filename)
            if os.path.exists(viejo):
                os.remove(viejo)
        config.qr_filename = filename
        db.commit()

    registrar_auditoria(db, "configuracion", 1, "UPDATE",
        datos_nuevos={"qr_filename": filename},
        datos_anteriores=None,
        id_usuario=current_user.get("id") or 0
    )

    return {"ok": True, "qr_filename": filename, "mensaje": "QR actualizado correctamente"}


# ─────────────────────────────────────────────
#  POST - Agregar depósito
# ─────────────────────────────────────────────

@router.post("/depositos")
def agregar_deposito(
    nombre_deposito: str = Form(...),
    direccion:       str = Form(...),
    telefono:        str = Form(""),
    contacto:        str = Form(""),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("administrador"))
):
    dep = DepositoMiami(
        nombre_deposito=nombre_deposito,
        direccion=direccion,
        telefono=telefono,
        contacto=contacto,
        estado=1,
    )
    db.add(dep)
    db.commit()
    db.refresh(dep)

    registrar_auditoria(db, "depositos_miami", dep.id_deposito, "INSERT",
        datos_nuevos={"nombre_deposito": nombre_deposito, "direccion": direccion,
                      "telefono": telefono, "contacto": contacto},
        datos_anteriores=None,
        id_usuario=current_user.get("id") or 0
    )

    return {"ok": True, "id_deposito": dep.id_deposito, "mensaje": "Depósito agregado correctamente"}


# ─────────────────────────────────────────────
#  DELETE - Eliminar depósito
# ─────────────────────────────────────────────

@router.delete("/depositos/{id_deposito}")
def eliminar_deposito(
    id_deposito: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("administrador"))
):
    dep = db.query(DepositoMiami).filter(DepositoMiami.id_deposito == id_deposito).first()
    if not dep:
        raise HTTPException(404, "Depósito no encontrado")
    dep.estado = 0
    db.commit()

    registrar_auditoria(db, "depositos_miami", id_deposito, "DELETE",
        datos_nuevos={"estado": 0},
        datos_anteriores={"nombre_deposito": dep.nombre_deposito},
        id_usuario=current_user.get("id") or 0
    )
    return {"ok": True, "mensaje": "Depósito eliminado"}


# ─────────────────────────────────────────────
#  POST - Agregar tienda
# ─────────────────────────────────────────────

@router.post("/tiendas")
def agregar_tienda(
    nombre_tienda: str = Form(...),
    url_tienda:    str = Form(""),
    tipo:          str = Form(...),
    api_key:       str = Form(""),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("administrador"))
):
    tienda = TiendaUSA(
        nombre_tienda=nombre_tienda,
        url_tienda=url_tienda,
        tipo=tipo,
        api_key=api_key,
        estado=1,
    )
    db.add(tienda)
    db.commit()
    db.refresh(tienda)

    registrar_auditoria(db, "tiendas_usa", tienda.id_tienda, "INSERT",
        datos_nuevos={"nombre_tienda": nombre_tienda, "url_tienda": url_tienda,
                      "tipo": tipo, "api_key": "***" if api_key else ""},
        datos_anteriores=None,
        id_usuario=current_user.get("id") or 0
    )

    return {"ok": True, "id_tienda": tienda.id_tienda, "mensaje": "Tienda agregada correctamente"}


# ─────────────────────────────────────────────
#  DELETE - Eliminar tienda
# ─────────────────────────────────────────────

@router.delete("/tiendas/{id_tienda}")
def eliminar_tienda(
    id_tienda: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("administrador"))
):
    tienda = db.query(TiendaUSA).filter(TiendaUSA.id_tienda == id_tienda).first()
    if not tienda:
        raise HTTPException(404, "Tienda no encontrada")
    tienda.estado = 0
    db.commit()

    registrar_auditoria(db, "tiendas_usa", id_tienda, "DELETE",
        datos_nuevos={"estado": 0},
        datos_anteriores={"nombre_tienda": tienda.nombre_tienda},
        id_usuario=current_user.get("id") or 0
    )
    return {"ok": True, "mensaje": "Tienda eliminada"}