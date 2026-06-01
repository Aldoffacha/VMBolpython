from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, text

from app.database import get_db
from app.models.user import Pago, Pedido, Cliente
from app.utils.dependencies import require_role

router = APIRouter(prefix="/admin/pagos", tags=["admin-pagos"])


def registrar_auditoria(db, current_user):
    uid  = current_user.get("sub") or current_user.get("id") or 0
    tipo = current_user.get("tipo_usuario") or "administrador"
    db.execute(text("SET LOCAL app.usuario_id = :uid"),   {"uid":  int(uid)})
    db.execute(text("SET LOCAL app.tipo_usuario = :tipo"), {"tipo": tipo})

@router.get("")
def get_pagos(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("administrador"))
):
    pagos_raw = (
        db.query(Pago, Pedido.id_cliente, Pedido.total.label("pedido_total"), Cliente.nombre.label("cliente_nombre"))
        .join(Pedido, Pago.id_pedido == Pedido.id_pedido)
        .outerjoin(Cliente, Pedido.id_cliente == Cliente.id_cliente)
        .order_by(Pago.id_pago.desc())
        .all()
    )

    total_pagos = db.query(func.count(Pago.id_pago)).scalar() or 0
    pendientes  = db.query(func.count(Pago.id_pago)).filter(Pago.estado == "pendiente").scalar() or 0
    confirmados = db.query(func.count(Pago.id_pago)).filter(Pago.estado == "confirmado").scalar() or 0
    monto_total = db.query(func.sum(Pago.monto)).filter(Pago.estado == "confirmado").scalar() or 0

    return {
        "stats": {
            "total_pagos": total_pagos, "pendientes": pendientes,
            "confirmados": confirmados, "monto_total": float(monto_total),
        },
        "pagos": [
            {
                "id_pago":        p.Pago.id_pago,
                "id_pedido":      p.Pago.id_pedido,
                "cliente_nombre": p.cliente_nombre or f"Cliente #{p.id_cliente}",
                "monto":          float(p.Pago.monto or p.pedido_total),
                "metodo":         p.Pago.metodo.upper(),
                "comprobante":    p.Pago.comprobante or "",
                "estado":         p.Pago.estado,
                "fecha_pago":     p.Pago.fecha_pago.strftime("%d/%m/%Y %H:%M"),
            }
            for p in pagos_raw
        ]
    }


@router.post("/{id_pago}/confirmar")
def confirmar_pago(
    id_pago: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("administrador"))
):
    pago = db.query(Pago).filter(Pago.id_pago == id_pago).first()
    if not pago:
        raise HTTPException(status_code=404, detail="Pago no encontrado")
    if pago.estado == "confirmado":
        raise HTTPException(status_code=400, detail="El pago ya fue confirmado")

    pago.estado = "confirmado"

    pedido = db.query(Pedido).filter(Pedido.id_pedido == pago.id_pedido).first()
    if pedido:
        pedido.estado = "pagado"

    registrar_auditoria(db, current_user)  # ← auditoría
    db.commit()

    return {"mensaje": "Pago confirmado y pedido actualizado a pagado"}