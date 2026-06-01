"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const API = "http://localhost:8000";

function getToken() {
  return document.cookie.split("; ").find(r => r.startsWith("access_token="))?.split("=")[1];
}

const EMPTY_FORM = { nombre: "", correo: "", contrasena: "", telefono: "" };

export default function AdminEmpleados() {
  const router = useRouter();
  const [empleados, setEmpleados] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusqueda] = useState("");
  const [inputBusqueda, setInputBusqueda] = useState("");
  const [verInactivos, setVerInactivos] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
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

  const fetchEmpleados = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      const params = new URLSearchParams({ pagina, por_pagina: 10, busqueda, inactivos: verInactivos });
      const res = await fetch(`${API}/admin/empleados?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) { router.push("/login"); return; }
      const data = await res.json();
      setEmpleados(data.empleados || []);
      setTotal(data.total || 0);
      setTotalPaginas(data.total_paginas || 1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [pagina, busqueda, verInactivos, router]);

  useEffect(() => { fetchEmpleados(); }, [fetchEmpleados]);

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

  const abrirEditar = (e) => {
    setForm({ nombre: e.nombre, correo: e.correo, contrasena: "", telefono: e.telefono });
    setEditId(e.id_empleado);
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
        res = await fetch(`${API}/admin/empleados`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(form),
        });
      } else {
        const { contrasena, ...rest } = form;
        res = await fetch(`${API}/admin/empleados/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(contrasena ? form : rest),
        });
      }
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Error al guardar"); return; }
      cerrarModal();
      fetchEmpleados();
    } catch (e) {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = async (id) => {
    try {
      const token = getToken();
      await fetch(`${API}/admin/empleados/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setConfirmDelete(null);
      fetchEmpleados();
    } catch (e) { console.error(e); }
  };

  const handleReactivar = async (id) => {
    try {
      const token = getToken();
      await fetch(`${API}/admin/empleados/${id}/reactivar`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchEmpleados();
    } catch (e) { console.error(e); }
  };

  const logout = () => {
    document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    sessionStorage.removeItem("user");
    router.push("/login");
  };

  return (
    <div style={s.page}>
      <main style={s.main}>
        <div style={s.header}>
          <div>
            <h1 style={s.pageTitle}>Gestión de Empleados</h1>
            <p style={s.pageSubtitle}>{total} empleados registrados</p>
          </div>
          <button onClick={abrirCrear} style={s.btnPrimary}>+ Nuevo Empleado</button>
        </div>

        <form onSubmit={handleBuscar} style={s.searchRow}>
          <input
            type="text"
            placeholder="Buscar por nombre o correo..."
            value={inputBusqueda}
            onChange={e => setInputBusqueda(e.target.value)}
            style={s.searchInput}
          />
          <button type="submit" style={s.btnPrimary}>Buscar</button>
          {busqueda && (
            <button type="button" onClick={() => { setBusqueda(""); setInputBusqueda(""); setPagina(1); }} style={s.btnSecondary}>
              Limpiar
            </button>
          )}
          <button type="button" onClick={() => { setVerInactivos(v => !v); setPagina(1); }}
            style={{ ...s.btnSecondary, background: verInactivos ? "rgba(239,68,68,0.2)" : "transparent", borderColor: verInactivos ? "rgba(239,68,68,0.5)" : "rgba(154,3,30,0.3)" }}>
            {verInactivos ? "Mostrar solo activos" : "Ver inactivos"}
          </button>
        </form>

        <div style={s.card}>
          {loading ? (
            <div style={s.loadingRow}><div style={s.spinner} /></div>
          ) : (
            <div style={s.tableWrapper}>
              <table style={s.table}>
                <thead>
                  <tr>
                    {["ID", "Nombre", "Correo", "Teléfono", "Estado", "Registro", "Acciones"].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {empleados.length === 0 ? (
                    <tr><td colSpan={7} style={{ ...s.td, textAlign: "center", color: "#a0a0a0", padding: 40 }}>No se encontraron empleados</td></tr>
                  ) : empleados.map((e, i) => (
                    <tr key={e.id_empleado} style={{
                      background: i % 2 === 0 ? "rgba(154,3,30,0.04)" : "transparent",
                      opacity: e.estado === 0 ? 0.5 : 1,
                    }}>
                      <td style={s.td}>{e.id_empleado}</td>
                      <td style={s.td}>{e.nombre}</td>
                      <td style={s.td}>{e.correo}</td>
                      <td style={s.td}>{e.telefono || "—"}</td>
                      <td style={s.td}>
                        <span style={{
                          ...s.badge,
                          background: e.estado === 1 ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                          color: e.estado === 1 ? "#10b981" : "#ef4444",
                          border: `1px solid ${e.estado === 1 ? "rgba(16,185,129,0.4)" : "rgba(239,68,68,0.4)"}`,
                        }}>
                          {e.estado === 1 ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td style={s.td}>{e.fecha_registro}</td>
                      <td style={s.td}>
                        <div style={{ display: "flex", gap: 6 }}>
                          {e.estado === 1 ? (
                            <>
                              <button onClick={() => abrirEditar(e)} style={s.btnEdit}>✏️</button>
                              <button onClick={() => setConfirmDelete(e)} style={s.btnDelete}>🗑️</button>
                            </>
                          ) : (
                            <button onClick={() => handleReactivar(e.id_empleado)} style={{
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

          {totalPaginas > 1 && !loading && (
            <div style={s.pagination}>
              {Array.from({ length: Math.min(totalPaginas, pagina + 4) }, (_, i) => i + 1)
                .filter(p => p <= totalPaginas)
                .slice(0, 5)
                .map(p => (
                  <button key={p} onClick={() => setPagina(p)}
                    style={{ ...s.pageBtn, ...(p === pagina ? s.pageBtnActive : {}) }}>
                    {p}
                  </button>
                ))}
              {pagina + 4 < totalPaginas && <span style={{ color: "#a0a0a0", fontSize: 13, padding: "0 4px" }}>...</span>}
              {pagina + 4 < totalPaginas && (
                <button onClick={() => setPagina(totalPaginas)} style={s.pageBtn}>{totalPaginas}</button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* MODAL CREAR/EDITAR */}
      {modal && (
        <div style={s.modalOverlay} onClick={cerrarModal}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>{modal === "crear" ? "Nuevo Empleado" : "Editar Empleado"}</h2>
              <button onClick={cerrarModal} style={s.closeBtn}>✕</button>
            </div>
            <div style={s.modalBody}>
              {error && <div style={s.errorBox}>{error}</div>}
              {[
                { key: "nombre",    label: "Nombre",    type: "text",     show: true },
                { key: "correo",    label: "Correo",    type: "email",    show: true },
                { key: "contrasena",label: "Contraseña",type: "password", show: true },
                { key: "telefono",  label: "Teléfono",  type: "text",     show: true },
              ].map(f => (
                <div key={f.key} style={s.formGroup}>
                  <label style={s.formLabel}>{f.label}</label>
                  <input
                    type={f.type}
                    value={form[f.key]}
                    onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    style={s.formInput}
                    required={f.key !== "telefono" && (modal === "crear" || f.key !== "contrasena")}
                    placeholder={f.key === "contrasena" && modal === "editar" ? "Dejar vacío para no cambiar" : ""}
                  />
                </div>
              ))}
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
              <h2 style={{ ...s.modalTitle, color: "#ef4444" }}>Confirmar Eliminación</h2>
              <button onClick={() => setConfirmDelete(null)} style={s.closeBtn}>✕</button>
            </div>
            <div style={{ ...s.modalBody, textAlign: "center", padding: 24 }}>
              <p style={{ color: "#d9d9d9", fontSize: 15 }}>
                ¿Estás seguro de eliminar al empleado <strong style={{ color: "#c1121f" }}>{confirmDelete.nombre}</strong>?
              </p>
              <p style={{ color: "#a0a0a0", fontSize: 13 }}>Esta acción lo marcará como inactivo.</p>
            </div>
            <div style={s.modalFooter}>
              <button onClick={() => setConfirmDelete(null)} style={s.btnSecondary}>Cancelar</button>
              <button onClick={() => handleEliminar(confirmDelete.id_empleado)} style={{ ...s.btnPrimary, background: "#dc3545" }}>
                Eliminar
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

  pagination: { display: "flex", justifyContent: "center", gap: 6, marginTop: 16, flexWrap: "wrap", padding: "0 20px 20px" },
  pageBtn: { padding: "7px 12px", background: "#1f2429", border: "1px solid rgba(154,3,30,0.3)", borderRadius: 6, color: "#d9d9d9", cursor: "pointer", fontSize: 13 },
  pageBtnActive: { background: "#9a031e", border: "1px solid #9a031e", color: "white", fontWeight: 700 },

  btnEdit: { padding: "5px 10px", background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.4)", borderRadius: 6, cursor: "pointer", fontSize: 13 },
  btnDelete: { padding: "5px 10px", background: "rgba(220,53,69,0.15)", border: "1px solid rgba(220,53,69,0.4)", borderRadius: 6, cursor: "pointer", fontSize: 13 },

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
