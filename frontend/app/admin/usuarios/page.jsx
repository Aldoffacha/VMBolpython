"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";


const API = "http://localhost:8000";

function getToken() {
  return document.cookie.split("; ").find(r => r.startsWith("access_token="))?.split("=")[1];
}

const EMPTY_FORM = { nombre: "", correo: "", contrasena: "", telefono: "", direccion: "" };

export default function AdminUsuarios() {
  const router = useRouter();
  const [clientes, setClientes] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusqueda] = useState("");
  const [inputBusqueda, setInputBusqueda] = useState("");
  const [verInactivos, setVerInactivos] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'crear' | 'editar'
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      const params = new URLSearchParams({ pagina, por_pagina: 8, busqueda, inactivos: verInactivos });
      const res = await fetch(`${API}/admin/usuarios?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) { router.push("/login"); return; }
      const data = await res.json();
      setClientes(data.clientes);
      setTotal(data.total);
      setTotalPaginas(data.total_paginas);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [pagina, busqueda, verInactivos]);

  useEffect(() => { fetchUsuarios(); }, [fetchUsuarios]);

  const handleBuscar = (e) => {
    e.preventDefault();
    setBusqueda(inputBusqueda);
    setPagina(1);
  };

  const abrirCrear = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setError("");
    setModal("crear");
  };

  const abrirEditar = (c) => {
    setForm({ nombre: c.nombre, correo: c.correo, contrasena: "", telefono: c.telefono, direccion: c.direccion });
    setEditId(c.id_cliente);
    setError("");
    setModal("editar");
  };

  const cerrarModal = () => { setModal(null); setError(""); };

  const handleGuardar = async () => {
    setSaving(true);
    setError("");
    try {
      const token = getToken();
      let res;
      if (modal === "crear") {
        res = await fetch(`${API}/admin/usuarios`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(form),
        });
      } else {
        const { contrasena, ...rest } = form;
        res = await fetch(`${API}/admin/usuarios/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(rest),
        });
      }
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Error al guardar"); return; }
      cerrarModal();
      fetchUsuarios();
    } catch (e) {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = async (id) => {
    try {
      const token = getToken();
      await fetch(`${API}/admin/usuarios/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setConfirmDelete(null);
      fetchUsuarios();
    } catch (e) { console.error(e); }
  };

  const handleReactivar = async (id) => {
    try {
      const token = getToken();
      await fetch(`${API}/admin/usuarios/${id}/reactivar`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchUsuarios();
    } catch (e) { console.error(e); }
  };

  const logout = () => {
    document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    sessionStorage.removeItem("user");
    router.push("/login");
  };

  return (
    <div style={styles.page}>
      {/* SIDEBAR */}
      

      {/* MAIN */}
      <main style={styles.main}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.pageTitle}>Gestión de Usuarios</h1>
            <p style={styles.pageSubtitle}>{total} clientes registrados</p>
          </div>
          <button onClick={abrirCrear} style={styles.btnPrimary}>+ Nuevo Usuario</button>
        </div>

        {/* BUSCADOR */}
        <form onSubmit={handleBuscar} style={styles.searchRow}>
          <input
            type="text"
            placeholder="Buscar por nombre o correo..."
            value={inputBusqueda}
            onChange={e => setInputBusqueda(e.target.value)}
            style={styles.searchInput}
          />
          <button type="submit" style={styles.btnPrimary}>Buscar</button>
          {busqueda && (
            <button type="button" onClick={() => { setBusqueda(""); setInputBusqueda(""); setPagina(1); }} style={styles.btnSecondary}>
              Limpiar
            </button>
          )}
          <button type="button" onClick={() => { setVerInactivos(v => !v); setPagina(1); }}
            style={{ ...styles.btnSecondary, background: verInactivos ? "rgba(239,68,68,0.2)" : "transparent", borderColor: verInactivos ? "rgba(239,68,68,0.5)" : "rgba(154,3,30,0.3)" }}>
            {verInactivos ? "Mostrar solo activos" : "Ver inactivos"}
          </button>
        </form>

        {/* TABLA */}
        <div style={styles.card}>
          {loading ? (
            <div style={styles.loadingRow}><div style={styles.spinner} /></div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {["ID", "Nombre", "Correo", "Teléfono", "Dirección", "Estado", "Registro", "Acciones"].map(h => (
                      <th key={h} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {clientes.length === 0 ? (
                    <tr><td colSpan={8} style={{ ...styles.td, textAlign: "center", color: "#a0a0a0", padding: 40 }}>No se encontraron usuarios</td></tr>
                  ) : clientes.map((c, i) => (
                    <tr key={c.id_cliente} style={{
                      background: i % 2 === 0 ? "rgba(154,3,30,0.04)" : "transparent",
                      opacity: c.estado === 0 ? 0.5 : 1,
                    }}>
                      <td style={styles.td}>{c.id_cliente}</td>
                      <td style={styles.td}>{c.nombre}</td>
                      <td style={styles.td}>{c.correo}</td>
                      <td style={styles.td}>{c.telefono || "—"}</td>
                      <td style={styles.td}>{c.direccion || "—"}</td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.badge,
                          background: c.estado === 1 ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                          color: c.estado === 1 ? "#10b981" : "#ef4444",
                          border: `1px solid ${c.estado === 1 ? "rgba(16,185,129,0.4)" : "rgba(239,68,68,0.4)"}`,
                        }}>
                          {c.estado === 1 ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td style={styles.td}>{c.fecha_registro}</td>
                      <td style={styles.td}>
                        <div style={{ display: "flex", gap: 6 }}>
                          {c.estado === 1 ? (
                            <>
                              <button onClick={() => abrirEditar(c)} style={styles.btnEdit}>✏️</button>
                              <button onClick={() => setConfirmDelete(c)} style={styles.btnDelete}>🗑️</button>
                            </>
                          ) : (
                            <button onClick={() => handleReactivar(c.id_cliente)} style={{
                              padding: "5px 10px",
                              background: "rgba(16,185,129,0.15)",
                              border: "1px solid rgba(16,185,129,0.4)",
                              borderRadius: 6,
                              cursor: "pointer",
                              fontSize: 13,
                              color: "#10b981",
                            }}>Reactivar</button>
                          )}
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
          <div style={styles.pagination}>
            <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1} style={{ ...styles.pageBtn, opacity: pagina === 1 ? 0.4 : 1 }}>‹ Anterior</button>
            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPagina(p)} style={{ ...styles.pageBtn, ...(p === pagina ? styles.pageBtnActive : {}) }}>{p}</button>
            ))}
            <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas} style={{ ...styles.pageBtn, opacity: pagina === totalPaginas ? 0.4 : 1 }}>Siguiente ›</button>
          </div>
        )}
        <p style={{ textAlign: "center", color: "#a0a0a0", fontSize: 12, marginTop: 8 }}>
          Mostrando {clientes.length} de {total} usuarios{busqueda ? ` para "${busqueda}"` : ""}
        </p>
      </main>

      {/* MODAL CREAR / EDITAR */}
      {modal && (
        <div style={styles.modalOverlay} onClick={cerrarModal}>
          <div style={styles.modalBox} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>{modal === "crear" ? "➕ Nuevo Usuario" : "✏️ Editar Usuario"}</h2>
              <button onClick={cerrarModal} style={styles.closeBtn}>✕</button>
            </div>
            <div style={styles.modalBody}>
              {error && <div style={styles.errorBox}>⚠️ {error}</div>}
              {[
                { key: "nombre",    label: "Nombre",    type: "text",     show: true },
                { key: "correo",    label: "Correo",    type: "email",    show: true },
                { key: "contrasena",label: "Contraseña",type: "password", show: modal === "crear" },
                { key: "telefono",  label: "Teléfono",  type: "text",     show: true },
                { key: "direccion", label: "Dirección", type: "text",     show: true },
              ].filter(f => f.show).map(f => (
                <div key={f.key} style={styles.formGroup}>
                  <label style={styles.formLabel}>{f.label}</label>
                  <input
                    type={f.type}
                    value={form[f.key]}
                    onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    style={styles.formInput}
                    required={["nombre", "correo", ...(modal === "crear" ? ["contrasena"] : [])].includes(f.key)}
                  />
                </div>
              ))}
            </div>
            <div style={styles.modalFooter}>
              <button onClick={cerrarModal} style={styles.btnSecondary}>Cancelar</button>
              <button onClick={handleGuardar} disabled={saving} style={{ ...styles.btnPrimary, opacity: saving ? 0.6 : 1 }}>
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR ELIMINAR */}
      {confirmDelete && (
        <div style={styles.modalOverlay} onClick={() => setConfirmDelete(null)}>
          <div style={{ ...styles.modalBox, maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={{ ...styles.modalTitle, color: "#ef4444" }}>⚠️ Confirmar Eliminación</h2>
              <button onClick={() => setConfirmDelete(null)} style={styles.closeBtn}>✕</button>
            </div>
            <div style={{ ...styles.modalBody, textAlign: "center", padding: 24 }}>
              <p style={{ color: "#d9d9d9", fontSize: 15 }}>
                ¿Estás seguro de eliminar al usuario <strong style={{ color: "#c1121f" }}>{confirmDelete.nombre}</strong>?
              </p>
              <p style={{ color: "#a0a0a0", fontSize: 13 }}>Esta acción lo marcará como inactivo.</p>
            </div>
            <div style={styles.modalFooter}>
              <button onClick={() => setConfirmDelete(null)} style={styles.btnSecondary}>Cancelar</button>
              <button onClick={() => handleEliminar(confirmDelete.id_cliente)} style={{ ...styles.btnPrimary, background: "#dc3545" }}>
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { display: "flex", minHeight: "100vh", background: "#121418", fontFamily: "'Lato', sans-serif", color: "#d9d9d9" },
  sidebar: { width: 240, background: "#0d0f12", borderRight: "2px solid #9a031e", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh" },
  sidebarLogo: { padding: "24px 20px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid rgba(154,3,30,0.3)" },
  logoIcon: { fontSize: 24 },
  logoText: { color: "#c1121f", fontWeight: 700, fontSize: 16 },
  nav: { flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 4 },
  navLink: { display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 8, color: "#d9d9d9", textDecoration: "none", fontSize: 14, borderLeft: "3px solid transparent" },
  navLinkActive: { background: "#9a031e", color: "white", borderLeftColor: "white" },
  sidebarFooter: { padding: 16, borderTop: "1px solid rgba(154,3,30,0.3)" },
  userInfo: { display: "flex", alignItems: "center", gap: 10, marginBottom: 12 },
  userName: { color: "#d9d9d9", fontSize: 13, fontWeight: 600, margin: 0 },
  userRole: { color: "#9a031e", fontSize: 11, margin: 0 },
  logoutBtn: { width: "100%", padding: 8, background: "rgba(154,3,30,0.15)", border: "1px solid rgba(154,3,30,0.4)", borderRadius: 8, color: "#d9d9d9", cursor: "pointer", fontSize: 13 },

  main: { flex: 1, padding: "24px 28px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, paddingBottom: 16, borderBottom: "2px solid #9a031e" },
  pageTitle: { color: "#c1121f", fontSize: 26, fontWeight: 700, margin: 0 },
  pageSubtitle: { color: "#a0a0a0", fontSize: 13, margin: "4px 0 0" },

  searchRow: { display: "flex", gap: 10, marginBottom: 20 },
  searchInput: { flex: 1, maxWidth: 340, padding: "10px 14px", background: "#1f2429", border: "1px solid rgba(154,3,30,0.3)", borderRadius: 8, color: "#d9d9d9", fontSize: 14, outline: "none" },

  card: { background: "#1f2429", borderRadius: 12, border: "1px solid rgba(154,3,30,0.2)", overflow: "hidden", marginBottom: 16 },
  tableWrapper: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { padding: "12px 16px", textAlign: "left", color: "#a0a0a0", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.8, background: "#121418", borderBottom: "2px solid rgba(154,3,30,0.3)" },
  td: { padding: "11px 16px", color: "#d9d9d9", borderBottom: "1px solid rgba(154,3,30,0.08)" },
  loadingRow: { display: "flex", justifyContent: "center", padding: 40 },
  spinner: { width: 32, height: 32, border: "3px solid rgba(154,3,30,0.3)", borderTop: "3px solid #9a031e", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  badge: { display: "inline-block", padding: "3px 10px", borderRadius: 10, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 },

  btnEdit: { padding: "5px 10px", background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.4)", borderRadius: 6, cursor: "pointer", fontSize: 13 },
  btnDelete: { padding: "5px 10px", background: "rgba(220,53,69,0.15)", border: "1px solid rgba(220,53,69,0.4)", borderRadius: 6, cursor: "pointer", fontSize: 13 },

  pagination: { display: "flex", justifyContent: "center", gap: 6, marginTop: 16, flexWrap: "wrap" },
  pageBtn: { padding: "7px 12px", background: "#1f2429", border: "1px solid rgba(154,3,30,0.3)", borderRadius: 6, color: "#d9d9d9", cursor: "pointer", fontSize: 13 },
  pageBtnActive: { background: "#9a031e", border: "1px solid #9a031e", color: "white", fontWeight: 700 },

  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  modalBox: { background: "#1f2429", border: "2px solid #9a031e", borderRadius: 16, width: "100%", maxWidth: 500 },
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