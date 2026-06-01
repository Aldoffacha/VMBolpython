# Machine Learning — Sistema de Recomendaciones (Market Basket Analysis)

## Algoritmo

**Apriori** — `mlxtend.frequent_patterns.apriori`

Genera **reglas de asociación** entre productos comprados juntos en los mismos pedidos. Se usan `association_rules` con métrica `lift` y umbral mínimo de `1.0`.

## Librerías usadas

| Librería | Versión | Uso |
|----------|---------|-----|
| `pandas` | 3.0.3 | Manipulación de datos: `DataFrame`, `groupby`, `unstack`, `sort_values`, `agg` |
| `mlxtend` | (última) | `apriori` para itemsets frecuentes, `association_rules` para reglas |
| `SQLAlchemy` | 2.0.48 | ORM + `text()` para queries raw a PostgreSQL |
| `FastAPI` | 0.135.1 | API REST que expone las recomendaciones |

## Datos de entrada

**Origen 1 (local):** Tabla `pedido_detalles` (PostgreSQL, DB `vmbolenred`).
- Columnas: `id_pedido`, `id_producto`, `cantidad`
- Filtro: pedidos con `estado IN ('pagado', 'enviado')`

**Origen 2 (público):** Tabla `pedido_detalles_publicos` (Online Retail UCI, ~400k transacciones UK).
- Mapeado a la misma estructura con `ID_OFFSET = 1_000_000` para evitar colisiones
- Productos en tabla `productos_publicos` con IDs auto-generados
- Se carga vía script `backend/scripts/ingestar_datos_publicos.py`

El modelo entrena con **ambos orígenes concatenados** (`pd.concat`), lo que le da ~400k transacciones adicionales para encontrar patrones de compra más robustos.

## Pipeline de datos (pandas)

1. `_cargar_datos_locales()` — query a `pedido_detalles` + `pedidos` (PostgreSQL)
2. `_cargar_datos_publicos()` — query a `pedido_detalles_publicos` + `productos_publicos` (Online Retail)
3. `pd.concat([df_local, df_publico])` — combina ambos orígenes
4. `df.groupby(["id_pedido", "id_producto"])["cantidad"].sum().unstack().fillna(0)` — matriz canasta (basket)
5. `.map(lambda x: 1 if x > 0 else 0)` — binariza (one-hot encode)
6. `apriori(basket, min_support=0.02, use_colnames=True)` — itemsets frecuentes
7. `association_rules(frequent, metric="lift", min_threshold=1.0)` — reglas de asociación
8. `sort_values("lift", ascending=False)` — ranking por relevancia
9. `groupby("id_producto").agg({"confidence": "mean", "lift": "mean", "support": "mean"})` — agrega por producto recomendado
10. `.head(top_n)` — top N recomendaciones

## Métricas de las reglas

| Métrica | Descripción | Umbral |
|---------|-------------|--------|
| **Support** | Frecuencia de la combinación en todos los pedidos | `min_support=0.02` (2%) |
| **Confidence** | Probabilidad de que se compre B dado A | — |
| **Lift** | Cuánto más probable es comprar B con A vs sin A | `min_threshold=1.0` (>1 = correlación positiva) |

## Endpoints de la API

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/recomendaciones/producto/{id_producto}` | GET | Recomendaciones para un producto específico |
| `/api/recomendaciones/carrito` | POST | Recomendaciones basadas en productos del carrito |
| `/api/recomendaciones/reglas` | GET | Todas las reglas de asociación (panel admin) |
| `/cliente/recomendaciones` | GET | Recomendaciones personalizadas para el cliente logueado |

## Lógica de negocio

- `obtener_recomendaciones(id_producto)` → busca reglas donde el producto esté en `antecedents` y devuelve los `consequents`
- `obtener_recomendaciones_por_carrito(product_ids)` → busca reglas donde **todos** los productos del carrito estén en `antecedents`
- `entrenar_modelo()` ejecuta Apriori completo cada vez que se consulta (sin caché persistente)
- Las recomendaciones se ordenan por `lift` descendente, luego `confidence`, luego `support`

## Frontend

- **Admin:** `frontend/app/admin/recomendaciones/page.jsx` — tabla con reglas, paginación, stats (lift/confidence/support promedio) y botón de re-entrenar
- **Cliente:** `frontend/app/cliente/dashboard/page.jsx` — carrusel de productos recomendados vía endpoint `/cliente/recomendaciones`

## Otras implementaciones posibles

- **FP-Growth** — más eficiente que Apriori para datasets grandes (también disponible en mlxtend)
- **Filtrado colaborativo (user-based)** — recomendar productos que usuarios similares compraron
- **Filtrado colaborativo (item-based)** — recomendar productos similares a los que el usuario compró (Similitud de Coseno, Pearson)
- **Matrix Factorization (SVD, NMF)** — descomposición de matriz usuario-producto para descubrir factores latentes
- **Content-based filtering** — recomendar productos con atributos similares (categoría, descripción usando TF-IDF + cosine similarity)
- **Deep Learning (NeuMF, NCF)** — redes neuronales para capturar interacciones no lineales
- **Híbridos** — combinar varias técnicas (ej. content-based + collaborative filtering)
- **Modelo basado en embeddings** — usar Word2Vec/Doc2Vec sobre secuencias de compra
- **Reglas de asociación temporales** — analizar secuencias en el tiempo (qué se compra antes/después)

---

## Notebooks de análisis

Se incluyen dos notebooks Jupyter en `notebooks/`:

| Notebook | Descripción |
|----------|-------------|
| `01_eda_apriori_datos_propios.ipynb` | Conecta a PostgreSQL (`vmbolenred`), extrae pedidos, construye basket, entrena Apriori y visualiza reglas con datos reales. |
| `02_eda_apriori_dataset_publico.ipynb` | Descarga **Online Retail (UCI)** (~540k transacciones UK), aplica el mismo pipeline Apriori como benchmark. |

---

## Scripts

| Script | Descripción |
|--------|-------------|
| `backend/scripts/ingestar_datos_publicos.py` | Descarga el dataset Online Retail (UCI), lo limpia y lo inserta en las tablas `productos_publicos` y `pedido_detalles_publicos` de PostgreSQL. Ejecutar una vez para poblar los datos públicos. |

```powershell
# Ingestar datos públicos (una sola vez)
.\backend\venv\Scripts\python backend\scripts\ingestar_datos_publicos.py

# Iniciar notebooks
.\backend\venv\Scripts\jupyter notebook notebooks\
```

O abrir los `.ipynb` en VS Code y seleccionar kernel `.\backend\venv\Scripts\python.exe`.
