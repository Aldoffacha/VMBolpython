"""
Ingesta del dataset público Online Retail (UCI) a PostgreSQL.

Crea las tablas auxiliares:
  - productos_publicos    (catálogo con IDs numéricos)
  - pedido_detalles_publicos  (transacciones para Apriori)

Ejecutar:
  python scripts/ingestar_datos_publicos.py
"""

import pandas as pd
import numpy as np
from sqlalchemy import create_engine, text
import warnings

warnings.filterwarnings("ignore")

DATABASE_URL = "postgresql://postgres:A12345@localhost/vmbolenred"
ID_OFFSET = 1_000_000  # para evitar colisión con IDs locales
URL_UCI = "https://archive.ics.uci.edu/ml/machine-learning-databases/00352/Online%20Retail.xlsx"


def descargar_y_limpiar():
    print("Descargando Online Retail dataset desde UCI...")
    df = pd.read_excel(URL_UCI, engine="openpyxl")
    print(f" 原始: {len(df):,} filas")

    # Limpieza estándar
    df = df.dropna(subset=["CustomerID", "Description"])
    df = df[df["Quantity"] > 0]
    df = df[~df["InvoiceNo"].astype(str).str.startswith("C")]
    df["UnitPrice"] = df["UnitPrice"].clip(lower=0.01)
    df = df[df["Country"] == "United Kingdom"]

    print(f"  Limpio: {len(df):,} filas (solo UK, sin nulos/devoluciones)")
    return df


def crear_tablas(engine):
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS productos_publicos (
                id_producto_publico  SERIAL PRIMARY KEY,
                codigo_original      VARCHAR(50) NOT NULL UNIQUE,
                nombre               VARCHAR(255) NOT NULL,
                categoria            VARCHAR(100) DEFAULT 'otros',
                precio               NUMERIC(10,2) DEFAULT 0,
                imagen               VARCHAR(500) DEFAULT ''
            );
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS pedido_detalles_publicos (
                id_detalle          SERIAL PRIMARY KEY,
                id_transaccion      VARCHAR(20) NOT NULL,
                id_producto_publico INTEGER NOT NULL REFERENCES productos_publicos(id_producto_publico),
                cantidad            INTEGER NOT NULL
            );
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_pdp_transaccion ON pedido_detalles_publicos(id_transaccion);"))
    print("  Tablas creadas/verificadas")


def ingestar(df, engine):
    # 1. Construir catálogo de productos públicos
    catalogo = df[["StockCode", "Description"]].drop_duplicates().copy()
    catalogo.columns = ["codigo_original", "nombre"]
    catalogo["categoria"] = "otros"

    with engine.begin() as conn:
        # Insertar productos (ignorar duplicados si ya existen)
        for _, row in catalogo.iterrows():
            conn.execute(
                text("""
                    INSERT INTO productos_publicos (codigo_original, nombre, categoria)
                    VALUES (:cod, :nom, :cat)
                    ON CONFLICT (codigo_original) DO NOTHING
                """),
                {"cod": row["codigo_original"], "nom": row["nombre"], "cat": row["categoria"]},
            )

        # 2. Obtener mapping código_original → id_producto_publico
        mapping = {}
        result = conn.execute(text("SELECT id_producto_publico, codigo_original FROM productos_publicos")).fetchall()
        for r in result:
            mapping[r.codigo_original] = r.id_producto_publico

        # 3. Insertar transacciones (en lotes para no saturar)
        batch_size = 5000
        batches = 0
        total = 0

        for i in range(0, len(df), batch_size):
            batch = df.iloc[i : i + batch_size]
            rows = []
            for _, row in batch.iterrows():
                pub_id = mapping.get(row["StockCode"])
                if pub_id:
                    rows.append({
                        "id_transaccion": str(row["InvoiceNo"]),
                        "id_producto_publico": pub_id,
                        "cantidad": int(row["Quantity"]),
                    })
            if rows:
                conn.execute(
                    text("""
                        INSERT INTO pedido_detalles_publicos (id_transaccion, id_producto_publico, cantidad)
                        VALUES (:id_transaccion, :id_producto_publico, :cantidad)
                    """),
                    rows,
                )
                total += len(rows)
                batches += 1

        print(f"  Insertadas {total:,} filas en {batches} lotes")
        print(f"  Productos públicos en catálogo: {len(mapping):,}")
        print(f"  Transacciones únicas: {df['InvoiceNo'].nunique():,}")


def main():
    engine = create_engine(DATABASE_URL)

    # Verificar conexión
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("Conectado a PostgreSQL exitosamente")
    except Exception as e:
        print(f"ERROR conectando a PostgreSQL: {e}")
        return

    crear_tablas(engine)
    df = descargar_y_limpiar()
    ingestar(df, engine)
    print("\nIngesta completada. Ahora el modelo Apriori entrenará también con estos datos.")


if __name__ == "__main__":
    main()
