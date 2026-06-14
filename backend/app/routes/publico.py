from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from datetime import datetime, timedelta

from app.database import get_db
from app.models.user import Producto, ProductoExterno

router = APIRouter(prefix="/publico", tags=["publico"])


def _img_url(imagen: str | None, nombre: str) -> str:
    if not imagen:
        placeholder = (nombre or "Producto")[:20].replace(" ", "+")
        return f"https://via.placeholder.com/300x200/2c7be5/ffffff?text={placeholder}"
    if imagen.startswith("http"):
        return imagen
    return f"http://localhost:8000/uploads/productos/{imagen}"


@router.get("/productos")
def productos_publicos(db: Session = Depends(get_db)):
    productos_locales = (
        db.query(Producto)
        .filter(Producto.estado == 1)
        .order_by(Producto.fecha_registro.desc())
        .limit(30)
        .all()
    )

    productos_externos = (
        db.query(ProductoExterno)
        .filter(ProductoExterno.estado == 1)
        .order_by(ProductoExterno.fecha_registro.desc())
        .limit(30)
        .all()
    )

    amazon = [p for p in productos_externos if p.plataforma == "amazon"][:12]
    ebay = [p for p in productos_externos if p.plataforma == "ebay"][:12]

    return {
        "productos_locales": [
            {
                "id_producto": p.id_producto,
                "nombre": p.nombre,
                "precio": float(p.precio),
                "imagen": p.imagen or "",
                "imagen_url": _img_url(p.imagen, p.nombre),
                "categoria": p.categoria or "otros",
                "tipo_cambio": float(p.tipo_cambio or 9.17),
            }
            for p in productos_locales
        ],
        "amazon": [
            {
                "id_producto_externo": p.id_producto_externo,
                "nombre": p.nombre,
                "precio": float(p.precio),
                "imagen_url": _img_url(p.imagen_url, p.nombre),
                "plataforma": "amazon",
                "categoria": p.categoria or "electronico",
                "peso": float(p.peso) if p.peso else 0.5,
                "enlace": p.enlace or "",
            }
            for p in amazon
        ],
        "ebay": [
            {
                "id_producto_externo": p.id_producto_externo,
                "nombre": p.nombre,
                "precio": float(p.precio),
                "imagen_url": _img_url(p.imagen_url, p.nombre),
                "plataforma": "ebay",
                "categoria": p.categoria or "electronico",
                "peso": float(p.peso) if p.peso else 0.5,
                "enlace": p.enlace or "",
            }
            for p in ebay
        ],
    }
