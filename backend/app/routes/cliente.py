from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app.utils.dependencies import get_current_user, require_role
from typing import Optional
import json, os, shutil, re, requests
from fastapi import UploadFile, File, Form
from pydantic import BaseModel as _Base
from typing import Optional as _Opt

router = APIRouter(prefix="/cliente", tags=["cliente"])
UPLOAD_FOTOS = "uploads/fotos_perfil"
os.makedirs(UPLOAD_FOTOS, exist_ok=True)
# ─── PERFIL: OBTENER ──────────────────────────────────────────────────────────
 
@router.get("/perfil")
def obtener_perfil(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    uid = get_uid(current_user)
 
    row = db.execute(
        text("""
            SELECT id_cliente, nombre, correo, telefono, direccion,
                   foto_perfil, fecha_registro
            FROM clientes
            WHERE id_cliente = :uid
        """),
        {"uid": uid},
    ).fetchone()
 
    if not row:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
 
    d = dict(row._mapping)
 
    if d.get("fecha_registro"):
        d["fecha_registro"] = d["fecha_registro"].isoformat()
 
    # Construir URL de la foto de perfil
    if d.get("foto_perfil"):
        d["foto_perfil_url"] = f"http://localhost:8000/uploads/fotos_perfil/{d['foto_perfil']}"
    else:
        d["foto_perfil_url"] = None
 
    # Estadísticas del cliente
    stats = {}
    stats["total_pedidos"] = db.execute(
        text("SELECT COUNT(*) FROM pedidos WHERE id_cliente = :uid"),
        {"uid": uid},
    ).scalar() or 0
 
    stats["total_cotizaciones"] = db.execute(
        text("SELECT COUNT(*) FROM cotizaciones WHERE id_cliente = :uid"),
        {"uid": uid},
    ).scalar() or 0
 
    d["stats"] = stats
 
    return d
 
 
# ─── PERFIL: ACTUALIZAR DATOS ─────────────────────────────────────────────────
 
class _PerfilBody(_Base):
    nombre:    str
    telefono:  _Opt[str] = None
    direccion: _Opt[str] = None
 
 
@router.put("/perfil")
def actualizar_perfil(
    body: _PerfilBody,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    uid = get_uid(current_user)
 
    nombre = body.nombre.strip()
    if not nombre:
        raise HTTPException(status_code=400, detail="El nombre es obligatorio")
 
    db.execute(
        text("""
            UPDATE clientes
            SET nombre = :nombre, telefono = :tel, direccion = :dir
            WHERE id_cliente = :uid
        """),
        {
            "nombre": nombre,
            "tel":    body.telefono,
            "dir":    body.direccion,
            "uid":    uid,
        },
    )
    db.commit()
 
    return {"success": True, "message": "Perfil actualizado correctamente"}
 
 
# ─── PERFIL: CAMBIAR CONTRASEÑA ───────────────────────────────────────────────
 
class _PassBody(_Base):
    nueva_password:     str
    confirmar_password: str
 
 
@router.put("/perfil/password")
def cambiar_password(
    body: _PassBody,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    uid = get_uid(current_user)
 
    if not body.nueva_password or not body.confirmar_password:
        raise HTTPException(status_code=400, detail="Debes llenar ambos campos de contraseña")
 
    if body.nueva_password != body.confirmar_password:
        raise HTTPException(status_code=400, detail="Las contraseñas no coinciden")
 
    if len(body.nueva_password) < 6:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres")
 
    # Usar bcrypt para hashear (requiere: pip install bcrypt)
    import bcrypt
    hashed = bcrypt.hashpw(body.nueva_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
 
    db.execute(
        text("UPDATE clientes SET contrasena = :h WHERE id_cliente = :uid"),
        {"h": hashed, "uid": uid},
    )
    db.commit()
 
    return {"success": True, "message": "Contraseña actualizada correctamente"}
 
 
# ─── PERFIL: SUBIR FOTO ───────────────────────────────────────────────────────
 
@router.post("/perfil/foto")
def subir_foto_perfil(
    foto_perfil: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    uid = get_uid(current_user)
 
    # Validar extensión
    ext = os.path.splitext(foto_perfil.filename or "foto.jpg")[1].lower()
    if ext not in {".jpg", ".jpeg", ".png", ".gif"}:
        raise HTTPException(
            status_code=400,
            detail="Solo se permiten archivos JPG, PNG y GIF",
        )
 
    # Validar tamaño (máximo 2 MB)
    foto_perfil.file.seek(0, 2)          # ir al final
    size = foto_perfil.file.tell()
    foto_perfil.file.seek(0)             # volver al inicio
    if size > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="El archivo es demasiado grande. Máximo 2MB.")
 
    # Nombre único
    filename = f"cliente_{uid}_{int(__import__('time').time())}{ext}"
    path = os.path.join(UPLOAD_FOTOS, filename)
 
    # Guardar archivo
    with open(path, "wb") as f:
        shutil.copyfileobj(foto_perfil.file, f)
 
    # Eliminar foto anterior si existe
    row = db.execute(
        text("SELECT foto_perfil FROM clientes WHERE id_cliente = :uid"),
        {"uid": uid},
    ).fetchone()
 
    if row and row.foto_perfil:
        old_path = os.path.join(UPLOAD_FOTOS, row.foto_perfil)
        if os.path.exists(old_path):
            os.remove(old_path)
 
    # Actualizar en la base de datos
    db.execute(
        text("UPDATE clientes SET foto_perfil = :f WHERE id_cliente = :uid"),
        {"f": filename, "uid": uid},
    )
    db.commit()
 
    return {
        "success":       True,
        "message":       "Foto de perfil actualizada correctamente",
        "foto_perfil_url": f"http://localhost:8000/uploads/fotos_perfil/{filename}",
    }

# ─── UTILIDADES ────────────────────────────────────────────────────────────────

TIPO_CAMBIO_DEFAULT = 9.17


def get_tipo_cambio(db: Session) -> float:
    try:
        result = db.execute(
            text("SELECT tipo_cambio FROM configuracion LIMIT 1")
        ).scalar()
        if result:
            return float(result)
    except Exception as e:
        print(f"[tipo_cambio] Error reading from DB: {e}")
    return TIPO_CAMBIO_DEFAULT

TARIFAS_ALMACEN = [
    (20,20,15,15,1,1,100,135),
    (20,20,15,15,15,15,100,180),
    (25,25,15,15,15,15,100,225),
    (30,30,20,20,20,20,100,270),
    (35,35,20,20,20,20,100,360),
    (50,50,40,40,10,10,10,450),
    (50,50,40,40,10,10,100,1350),
    (60,60,60,60,60,60,20,1800),
    (100,100,100,100,60,60,25,2250),
    (150,150,100,100,100,100,30,3150),
]

def calcular_costo_almacen(largo, ancho, alto, peso):
    for l_min,l_max,a_min,a_max,h_min,h_max,p_max,costo in TARIFAS_ALMACEN:
        if (l_min <= largo <= l_max and a_min <= ancho <= a_max and
                h_min <= alto <= h_max and peso <= p_max):
            return costo
    volumen = largo * ancho * alto
    if volumen <= 300: return 135
    if volumen <= 4500: return 180
    if volumen <= 5625: return 225
    if volumen <= 12000: return 270
    if volumen <= 14000: return 360
    if volumen <= 20000: return 450
    if volumen <= 216000: return 1800
    if volumen <= 600000: return 2250
    return 3150

IMPUESTOS = {
    'electronico': 0.30, 'ropa': 0.20, 'hogar': 0.15,
    'deportes': 0.25, 'otros': 0.18
}

# ── Mapa subcategoría → categoría padre (para impuestos y filtros) ────────────
SUBCAT_TO_CAT = {
    # Electrónico
    'gaming':        'electronico',
    'audio':         'electronico',
    'celulares':     'electronico',
    'computadoras':  'electronico',
    'fotografia':    'electronico',
    # Ropa
    'ropa_hombre':   'ropa',
    'ropa_mujer':    'ropa',
    'calzado':       'ropa',
    'accesorios':    'ropa',
    # Hogar
    'cocina':        'hogar',
    'dormitorio':    'hogar',
    'decoracion':    'hogar',
    # Deportes
    'fitness':       'deportes',
    'futbol':        'deportes',
    'outdoor':       'deportes',
    # Otros
    'juguetes':      'otros',
    'libros':        'otros',
}

def get_cat_padre(cat: str) -> str:
    """Devuelve la categoría padre dado una subcategoría o categoría directa."""
    return SUBCAT_TO_CAT.get(cat, cat)
def calcular_importacion(precio, peso, categoria, largo=20, ancho=15, alto=1, tipo_cambio=TIPO_CAMBIO_DEFAULT):
    cat_padre = get_cat_padre(categoria)          # ← línea nueva
    impuesto = IMPUESTOS.get(cat_padre, 0.18)     # ← antes era IMPUESTOS.get(categoria, 0.18)
    flete = max(15.0, peso * 3)
    seguro = precio * 0.02
    aduana = precio * impuesto
    almacen_bs = calcular_costo_almacen(largo, ancho, alto, peso)
    almacen = almacen_bs / tipo_cambio
    total = precio + flete + seguro + aduana + almacen
    return {
        "total": round(total, 2),
        "tipo_cambio": tipo_cambio,
        "desglose": {
            "producto": round(precio, 2),
            "flete": round(flete, 2),
            "seguro": round(seguro, 2),
            "aduana": round(aduana, 2),
            "almacen": round(almacen, 2),
            "almacen_bs": almacen_bs,
        }
    }

def imagen_url(imagen: str | None, nombre: str) -> str:
    if imagen and imagen.startswith("http"):
        return imagen
    if imagen:
        return f"http://localhost:8000/uploads/productos/{imagen}"
    placeholder = nombre[:20].replace(" ", "+")
    return f"https://via.placeholder.com/300x200/2c7be5/ffffff?text={placeholder}"

# ✅ Helper centralizado para extraer uid — evita el bug de uid=None
def get_uid(current_user: dict) -> int:
    uid = (
        current_user.get("id")
        or current_user.get("id_cliente")
        or current_user.get("id_usuario")
        or current_user.get("sub")
    )
    if not uid:
        raise HTTPException(status_code=401, detail="No se pudo identificar al usuario")
    return uid


CAT_SUBCATS = {
    "electronico": ["gaming", "audio", "celulares", "computadoras", "fotografia"],
    "ropa": ["ropa_hombre", "ropa_mujer", "calzado", "accesorios"],
    "hogar": ["cocina", "dormitorio", "decoracion"],
    "deportes": ["fitness", "futbol", "outdoor"],
    "otros": ["juguetes", "libros", "otros"],
}

# ─── DASHBOARD ─────────────────────────────────────────────────────────────────

@router.get("/dashboard")
def dashboard_cliente(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    uid = get_uid(current_user)
    tc = get_tipo_cambio(db)

    total_pedidos = db.execute(
        text("SELECT COUNT(*) FROM pedidos WHERE id_cliente=:u AND estado != 'cancelado'"),
        {"u": uid}
    ).scalar()

    envios_camino = db.execute(
        text("""SELECT COUNT(*) FROM pedidos p
                LEFT JOIN envios_importacion e ON p.id_pedido=e.id_pedido
                WHERE p.id_cliente=:u AND e.estado='en_transito'"""),
        {"u": uid}
    ).scalar()

    total_carrito = db.execute(
        text("SELECT COUNT(*) FROM carrito WHERE id_cliente=:u"),
        {"u": uid}
    ).scalar()

    cotizaciones_pendientes = db.execute(
        text("SELECT COUNT(*) FROM cotizaciones WHERE id_cliente=:u AND estado='pendiente'"),
        {"u": uid}
    ).scalar()

    rows = db.execute(
        text("""SELECT p.id_pedido, p.total, p.estado, p.fecha, p.estado_entrega,
                       e.estado as estado_envio
                FROM pedidos p
                LEFT JOIN envios_importacion e ON p.id_pedido=e.id_pedido
                WHERE p.id_cliente=:u
                ORDER BY p.fecha DESC LIMIT 5"""),
        {"u": uid}
    ).fetchall()
    pedidos_recientes = [dict(r._mapping) for r in rows]
    for p in pedidos_recientes:
        if p.get("fecha"):
            p["fecha"] = p["fecha"].isoformat()

    envios_rows = db.execute(
        text("""SELECT p.id_pedido, p.total, e.guia_aerea, e.aerolinea,
                       e.fecha_salida_miami, e.fecha_llegada_bolivia
                FROM pedidos p
                LEFT JOIN envios_importacion e ON p.id_pedido=e.id_pedido
                WHERE p.id_cliente=:u AND e.estado='en_transito'"""),
        {"u": uid}
    ).fetchall()
    envios_lista = []
    for r in envios_rows:
        d = dict(r._mapping)
        if d.get("fecha_salida_miami"): d["fecha_salida_miami"] = str(d["fecha_salida_miami"])
        if d.get("fecha_llegada_bolivia"): d["fecha_llegada_bolivia"] = str(d["fecha_llegada_bolivia"])
        envios_lista.append(d)

    carrito_rows = db.execute(
        text("""SELECT c.id_carrito, c.cantidad, c.tipo_producto,
                       p.id_producto, p.nombre, p.precio, p.imagen
                FROM carrito c
                JOIN productos p ON c.id_producto=p.id_producto
                WHERE c.id_cliente=:u"""),
        {"u": uid}
    ).fetchall()
    carrito_items = []
    total_carrito_monto = 0.0
    for r in carrito_rows:
        d = dict(r._mapping)
        d["imagen_url"] = imagen_url(d.get("imagen"), d.get("nombre",""))
        total_carrito_monto += float(d["precio"]) * int(d["cantidad"])
        carrito_items.append(d)

    cot_rows = db.execute(
        text("""SELECT id_cotizacion, nombre_producto, precio_base, categoria,
                       peso, costo_flete, costo_aduana, costo_seguro, costo_almacen,
                       costo_total, fecha
                FROM cotizaciones WHERE id_cliente=:u AND estado='pendiente'
                ORDER BY fecha DESC"""),
        {"u": uid}
    ).fetchall()
    cotizaciones_lista = []
    for r in cot_rows:
        d = dict(r._mapping)
        if d.get("fecha"): d["fecha"] = d["fecha"].isoformat()
        cotizaciones_lista.append(d)

    productos_por_categoria = {}

    for cat, subcats in CAT_SUBCATS.items():
        placeholders = ", ".join(f":s{i}" for i in range(len(subcats)))
        params_cat = {f"s{i}": sc for i, sc in enumerate(subcats)}

        prods = db.execute(
            text(f"SELECT * FROM productos WHERE estado=1 AND categoria IN ({placeholders}) LIMIT 8"),
            params_cat
        ).fetchall()

        lista = []
        for r in prods:
            d = dict(r._mapping)
            cot = calcular_importacion(float(d["precio"]), 0.5, d.get("categoria", "otros"), tipo_cambio=tc)
            d["imagen_url"] = imagen_url(d.get("imagen"), d.get("nombre", ""))
            d["costo_total_importacion"] = cot["total"]

            if d.get("fecha_registro"):
                d["fecha_registro"] = d["fecha_registro"].isoformat()

            lista.append(d)

        if lista:
            productos_por_categoria[cat] = lista

    # 🔹 productos externos
    ext_rows = db.execute(
        text("SELECT * FROM productos_exterior WHERE estado=1 AND destacado=1 ORDER BY fecha_agregado DESC LIMIT 8")
    ).fetchall()

    productos_externos = []
    for r in ext_rows:
        d = dict(r._mapping)
        cot = calcular_importacion(float(d["precio"]), float(d.get("peso") or 0.5), d.get("categoria", "otros"), tipo_cambio=tc)
        d["costo_total_importacion"] = cot["total"]

        if d.get("fecha_agregado"):
            d["fecha_agregado"] = d["fecha_agregado"].isoformat()
        if d.get("fecha_actualizacion"):
            d["fecha_actualizacion"] = d["fecha_actualizacion"].isoformat()

        productos_externos.append(d)

    # 🔹 productos destacados
    dest_rows = db.execute(
        text("SELECT * FROM productos WHERE estado=1 LIMIT 8")
    ).fetchall()

    productos_destacados = []
    for r in dest_rows:
        d = dict(r._mapping)
        cot = calcular_importacion(float(d["precio"]), 0.5, d.get("categoria", "otros"), tipo_cambio=tc)
        d["imagen_url"] = imagen_url(d.get("imagen"), d.get("nombre", ""))
        d["costo_total_importacion"] = cot["total"]

        if d.get("fecha_registro"):
            d["fecha_registro"] = d["fecha_registro"].isoformat()

        productos_destacados.append(d)

    return {
        "stats": {
            "total_pedidos": total_pedidos,
            "envios_camino": envios_camino,
            "total_carrito": total_carrito,
            "cotizaciones_pendientes": cotizaciones_pendientes,
        },
        "pedidos_recientes": pedidos_recientes,
        "envios_camino": envios_lista,
        "carrito_items": carrito_items,
        "total_carrito_monto": round(total_carrito_monto, 2),
        "cotizaciones_pendientes": cotizaciones_lista,
        "productos_por_categoria": productos_por_categoria,
        "productos_externos": productos_externos,
        "productos_destacados": productos_destacados,
        "pedidos_ids": [p["id_pedido"] for p in pedidos_recientes],
        "tipo_cambio": get_tipo_cambio(db),
    }


@router.get("/recomendaciones")
def recomendaciones_usuario(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    uid = get_uid(current_user)
    recomendaciones = []
    try:
        prod_ids = db.execute(
            text("""
                SELECT pd.id_producto, SUM(pd.cantidad) as total_vendido
                FROM pedido_detalles pd
                JOIN pedidos pe ON pd.id_pedido = pe.id_pedido
                WHERE pe.id_cliente = :u AND pe.estado IN ('pagado', 'enviado')
                  AND pd.id_producto IS NOT NULL
                GROUP BY pd.id_producto
                ORDER BY total_vendido DESC
                LIMIT 10
            """),
            {"u": uid}
        ).fetchall()
        ids = [r[0] for r in prod_ids if r[0]]
        if ids:
            from app.services.recomendaciones import entrenar_modelo, ID_OFFSET
            rules = entrenar_modelo(db)
            if rules:
                vistos = set(ids)
                puntajes = {}
                for r in rules:
                    ant = list(r["antecedents"])
                    con = list(r["consequents"])
                    if any(pid in ant for pid in ids):
                        for prod_id in con:
                            if prod_id not in vistos:
                                if prod_id not in puntajes:
                                    puntajes[prod_id] = {"confidence": [], "lift": [], "support": []}
                                puntajes[prod_id]["confidence"].append(r["confidence"])
                                puntajes[prod_id]["lift"].append(r["lift"])
                                puntajes[prod_id]["support"].append(r["support"])

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
                    df_rec = pd.DataFrame(rows).sort_values(["lift", "confidence", "support"], ascending=False)
                    top_ids = df_rec.head(8)["id_producto"].tolist()

                    ids_locales = [i for i in top_ids if i < ID_OFFSET]
                    ids_publicos = [i - ID_OFFSET for i in top_ids if i >= ID_OFFSET]
                    prods_map = {}

                    if ids_locales:
                        rows = db.execute(
                            text("SELECT id_producto, nombre, precio, imagen, categoria FROM productos WHERE id_producto = ANY(:ids)"),
                            {"ids": ids_locales}
                        ).fetchall()
                        for r in rows:
                            prods_map[r.id_producto] = r

                    if ids_publicos:
                        rows = db.execute(
                            text("SELECT id_producto_publico, nombre, precio, imagen, categoria FROM productos_publicos WHERE id_producto_publico = ANY(:ids)"),
                            {"ids": ids_publicos}
                        ).fetchall()
                        for r in rows:
                            pid = r.id_producto_publico + ID_OFFSET
                            prods_map[pid] = r

                    for pid in top_ids:
                        p = prods_map.get(pid)
                        if not p:
                            continue
                        if pid >= ID_OFFSET:
                            recomendaciones.append({
                                "id_producto": pid,
                                "nombre": f"[Público] {p.nombre}",
                                "precio": float(p.precio) if p.precio else 0.0,
                                "imagen_url": imagen_url(p.imagen, p.nombre),
                                "imagen": p.imagen or "",
                                "categoria": p.categoria or "otros",
                            })
                        else:
                            recomendaciones.append({
                                "id_producto": p.id_producto,
                                "nombre": p.nombre,
                                "precio": float(p.precio),
                                "imagen_url": imagen_url(p.imagen, p.nombre),
                                "imagen": p.imagen or "",
                                "categoria": p.categoria,
                            })

        # Fallback: si no hay reglas que matcheen, recomendar productos populares
        # de las categorías que el usuario ha comprado
        if not recomendaciones and ids:
            cat_rows = db.execute(
                text("SELECT DISTINCT categoria FROM productos WHERE id_producto = ANY(:ids) AND categoria IS NOT NULL"),
                {"ids": ids}
            ).fetchall()
            cats = [r[0] for r in cat_rows if r[0]]
            if not cats:
                cats = ["otros"]
            popular = db.execute(
                text("""
                    SELECT p.id_producto, p.nombre, p.precio, p.imagen, p.categoria,
                           COUNT(pd.id_detalle) as total_vendido
                    FROM productos p
                    JOIN pedido_detalles pd ON pd.id_producto = p.id_producto
                    JOIN pedidos pe ON pd.id_pedido = pe.id_pedido
                    WHERE p.estado = 1
                      AND pe.estado IN ('pagado', 'enviado')
                      AND p.categoria = ANY(:cats)
                      AND p.id_producto != ALL(:exclude)
                    GROUP BY p.id_producto
                    ORDER BY total_vendido DESC
                    LIMIT 8
                """),
                {"cats": cats, "exclude": ids}
            ).fetchall()
            for p in popular:
                recomendaciones.append({
                    "id_producto": p.id_producto,
                    "nombre": p.nombre,
                    "precio": float(p.precio),
                    "imagen_url": imagen_url(p.imagen, p.nombre),
                    "imagen": p.imagen or "",
                    "categoria": p.categoria,
                })
    except Exception as e:
        print(f"[recomendaciones] Error: {e}")

    return {"recomendaciones": recomendaciones, "total": len(recomendaciones)}


@router.get("/tienda")
def tienda(
    busqueda: Optional[str] = Query(None),
    categoria: Optional[str] = Query(None),
    plataforma: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    tc_actual = get_tipo_cambio(db)

    q = "SELECT * FROM productos WHERE estado=1"
    params = {}
    if busqueda:
        q += " AND (LOWER(nombre) LIKE LOWER(:b) OR LOWER(descripcion) LIKE LOWER(:b))"
        params["b"] = f"%{busqueda}%"
    if categoria and categoria != "todos":
        q += " AND categoria = :c"
        params["c"] = categoria
    q += " ORDER BY fecha_registro DESC"

    rows = db.execute(text(q), params).fetchall()
    productos_locales = []
    for r in rows:
        d = dict(r._mapping)
        ptc = float(d.get("tipo_cambio") or tc_actual)
        cot = calcular_importacion(float(d["precio"]), 0.5, d.get("categoria","otros"), tipo_cambio=ptc)
        d["tipo_cambio"] = ptc
        d["imagen_url"] = imagen_url(d.get("imagen"), d.get("nombre",""))
        d["plataforma"] = "local"
        d["costo_total_importacion"] = cot["total"]
        if d.get("fecha_registro"): d["fecha_registro"] = d["fecha_registro"].isoformat()
        productos_locales.append(d)

    q2 = "SELECT * FROM productos_exterior WHERE estado=1"
    params2 = {}
    if busqueda:
        q2 += " AND (LOWER(nombre) LIKE LOWER(:b) OR LOWER(descripcion) LIKE LOWER(:b))"
        params2["b"] = f"%{busqueda}%"
    if categoria and categoria != "todos":
        q2 += " AND categoria = :c"
        params2["c"] = categoria
    if plataforma and plataforma not in ("todas", "local"):
        q2 += " AND plataforma=:p"
        params2["p"] = plataforma

    ext_rows = db.execute(text(q2), params2).fetchall()
    productos_externos = []
    for r in ext_rows:
        d = dict(r._mapping)
        ptc = float(d.get("tipo_cambio") or tc_actual)
        cot = calcular_importacion(float(d["precio"]), float(d.get("peso") or 0.5), d.get("categoria","otros"), tipo_cambio=ptc)
        d["tipo_cambio"] = ptc
        d["costo_total_importacion"] = cot["total"]
        d["id_producto"] = f"ext_{d['id_producto_exterior']}"
        if d.get("fecha_agregado"): d["fecha_agregado"] = d["fecha_agregado"].isoformat()
        if d.get("fecha_actualizacion"): d["fecha_actualizacion"] = d["fecha_actualizacion"].isoformat()
        productos_externos.append(d)

    if plataforma == "local":
        productos_externos = []

    return {
        "productos_locales": productos_locales,
        "productos_externos": productos_externos,
        "total_locales": len(productos_locales),
        "total_externos": len(productos_externos),
        "tipo_cambio": tc_actual,
    }

# ─── SCRAPE: DETECTAR NOMBRE Y PRECIO DESDE URL ────────────────────────────────

_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
}

def _amazon_peso(html: str) -> float | None:
    for m in re.finditer(
        r'<tr[^>]*>\s*<th[^>]*>(.*?)</th>\s*<td[^>]*>(.*?)</td>',
        html, re.DOTALL | re.IGNORECASE
    ):
        label = re.sub(r'<[^>]+>', '', m.group(1)).strip()
        label = re.sub(r'\s+', ' ', label).lower()
        if 'peso' in label or 'weight' in label:
            txt = re.sub(r'<[^>]+>', ' ', m.group(2)).strip()
            txt = re.sub(r'\s+', ' ', txt)
            txt = re.sub(r'&\w+;|&#\d+;', ' ', txt)
            n = re.search(r'([\d,]+\.?\d*)\s*(kg|kilo|kilogramos?|g\b|gramos?|libras?|pounds?|lbs?|oz|onzas?)', txt, re.IGNORECASE)
            if n:
                val = float(n.group(1).replace(",", "."))
                unit = n.group(2).lower()
                if unit in ("g", "gramo", "gramos"):
                    val /= 1000
                elif unit in ("lb", "lbs", "libra", "libras", "pound", "pounds"):
                    val *= 0.453592
                elif unit in ("oz", "onza", "onzas"):
                    val *= 0.0283495
                return round(val, 2)
            n2 = re.search(r'([\d,]+\.?\d*)', txt)
            if n2:
                try:
                    return round(float(n2.group(1).replace(",", ".")), 2)
                except ValueError:
                    pass
    return None

def _amazon_dimensiones(html: str) -> str | None:
    for m in re.finditer(
        r'<tr[^>]*>\s*<th[^>]*>(.*?)</th>\s*<td[^>]*>(.*?)</td>',
        html, re.DOTALL | re.IGNORECASE
    ):
        label = re.sub(r'<[^>]+>', '', m.group(1)).strip()
        label = re.sub(r'\s+', ' ', label).lower()
        if ('dimensi' in label or 'tamaño' in label or 'tamano' in label or
            (('medida' in label or 'medidas' in label) and 'precio' not in label)):
            txt = re.sub(r'<[^>]+>', ' ', m.group(2)).strip()
            txt = re.sub(r'\s+', ' ', txt)
            txt = re.sub(r'&\w+;|&#\d+;', ' ', txt)
            if re.search(r'\d+[.,]?\d*\s*(?:x|por|by|")', txt, re.IGNORECASE) or re.search(r'\d+[.,]\d+', txt):
                return txt
    return None

_CAMBIO_BOX_SIZES = [
    (20, 15, 1,   "20x15x1",    None),
    (20, 15, 15,  "20x15x15",   None),
    (25, 15, 15,  "25x15x15",   None),
    (30, 20, 20,  "30x20x20",   None),
    (35, 20, 20,  "35x20x20",   None),
    (50, 40, 10,  "50x40x10",   None),
    (50, 40, 50,  "50x40x50",   10),
    (60, 60, 60,  "60x60x60",   20),
    (100, 100, 60,"100x100x60", 25),
    (150, 100, 100,"150x100x100", 30),
]

def _sugerir_tamano(dim_str: str | None, peso: float | None = None) -> str:
    if not dim_str:
        return "20x15x1"
    dim_str = re.sub(r'&\w+;|&#\d+;', ' ', dim_str)
    nums = [float(x.replace(",", ".")) for x in re.findall(r'(\d+[.,]?\d*)', dim_str)]
    if not nums:
        return "20x15x1"
    while len(nums) < 3:
        nums.append(0.5)
    nums = sorted([max(x, 0.1) for x in nums[:3]], reverse=True)
    lower = dim_str.lower()
    if 'cm' not in lower and 'centímetro' not in lower and 'centimetro' not in lower:
        nums = [round(x * 2.54, 1) for x in nums]
    for w, d, h, key, max_kg in _CAMBIO_BOX_SIZES:
        box = sorted([w, d, h], reverse=True)
        if not all(p <= b for p, b in zip(nums, box)):
            continue
        if max_kg is not None and peso is not None and peso > max_kg:
            continue
        return key
    return "150x100x100"

def _inferir_categoria(nombre: str) -> str:
    if not nombre:
        return "gaming"
    n = nombre.lower()
    if any(kw in n for kw in ['grill', 'parrilla', 'cocina', 'kitchen', 'cook', 'cocinar',
                               'olla', 'sarten', 'sartén', 'utensilio', 'cuchillo', 'knife',
                               'espatula', 'espátula']):
        return "cocina"
    if any(kw in n for kw in ['cama', 'bed ', 'dormitorio', 'bedroom', 'colchon', 'almohada',
                               'sabana', 'cortina', 'sábanas']):
        return "dormitorio"
    if any(kw in n for kw in ['decoracion', 'decoración', 'lampara', 'luz ', 'light',
                               'cuadro', 'espejo', 'mirror', 'adorno']):
        return "decoracion"
    if any(kw in n for kw in ['gaming', 'gamer', 'mouse', 'teclado', 'keyboard', 'headset',
                               'audifonos', 'auricular', 'headphone', 'juegos', 'juego']):
        return "gaming"
    if any(kw in n for kw in ['audio', 'speaker', 'parlante', 'bocina', 'sonido']):
        return "audio"
    if any(kw in n for kw in ['celular', 'smartphone', 'iphone', 'samsung galaxy', 'movil', 'móvil']):
        return "celulares"
    if any(kw in n for kw in ['computadora', 'laptop', 'notebook', 'computer', 'portatil', 'portátil',
                               'monitor', 'tablet', 'ipad', 'disco duro', 'ssd', 'memoria']):
        return "computadoras"
    if any(kw in n for kw in ['camara', 'cámara', 'foto', 'camera', 'lente', 'lentes',
                               'fotografia', 'fotografía']):
        return "fotografia"
    if any(kw in n for kw in ['camisa', 'camiseta', 'pantalon', 'pantalón', 'chaqueta',
                               'jacket', 'vestido', 'shirt', 'pants', 'short']):
        return "ropa_hombre"
    if any(kw in n for kw in ['zapato', 'shoe', 'sneaker', 'calzado', 'sandalia', 'zapatilla']):
        return "calzado"
    if any(kw in n for kw in ['bolso', 'mochila', 'cartera', 'reloj', 'watch', 'bag',
                               'accesorio', 'accessory', 'gafas']):
        return "accesorios"
    if any(kw in n for kw in ['fitness', 'gym', 'ejercicio', 'exercise', 'yoga', 'pesa',
                               'mancuerna', 'dumbbell', 'entrenamiento']):
        return "fitness"
    if any(kw in n for kw in ['futbol', 'fútbol', 'soccer', 'fifa', 'world cup', 'balon', 'pelota']):
        return "futbol"
    if any(kw in n for kw in ['outdoor', 'camping', 'hiking', 'senderismo', 'pesca', 'fishing']):
        return "outdoor"
    if any(kw in n for kw in ['juguete', 'toy', 'juego de', 'board game', 'muñeco', 'lego']):
        return "juguetes"
    if any(kw in n for kw in ['libro', 'book', 'kindle']):
        return "libros"
    return "gaming"

def _extract_amazon(html: str) -> dict:
    r = {"nombre": "", "precio": 0.0, "peso": None}
    # Title: #productTitle or og:title
    m = re.search(r'<span[^>]*id="productTitle"[^>]*>(.*?)</span>', html, re.DOTALL)
    if m:
        r["nombre"] = re.sub(r'\s+', ' ', m.group(1)).strip()
    if not r["nombre"]:
        m = re.search(r'<meta\s+property="og:title"\s+content="([^"]+)"', html)
        if m:
            r["nombre"] = m.group(1)
    # Price: try a-offscreen first (formats: "BOB10,733.68", "$1,099.00", "10,733.68")
    m = re.search(r'class="a-offscreen"[^>]*>([^<]+)<', html)
    if m:
        raw = m.group(1).strip()
        num_m = re.search(r'([\d,]+\.?\d*)', raw)
        if num_m:
            precio = float(num_m.group(1).replace(",", ""))
            # Amazon's rate for Bolivia is 6.9250 BOB/USD — convert to USD
            if raw.startswith("BOB") or raw.startswith("Bs"):
                precio = round(precio / 6.9250, 2)
            r["precio"] = precio
    else:
        # JSON-LD price
        m = re.search(r'"price"\s*:\s*"?\s*([\d.]+)\s*"?', html)
        if m and float(m.group(1)) > 0:
            r["precio"] = float(m.group(1))
        else:
            m = re.search(r'class="a-price-whole"[^>]*>([\d,]+)<', html)
            if m:
                cents = re.search(r'class="a-price-fraction"[^>]*>(\d+)<', html)
                r["precio"] = float(m.group(1).replace(",", "")) + (float(cents.group(1)) / 100 if cents else 0)
            else:
                m = re.search(r'id="priceblock_ourprice"[^>]*>\$?([\d,]+\.?\d*)', html)
                if m:
                    r["precio"] = float(m.group(1).replace(",", ""))
    # Weight
    peso = _amazon_peso(html)
    if peso:
        r["peso"] = peso
    # Dimensions
    dim = _amazon_dimensiones(html)
    if dim:
        r["dimensiones"] = dim
    # Category
    r["categoria"] = _inferir_categoria(r["nombre"])
    # Box size
    if r.get("dimensiones"):
        r["tamano"] = _sugerir_tamano(r["dimensiones"], r.get("peso"))
    return r

def _extract_ebay(html: str) -> dict:
    r = {"nombre": "", "precio": 0.0}
    # Title: #itemTitle or og:title
    m = re.search(r'<h1[^>]*id="itemTitle"[^>]*>(.*?)</h1>', html, re.DOTALL)
    if m:
        txt = re.sub(r'<[^>]+>', '', m.group(1))
        r["nombre"] = re.sub(r'\s+', ' ', txt).strip()
    if not r["nombre"]:
        m = re.search(r'<meta\s+property="og:title"\s+content="([^"]+)"', html)
        if m:
            r["nombre"] = m.group(1)
    # Price: JSON-LD, prcIsum, or itemprop
    m = re.search(r'"price"\s*:\s*"?\s*([\d.]+)\s*"?', html)
    if m and float(m.group(1)) > 0:
        r["precio"] = float(m.group(1))
    else:
        m = re.search(r'<span[^>]*id="prcIsum"[^>]*>\$?([\d,]+\.?\d*)', html)
        if m:
            r["precio"] = float(m.group(1).replace(",", ""))
        else:
            m = re.search(r'itemprop="price"[^>]+content="([\d.]+)"', html)
            if m:
                r["precio"] = float(m.group(1))
    return r

@router.post("/tienda/scrape")
def scrape_producto(
    data: dict,
    current_user: dict = Depends(get_current_user),
):
    url = (data.get("url") or "").strip()
    if not url.startswith("http"):
        raise HTTPException(400, "URL inválida")

    url_lower = url.lower()
    if "amazon" in url_lower:
        plataforma = "amazon"
    elif "ebay" in url_lower:
        plataforma = "ebay"
    else:
        raise HTTPException(400, "Solo se soportan URLs de Amazon o eBay")

    try:
        resp = requests.get(url, headers=_HEADERS, timeout=15)
        resp.raise_for_status()
        html = resp.text
    except Exception as e:
        raise HTTPException(502, f"No se pudo obtener la página: {str(e)[:80]}")

    try:
        if plataforma == "amazon":
            info = _extract_amazon(html)
        else:
            info = _extract_ebay(html)
    except Exception as e:
        raise HTTPException(502, f"Error al procesar: {str(e)[:80]}")

    if not info["nombre"]:
        info["nombre"] = ""
    if not info["precio"] or info["precio"] <= 0:
        info["precio"] = 0.0

    return {
        "nombre": info["nombre"],
        "precio": info["precio"],
        "peso": info.get("peso"),
        "dimensiones": info.get("dimensiones"),
        "tamano": info.get("tamano"),
        "categoria": info.get("categoria"),
        "plataforma": plataforma,
    }

# ─── CARRITO: AGREGAR ──────────────────────────────────────────────────────────

@router.post("/carrito/agregar")
def agregar_carrito(
    data: dict,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    uid = get_uid(current_user)
    tipo = data.get("tipo", "local")

    if tipo == "local":
        id_producto = data.get("id_producto")
        cantidad = int(data.get("cantidad", 1))

        prod = db.execute(
            text("SELECT * FROM productos WHERE id_producto=:id AND estado=1"),
            {"id": id_producto}
        ).fetchone()
        if not prod:
            raise HTTPException(status_code=404, detail="Producto no encontrado")

        existe = db.execute(
            text("SELECT * FROM carrito WHERE id_cliente=:u AND id_producto=:p AND tipo_producto='local'"),
            {"u": uid, "p": id_producto}
        ).fetchone()

        if existe:
            db.execute(
                text("UPDATE carrito SET cantidad=cantidad+:c WHERE id_carrito=:id"),
                {"c": cantidad, "id": existe.id_carrito}
            )
        else:
            db.execute(
                text("""INSERT INTO carrito (id_cliente, id_producto, cantidad, tipo_producto)
                        VALUES (:u, :p, :c, 'local')"""),
                {"u": uid, "p": id_producto, "c": cantidad}
            )
        db.commit()
        return {"success": True, "message": "Producto agregado al carrito"}

    elif tipo == "externo":
        nombre = data.get("nombre", "")
        precio = float(data.get("precio", 0))
        peso = float(data.get("peso", 0.5))
        categoria = data.get("categoria", "otros")
        plataforma = data.get("plataforma", "amazon")
        url = data.get("url", "")
        id_prod_ext = str(data.get("id_producto_externo", ""))
        cantidad = int(data.get("cantidad", 1))

        existe = db.execute(
            text("""SELECT * FROM carrito_externo
                    WHERE id_cliente=:u AND id_producto_externo=:id"""),
            {"u": uid, "id": id_prod_ext}
        ).fetchone()

        if existe:
            db.execute(
                text("UPDATE carrito_externo SET cantidad=cantidad+:c WHERE id_carrito_externo=:id"),
                {"c": cantidad, "id": existe.id_carrito_externo}
            )
        else:
            db.execute(
                text("""INSERT INTO carrito_externo
                        (id_cliente, id_producto_externo, nombre, precio, peso, categoria, plataforma, url, cantidad)
                        VALUES (:u, :id, :n, :pr, :pe, :cat, :plat, :url, :c)"""),
                {"u": uid, "id": id_prod_ext, "n": nombre, "pr": precio,
                 "pe": peso, "cat": categoria, "plat": plataforma, "url": url, "c": cantidad}
            )
        db.commit()
        return {"success": True, "message": "Producto externo agregado al carrito"}

    raise HTTPException(status_code=400, detail="Tipo de producto inválido")


# ─── CARRITO: OBTENER ──────────────────────────────────────────────────────────

@router.get("/carrito")
def obtener_carrito(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    uid = get_uid(current_user)
    tc_actual = get_tipo_cambio(db)

    rows = db.execute(
        text("""SELECT c.id_carrito, c.cantidad, c.tipo_producto,
                       p.id_producto, p.nombre, p.precio, p.imagen, p.categoria,
                       p.tipo_cambio
                FROM carrito c
                JOIN productos p ON c.id_producto=p.id_producto
                WHERE c.id_cliente=:u"""),
        {"u": uid}
    ).fetchall()
    items_locales = []
    for r in rows:
        d = dict(r._mapping)
        ptc = float(d.get("tipo_cambio") or tc_actual)
        d["tipo_cambio"] = ptc
        d["imagen_url"] = imagen_url(d.get("imagen"), d.get("nombre",""))
        d["plataforma"] = "local"
        cot = calcular_importacion(float(d["precio"]), 0.5, d.get("categoria","otros"), tipo_cambio=ptc)
        d["costo_total_importacion"] = cot["total"]
        items_locales.append(d)

    ext_rows = db.execute(
        text("""SELECT * FROM carrito_externo
                WHERE id_cliente=:u AND (estado='pendiente' OR estado IS NULL)"""),
        {"u": uid}
    ).fetchall()
    items_externos = []
    for r in ext_rows:
        d = dict(r._mapping)
        if d.get("fecha_agregado"): d["fecha_agregado"] = d["fecha_agregado"].isoformat()
        cot = calcular_importacion(float(d["precio"]), float(d.get("peso") or 0.5), d.get("categoria","otros"), tipo_cambio=tc_actual)
        d["tipo_cambio"] = tc_actual
        d["costo_total_importacion"] = cot["total"]
        items_externos.append(d)

    total_items = len(items_locales) + len(items_externos)
    total_monto = sum(float(i["precio"]) * int(i["cantidad"]) for i in items_locales + items_externos)

    return {
        "items_locales": items_locales,
        "items_externos": items_externos,
        "total_items": total_items,
        "total_monto": round(total_monto, 2),
    }


# ─── CARRITO: ACTUALIZAR CANTIDAD ─────────────────────────────────────────────

class _CantBody(_Base):
    cantidad: int
    tipo: str  # "local" | "externo"

@router.put("/carrito/{id_item}/cantidad")
def actualizar_cantidad_carrito(
    id_item: int,
    body: _CantBody,
    current_user: dict = Depends(get_current_user),  # ✅ no require_role para consistencia
    db: Session = Depends(get_db),
):
    uid = get_uid(current_user)
    if body.cantidad < 1:
        raise HTTPException(status_code=400, detail="Cantidad mínima es 1")
    if body.cantidad > 10:
        raise HTTPException(status_code=400, detail="Cantidad máxima es 10")

    if body.tipo == "externo":
        db.execute(
            text("UPDATE carrito_externo SET cantidad=:q WHERE id_carrito_externo=:id AND id_cliente=:u"),
            {"q": body.cantidad, "id": id_item, "u": uid}
        )
    else:
        db.execute(
            text("UPDATE carrito SET cantidad=:q WHERE id_carrito=:id AND id_cliente=:u"),
            {"q": body.cantidad, "id": id_item, "u": uid}
        )
    db.commit()
    return {"success": True}


# ─── CARRITO: ELIMINAR ITEM ───────────────────────────────────────────────────

@router.delete("/carrito/{id_item}")
def eliminar_carrito(
    id_item: int,
    tipo: str = "local",
    current_user: dict = Depends(get_current_user),  # ✅ consistente con los demás
    db: Session = Depends(get_db),
):
    uid = get_uid(current_user)

    if tipo == "externo":
        db.execute(
            text("DELETE FROM carrito_externo WHERE id_carrito_externo=:id AND id_cliente=:u"),
            {"id": id_item, "u": uid}
        )
    else:
        db.execute(
            text("DELETE FROM carrito WHERE id_carrito=:id AND id_cliente=:u"),
            {"id": id_item, "u": uid}
        )
    db.commit()
    return {"success": True, "message": "Item eliminado del carrito"}


# ─── CARRITO: VACIAR ──────────────────────────────────────────────────────────

@router.delete("/carrito")
def vaciar_carrito(
    current_user: dict = Depends(get_current_user),  # ✅ consistente
    db: Session = Depends(get_db),
):
    uid = get_uid(current_user)
    db.execute(text("DELETE FROM carrito WHERE id_cliente=:u"), {"u": uid})
    db.execute(
        text("DELETE FROM carrito_externo WHERE id_cliente=:u AND (estado='pendiente' OR estado IS NULL)"),
        {"u": uid}
    )
    db.commit()
    return {"success": True, "message": "Carrito vaciado"}


# ─── PEDIDOS: LISTAR ──────────────────────────────────────────────────────────

@router.get("/pedidos")
def pedidos_cliente(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    uid = get_uid(current_user)

    rows = db.execute(
        text("""SELECT p.id_pedido, p.total, p.estado, p.fecha,
                       p.estado_entrega, p.tipo_pedido, p.tipo_cambio,
                       COALESCE(pg.estado, 'sin_pago') as estado_pago,
                       pg.fecha_pago,
                       ue.direccion_entrega, ue.latitud, ue.longitud,
                       ue.nombre_receptor, ue.telefono_receptor
                FROM pedidos p
                LEFT JOIN pagos pg ON p.id_pedido=pg.id_pedido
                LEFT JOIN ubicacion_entrega ue ON p.id_pedido=ue.id_pedido
                WHERE p.id_cliente=:u
                ORDER BY p.fecha DESC"""),
        {"u": uid}
    ).fetchall()

    pedidos = []
    for r in rows:
        d = dict(r._mapping)
        if d.get("fecha"): d["fecha"] = d["fecha"].isoformat()
        if d.get("fecha_pago"): d["fecha_pago"] = d["fecha_pago"].isoformat()

        detalles = db.execute(
            text("""SELECT pd.cantidad, pd.precio, pd.tipo_producto,
                           p.nombre, p.imagen
                    FROM pedido_detalles pd
                    LEFT JOIN productos p ON pd.id_producto=p.id_producto
                    WHERE pd.id_pedido=:pid"""),
            {"pid": d["id_pedido"]}
        ).fetchall()
        d["detalles"] = []
        for det in detalles:
            det_d = dict(det._mapping)
            det_d["imagen_url"] = imagen_url(det_d.get("imagen"), det_d.get("nombre") or "")
            d["detalles"].append(det_d)

        envio = db.execute(
            text("""SELECT guia_aerea, aerolinea, estado,
                           fecha_salida_miami, fecha_llegada_bolivia
                    FROM envios_importacion WHERE id_pedido=:pid"""),
            {"pid": d["id_pedido"]}
        ).fetchone()
        if envio:
            envio_d = dict(envio._mapping)
            if envio_d.get("fecha_salida_miami"): envio_d["fecha_salida_miami"] = str(envio_d["fecha_salida_miami"])
            if envio_d.get("fecha_llegada_bolivia"): envio_d["fecha_llegada_bolivia"] = str(envio_d["fecha_llegada_bolivia"])
            d["envio"] = envio_d
        else:
            d["envio"] = None

        pedidos.append(d)

    return {"pedidos": pedidos}


# ─── PEDIDOS: MARCAR ENTREGADO ────────────────────────────────────────────────

@router.post("/pedidos/{id_pedido}/marcar-entregado")
def marcar_entregado(
    id_pedido: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    uid = get_uid(current_user)

    pedido = db.execute(
        text("SELECT * FROM pedidos WHERE id_pedido=:id AND id_cliente=:u"),
        {"id": id_pedido, "u": uid}
    ).fetchone()

    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    db.execute(
        text("UPDATE pedidos SET estado_entrega='entregado' WHERE id_pedido=:id"),
        {"id": id_pedido}
    )
    db.commit()
    return {"success": True, "message": "Pedido marcado como entregado"}


# ─── PEDIDOS: DETALLE ─────────────────────────────────────────────────────────

@router.get("/pedidos/{id_pedido}")
def detalle_pedido(
    id_pedido: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    uid = get_uid(current_user)

    row = db.execute(
        text("""
            SELECT p.id_pedido, p.total, p.estado, p.fecha,
                   p.estado_entrega, p.tipo_pedido,
                   COALESCE(pg.estado, 'sin_pago') AS estado_pago,
                   pg.fecha_pago, pg.metodo, pg.comprobante
            FROM pedidos p
            LEFT JOIN pagos pg ON p.id_pedido = pg.id_pedido
            WHERE p.id_pedido = :pid AND p.id_cliente = :uid
        """),
        {"pid": id_pedido, "uid": uid},
    ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    d = dict(row._mapping)
    for f in ("fecha", "fecha_pago"):
        if d.get(f):
            d[f] = d[f].isoformat()

    det_rows = db.execute(
        text("""
            SELECT pd.id_detalle, pd.cantidad, pd.precio,
                   pd.tipo_producto, pd.datos_externos,
                   p.nombre, p.imagen, p.descripcion
            FROM pedido_detalles pd
            LEFT JOIN productos p ON pd.id_producto = p.id_producto
            WHERE pd.id_pedido = :pid
        """),
        {"pid": id_pedido},
    ).fetchall()

    detalles = []
    for det in det_rows:
        det_d = dict(det._mapping)
        if det_d.get("tipo_producto") == "externo" and det_d.get("datos_externos"):
            try:
                ext = json.loads(det_d["datos_externos"])
                det_d["nombre"]     = ext.get("nombre", "Producto externo")
                det_d["imagen_url"] = ext.get("imagen", "")
            except Exception:
                det_d["imagen_url"] = imagen_url(det_d.get("imagen"), det_d.get("nombre") or "")
        else:
            det_d["imagen_url"] = imagen_url(det_d.get("imagen"), det_d.get("nombre") or "")
        detalles.append(det_d)
    d["detalles"] = detalles

    envio = db.execute(
        text("""
            SELECT e.guia_aerea, e.aerolinea, e.estado,
                   e.peso_total, e.observaciones,
                   e.fecha_salida_miami, e.fecha_llegada_bolivia, e.fecha_entrega_cliente,
                   dm.nombre_deposito, dm.direccion AS dir_deposito,
                   dm.telefono AS tel_deposito, dm.contacto AS contacto_deposito
            FROM envios_importacion e
            LEFT JOIN depositos_miami dm ON dm.estado = 1
            WHERE e.id_pedido = :pid
            LIMIT 1
        """),
        {"pid": id_pedido},
    ).fetchone()

    if envio:
        envio_d = dict(envio._mapping)
        for f in ("fecha_salida_miami", "fecha_llegada_bolivia", "fecha_entrega_cliente"):
            if envio_d.get(f):
                envio_d[f] = str(envio_d[f])
        d["envio"] = envio_d
    else:
        d["envio"] = None

    ubi = db.execute(
        text("""
            SELECT direccion_entrega, latitud, longitud,
                   referencia, nombre_receptor, telefono_receptor
            FROM ubicacion_entrega
            WHERE id_pedido = :pid
        """),
        {"pid": id_pedido},
    ).fetchone()
    d["ubicacion"] = dict(ubi._mapping) if ubi else None

    tracking = db.execute(
        text("""
            SELECT ue.latitud, ue.longitud, ue.activo,
                   em.nombre AS nombre_empleado
            FROM ubicacion_empleado ue
            JOIN empleados em ON ue.id_empleado = em.id_empleado
            WHERE ue.id_pedido = :pid AND ue.activo = true
            ORDER BY ue.id DESC
            LIMIT 1
        """),
        {"pid": id_pedido},
    ).fetchone()
    d["tracking_empleado"] = dict(tracking._mapping) if tracking else None

    return d


# ─── PEDIDOS: GUARDAR UBICACION ───────────────────────────────────────────────

class _UbicacionBody(_Base):
    latitud:           float
    longitud:          float
    direccion_entrega: str
    referencia:        _Opt[str] = None
    nombre_receptor:   _Opt[str] = None
    telefono_receptor: _Opt[str] = None

@router.post("/pedidos/{id_pedido}/ubicacion")
def guardar_ubicacion(
    id_pedido: int,
    body: _UbicacionBody,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    uid = get_uid(current_user)

    pedido = db.execute(
        text("""
            SELECT p.estado,
                   COALESCE(pg.estado, 'sin_pago') AS estado_pago
            FROM pedidos p
            LEFT JOIN pagos pg ON p.id_pedido = pg.id_pedido
            WHERE p.id_pedido = :pid AND p.id_cliente = :uid
        """),
        {"pid": id_pedido, "uid": uid},
    ).fetchone()

    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    p = dict(pedido._mapping)
    if p["estado"] not in ("pagado",) and p["estado_pago"] not in ("pagado", "confirmado"):
        raise HTTPException(
            status_code=400,
            detail="El pedido debe estar pagado para establecer ubicación"
        )

    existe = db.execute(
        text("SELECT id FROM ubicacion_entrega WHERE id_pedido = :pid"),
        {"pid": id_pedido},
    ).fetchone()

    if existe:
        db.execute(
            text("""UPDATE ubicacion_entrega
                    SET latitud=:lat, longitud=:lng,
                        direccion_entrega=:dir, referencia=:ref,
                        nombre_receptor=:nr, telefono_receptor=:tr
                    WHERE id_pedido=:pid"""),
            {"lat": body.latitud, "lng": body.longitud,
             "dir": body.direccion_entrega, "ref": body.referencia,
             "nr": body.nombre_receptor, "tr": body.telefono_receptor,
             "pid": id_pedido},
        )
    else:
        db.execute(
            text("""INSERT INTO ubicacion_entrega
                        (id_pedido, id_cliente, latitud, longitud,
                         direccion_entrega, referencia, nombre_receptor, telefono_receptor)
                    VALUES (:pid, :uid, :lat, :lng, :dir, :ref, :nr, :tr)"""),
            {"pid": id_pedido, "uid": uid,
             "lat": body.latitud, "lng": body.longitud,
             "dir": body.direccion_entrega, "ref": body.referencia,
             "nr": body.nombre_receptor, "tr": body.telefono_receptor},
        )

    db.commit()
    return {"success": True, "message": "Ubicación guardada correctamente"}


# ─── COTIZACIÓN: CALCULAR ─────────────────────────────────────────────────────

@router.post("/cotizacion/calcular")
def calcular_cotizacion(
    data: dict,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    precio = float(data.get("precio", 0))
    peso = float(data.get("peso", 0.5))
    categoria = data.get("categoria", "otros")
    largo = float(data.get("largo", 20))
    ancho = float(data.get("ancho", 15))
    alto = float(data.get("alto", 1))

    if precio <= 0 or peso <= 0:
        raise HTTPException(status_code=400, detail="Precio y peso deben ser mayores a 0")

    tc = get_tipo_cambio(db)
    return calcular_importacion(precio, peso, categoria, largo, ancho, alto, tipo_cambio=tc)


# ─── COTIZACIÓN: GUARDAR ──────────────────────────────────────────────────────

@router.post("/cotizacion/guardar")
def guardar_cotizacion(
    data: dict,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    uid = get_uid(current_user)
    precio = float(data.get("precio", 0))
    peso = float(data.get("peso", 0.5))
    categoria = data.get("categoria", "otros")
    largo = float(data.get("largo", 20))
    ancho = float(data.get("ancho", 15))
    alto = float(data.get("alto", 1))
    nombre_producto = data.get("nombre_producto", "Producto")
    tamano = data.get("tamano", f"{largo}x{ancho}x{alto}")

    tc = get_tipo_cambio(db)
    cot = calcular_importacion(precio, peso, categoria, largo, ancho, alto, tipo_cambio=tc)

    db.execute(
        text("""INSERT INTO cotizaciones
                (id_cliente, nombre_producto, precio_base, peso, categoria, tamano,
                 costo_flete, costo_aduana, costo_almacen, costo_seguro, costo_total)
                VALUES (:u, :n, :pr, :pe, :cat, :tam, :fl, :ad, :alm, :seg, :tot)"""),
        {
            "u": uid, "n": nombre_producto, "pr": precio, "pe": peso,
            "cat": categoria, "tam": tamano,
            "fl": cot["desglose"]["flete"],
            "ad": cot["desglose"]["aduana"],
            "alm": cot["desglose"]["almacen"],
            "seg": cot["desglose"]["seguro"],
            "tot": cot["total"],
        }
    )
    db.commit()
    return {"success": True, "message": "Cotización guardada", "cotizacion": cot}


# ─── PEDIDO: CREAR DESDE CARRITO ──────────────────────────────────────────────

@router.post("/pedido/crear")
def crear_pedido(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    uid = int(get_uid(current_user))  # ✅ forzar int — get_uid devolvía string

    db.execute(text("SET LOCAL app.usuario_id = :uid"), {"uid": uid})
    db.execute(text("SET LOCAL app.tipo_usuario = 'cliente'"))

    locales = db.execute(
        text("""SELECT c.id_carrito, c.cantidad, c.id_producto,
                       p.precio, p.nombre
                FROM carrito c JOIN productos p ON c.id_producto=p.id_producto
                WHERE c.id_cliente=:u"""),
        {"u": uid}
    ).fetchall()

    externos = db.execute(
        text("SELECT * FROM carrito_externo WHERE id_cliente=:u AND (estado='pendiente' OR estado IS NULL)"),
        {"u": uid}
    ).fetchall()

    if not locales and not externos:
        raise HTTPException(status_code=400, detail="El carrito está vacío")

    total = sum(float(r.precio) * int(r.cantidad) for r in locales)
    total += sum(float(r.precio) * int(r.cantidad) for r in externos)
    tipo = "import"  # ✅ VARCHAR(10) — no cambiar, "importacion" tiene 11 chars

    tc = get_tipo_cambio(db)
    result = db.execute(
        text("""INSERT INTO pedidos (id_cliente, total, estado, fecha, tipo_pedido, estado_entrega, tipo_cambio)
                VALUES (:u, :t, 'pendiente', NOW(), :tp, 'pendiente', :tc)
                RETURNING id_pedido"""),
        {"u": uid, "t": round(total, 2), "tp": tipo, "tc": tc}
    ).fetchone()
    id_pedido = result.id_pedido

    for r in locales:
        db.execute(
            text("""INSERT INTO pedido_detalles (id_pedido, id_producto, cantidad, precio, tipo_producto)
                    VALUES (:pid, :prod, :qty, :precio, 'local')"""),
            {"pid": id_pedido, "prod": r.id_producto, "qty": r.cantidad, "precio": r.precio}
        )

    for r in externos:
        datos_ext = json.dumps({
            "nombre": r.nombre,
            "precio": float(r.precio),
            "plataforma": r.plataforma,
            "url": r.url or "",
            "imagen": getattr(r, "imagen", "") or "",
        })
        db.execute(
            text("""INSERT INTO pedido_detalles
                    (id_pedido, id_producto, cantidad, precio, tipo_producto, datos_externos)
                    VALUES (:pid, NULL, :qty, :precio, 'externo', CAST(:datos AS jsonb))"""),
            {"pid": id_pedido, "qty": r.cantidad, "precio": r.precio, "datos": datos_ext}
        )

    db.execute(text("DELETE FROM carrito WHERE id_cliente=:u"), {"u": uid})
    db.execute(
        text("UPDATE carrito_externo SET estado='en_pedido' WHERE id_cliente=:u AND (estado='pendiente' OR estado IS NULL)"),
        {"u": uid}
    )

    try:
        db.execute(
            text("""INSERT INTO notificaciones
                    (id_usuario, tipo_usuario, titulo, mensaje, tipo, leido, fecha_creacion)
                    VALUES (:u, 'cliente', '✅ Pedido creado', :msg, 'pedido', false, NOW())"""),
            {"u": uid, "msg": f"Tu pedido #VM{id_pedido} fue creado. Total: ${round(total,2)}. Procede al pago."}
        )
    except Exception:
        pass

    db.commit()
    return {
        "success": True,
        "id_pedido": id_pedido,
        "total": round(total, 2),
        "message": f"Pedido #VM{id_pedido} creado correctamente"
    }
# ─── PAGO: INFO ───────────────────────────────────────────────────────────────

@router.get("/pago/info")
def info_pago(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    config = db.execute(
        text("SELECT qr_filename, nombre_empresa, moneda FROM configuracion LIMIT 1")
    ).fetchone()

    qr_url = None
    if config and config.qr_filename:
        qr_url = f"http://localhost:8000/uploads/qr/{config.qr_filename}"

    return {
        "qr_url": qr_url,
        "nombre_empresa": config.nombre_empresa if config else "VMBol en Red",
        "moneda": config.moneda if config else "USD",
        "metodos": ["Transferencia bancaria", "QR Bancosol", "QR BNB", "Efectivo"],
    }


# ─── PAGO: SUBIR COMPROBANTE ──────────────────────────────────────────────────

UPLOAD_PAGOS = "uploads/payments"
os.makedirs(UPLOAD_PAGOS, exist_ok=True)

@router.post("/pago/subir")
def subir_comprobante(
    id_pedido:   int       = Form(...),
    metodo:      str       = Form(...),
    monto:       float     = Form(...),
    comprobante: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    uid = get_uid(current_user)

    pedido = db.execute(
        text("SELECT id_pedido, total FROM pedidos WHERE id_pedido=:pid AND id_cliente=:u"),
        {"pid": id_pedido, "u": uid}
    ).fetchone()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    pago_existente = db.execute(
        text("SELECT estado FROM pagos WHERE id_pedido=:pid"),
        {"pid": id_pedido}
    ).fetchone()
    if pago_existente and pago_existente.estado in ("pagado", "confirmado"):
        raise HTTPException(status_code=400, detail="Este pedido ya tiene un pago confirmado")

    ext = os.path.splitext(comprobante.filename or "comp.jpg")[1] or ".jpg"
    if ext.lower() not in {".jpg", ".jpeg", ".png", ".pdf", ".webp"}:
        raise HTTPException(status_code=400, detail="Formato no permitido. Usa JPG, PNG o PDF.")

    filename = f"pago_{id_pedido}_{uid}{ext}"
    path = os.path.join(UPLOAD_PAGOS, filename)
    with open(path, "wb") as f:
        shutil.copyfileobj(comprobante.file, f)

    if pago_existente:
        db.execute(
            text("""UPDATE pagos SET estado='pendiente', metodo=:m,
                    monto=:monto, comprobante=:comp, fecha_pago=NOW()
                    WHERE id_pedido=:pid"""),
            {"m": metodo, "monto": monto, "comp": filename, "pid": id_pedido}
        )
    else:
        db.execute(
            text("""INSERT INTO pagos (id_pedido, estado, metodo, monto, comprobante, fecha_pago)
                    VALUES (:pid, 'pendiente', :m, :monto, :comp, NOW())"""),
            {"pid": id_pedido, "m": metodo, "monto": monto, "comp": filename}
        )

    try:
        db.execute(
            text("""INSERT INTO notificaciones
                    (id_usuario, tipo_usuario, titulo, mensaje, tipo, leido, fecha_creacion)
                    VALUES (:u, 'cliente', '💳 Comprobante enviado', :msg, 'pago', false, NOW())"""),
            {"u": uid, "msg": f"Recibimos tu comprobante para el pedido #VM{id_pedido}. Lo revisaremos pronto."}
        )
    except Exception:
        pass

    db.commit()
    return {
        "success": True,
        "message": "Comprobante enviado correctamente. El administrador lo revisará pronto.",
        "id_pedido": id_pedido,
    }