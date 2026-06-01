import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import text
from mlxtend.frequent_patterns import apriori, association_rules
import logging
import time

logger = logging.getLogger(__name__)

_rules_cache = {"rules": None, "ts": 0, "ttl": 300}  # cache 5 min
ID_OFFSET = 1_000_000


def _build_basket(df):
    basket = df.groupby(["id_pedido", "id_producto"])["cantidad"].sum().unstack().fillna(0)
    basket = basket.map(lambda x: 1 if x > 0 else 0)
    return basket


def _cargar_datos_locales(db: Session):
    rows = db.execute(
        text("""
            SELECT pd.id_pedido, pd.id_producto, pd.cantidad
            FROM pedido_detalles pd
            JOIN pedidos pe ON pd.id_pedido = pe.id_pedido
            WHERE pd.id_producto IS NOT NULL
              AND pe.estado IN ('pagado', 'enviado')
        """)
    ).fetchall()
    if not rows:
        return pd.DataFrame(columns=["id_pedido", "id_producto", "cantidad"])
    df = pd.DataFrame(rows, columns=["id_pedido", "id_producto", "cantidad"])
    df["id_producto"] = df["id_producto"].astype(int)
    return df


def _cargar_datos_publicos(db: Session):
    """Carga transacciones del dataset público Online Retail."""
    rows = db.execute(
        text("""
            SELECT pdp.id_transaccion, pp.id_producto_publico, pdp.cantidad
            FROM pedido_detalles_publicos pdp
            JOIN productos_publicos pp ON pdp.id_producto_publico = pp.id_producto_publico
        """)
    ).fetchall()
    if not rows:
        return pd.DataFrame(columns=["id_pedido", "id_producto", "cantidad"])
    df = pd.DataFrame(rows, columns=["id_pedido", "id_producto", "cantidad"])
    df["id_producto"] = df["id_producto"].astype(int) + ID_OFFSET
    df["id_pedido"] = df["id_pedido"].apply(lambda x: -abs(hash(str(x))))  # IDs únicos negativos
    return df


def _nombre_producto(pid: int, db: Session) -> str:
    if pid >= ID_OFFSET:
        row = db.execute(
            text("SELECT nombre FROM productos_publicos WHERE id_producto_publico = :id"),
            {"id": pid - ID_OFFSET},
        ).fetchone()
        return row.nombre if row else f"Público #{pid - ID_OFFSET}"
    row = db.execute(
        text("SELECT nombre FROM productos WHERE id_producto = :id"),
        {"id": pid},
    ).fetchone()
    return row.nombre if row else f"ID #{pid}"


def _productos_info(ids: list[int], db: Session):
    """Retorna lista de {id_producto, nombre, precio, imagen, categoria} desde ambas tablas."""
    ids_locales = [i for i in ids if i < ID_OFFSET]
    ids_publicos = [i - ID_OFFSET for i in ids if i >= ID_OFFSET]
    result = []

    if ids_locales:
        rows = db.execute(
            text("SELECT id_producto, nombre, precio, imagen, categoria FROM productos WHERE id_producto = ANY(:ids)"),
            {"ids": ids_locales},
        ).fetchall()
        for r in rows:
            result.append({
                "id_producto": r.id_producto,
                "nombre": r.nombre,
                "precio": float(r.precio),
                "imagen": r.imagen or "",
                "categoria": r.categoria,
            })

    if ids_publicos:
        rows = db.execute(
            text("SELECT id_producto_publico, nombre, precio, imagen, categoria FROM productos_publicos WHERE id_producto_publico = ANY(:ids)"),
            {"ids": ids_publicos},
        ).fetchall()
        for r in rows:
            result.append({
                "id_producto": r.id_producto_publico + ID_OFFSET,
                "nombre": f"[Público] {r.nombre}",
                "precio": float(r.precio) if r.precio else 0.0,
                "imagen": r.imagen or "",
                "categoria": r.categoria or "otros",
            })

    return result


def _tabla_productos_publicos_existe(db: Session) -> bool:
    try:
        db.execute(text("SELECT 1 FROM productos_publicos LIMIT 1"))
        return True
    except Exception:
        return False


