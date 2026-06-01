from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, text
from datetime import datetime, timedelta

from app.database import get_db
from app.models.user import (
    Cliente, Pedido, Producto, Administrador, Empleado
)
from app.utils.dependencies import require_role

router = APIRouter(prefix="/admin", tags=["admin"])


def registrar_auditoria(db, current_user):
    uid  = current_user.get("sub") or current_user.get("id") or 0
    tipo = current_user.get("tipo_usuario") or "administrador"
    db.execute(text("SET LOCAL app.usuario_id = :uid"),   {"uid":  int(uid)})
    db.execute(text("SET LOCAL app.tipo_usuario = :tipo"), {"tipo": tipo})
# ─────────────────────────────────────────────
#  DASHBOARD - STATS
# ─────────────────────────────────────────────

@router.get("/dashboard")
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("administrador"))
):
    hoy = datetime.now()
    mes_actual = hoy.month
    anio_actual = hoy.year
    mes_anterior = (hoy.replace(day=1) - timedelta(days=1)).month
    anio_anterior = (hoy.replace(day=1) - timedelta(days=1)).year

    clientes = db.query(func.count(Cliente.id_cliente)).filter(Cliente.estado == 1).scalar() or 0
    productos = db.query(func.count(Producto.id_producto)).filter(Producto.estado == 1).scalar() or 0
    pedidos = db.query(func.count(Pedido.id_pedido)).filter(Pedido.estado != "cancelado").scalar() or 0
    pendientes = db.query(func.count(Pedido.id_pedido)).filter(Pedido.estado == "pendiente").scalar() or 0
    pagados = db.query(func.count(Pedido.id_pedido)).filter(Pedido.estado == "pagado").scalar() or 0
    enviados = db.query(func.count(Pedido.id_pedido)).filter(Pedido.estado == "enviado").scalar() or 0

    ventas_mes = db.query(func.sum(Pedido.total)).filter(
        extract("month", Pedido.fecha) == mes_actual,
        extract("year", Pedido.fecha) == anio_actual,
        Pedido.estado.in_(["pagado", "enviado"])
    ).scalar() or 0

    ventas_mes_anterior = db.query(func.sum(Pedido.total)).filter(
        extract("month", Pedido.fecha) == mes_anterior,
        extract("year", Pedido.fecha) == anio_anterior,
        Pedido.estado.in_(["pagado", "enviado"])
    ).scalar() or 0

    if ventas_mes_anterior > 0:
        crecimiento = ((float(ventas_mes) - float(ventas_mes_anterior)) / float(ventas_mes_anterior)) * 100
    else:
        crecimiento = 0

    ventas_mensuales = []
    for i in range(5, -1, -1):
        fecha_ref = hoy.replace(day=1) - timedelta(days=i * 30)
        total = db.query(func.sum(Pedido.total)).filter(
            extract("month", Pedido.fecha) == fecha_ref.month,
            extract("year", Pedido.fecha) == fecha_ref.year,
            Pedido.estado.in_(["pagado", "enviado"])
        ).scalar() or 0
        ventas_mensuales.append({"mes": fecha_ref.strftime("%b %Y"), "total": float(total)})

    pedidos_recientes_raw = (
        db.query(Pedido, Cliente.nombre.label("cliente"))
        .join(Cliente, Pedido.id_cliente == Cliente.id_cliente)
        .filter(Pedido.estado != "cancelado")
        .order_by(Pedido.fecha.desc())
        .limit(10).all()
    )
    pedidos_recientes = [
        {"id_pedido": p.Pedido.id_pedido, "cliente": p.cliente, "total": float(p.Pedido.total),
         "estado": p.Pedido.estado, "fecha": p.Pedido.fecha.strftime("%d/%m/%Y %H:%M")}
        for p in pedidos_recientes_raw
    ]

    clientes_recientes_raw = (
        db.query(Cliente).filter(Cliente.estado == 1)
        .order_by(Cliente.fecha_registro.desc()).limit(5).all()
    )
    clientes_recientes = [
        {"id_cliente": c.id_cliente, "nombre": c.nombre, "correo": c.correo,
         "telefono": c.telefono or "No especificado", "fecha_registro": c.fecha_registro.strftime("%d/%m/%Y")}
        for c in clientes_recientes_raw
    ]

    ventas_detalladas_raw = (
        db.query(Pedido, Cliente.nombre.label("cliente"))
        .join(Cliente, Pedido.id_cliente == Cliente.id_cliente)
        .filter(extract("month", Pedido.fecha) == mes_actual,
                extract("year", Pedido.fecha) == anio_actual,
                Pedido.estado.in_(["pagado", "enviado"]))
        .order_by(Pedido.fecha.desc()).limit(5).all()
    )
    ventas_detalladas = [
        {"id_pedido": p.Pedido.id_pedido, "cliente": p.cliente, "total": float(p.Pedido.total),
         "estado": p.Pedido.estado, "fecha": p.Pedido.fecha.strftime("%d/%m/%Y %H:%M")}
        for p in ventas_detalladas_raw
    ]

    productos_recientes_raw = (
        db.query(Producto).filter(Producto.estado == 1)
        .order_by(Producto.fecha_registro.desc()).limit(5).all()
    )
    productos_recientes = [
        {"id_producto": p.id_producto, "nombre": p.nombre, "precio": float(p.precio),
         "stock": p.stock, "imagen": p.imagen, "fecha_registro": p.fecha_registro.strftime("%d/%m/%Y")}
        for p in productos_recientes_raw
    ]

    pedidos_activos_raw = (
        db.query(Pedido, Cliente.nombre.label("cliente"))
        .join(Cliente, Pedido.id_cliente == Cliente.id_cliente)
        .filter(Pedido.estado != "cancelado")
        .order_by(Pedido.fecha.desc()).limit(5).all()
    )
    pedidos_activos = [
        {"id_pedido": p.Pedido.id_pedido, "cliente": p.cliente, "total": float(p.Pedido.total),
         "estado": p.Pedido.estado, "fecha": p.Pedido.fecha.strftime("%d/%m/%Y %H:%M")}
        for p in pedidos_activos_raw
    ]

    # ── Top selling products ─────────────────────────────────
    top_selling_raw = db.execute(text("""
        SELECT p.id_producto, p.nombre, p.precio, p.imagen, p.categoria, p.stock,
               SUM(pd.cantidad)::int as total_vendido
        FROM pedido_detalles pd
        JOIN productos p ON pd.id_producto = p.id_producto
        JOIN pedidos pe ON pd.id_pedido = pe.id_pedido
        WHERE pe.estado IN ('pagado', 'enviado')
          AND p.estado = 1
        GROUP BY p.id_producto
        ORDER BY total_vendido DESC
        LIMIT 10
    """)).fetchall()
    productos_mas_vendidos = [
        {"id_producto": r.id_producto, "nombre": r.nombre, "precio": float(r.precio),
         "imagen": r.imagen or "", "categoria": r.categoria, "stock": r.stock,
         "total_vendido": r.total_vendido}
        for r in top_selling_raw
    ]

    # ── Restock recommendations (low stock + high demand) ────
    restock_raw = db.execute(text("""
        SELECT p.id_producto, p.nombre, p.precio, p.imagen, p.categoria, p.stock,
               COALESCE(SUM(pd.cantidad)::int, 0) as total_vendido
        FROM productos p
        LEFT JOIN pedido_detalles pd ON pd.id_producto = p.id_producto
        LEFT JOIN pedidos pe ON pd.id_pedido = pe.id_pedido
            AND pe.estado IN ('pagado', 'enviado')
        WHERE p.estado = 1 AND p.stock <= 10
        GROUP BY p.id_producto
        ORDER BY total_vendido DESC, p.stock ASC
        LIMIT 10
    """)).fetchall()
    recomendaciones_reabastecimiento = [
        {"id_producto": r.id_producto, "nombre": r.nombre, "precio": float(r.precio),
         "imagen": r.imagen or "", "categoria": r.categoria, "stock": r.stock,
         "total_vendido": r.total_vendido}
        for r in restock_raw
    ]

    # ── ML Prediction: based on top sellers, what to stock next (via Apriori) ────
    prediccion_ml = {"recomendaciones": [], "total_reglas": 0, "promedio_lift": 0}
    if top_selling_raw:
        top_ids = [r.id_producto for r in top_selling_raw]
        from app.services.recomendaciones import entrenar_modelo, ID_OFFSET
        from app.services.recomendaciones import _productos_info as prod_info
        from app.services.recomendaciones import _nombre_producto
        rules = entrenar_modelo(db)
        if rules:
            vistos = set(top_ids)
            puntajes = {}
            basado_en_map = {}
            for r in rules:
                ant = list(r["antecedents"])
                con = list(r["consequents"])
                if any(pid in ant for pid in top_ids):
                    for prod_id in con:
                        if prod_id not in vistos:
                            if prod_id not in puntajes:
                                puntajes[prod_id] = {"confidence": [], "lift": [], "support": []}
                                basado_en_map[prod_id] = set()
                            puntajes[prod_id]["confidence"].append(r["confidence"])
                            puntajes[prod_id]["lift"].append(r["lift"])
                            puntajes[prod_id]["support"].append(r["support"])
                            for pid in ant:
                                if pid in top_ids:
                                    basado_en_map[prod_id].add(int(pid))

            if puntajes:
                import pandas as pd
                rows = []
                for pid, vals in puntajes.items():
                    rows.append({
                        "id_producto": int(pid),
                        "confidence": sum(vals["confidence"]) / len(vals["confidence"]),
                        "lift": sum(vals["lift"]) / len(vals["lift"]),
                        "support": sum(vals["support"]) / len(vals["support"]),
                    })
                df_pred = pd.DataFrame(rows).sort_values(["lift", "confidence", "support"], ascending=False)
                top_pred_ids = df_pred.head(12)["id_producto"].tolist()

                info_map = {}
                for p in prod_info(top_pred_ids, db):
                    info_map[p["id_producto"]] = p

                for pid in top_pred_ids:
                    p = info_map.get(pid)
                    if not p:
                        continue
                    match = df_pred[df_pred["id_producto"] == pid].iloc[0]
                    basado_en = list(basado_en_map.get(pid, set()))
                    basado_en_nombres = [_nombre_producto(bid, db) for bid in basado_en[:3]]
                    prediccion_ml["recomendaciones"].append({
                        "id_producto": p["id_producto"],
                        "nombre": p["nombre"],
                        "precio": p["precio"],
                        "imagen": p["imagen"],
                        "categoria": p["categoria"],
                        "confidence": round(float(match["confidence"]), 4),
                        "lift": round(float(match["lift"]), 4),
                        "support": round(float(match["support"]), 4),
                        "basado_en_ids": basado_en,
                        "basado_en_nombres": basado_en_nombres,
                    })

            prediccion_ml["total_reglas"] = len(rules)
            prediccion_ml["promedio_lift"] = round(
                sum(r["lift"] for r in rules) / len(rules), 2
            ) if rules else 0

    return {
        "stats": {
            "clientes": clientes, "productos": productos, "pedidos": pedidos,
            "pendientes": pendientes, "pagados": pagados, "enviados": enviados,
            "ventas_mes": float(ventas_mes), "ventas_mes_anterior": float(ventas_mes_anterior),
            "crecimiento": round(crecimiento, 1),
        },
        "ventas_mensuales": ventas_mensuales,
        "pedidos_recientes": pedidos_recientes,
        "clientes_recientes": clientes_recientes,
        "ventas_detalladas": ventas_detalladas,
        "productos_recientes": productos_recientes,
        "pedidos_activos": pedidos_activos,
        "productos_mas_vendidos": productos_mas_vendidos,
        "recomendaciones_reabastecimiento": recomendaciones_reabastecimiento,
        "prediccion_ml": prediccion_ml,
    }


