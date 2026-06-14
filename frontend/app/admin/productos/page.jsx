"use client";

import "@/styles/admin.css";

import { useEffect, useState, useCallback, Fragment } from "react";
import { useRouter } from "next/navigation";
import { useAdminCurrency } from "@/lib/AdminCurrencyContext";


const API = "http://localhost:8000";

function getToken() {
  return document.cookie.split("; ").find(r => r.startsWith("access_token="))?.split("=")[1];
}

const CATEGORIAS_ADMIN = [
  { group: "Electrónico",  options: [
    { value: "gaming",        label: "Gaming"        },
    { value: "audio",         label: "Audio"         },
    { value: "celulares",     label: "Celulares"     },
    { value: "computadoras",  label: "Computadoras"  },
    { value: "fotografia",    label: "Fotografía"    },
  ]},
  { group: "Ropa", options: [
    { value: "ropa_hombre",   label: "Ropa Hombre"   },
    { value: "ropa_mujer",    label: "Ropa Mujer"    },
    { value: "calzado",       label: "Calzado"       },
    { value: "accesorios",    label: "Accesorios"    },
  ]},
  { group: "Hogar", options: [
    { value: "cocina",        label: "Cocina"        },
    { value: "dormitorio",    label: "Dormitorio"    },
    { value: "decoracion",    label: "Decoración"    },
  ]},
  { group: "Deportes", options: [
    { value: "fitness",       label: "Fitness"       },
    { value: "futbol",        label: "Fútbol"        },
    { value: "outdoor",       label: "Outdoor"       },
  ]},
  { group: "Otros", options: [
    { value: "juguetes",      label: "Juguetes"      },
    { value: "libros",        label: "Libros"        },
    { value: "otros",         label: "Otros"         },
  ]},
];
const EMPTY_FORM = { nombre: "", descripcion: "", precio: "", stock: "0", categoria: "otros", imagen_actual: "" };


