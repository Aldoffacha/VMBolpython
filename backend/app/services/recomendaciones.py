import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import text
from mlxtend.frequent_patterns import apriori, association_rules
import logging
import time
import json
from math import sqrt

logger = logging.getLogger(__name__)

_rules_cache = {"rules": None, "ts": 0, "ttl": 300}
ID_OFFSET = 1_000_000
MAX_DB_AGE = 3600


def _build_basket(df):
    basket = df.groupby(["id_pedido", "id_producto"])["cantidad"].sum().unstack().fillna(0)
    basket = basket.map(lambda x: True if x > 0 else False)
    return basket


def _composite_score(support, confidence, lift):
    return round(lift * confidence * sqrt(support), 6)


def _cargar_datos_locales(db: Session):
    rows = db.execute(
        text("""
            SELECT pd.id_pedido, pd.id_producto, pd.cantidad, p.categoria
            FROM pedido_detalles pd
            JOIN pedidos pe ON pd.id_pedido = pe.id_pedido
            JOIN productos p ON pd.id_producto = p.id_producto
            WHERE pd.id_producto IS NOT NULL
              AND pe.estado IN ('pagado', 'enviado')
        """)
    ).fetchall()
    if not rows:
        return pd.DataFrame(columns=["id_pedido", "id_producto", "cantidad", "categoria"])
    df = pd.DataFrame(rows, columns=["id_pedido", "id_producto", "cantidad", "categoria"])
    df["id_producto"] = df["id_producto"].astype(int)
    df["categoria"] = df["categoria"].fillna("otros")
    return df


def _cargar_datos_publicos(db: Session):
    rows = db.execute(
        text("""
            SELECT pdp.id_transaccion, pp.id_producto_publico, pdp.cantidad, pp.categoria
            FROM pedido_detalles_publicos pdp
            JOIN productos_publicos pp ON pdp.id_producto_publico = pp.id_producto_publico
        """)
    ).fetchall()
    if not rows:
        return pd.DataFrame(columns=["id_pedido", "id_producto", "cantidad", "categoria"])
    df = pd.DataFrame(rows, columns=["id_pedido", "id_producto", "cantidad", "categoria"])
    df["id_producto"] = df["id_producto"].astype(int) + ID_OFFSET
    df["id_pedido"] = df["id_pedido"].apply(lambda x: -abs(hash(str(x))))
    df["categoria"] = df["categoria"].fillna("otros")
    return df


def _obtener_categorias(db):
    rows = db.execute(
        text("SELECT DISTINCT categoria FROM productos WHERE categoria IS NOT NULL AND categoria != '' AND estado = 1")
    ).fetchall()
    cats = [r[0] for r in rows]
    return cats if cats else ["otros"]


def _categoria_producto(pid, db):
    if pid >= ID_OFFSET:
        row = db.execute(
            text("SELECT categoria FROM productos_publicos WHERE id_producto_publico = :id"),
            {"id": pid - ID_OFFSET},
        ).fetchone()
    else:
        row = db.execute(
            text("SELECT categoria FROM productos WHERE id_producto = :id"),
            {"id": pid},
        ).fetchone()
    return row[0] if row else "otros"


def _train_apriori(basket, categoria, origen):
    if basket.shape[1] < 2:
        return []
    n = basket.shape[0]
    if n < 50:
        ms = 0.01
    elif n < 200:
        ms = 0.015
    else:
        ms = 0.02

    logger.info(f"Apriori [{origen}/{categoria}]: {n} transacciones, {basket.shape[1]} productos, min_support={ms}")
    frequent = apriori(basket, min_support=ms, use_colnames=True, low_memory=True)
    if frequent.empty:
        return []
    rules = association_rules(frequent, metric="lift", min_threshold=1.0)
    rules = rules.sort_values("lift", ascending=False)
    rules = rules[rules["antecedents"].apply(len) > 0]
    rules = rules[rules["consequents"].apply(len) > 0]

    result = []
    for _, r in rules.iterrows():
        result.append({
            "antecedents": list(r["antecedents"]),
            "consequents": list(r["consequents"]),
            "support": round(r["support"], 6),
            "confidence": round(r["confidence"], 6),
            "lift": round(r["lift"], 6),
            "categoria": categoria,
            "origen": origen,
            "n_transacciones": n,
        })
    return result