# ─────────────────────────────────────────────
#  USUARIOS (CLIENTES)
# ─────────────────────────────────────────────

@router.get("/usuarios")
def get_usuarios(
    busqueda: str = Query(default=""),
    pagina: int = Query(default=1, ge=1),
    por_pagina: int = Query(default=8, ge=1, le=100),
    inactivos: bool = Query(default=False),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("administrador"))
):
    query = db.query(Cliente)
    if not inactivos:
        query = query.filter(Cliente.estado == 1)
    if busqueda:
        query = query.filter(
            Cliente.nombre.ilike(f"%{busqueda}%") |
            Cliente.correo.ilike(f"%{busqueda}%")
        )

    total = query.count()
    total_paginas = -(-total // por_pagina)
    offset = (pagina - 1) * por_pagina
    clientes = query.order_by(Cliente.id_cliente.desc()).offset(offset).limit(por_pagina).all()

    return {
        "clientes": [
            {"id_cliente": c.id_cliente, "nombre": c.nombre, "correo": c.correo,
             "telefono": c.telefono or "", "direccion": c.direccion or "",
             "estado": c.estado,
             "fecha_registro": c.fecha_registro.strftime("%d/%m/%Y")}
            for c in clientes
        ],
        "total": total,
        "total_paginas": total_paginas,
        "pagina_actual": pagina,
    }


@router.post("/usuarios")
def crear_usuario(
    data: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("administrador"))
):
    from app.utils.security import hash_password

    existente = db.query(Cliente).filter(Cliente.correo == data["correo"]).first()
    if existente:
        raise HTTPException(status_code=400, detail="Correo ya registrado")

    nuevo = Cliente(
        nombre=data["nombre"],
        correo=data["correo"],
        contrasena=hash_password(data["contrasena"]),
        telefono=data.get("telefono"),
        direccion=data.get("direccion"),
    )
    db.add(nuevo)
    registrar_auditoria(db, current_user)  # ← auditoría
    db.commit()
    db.refresh(nuevo)
    return {"mensaje": "Usuario creado exitosamente", "id": nuevo.id_cliente}


