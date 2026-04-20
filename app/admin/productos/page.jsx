"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";


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
  const [modal, setModal] = useState(null); // null | 'crear' | 'editar'
  const [form, setForm] = useState(EMPTY_FORM);
  const [imagenFile, setImagenFile] = useState(null);
  const [imagenPreview, setImagenPreview] = useState("");
  const [editId, setEditId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [user, setUser] = useState(null);

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
      showToast(modal === "crear" ? "✅ Producto creado correctamente" : "✅ Producto actualizado correctamente");
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
      showToast("✅ Producto eliminado correctamente");
    } catch (e) { console.error(e); }
  };

  const logout = () => {
    document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    sessionStorage.removeItem("user");
    router.push("/login");
  };

  return (
    <div style={s.page}>
      {/* TOAST */}
      {toast && <div style={s.toast}>{toast}</div>}

      {/* SIDEBAR */}
      

      {/* MAIN */}
      <main style={s.main}>
        {/* HEADER */}
        <div style={s.header}>
          <div>
            <h1 style={s.pageTitle}>Gestión de Productos</h1>
            <p style={s.pageSubtitle}>{total} productos registrados</p>
          </div>
          <button onClick={abrirCrear} style={s.btnPrimary}>+ Nuevo Producto</button>
        </div>

        {/* TABLA */}
        <div style={s.card}>
          {loading ? (
            <div style={s.loadingRow}><div style={s.spinner} /></div>
          ) : (
            <div style={s.tableWrapper}>
              <table style={s.table}>
                <thead>
                  <tr>
                    {["ID", "Imagen", "Nombre", "Descripción", "Precio", "Stock", "Categoría", "Registro", "Acciones"].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {productos.length === 0 ? (
                    <tr><td colSpan={9} style={{ ...s.td, textAlign: "center", color: "#a0a0a0", padding: 40 }}>
                      No hay productos activos
                    </td></tr>
                  ) : productos.map((p, i) => (
                    <tr key={p.id_producto} style={{ background: i % 2 === 0 ? "rgba(154,3,30,0.04)" : "transparent" }}>
                      <td style={s.td}>{p.id_producto}</td>
                      <td style={s.td}>
                        {p.imagen ? (
                          <img
                            src={`${API}/uploads/productos/${p.imagen}`}
                            alt={p.nombre}
                            style={{ width: 50, height: 50, objectFit: "cover", borderRadius: 6, border: "1px solid rgba(154,3,30,0.2)" }}
                            onError={e => { e.target.src = "https://placehold.co/50x50/1f2429/9a031e?text=IMG"; }}
                          />
                        ) : (
                          <div style={s.imgPlaceholder}>📷</div>
                        )}
                      </td>
                      <td style={s.td}>{p.nombre}</td>
                      <td style={{ ...s.td, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.descripcion ? p.descripcion.substring(0, 50) + "..." : "—"}
                      </td>
                      <td style={s.td}>${p.precio.toFixed(2)}</td>
                      <td style={{ ...s.td, color: p.stock <= 5 ? "#ef4444" : "#d9d9d9", fontWeight: p.stock <= 5 ? 700 : 400 }}>
                        {p.stock} {p.stock <= 5 && <span style={{ fontSize: 10 }}> bajo</span>}
                      </td>
                      <td style={s.td}>
                        <span style={s.categoriaBadge}>{p.categoria}</span>
                      </td>
                      <td style={s.td}>{p.fecha_registro}</td>
                      <td style={s.td}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => abrirEditar(p)} style={s.btnEdit}>✏️</button>
                          <button onClick={() => setConfirmDelete(p)} style={s.btnDelete}>🗑️</button>
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
          <div style={s.pagination}>
            <button onClick={() => setPagina(1)} disabled={pagina === 1} style={{ ...s.pageBtn, opacity: pagina === 1 ? 0.4 : 1 }}>«</button>
            <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1} style={{ ...s.pageBtn, opacity: pagina === 1 ? 0.4 : 1 }}>‹ Anterior</button>
            {Array.from({ length: totalPaginas }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPaginas || Math.abs(p - pagina) <= 1)
              .map((p, idx, arr) => (
                <>
                  {idx > 0 && arr[idx - 1] !== p - 1 && <span key={`dots-${p}`} style={{ color: "#a0a0a0", padding: "0 4px" }}>...</span>}
                  <button key={p} onClick={() => setPagina(p)} style={{ ...s.pageBtn, ...(p === pagina ? s.pageBtnActive : {}) }}>{p}</button>
                </>
              ))
            }
            <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas} style={{ ...s.pageBtn, opacity: pagina === totalPaginas ? 0.4 : 1 }}>Siguiente ›</button>
            <button onClick={() => setPagina(totalPaginas)} disabled={pagina === totalPaginas} style={{ ...s.pageBtn, opacity: pagina === totalPaginas ? 0.4 : 1 }}>»</button>
          </div>
        )}
        <p style={{ textAlign: "center", color: "#a0a0a0", fontSize: 12, marginTop: 8 }}>
          Página {pagina} de {totalPaginas} — {total} productos en total
        </p>
      </main>

      {/* MODAL CREAR / EDITAR */}
      {modal && (
        <div style={s.modalOverlay} onClick={cerrarModal}>
          <div style={{ ...s.modalBox, maxWidth: 680 }} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>{modal === "crear" ? "➕ Nuevo Producto" : "✏️ Editar Producto"}</h2>
              <button onClick={cerrarModal} style={s.closeBtn}>✕</button>
            </div>
            <div style={{ ...s.modalBody, overflowY: "auto", maxHeight: "65vh" }}>
              {error && <div style={s.errorBox}> {error}</div>}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {/* Columna izquierda */}
                <div>
                  <div style={s.formGroup}>
                    <label style={s.formLabel}>Nombre *</label>
                    <input type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} style={s.formInput} required />
                  </div>
                  <div style={s.formGroup}>
                    <label style={s.formLabel}>Precio *</label>
                    <input type="number" step="0.01" min="0" value={form.precio} onChange={e => setForm({ ...form, precio: e.target.value })} style={s.formInput} required />
                  </div>
                  <div style={s.formGroup}>
                    <label style={s.formLabel}>Stock</label>
                    <input type="number" min="0" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} style={s.formInput} />
                  </div>
                  <div style={s.formGroup}>
                    <label style={s.formLabel}>Categoría</label>
                    <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} style={s.formInput}>
  {CATEGORIAS_ADMIN.map(grupo => (
    <optgroup key={grupo.group} label={grupo.group}>
      {grupo.options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </optgroup>
  ))}
</select>
                  </div>
                  <div style={s.formGroup}>
                    <label style={s.formLabel}>Imagen</label>
                    <input type="file" accept="image/*" onChange={handleImagenChange} style={{ ...s.formInput, padding: "6px 10px" }} />
                    <p style={{ color: "#a0a0a0", fontSize: 11, marginTop: 4 }}>JPG, PNG, GIF, WEBP</p>
                    {imagenPreview && (
                      <img src={imagenPreview} alt="preview" style={{ marginTop: 8, maxWidth: "100%", maxHeight: 120, objectFit: "cover", borderRadius: 8, border: "1px solid rgba(154,3,30,0.3)" }} />
                    )}
                  </div>
                </div>
                {/* Columna derecha */}
                <div>
                  <div style={s.formGroup}>
                    <label style={s.formLabel}>Descripción</label>
                    <textarea
                      value={form.descripcion}
                      onChange={e => setForm({ ...form, descripcion: e.target.value })}
                      style={{ ...s.formInput, height: 200, resize: "vertical" }}
                      placeholder="Descripción detallada del producto..."
                    />
                  </div>
                </div>
              </div>
            </div>
            <div style={s.modalFooter}>
              <button onClick={cerrarModal} style={s.btnSecondary}>Cancelar</button>
              <button onClick={handleGuardar} disabled={saving} style={{ ...s.btnPrimary, opacity: saving ? 0.6 : 1 }}>
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR ELIMINAR */}
      {confirmDelete && (
        <div style={s.modalOverlay} onClick={() => setConfirmDelete(null)}>
          <div style={{ ...s.modalBox, maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h2 style={{ ...s.modalTitle, color: "#ef4444" }}> Confirmar Eliminación</h2>
              <button onClick={() => setConfirmDelete(null)} style={s.closeBtn}>✕</button>
            </div>
            <div style={{ ...s.modalBody, textAlign: "center", padding: 24 }}>
              <p style={{ color: "#d9d9d9", fontSize: 15 }}>
                ¿Estás seguro de eliminar <strong style={{ color: "#c1121f" }}>{confirmDelete.nombre}</strong>?
              </p>
              <p style={{ color: "#a0a0a0", fontSize: 13 }}>Esta acción lo marcará como inactivo.</p>
            </div>
            <div style={s.modalFooter}>
              <button onClick={() => setConfirmDelete(null)} style={s.btnSecondary}>Cancelar</button>
              <button onClick={() => handleEliminar(confirmDelete.id_producto)} style={{ ...s.btnPrimary, background: "#dc3545" }}>
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  page: { display: "flex", minHeight: "100vh", background: "#121418", fontFamily: "'Lato', sans-serif", color: "#d9d9d9" },
  toast: { position: "fixed", top: 20, right: 20, background: "#1f2429", border: "1px solid #10b981", borderRadius: 10, padding: "12px 20px", color: "#10b981", fontWeight: 600, fontSize: 14, zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.5)" },
  sidebar: { width: 240, background: "#0d0f12", borderRight: "2px solid #9a031e", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh" },
  sidebarLogo: { padding: "24px 20px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid rgba(154,3,30,0.3)" },
  logoText: { color: "#c1121f", fontWeight: 700, fontSize: 16 },
  nav: { flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 4 },
  navLink: { display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 8, color: "#d9d9d9", textDecoration: "none", fontSize: 14, borderLeft: "3px solid transparent" },
  navLinkActive: { background: "#9a031e", color: "white", borderLeftColor: "white" },
  sidebarFooter: { padding: 16, borderTop: "1px solid rgba(154,3,30,0.3)" },
  userName: { color: "#d9d9d9", fontSize: 13, fontWeight: 600, margin: 0 },
  userRole: { color: "#9a031e", fontSize: 11, margin: 0 },
  logoutBtn: { width: "100%", padding: 8, background: "rgba(154,3,30,0.15)", border: "1px solid rgba(154,3,30,0.4)", borderRadius: 8, color: "#d9d9d9", cursor: "pointer", fontSize: 13 },

  main: { flex: 1, padding: "24px 28px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, paddingBottom: 16, borderBottom: "2px solid #9a031e" },
  pageTitle: { color: "#c1121f", fontSize: 26, fontWeight: 700, margin: 0 },
  pageSubtitle: { color: "#a0a0a0", fontSize: 13, margin: "4px 0 0" },

  card: { background: "#1f2429", borderRadius: 12, border: "1px solid rgba(154,3,30,0.2)", overflow: "hidden", marginBottom: 16 },
  tableWrapper: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { padding: "12px 14px", textAlign: "left", color: "#a0a0a0", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.8, background: "#121418", borderBottom: "2px solid rgba(154,3,30,0.3)" },
  td: { padding: "10px 14px", color: "#d9d9d9", borderBottom: "1px solid rgba(154,3,30,0.08)" },
  loadingRow: { display: "flex", justifyContent: "center", padding: 40 },
  spinner: { width: 32, height: 32, border: "3px solid rgba(154,3,30,0.3)", borderTop: "3px solid #9a031e", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  imgPlaceholder: { width: 50, height: 50, background: "#121418", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, border: "1px solid rgba(154,3,30,0.2)" },
  categoriaBadge: { padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: "rgba(154,3,30,0.15)", color: "#c1121f", border: "1px solid rgba(154,3,30,0.3)" },

  btnEdit: { padding: "5px 10px", background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.4)", borderRadius: 6, cursor: "pointer", fontSize: 13 },
  btnDelete: { padding: "5px 10px", background: "rgba(220,53,69,0.15)", border: "1px solid rgba(220,53,69,0.4)", borderRadius: 6, cursor: "pointer", fontSize: 13 },

  pagination: { display: "flex", justifyContent: "center", gap: 6, marginTop: 16, flexWrap: "wrap", alignItems: "center" },
  pageBtn: { padding: "7px 12px", background: "#1f2429", border: "1px solid rgba(154,3,30,0.3)", borderRadius: 6, color: "#d9d9d9", cursor: "pointer", fontSize: 13 },
  pageBtnActive: { background: "#9a031e", borderColor: "#9a031e", color: "white", fontWeight: 700 },

  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  modalBox: { background: "#1f2429", border: "2px solid #9a031e", borderRadius: 16, width: "100%" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "2px solid #9a031e", background: "#121418" },
  modalTitle: { color: "#c1121f", fontSize: 16, fontWeight: 700, margin: 0 },
  closeBtn: { background: "none", border: "none", color: "#a0a0a0", fontSize: 18, cursor: "pointer" },
  modalBody: { padding: "20px" },
  modalFooter: { display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 20px", borderTop: "1px solid rgba(154,3,30,0.2)", background: "#121418" },

  formGroup: { marginBottom: 16 },
  formLabel: { display: "block", color: "#a0a0a0", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 },
  formInput: { width: "100%", padding: "10px 14px", background: "#121418", border: "1px solid rgba(154,3,30,0.3)", borderRadius: 8, color: "#d9d9d9", fontSize: 14, outline: "none", boxSizing: "border-box" },

  errorBox: { background: "rgba(193,18,31,0.12)", border: "1px solid rgba(193,18,31,0.35)", borderRadius: 8, padding: "10px 14px", color: "#f87171", fontSize: 13, marginBottom: 16 },
  btnPrimary: { padding: "9px 20px", background: "#9a031e", border: "none", borderRadius: 8, color: "white", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  btnSecondary: { padding: "9px 20px", background: "rgba(154,3,30,0.1)", border: "1px solid rgba(154,3,30,0.3)", borderRadius: 8, color: "#d9d9d9", fontWeight: 600, fontSize: 13, cursor: "pointer" },
};