def _crear_tabla_reglas(db):
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS reglas_asociacion (
            id_regla SERIAL PRIMARY KEY,
            categoria VARCHAR(50) NOT NULL DEFAULT 'todas',
            antecedentes TEXT NOT NULL,
            consecuentes TEXT NOT NULL,
            support NUMERIC(10,6) NOT NULL,
            confidence NUMERIC(10,6) NOT NULL,
            lift NUMERIC(10,6) NOT NULL,
            score NUMERIC(10,6) NOT NULL DEFAULT 0,
            origen VARCHAR(20) NOT NULL DEFAULT 'local',
            n_transacciones INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT NOW()
        )
    """))
    db.execute(text("CREATE INDEX IF NOT EXISTS idx_reglas_categoria ON reglas_asociacion(categoria)"))
    db.execute(text("CREATE INDEX IF NOT EXISTS idx_reglas_origen ON reglas_asociacion(origen)"))
    db.commit()


def _guardar_reglas(db, rules, categoria, origen):
    if not rules:
        return
    db.execute(
        text("DELETE FROM reglas_asociacion WHERE categoria = :cat AND origen = :o"),
        {"cat": categoria, "o": origen},
    )
    for r in rules:
        ant = list(r["antecedents"]) if isinstance(r["antecedents"], (list, frozenset)) else r["antecedents"]
        con = list(r["consequents"]) if isinstance(r["consequents"], (list, frozenset)) else r["consequents"]
        score = _composite_score(r["support"], r["confidence"], r["lift"])
        db.execute(
            text("""
                INSERT INTO reglas_asociacion
                    (categoria, antecedentes, consecuentes, support, confidence, lift, score, origen, n_transacciones)
                VALUES (:cat, :ant, :con, :sup, :conf, :lift, :score, :origen, :n)
            """),
            {
                "cat": categoria,
                "ant": json.dumps(ant),
                "con": json.dumps(con),
                "sup": r["support"],
                "conf": r["confidence"],
                "lift": r["lift"],
                "score": score,
                "origen": origen,
                "n": r.get("n_transacciones", 0),
            },
        )
    db.commit()
    logger.info(f"Guardadas {len(rules)} reglas [{origen}/{categoria}]")


def _cargar_reglas(db, categorias=None, origenes=None):
    rows = db.execute(text("SELECT * FROM reglas_asociacion ORDER BY score DESC")).fetchall()
    result = []
    for r in rows:
        if categorias and r.categoria not in categorias:
            continue
        if origenes and r.origen not in origenes:
            continue
        try:
            ant = json.loads(r.antecedentes)
            con = json.loads(r.consecuentes)
        except (json.JSONDecodeError, TypeError):
            continue
        result.append({
            "antecedents": ant,
            "consequents": con,
            "support": float(r.support),
            "confidence": float(r.confidence),
            "lift": float(r.lift),
            "categoria": r.categoria,
            "origen": r.origen,
            "n_transacciones": r.n_transacciones,
        })
    return result


def _reglas_en_db_recientes(db):
    row = db.execute(
        text("SELECT COUNT(*) as cnt, MAX(created_at) as max_ts FROM reglas_asociacion")
    ).fetchone()
    if not row or row.cnt == 0:
        return False
    if row.max_ts is None:
        return False
    age = (time.time() - row.max_ts.timestamp())
    return age < MAX_DB_AGE


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


def _producto_row_to_dict(r):
    return {
        "id_producto": r.id_producto,
        "nombre": r.nombre,
        "precio": float(r.precio),
        "imagen": r.imagen or "",
        "categoria": r.categoria or "otros",
        "confidence": 0,
        "lift": 0,
        "support": 0,
    }


def _fallback_recomendaciones(id_producto, db, top_n):
    cat = _categoria_producto(id_producto, db)

    rows = db.execute(
        text("""
            SELECT p.id_producto, p.nombre, p.precio, p.imagen, p.categoria
            FROM productos p
            WHERE p.estado = 1 AND p.categoria = :cat AND p.id_producto != :pid
            ORDER BY p.stock DESC
            LIMIT :lim
        """),
        {"cat": cat, "pid": id_producto, "lim": top_n},
    ).fetchall()
    if rows:
        return [_producto_row_to_dict(r) for r in rows]

    rows = db.execute(
        text("""
            SELECT p.id_producto, p.nombre, p.precio, p.imagen, p.categoria
            FROM productos p
            JOIN pedido_detalles pd ON pd.id_producto = p.id_producto
            JOIN pedidos pe ON pd.id_pedido = pe.id_pedido
            WHERE p.estado = 1 AND p.id_producto != :pid
              AND pe.estado IN ('pagado', 'enviado')
            GROUP BY p.id_producto
            ORDER BY COUNT(pd.id_detalle) DESC
            LIMIT :lim
        """),
        {"pid": id_producto, "lim": top_n},
    ).fetchall()
    if rows:
        return [_producto_row_to_dict(r) for r in rows]

    rows = db.execute(
        text("""
            SELECT id_producto, nombre, precio, imagen, categoria
            FROM productos WHERE estado = 1 AND id_producto != :pid
            LIMIT :lim
        """),
        {"pid": id_producto, "lim": top_n},
    ).fetchall()
    return [_producto_row_to_dict(r) for r in rows]


def _fallback_carrito(product_ids, db, top_n):
    rows = db.execute(
        text("""
            SELECT p.id_producto, p.nombre, p.precio, p.imagen, p.categoria
            FROM productos p
            JOIN pedido_detalles pd ON pd.id_producto = p.id_producto
            JOIN pedidos pe ON pd.id_pedido = pe.id_pedido
            WHERE p.estado = 1
              AND pe.estado IN ('pagado', 'enviado')
            GROUP BY p.id_producto
            ORDER BY COUNT(pd.id_detalle) DESC
            LIMIT :lim
        """),
        {"lim": top_n + len(product_ids)},
    ).fetchall()
    filtered = [r for r in rows if r.id_producto not in product_ids][:top_n]
    return [_producto_row_to_dict(r) for r in filtered]


def _aplicar_score(recomendados):
    rows_list = []
    for pid, vals in recomendados.items():
        avg_conf = sum(vals["confidence"]) / len(vals["confidence"])
        avg_lift = sum(vals["lift"]) / len(vals["lift"])
        avg_sup = sum(vals["support"]) / len(vals["support"])
        score = _composite_score(avg_sup, avg_conf, avg_lift)
        rows_list.append({
            "id_producto": pid,
            "confidence": round(avg_conf, 4),
            "lift": round(avg_lift, 4),
            "support": round(avg_sup, 4),
            "_score": score,
        })
    rows_list.sort(key=lambda x: x["_score"], reverse=True)
    return rows_list


def _armar_resultado(rows_list, top_n, db):
    top_ids = [r["id_producto"] for r in rows_list[:top_n]]
    productos = _productos_info(top_ids, db)
    result = []
    for p in productos:
        match = next(r for r in rows_list if r["id_producto"] == p["id_producto"])
        result.append({
            "id_producto": p["id_producto"],
            "nombre": p["nombre"],
            "precio": p["precio"],
            "imagen": p["imagen"],
            "categoria": p["categoria"],
            "confidence": match["confidence"],
            "lift": match["lift"],
            "support": match["support"],
        })
    return result


def entrenar_modelo(db: Session, force: bool = False):
    now = time.time()
    if not force and _rules_cache["rules"] is not None and (now - _rules_cache["ts"]) < _rules_cache["ttl"]:
        logger.debug("Usando reglas en caché (in-memory)")
        return _rules_cache["rules"]

    _crear_tabla_reglas(db)

    if not force and _reglas_en_db_recientes(db):
        logger.info("Cargando reglas desde la base de datos")
        rules = _cargar_reglas(db)
        _rules_cache["rules"] = rules
        _rules_cache["ts"] = now
        return rules

    logger.info("Entrenando modelo Apriori desde cero...")
    df_local = _cargar_datos_locales(db)

    df_publico = pd.DataFrame(columns=["id_pedido", "id_producto", "cantidad", "categoria"])
    if _tabla_productos_publicos_existe(db):
        try:
            df_publico = _cargar_datos_publicos(db)
        except Exception as e:
            logger.warning(f"Error cargando datos públicos: {e}")

    categorias = _obtener_categorias(db)
    all_rules = []

    for cat in categorias:
        df_cat = df_local[df_local["categoria"] == cat]
        if df_cat.empty:
            continue
        basket = _build_basket(df_cat)
        rules = _train_apriori(basket, cat, "local")
        _guardar_reglas(db, rules, cat, "local")
        all_rules.extend(rules)

    if not df_local.empty:
        basket = _build_basket(df_local)
        rules = _train_apriori(basket, "todas", "local")
        _guardar_reglas(db, rules, "todas", "local")
        all_rules.extend(rules)

    if not df_publico.empty:
        basket = _build_basket(df_publico)
        rules = _train_apriori(basket, "todas", "publico")
        _guardar_reglas(db, rules, "todas", "publico")
        all_rules.extend(rules)

    if not all_rules:
        logger.warning("No se generaron reglas de asociación")
        _rules_cache["rules"] = []
        _rules_cache["ts"] = now
        return []

    all_rules.sort(
        key=lambda r: _composite_score(r["support"], r["confidence"], r["lift"]),
        reverse=True,
    )

    _rules_cache["rules"] = all_rules
    _rules_cache["ts"] = now
    logger.info(f"Total reglas generadas: {len(all_rules)}")
    return all_rules


def obtener_recomendaciones(id_producto: int, db: Session, top_n: int = 5):
    all_rules = entrenar_modelo(db)
    cat = _categoria_producto(id_producto, db)

    recomendados = {}

    def add_rules(rules_list, weight=1.0):
        for r in rules_list:
            ant = list(r["antecedents"])
            con = list(r["consequents"])
            if id_producto in ant:
                for prod_id in con:
                    if int(prod_id) == id_producto:
                        continue
                    pid = int(prod_id)
                    if pid not in recomendados:
                        recomendados[pid] = {"confidence": [], "lift": [], "support": []}
                    recomendados[pid]["confidence"].append(r["confidence"] * weight)
                    recomendados[pid]["lift"].append(r["lift"] * weight)
                    recomendados[pid]["support"].append(r["support"] * weight)

    add_rules(
        [r for r in all_rules if r.get("categoria") == cat and r.get("origen") == "local"],
        weight=1.0,
    )
    add_rules(
        [r for r in all_rules if r.get("categoria") == "todas" and r.get("origen") == "local"],
        weight=0.8,
    )
    add_rules(
        [r for r in all_rules if r.get("categoria") == cat and r.get("origen") != "local"],
        weight=0.6,
    )
    add_rules(
        [r for r in all_rules if r.get("categoria") == "todas" and r.get("origen") == "publico"],
        weight=0.4,
    )

    if not recomendados:
        return _fallback_recomendaciones(id_producto, db, top_n)

    rows_list = _aplicar_score(recomendados)
    return _armar_resultado(rows_list, top_n, db)


def obtener_recomendaciones_por_carrito(product_ids: list[int], db: Session, top_n: int = 5):
    all_rules = entrenar_modelo(db)

    recomendados = {}
    for r in all_rules:
        ant = list(r["antecedents"])
        con = list(r["consequents"])
        if all(pid in ant for pid in product_ids):
            for prod_id in con:
                pid = int(prod_id)
                if pid in product_ids:
                    continue
                weight = 1.0
                o = r.get("origen", "")
                c = r.get("categoria", "")
                if o == "local" and c != "todas":
                    weight = 1.0
                elif o == "local":
                    weight = 0.8
                elif o == "publico":
                    weight = 0.4
                else:
                    weight = 0.6
                if pid not in recomendados:
                    recomendados[pid] = {"confidence": [], "lift": [], "support": []}
                recomendados[pid]["confidence"].append(r["confidence"] * weight)
                recomendados[pid]["lift"].append(r["lift"] * weight)
                recomendados[pid]["support"].append(r["support"] * weight)

    if not recomendados:
        return _fallback_carrito(product_ids, db, top_n)

    rows_list = _aplicar_score(recomendados)
    return _armar_resultado(rows_list, top_n, db)


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
            "categoria": r.get("categoria", "todas"),
            "origen": r.get("origen", "combinado"),
        })

    return result