@router.put("/usuarios/{id_cliente}")
def editar_usuario(
    id_cliente: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("administrador"))
):
    cliente = db.query(Cliente).filter(Cliente.id_cliente == id_cliente).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    cliente.nombre = data.get("nombre", cliente.nombre)
    cliente.correo = data.get("correo", cliente.correo)
    cliente.telefono = data.get("telefono", cliente.telefono)
    cliente.direccion = data.get("direccion", cliente.direccion)

    registrar_auditoria(db, current_user)  # ← auditoría
    db.commit()
    return {"mensaje": "Usuario actualizado exitosamente"}


@router.delete("/usuarios/{id_cliente}")
def eliminar_usuario(
    id_cliente: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("administrador"))
):
    cliente = db.query(Cliente).filter(Cliente.id_cliente == id_cliente).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    cliente.estado = 0
    registrar_auditoria(db, current_user)  # ← auditoría
    db.commit()
    return {"mensaje": "Usuario eliminado exitosamente"}


@router.put("/usuarios/{id_cliente}/reactivar")
def reactivar_usuario(
    id_cliente: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("administrador"))
):
    cliente = db.query(Cliente).filter(Cliente.id_cliente == id_cliente).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if cliente.estado == 1:
        raise HTTPException(status_code=400, detail="El usuario ya está activo")
    cliente.estado = 1
    registrar_auditoria(db, current_user)
    db.commit()
    return {"mensaje": "Usuario reactivado exitosamente"}