export default function AdminProductos() {
  const router = useRouter();
  const [productos, setProductos] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [pagina, setPagina] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [imagenFile, setImagenFile] = useState(null);
  const [imagenPreview, setImagenPreview] = useState("");
  const [editId, setEditId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [user, setUser] = useState(null);
  const [sortField, setSortField] = useState("id_producto");
  const [sortDir, setSortDir] = useState("desc");
  const { formatPrice } = useAdminCurrency();

  useEffect(() => {
    const stored = sessionStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const fetchProductos = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      const params = new URLSearchParams({ pagina, por_pagina: 9 });
      const res = await fetch(`${API}/admin/productos?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) { router.push("/login"); return; }
      const data = await res.json();
      setProductos(data.productos);
      setTotal(data.total);
      setTotalPaginas(data.total_paginas);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [pagina]);

  useEffect(() => { fetchProductos(); }, [fetchProductos]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const ordenados = [...productos].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    let va = a[sortField], vb = b[sortField];
    if (typeof va === "string") va = va.toLowerCase();
    if (typeof vb === "string") vb = vb.toLowerCase();
    if (va < vb) return -1 * dir;
    if (va > vb) return 1 * dir;
    return 0;
  });

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const abrirCrear = () => {
    setForm(EMPTY_FORM);
    setImagenFile(null);
    setImagenPreview("");
    setEditId(null);
    setError("");
    setModal("crear");
  };

  const abrirEditar = (p) => {
    setForm({
      nombre: p.nombre,
      descripcion: p.descripcion,
      precio: String(p.precio),
      stock: String(p.stock),
      categoria: p.categoria,
      imagen_actual: p.imagen,
    });
    setImagenFile(null);
    setImagenPreview(p.imagen ? `${API}/uploads/productos/${p.imagen}` : "");
    setEditId(p.id_producto);
    setError("");
    setModal("editar");
  };

  const cerrarModal = () => { setModal(null); setError(""); setImagenPreview(""); setImagenFile(null); };

  const handleImagenChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImagenFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagenPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleGuardar = async () => {
    setSaving(true);
    setError("");
    try {
      const token = getToken();
      const fd = new FormData();
      fd.append("nombre",        form.nombre);
      fd.append("descripcion",   form.descripcion);
      fd.append("precio",        form.precio);
      fd.append("stock",         form.stock);
      fd.append("categoria",     form.categoria);
      fd.append("imagen_actual", form.imagen_actual);
      if (imagenFile) fd.append("imagen", imagenFile);

      const url    = modal === "crear" ? `${API}/admin/productos` : `${API}/admin/productos/${editId}`;
      const method = modal === "crear" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Error al guardar"); return; }
      cerrarModal();
      fetchProductos();
      showToast(modal === "crear" ? "Producto creado correctamente" : "Producto actualizado correctamente");
    } catch (e) {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = async (id) => {
    try {
      const token = getToken();
      await fetch(`${API}/admin/productos/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setConfirmDelete(null);
      fetchProductos();
      showToast("Producto eliminado correctamente");
    } catch (e) { console.error(e); }
  };

  const logout = () => {
    document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    sessionStorage.removeItem("user");
    router.push("/login");
  };

  return (
    <>
      {/* TOAST */}
      {toast && <div className="admin-toast admin-toast--ok">{toast}</div>}

      {/* MAIN */}
      <div>
        {/* HEADER */}
        <div className="admin-header">
          <div>
            <h1 className="admin-header__title">Gestión de Productos</h1>
            <p className="admin-header__sub">{total} productos registrados</p>
          </div>
          <button onClick={abrirCrear} className="admin-btn admin-btn--pri">+ Nuevo Producto</button>
        </div>

        {/* TABLA */}
        <div className="admin-card">
          {loading ? (
            <div className="admin-loading"><div className="admin-spinner" /></div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    {[
                      { field: "id_producto", label: "ID" },
                      { field: null, label: "Imagen" },
                      { field: "nombre", label: "Nombre" },
                      { field: null, label: "Descripción" },
                      { field: "precio", label: "Precio" },
                      { field: "stock", label: "Stock" },
                      { field: "categoria", label: "Categoría" },
                      { field: "fecha_registro", label: "Registro" },
                      { field: null, label: "Acciones" },
                    ].map(h => (
                      <th key={h.label} style={{ cursor: h.field ? "pointer" : "default" }}
                        onClick={() => h.field && handleSort(h.field)}>
                        {h.label}
                        {h.field === sortField && <span style={{ marginLeft: 4 }}>{sortDir === "asc" ? "▲" : "▼"}</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ordenados.length === 0 ? (
                    <tr>                      <td colSpan={9} style={{ textAlign: "center", color: "var(--admin-text-2)", padding: 40 }}>
                      No hay productos activos
                    </td></tr>
                  ) : ordenados.map((p, i) => (
                    <tr key={p.id_producto} style={{ background: i % 2 === 0 ? "rgba(154,3,30,0.04)" : "transparent" }}>
                      <td>{p.id_producto}</td>
                      <td>
                        {p.imagen ? (
                          <img
                            src={`${API}/uploads/productos/${p.imagen}`}
                            alt={p.nombre}
                            style={{ width: 50, height: 50, objectFit: "cover", borderRadius: 6, border: "1px solid rgba(154,3,30,0.2)" }}
                            onError={e => { e.target.src = "https://placehold.co/50x50/1f2429/9a031e?text=IMG"; }}
                          />
                        ) : (
                          <div style={{ width: 50, height: 50, background: "var(--admin-bg-2)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, border: "1px solid var(--admin-border)" }}>📷</div>
                        )}
                      </td>
                      <td>{p.nombre}</td>
                      <td style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.descripcion ? p.descripcion.substring(0, 50) + "..." : "—"}
                      </td>
                      <td>{formatPrice(p.precio)}</td>
                      <td style={{ color: p.stock <= 5 ? "#ef4444" : "var(--admin-text)", fontWeight: p.stock <= 5 ? 700 : 400 }}>
                        {p.stock} {p.stock <= 5 && <span style={{ fontSize: 10 }}> bajo</span>}
                      </td>
                      <td>
                        <span className="admin-badge">{p.categoria}</span>
                      </td>
                      <td>{p.fecha_registro}</td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => abrirEditar(p)} className="admin-btn admin-btn--xs admin-btn--sec2">✏️</button>
                          <button onClick={() => setConfirmDelete(p)} className="admin-btn admin-btn--xs admin-btn--del">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* PAGINACIÓN */}
        {totalPaginas > 1 && (
          <div className="admin-pagination">
            <button onClick={() => setPagina(1)} disabled={pagina === 1} className="admin-page-btn" style={{ opacity: pagina === 1 ? 0.4 : 1 }}>«</button>
            <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1} className="admin-page-btn" style={{ opacity: pagina === 1 ? 0.4 : 1 }}>‹ Anterior</button>
            {Array.from({ length: totalPaginas }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPaginas || Math.abs(p - pagina) <= 1)
              .map((p, idx, arr) => (
                <Fragment key={p}>
                  {idx > 0 && arr[idx - 1] !== p - 1 && <span style={{ color: "var(--admin-text-2)", padding: "0 4px" }}>...</span>}
                  <button onClick={() => setPagina(p)} className={`admin-page-btn ${p === pagina ? "admin-page-btn--on" : ""}`}>{p}</button>
                </Fragment>
              ))
            }
            <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas} className="admin-page-btn" style={{ opacity: pagina === totalPaginas ? 0.4 : 1 }}>Siguiente ›</button>
            <button onClick={() => setPagina(totalPaginas)} disabled={pagina === totalPaginas} className="admin-page-btn" style={{ opacity: pagina === totalPaginas ? 0.4 : 1 }}>»</button>
          </div>
        )}
        <p style={{ textAlign: "center", color: "var(--admin-text-2)", fontSize: 12, marginTop: 8 }}>
          Página {pagina} de {totalPaginas} — {total} productos en total
        </p>
      </div>

      {/* MODAL CREAR / EDITAR */}
      {modal && (
        <div className="admin-overlay" onClick={cerrarModal}>
          <div className="admin-modal" style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>
            <div className="admin-modal__head">
              <h2 className="admin-modal__title">{modal === "crear" ? "Nuevo Producto" : "Editar Producto"}</h2>
              <button onClick={cerrarModal} className="admin-modal__close">✕</button>
            </div>
            <div className="admin-modal__body" style={{ overflowY: "auto", maxHeight: "65vh" }}>
              {error && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid var(--admin-red)", borderRadius: 8, padding: "10px 14px", color: "var(--admin-red)", fontSize: 13, marginBottom: 16 }}>{error}</div>}
              <div className="admin-grid2">
                {/* Columna izquierda */}
                <div>
                  <div className="admin-form-group">
                    <label className="admin-form-label">Nombre *</label>
                    <input type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} className="admin-form-input" required />
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-form-label">Precio *</label>
                    <input type="number" step="0.01" min="0" value={form.precio} onChange={e => setForm({ ...form, precio: e.target.value })} className="admin-form-input" required />
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-form-label">Stock</label>
                    <input type="number" min="0" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} className="admin-form-input" />
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-form-label">Categoría</label>
                    <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} className="admin-form-select">
  {CATEGORIAS_ADMIN.map(grupo => (
    <optgroup key={grupo.group} label={grupo.group}>
      {grupo.options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </optgroup>
  ))}
</select>
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-form-label">Imagen</label>
                    <input type="file" accept="image/*" onChange={handleImagenChange} className="admin-form-input" style={{ padding: "6px 10px" }} />
                    <p style={{ color: "var(--admin-text-2)", fontSize: 11, marginTop: 4 }}>JPG, PNG, GIF, WEBP</p>
                    {imagenPreview && (
                      <img src={imagenPreview} alt="preview" style={{ marginTop: 8, maxWidth: "100%", maxHeight: 120, objectFit: "cover", borderRadius: 8, border: "1px solid rgba(154,3,30,0.3)" }} />
                    )}
                  </div>
                </div>
                {/* Columna derecha */}
                <div>
                  <div className="admin-form-group">
                    <label className="admin-form-label">Descripción</label>
                    <textarea
                      value={form.descripcion}
                      onChange={e => setForm({ ...form, descripcion: e.target.value })}
                      className="admin-form-textarea"
                      style={{ height: 200 }}
                      placeholder="Descripción detallada del producto..."
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="admin-modal__foot">
              <button onClick={cerrarModal} className="admin-btn admin-btn--sec">Cancelar</button>
              <button onClick={handleGuardar} disabled={saving} className="admin-btn admin-btn--pri" style={{ opacity: saving ? 0.6 : 1 }}>
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR ELIMINAR */}
      {confirmDelete && (
        <div className="admin-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="admin-modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="admin-modal__head">
              <h2 className="admin-modal__title" style={{ color: "#ef4444" }}>Confirmar Eliminación</h2>
              <button onClick={() => setConfirmDelete(null)} className="admin-modal__close">✕</button>
            </div>
            <div className="admin-modal__body" style={{ textAlign: "center", padding: 24 }}>
              <p style={{ color: "var(--admin-text)", fontSize: 15 }}>
                ¿Estás seguro de eliminar <strong style={{ color: "var(--admin-accent2)" }}>{confirmDelete.nombre}</strong>?
              </p>
              <p style={{ color: "var(--admin-text-2)", fontSize: 13 }}>Esta acción lo marcará como inactivo.</p>
            </div>
            <div className="admin-modal__foot">
              <button onClick={() => setConfirmDelete(null)} className="admin-btn admin-btn--sec">Cancelar</button>
              <button onClick={() => handleEliminar(confirmDelete.id_producto)} className="admin-btn admin-btn--pri" style={{ background: "#dc3545" }}>
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
