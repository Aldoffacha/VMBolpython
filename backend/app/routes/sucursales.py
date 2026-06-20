from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, Text, Boolean, Double, DateTime
from sqlalchemy.sql import func
import os, shutil, uuid

from app.database import Base, get_db
from app.utils.dependencies import require_role

router = APIRouter(tags=["sucursales"])

PUBLIC_PREFIX = "/api/sucursales"
ADMIN_PREFIX  = "/api/admin/sucursales"

UPLOAD_DIR = "uploads/sucursales"


class Sucursal(Base):
    __tablename__ = "sucursales"

    id_sucursal   = Column(Integer, primary_key=True, index=True)
    departamento  = Column(String(100), nullable=False)
    ciudad        = Column(String(100), nullable=False)
    direccion     = Column(Text, nullable=False)
    latitud       = Column(Double, nullable=False)
    longitud      = Column(Double, nullable=False)
    descripcion   = Column(Text)
    foto_url      = Column(String(255))
    activo        = Column(Boolean, default=True)
    created_at    = Column(DateTime, server_default=func.now())
    updated_at    = Column(DateTime, server_default=func.now(), onupdate=func.now())


def sucursal_to_dict(s):
    return {
        "id_sucursal":  s.id_sucursal,
        "departamento": s.departamento,
        "ciudad":       s.ciudad,
        "direccion":    s.direccion,
        "latitud":      s.latitud,
        "longitud":     s.longitud,
        "descripcion":  s.descripcion or "",
        "foto_url":     s.foto_url or "",
        "activo":       s.activo,
    }


# ── Público ────────────────────────────────────────

@router.get(f"{PUBLIC_PREFIX}")
def listar_sucursales(db: Session = Depends(get_db)):
    rows = db.query(Sucursal).filter(Sucursal.activo == True).order_by(Sucursal.departamento).all()
    return {"success": True, "sucursales": [sucursal_to_dict(r) for r in rows]}


@router.get(f"{PUBLIC_PREFIX}/{{id_sucursal}}")
def obtener_sucursal(id_sucursal: int, db: Session = Depends(get_db)):
    s = db.query(Sucursal).filter(Sucursal.id_sucursal == id_sucursal).first()
    if not s:
        raise HTTPException(404, "Sucursal no encontrada")
    return {"success": True, "sucursal": sucursal_to_dict(s)}


# ── Admin ───────────────────────────────────────────

@router.get(f"{ADMIN_PREFIX}")
def listar_todas(db: Session = Depends(get_db), current_user: dict = Depends(require_role("administrador"))):
    rows = db.query(Sucursal).order_by(Sucursal.departamento).all()
    return {"success": True, "sucursales": [sucursal_to_dict(r) for r in rows]}


@router.post(f"{ADMIN_PREFIX}")
async def crear_sucursal(
    departamento: str = Form(...),
    ciudad: str = Form(...),
    direccion: str = Form(...),
    latitud: float = Form(...),
    longitud: float = Form(...),
    descripcion: str = Form(""),
    foto: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("administrador")),
):
    foto_url = ""
    if foto and foto.filename:
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        ext = os.path.splitext(foto.filename)[1] or ".jpg"
        filename = f"{uuid.uuid4().hex}{ext}"
        filepath = os.path.join(UPLOAD_DIR, filename)
        with open(filepath, "wb") as f:
            shutil.copyfileobj(foto.file, f)
        foto_url = f"{UPLOAD_DIR}/{filename}"

    s = Sucursal(
        departamento=departamento,
        ciudad=ciudad,
        direccion=direccion,
        latitud=latitud,
        longitud=longitud,
        descripcion=descripcion,
        foto_url=foto_url,
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return {"success": True, "mensaje": "Sucursal creada", "sucursal": sucursal_to_dict(s)}


@router.put(f"{ADMIN_PREFIX}/{{id_sucursal}}")
async def actualizar_sucursal(
    id_sucursal: int,
    departamento: str = Form(...),
    ciudad: str = Form(...),
    direccion: str = Form(...),
    latitud: float = Form(...),
    longitud: float = Form(...),
    descripcion: str = Form(""),
    activo: bool = Form(True),
    foto: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("administrador")),
):
    s = db.query(Sucursal).filter(Sucursal.id_sucursal == id_sucursal).first()
    if not s:
        raise HTTPException(404, "Sucursal no encontrada")

    s.departamento = departamento
    s.ciudad = ciudad
    s.direccion = direccion
    s.latitud = latitud
    s.longitud = longitud
    s.descripcion = descripcion
    s.activo = activo

    if foto and foto.filename:
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        ext = os.path.splitext(foto.filename)[1] or ".jpg"
        filename = f"{uuid.uuid4().hex}{ext}"
        filepath = os.path.join(UPLOAD_DIR, filename)
        with open(filepath, "wb") as f:
            shutil.copyfileobj(foto.file, f)
        s.foto_url = f"{UPLOAD_DIR}/{filename}"

    db.commit()
    db.refresh(s)
    return {"success": True, "mensaje": "Sucursal actualizada", "sucursal": sucursal_to_dict(s)}


@router.delete(f"{ADMIN_PREFIX}/{{id_sucursal}}")
def eliminar_sucursal(
    id_sucursal: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("administrador")),
):
    s = db.query(Sucursal).filter(Sucursal.id_sucursal == id_sucursal).first()
    if not s:
        raise HTTPException(404, "Sucursal no encontrada")
    db.delete(s)
    db.commit()
    return {"success": True, "mensaje": "Sucursal eliminada"}