# ─────────────────────────────────────────────
#  EMPLEADOS
# ─────────────────────────────────────────────

@router.get("/empleados")
def listar_empleados(
    pagina: int = Query(default=1, ge=1),
    por_pagina: int = Query(default=10, ge=1, le=50),
    busqueda: str = Query(default=""),
    inactivos: bool = Query(default=False),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("administrador"))
):
    q = db.query(Empleado)
    if not inactivos:
        q = q.filter(Empleado.estado == 1)
    if busqueda:
        q = q.filter(
            Empleado.nombre.ilike(f"%{busqueda}%") |
            Empleado.correo.ilike(f"%{busqueda}%")
        )
    total = q.count()
    total_paginas = max(1, (total + por_pagina - 1) // por_pagina)
    empleados = q.order_by(Empleado.fecha_registro.desc()).offset((pagina - 1) * por_pagina).limit(por_pagina).all()
    return {
        "empleados": [{
            "id_empleado": e.id_empleado,
            "nombre": e.nombre,
            "correo": e.correo,
            "telefono": e.telefono or "",
            "estado": e.estado,
            "fecha_registro": e.fecha_registro.strftime("%d/%m/%Y") if e.fecha_registro else "",
        } for e in empleados],
        "total": total,
        "total_paginas": total_paginas,
    }


@router.post("/empleados")
def crear_empleado(
    data: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("administrador"))
):
    from app.utils.security import hash_password

    existente = db.query(Empleado).filter(Empleado.correo == data["correo"]).first()
    if existente:
        raise HTTPException(status_code=400, detail="Correo ya registrado")

    nuevo = Empleado(
        nombre=data["nombre"],
        correo=data["correo"],
        contrasena=hash_password(data["contrasena"]),
        telefono=data.get("telefono"),
    )
    db.add(nuevo)
    registrar_auditoria(db, current_user)
    db.commit()
    db.refresh(nuevo)
    return {"mensaje": "Empleado creado exitosamente", "id": nuevo.id_empleado}


@router.put("/empleados/{id_empleado}")
def editar_empleado(
    id_empleado: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("administrador"))
):
    emp = db.query(Empleado).filter(Empleado.id_empleado == id_empleado).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    if "nombre" in data:
        emp.nombre = data["nombre"]
    if "correo" in data:
        emp.correo = data["correo"]
    if "telefono" in data:
        emp.telefono = data["telefono"]
    if "contrasena" in data and data["contrasena"]:
        from app.utils.security import hash_password
        emp.contrasena = hash_password(data["contrasena"])

    registrar_auditoria(db, current_user)
    db.commit()
    return {"mensaje": "Empleado actualizado exitosamente"}


@router.delete("/empleados/{id_empleado}")
def eliminar_empleado(
    id_empleado: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("administrador"))
):
    emp = db.query(Empleado).filter(Empleado.id_empleado == id_empleado).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    emp.estado = 0
    registrar_auditoria(db, current_user)
    db.commit()
    return {"mensaje": "Empleado eliminado exitosamente"}


@router.put("/empleados/{id_empleado}/reactivar")
def reactivar_empleado(
    id_empleado: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("administrador"))
):
    emp = db.query(Empleado).filter(Empleado.id_empleado == id_empleado).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    if emp.estado == 1:
        raise HTTPException(status_code=400, detail="El empleado ya está activo")
    emp.estado = 1
    registrar_auditoria(db, current_user)
    db.commit()
    return {"mensaje": "Empleado reactivado exitosamente"}