def entrenar_modelo(db: Session, force: bool = False):
    now = time.time()
    if not force and _rules_cache["rules"] is not None and (now - _rules_cache["ts"]) < _rules_cache["ttl"]:
        logger.debug("Usando reglas en caché")
        return _rules_cache["rules"]

    df_local = _cargar_datos_locales(db)

    df_publico = pd.DataFrame(columns=["id_pedido", "id_producto", "cantidad"])
    if _tabla_productos_publicos_existe(db):
        df_publico = _cargar_datos_publicos(db)

    df = pd.concat([df_local, df_publico], ignore_index=True)

    if df.empty:
        return []

    basket = _build_basket(df)

    if basket.shape[1] < 2:
        return []

    n_transacciones = basket.shape[0]
    n_productos = basket.shape[1]

    # min_support adaptativo según el volumen de datos
    if n_transacciones < 100:
        min_support = 0.01
    elif n_transacciones < 500:
        min_support = 0.015
    else:
        min_support = 0.02

    logger.info(f"Entrenando Apriori: {n_transacciones} transacciones, {n_productos} productos, min_support={min_support}")

    frequent = apriori(basket, min_support=min_support, use_colnames=True, low_memory=True)

    if frequent.empty:
        logger.warning("No se encontraron itemsets frecuentes")
        return []

    rules = association_rules(frequent, metric="lift", min_threshold=1.0)

    rules = rules.sort_values("lift", ascending=False)

    rules = rules[rules["antecedents"].apply(len) > 0]
    rules = rules[rules["consequents"].apply(len) > 0]

    result = rules.to_dict("records")
    _rules_cache["rules"] = result
    _rules_cache["ts"] = now
    logger.info(f"Reglas generadas: {len(result)} (cacheadas)")
    return result


def obtener_recomendaciones(id_producto: int, db: Session, top_n: int = 5):
    rules = entrenar_modelo(db)

    recomendados = []
    for r in rules:
        ant = list(r["antecedents"])
        con = list(r["consequents"])
        if id_producto in ant:
            for prod_id in con:
                if prod_id != id_producto:
                    recomendados.append({
                        "id_producto": int(prod_id),
                        "confidence": round(r["confidence"], 4),
                        "lift": round(r["lift"], 4),
                        "support": round(r["support"], 4),
                    })

    if not recomendados:
        return []

    df_rec = pd.DataFrame(recomendados)
    df_rec = df_rec.groupby("id_producto").agg({
        "confidence": "mean",
        "lift": "mean",
        "support": "mean",
    }).reset_index()
    df_rec = df_rec.sort_values(["lift", "confidence", "support"], ascending=False)

    top_ids = df_rec.head(top_n)["id_producto"].tolist()

    productos = _productos_info(top_ids, db)

    result = []
    for p in productos:
        match = df_rec[df_rec["id_producto"] == p["id_producto"]].iloc[0]
        result.append({
            "id_producto": p["id_producto"],
            "nombre": p["nombre"],
            "precio": p["precio"],
            "imagen": p["imagen"],
            "categoria": p["categoria"],
            "confidence": round(float(match["confidence"]), 4),
            "lift": round(float(match["lift"]), 4),
            "support": round(float(match["support"]), 4),
        })

    return result


def obtener_recomendaciones_por_carrito(product_ids: list[int], db: Session, top_n: int = 5):
    rules = entrenar_modelo(db)

    puntajes = {}
    for r in rules:
        ant = list(r["antecedents"])
        con = list(r["consequents"])

        if all(pid in ant for pid in product_ids):
            for prod_id in con:
                if prod_id not in product_ids:
                    if prod_id not in puntajes:
                        puntajes[prod_id] = {"confidence": [], "lift": [], "support": []}
                    puntajes[prod_id]["confidence"].append(r["confidence"])
                    puntajes[prod_id]["lift"].append(r["lift"])
                    puntajes[prod_id]["support"].append(r["support"])

    if not puntajes:
        return []

    rows_list = []
    for pid, vals in puntajes.items():
        rows_list.append({
            "id_producto": int(pid),
            "confidence": sum(vals["confidence"]) / len(vals["confidence"]),
            "lift": sum(vals["lift"]) / len(vals["lift"]),
            "support": sum(vals["support"]) / len(vals["support"]),
        })

    df_rec = pd.DataFrame(rows_list).sort_values(["lift", "confidence", "support"], ascending=False)
    top_ids = df_rec.head(top_n)["id_producto"].tolist()

    productos = _productos_info(top_ids, db)

    result = []
    for p in productos:
        match = df_rec[df_rec["id_producto"] == p["id_producto"]].iloc[0]
        result.append({
            "id_producto": p["id_producto"],
            "nombre": p["nombre"],
            "precio": p["precio"],
            "imagen": p["imagen"],
            "categoria": p["categoria"],
            "confidence": round(float(match["confidence"]), 4),
            "lift": round(float(match["lift"]), 4),
            "support": round(float(match["support"]), 4),
        })

    return result


def obtener_todas_las_reglas(db: Session, force: bool = False):
    rules = entrenar_modelo(db, force=force)
    result = []
    for r in rules:
        ant_ids = sorted([int(x) for x in r["antecedents"]])
        con_ids = sorted([int(x) for x in r["consequents"]])

        ant_list = [{"id": pid, "nombre": _nombre_producto(pid, db)} for pid in ant_ids]
        con_list = [{"id": pid, "nombre": _nombre_producto(pid, db)} for pid in con_ids]

        result.append({
            "antecedentes": ant_list,
            "consecuentes": con_list,
            "support": round(r["support"], 4),
            "confidence": round(r["confidence"], 4),
            "lift": round(r["lift"], 4),
        })

    return result
