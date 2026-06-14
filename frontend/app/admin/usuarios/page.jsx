"use client";

import "@/styles/admin.css";
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
    <div>
      {/* SIDEBAR */}
      

      {/* MAIN */}
      <main>
        <div className="admin-header">
          <div>
            <h1 className="admin-header__title">Gestión de Usuarios</h1>
            <p className="admin-header__sub">{total} clientes registrados</p>
          </div>
          <button onClick={abrirCrear} className="admin-btn admin-btn--pri">+ Nuevo Usuario</button>
        </div>

        {/* BUSCADOR */}
        <form onSubmit={handleBuscar} style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <input
            type="text"
            placeholder="Buscar por nombre o correo..."
            value={inputBusqueda}
            onChange={e => setInputBusqueda(e.target.value)}
            style={{ flex: 1, maxWidth: 340, padding: "10px 14px", background: "var(--admin-surface)", border: "1px solid var(--admin-border)", borderRadius: 8, color: "var(--admin-text)", fontSize: 14, outline: "none" }}
          />
          <button type="submit" className="admin-btn admin-btn--pri">Buscar</button>
          {busqueda && (
            <button type="button" onClick={() => { setBusqueda(""); setInputBusqueda(""); setPagina(1); }} className="admin-btn admin-btn--sec">
              Limpiar
            </button>
          )}
          <button type="button" onClick={() => { setVerInactivos(v => !v); setPagina(1); }}
            className="admin-btn admin-btn--sec" style={{ background: verInactivos ? "rgba(239,68,68,0.2)" : "transparent", borderColor: verInactivos ? "rgba(239,68,68,0.5)" : "rgba(154,3,30,0.3)" }}>
            {verInactivos ? "Mostrar solo activos" : "Ver inactivos"}
          </button>
        </form>

        {/* TABLA */}
        <div className="admin-card" style={{ marginBottom: 16 }}>
          {loading ? (
            <div className="admin-loading"><div className="admin-spinner" /></div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    {["ID", "Nombre", "Correo", "Teléfono", "Dirección", "Estado", "Registro", "Acciones"].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {clientes.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: "center", color: "var(--admin-text-2)", padding: 40 }}>No se encontraron usuarios</td></tr>
                  ) : clientes.map((c, i) => (
                    <tr key={c.id_cliente} style={{
                      background: i % 2 === 0 ? "rgba(154,3,30,0.04)" : "transparent",
                      opacity: c.estado === 0 ? 0.5 : 1,
                    }}>
                      <td>{c.id_cliente}</td>
                      <td>{c.nombre}</td>
                      <td>{c.correo}</td>
                      <td>{c.telefono || "—"}</td>
                      <td>{c.direccion || "—"}</td>
                      <td>
                        <span className="admin-badge" style={{
                          background: c.estado === 1 ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                          color: c.estado === 1 ? "#10b981" : "#ef4444",
                          border: `1px solid ${c.estado === 1 ? "rgba(16,185,129,0.4)" : "rgba(239,68,68,0.4)"}`,
                        }}>
                          {c.estado === 1 ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td>{c.fecha_registro}</td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          {c.estado === 1 ? (
                            <>
                              <button onClick={() => abrirEditar(c)} className="admin-btn admin-btn--xs admin-btn--sec2">✏️</button>
                              <button onClick={() => setConfirmDelete(c)} className="admin-btn admin-btn--xs admin-btn--del">🗑️</button>
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
          <div className="admin-pagination">
            <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1} className="admin-page-btn" style={{ opacity: pagina === 1 ? 0.4 : 1 }}>‹ Anterior</button>
            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPagina(p)} className="admin-page-btn"               style={p === pagina ? { background: "var(--admin-accent)", borderColor: "var(--admin-accent)", color: "white", fontWeight: 700 } : {}}>{p}</button>
            ))}
            <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas} className="admin-page-btn" style={{ opacity: pagina === totalPaginas ? 0.4 : 1 }}>Siguiente ›</button>
          </div>
        )}
        <p style={{ textAlign: "center", color: "var(--admin-text-2)", fontSize: 12, marginTop: 8 }}>
          Mostrando {clientes.length} de {total} usuarios{busqueda ? ` para "${busqueda}"` : ""}
        </p>
      </main>

      {/* MODAL CREAR / EDITAR */}
      {modal && (
        <div className="admin-overlay" onClick={cerrarModal}>
          <div className="admin-modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div className="admin-modal__head">
              <h2 className="admin-modal__title">{modal === "crear" ? "➕ Nuevo Usuario" : "✏️ Editar Usuario"}</h2>
              <button onClick={cerrarModal} className="admin-modal__close">✕</button>
            </div>
            <div className="admin-modal__body">
              {error && <div style={styles.errorBox}>⚠️ {error}</div>}
              {[
                { key: "nombre",    label: "Nombre",    type: "text",     show: true },
                { key: "correo",    label: "Correo",    type: "email",    show: true },
                { key: "contrasena",label: "Contraseña",type: "password", show: modal === "crear" },
                { key: "telefono",  label: "Teléfono",  type: "text",     show: true },
                { key: "direccion", label: "Dirección", type: "text",     show: true },
              ].filter(f => f.show).map(f => (
                <div key={f.key} className="admin-form-group">
                  <label className="admin-form-label">{f.label}</label>
                  <input
                    type={f.type}
                    value={form[f.key]}
                    onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    className="admin-form-input"
                    required={["nombre", "correo", ...(modal === "crear" ? ["contrasena"] : [])].includes(f.key)}
                  />
                </div>
              ))}
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
              <h2 className="admin-modal__title" style={{ color: "#ef4444" }}>⚠️ Confirmar Eliminación</h2>
              <button onClick={() => setConfirmDelete(null)} className="admin-modal__close">✕</button>
            </div>
            <div className="admin-modal__body" style={{ textAlign: "center", padding: 24 }}>
              <p style={{ color: "var(--admin-text)", fontSize: 15 }}>
                ¿Estás seguro de eliminar al usuario <strong style={{ color: "var(--admin-accent2)" }}>{confirmDelete.nombre}</strong>?
              </p>
              <p style={{ color: "var(--admin-text-2)", fontSize: 13 }}>Esta acción lo marcará como inactivo.</p>
            </div>
            <div className="admin-modal__foot">
              <button onClick={() => setConfirmDelete(null)} className="admin-btn admin-btn--sec">Cancelar</button>
              <button onClick={() => handleEliminar(confirmDelete.id_cliente)} className="admin-btn admin-btn--pri" style={{ background: "#dc3545" }}>
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
  errorBox: { background: "rgba(193,18,31,0.12)", border: "1px solid rgba(193,18,31,0.35)", borderRadius: 8, padding: "10px 14px", color: "#f87171", fontSize: 13, marginBottom: 16 },
};