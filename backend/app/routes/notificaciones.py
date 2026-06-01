from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.utils.dependencies import get_current_user
from app.models.user import Notificacion

router = APIRouter(prefix="/notificaciones", tags=["notificaciones"])


@router.get("")
def obtener_notificaciones(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    uid  = current_user.get("id")
    tipo = current_user.get("tipo_usuario")

    notifs = (
        db.query(Notificacion)
        .filter(
            Notificacion.id_usuario   == uid,
            Notificacion.tipo_usuario == tipo
        )
        .order_by(Notificacion.fecha_creacion.desc())
        .limit(10)
        .all()
    )

    no_leidas = sum(1 for n in notifs if not n.leido)

    return {
        "success": True,
        "notificaciones": [
            {
                "id_notificacion": n.id_notificacion,
                "titulo":          n.titulo,
                "mensaje":         n.mensaje,
                "tipo":            n.tipo,
                "leido":           n.leido,
                "fecha_creacion":  str(n.fecha_creacion) if n.fecha_creacion else None,
            }
            for n in notifs
        ],
        "no_leidas": no_leidas,
    }


@router.post("/{id_notificacion}/leer")
def marcar_leida(
    id_notificacion: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    uid  = current_user.get("id")
    tipo = current_user.get("tipo_usuario")

    notif = (
        db.query(Notificacion)
        .filter(
            Notificacion.id_notificacion == id_notificacion,
            Notificacion.id_usuario   == uid,
            Notificacion.tipo_usuario == tipo
        )
        .first()
    )
    if not notif:
        return {"success": False, "message": "Notificación no encontrada"}

    notif.leido = True
    db.commit()
    return {"success": True}


@router.post("/leer-todas")
def marcar_todas_leidas(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    uid  = current_user.get("id")
    tipo = current_user.get("tipo_usuario")

    (
        db.query(Notificacion)
        .filter(
            Notificacion.id_usuario   == uid,
            Notificacion.tipo_usuario == tipo,
            Notificacion.leido        == False
        )
        .update({"leido": True})
    )
    db.commit()
    return {"success": True}