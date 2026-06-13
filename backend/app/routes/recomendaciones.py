from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel

from app.database import get_db
from app.services.recomendaciones import (
    obtener_recomendaciones,
    obtener_recomendaciones_por_carrito,
    obtener_todas_las_reglas,
    entrenar_modelo,
)

router = APIRouter(prefix="/api/recomendaciones", tags=["recomendaciones"])


class CarritoRequest(BaseModel):
    product_ids: list[int]


@router.get("/producto/{id_producto}")
def recomendaciones_por_producto(
    id_producto: int,
    top_n: int = Query(default=5, ge=1, le=20),
    db: Session = Depends(get_db),
):
    from app.models.user import Producto
    producto = db.query(Producto).filter(Producto.id_producto == id_producto, Producto.estado == 1).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    recomendaciones = obtener_recomendaciones(id_producto, db, top_n)
    return {
        "producto_base": {
            "id_producto": producto.id_producto,
            "nombre": producto.nombre,
            "categoria": producto.categoria,
        },
        "recomendaciones": recomendaciones,
        "total": len(recomendaciones),
    }


@router.post("/carrito")
def recomendaciones_por_carrito(
    body: CarritoRequest,
    top_n: int = Query(default=5, ge=1, le=20),
    db: Session = Depends(get_db),
):
    if not body.product_ids:
        raise HTTPException(status_code=400, detail="La lista de productos no puede estar vacía")

    from app.models.user import Producto
    productos_en_db = db.query(Producto).filter(
        Producto.id_producto.in_(body.product_ids),
        Producto.estado == 1,
    ).all()

    if not productos_en_db:
        raise HTTPException(status_code=404, detail="Ningún producto válido encontrado")

    recomendaciones = obtener_recomendaciones_por_carrito(body.product_ids, db, top_n)
    return {
        "productos_base": [{"id_producto": p.id_producto, "nombre": p.nombre} for p in productos_en_db],
        "recomendaciones": recomendaciones,
        "total": len(recomendaciones),
    }


@router.get("/reglas")
def reglas_asociacion(
    force: bool = Query(default=False),
    db: Session = Depends(get_db),
):
    reglas = obtener_todas_las_reglas(db, force=force)
    return {
        "reglas": reglas,
        "total": len(reglas),
    }


@router.post("/entrenar")
def reentrenar_modelo(
    db: Session = Depends(get_db),
):
    rules = entrenar_modelo(db, force=True)
    return {
        "success": True,
        "total_reglas": len(rules),
        "mensaje": f"Modelo re-entrenado: {len(rules)} reglas generadas",
    }


@router.get("/stats")
def stats_modelo(
    db: Session = Depends(get_db),
):
    rows = db.execute(
        text("""
            SELECT
                categoria,
                origen,
                COUNT(*) as total_reglas,
                ROUND(AVG(support)::numeric, 6) as avg_support,
                ROUND(AVG(confidence)::numeric, 6) as avg_confidence,
                ROUND(AVG(lift)::numeric, 6) as avg_lift,
                ROUND(AVG(score)::numeric, 6) as avg_score,
                MAX(created_at) as ultimo_entreno
            FROM reglas_asociacion
            GROUP BY categoria, origen
            ORDER BY categoria, origen
        """)
    ).fetchall()

    stats = []
    for r in rows:
        stats.append({
            "categoria": r.categoria,
            "origen": r.origen,
            "total_reglas": r.total_reglas,
            "avg_support": float(r.avg_support) if r.avg_support else 0,
            "avg_confidence": float(r.avg_confidence) if r.avg_confidence else 0,
            "avg_lift": float(r.avg_lift) if r.avg_lift else 0,
            "avg_score": float(r.avg_score) if r.avg_score else 0,
            "ultimo_entreno": str(r.ultimo_entreno) if r.ultimo_entreno else None,
        })

    return {
        "stats": stats,
        "total_modelos": len(stats),
    }
