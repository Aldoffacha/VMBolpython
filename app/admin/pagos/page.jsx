"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";


const API = "http://localhost:8000";

function getToken() {
  return document.cookie.split("; ").find(r => r.startsWith("access_token="))?.split("=")[1];
}

const ESTADO_COLORS = {
  pendiente:  { bg: "rgba(245,158,11,0.15)",  color: "#f59e0b", border: "rgba(245,158,11,0.4)"  },
  confirmado: { bg: "rgba(16,185,129,0.15)",  color: "#10b981", border: "rgba(16,185,129,0.4)"  },
  rechazado:  { bg: "rgba(239,68,68,0.15)",   color: "#ef4444", border: "rgba(239,68,68,0.4)"   },
};



export default function AdminPagos() {
  const router = useRouter();
  const [pagos, setPagos] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmando, setConfirmando] = useState(null);
  const [modalImg, setModalImg] = useState(null);
  const [toast, setToast] = useState("");
  const [user, setUser] = useState(null);
  const [filtro, setFiltro] = useState("todos"); // todos | pendiente | confirmado

  useEffect(() => {
    const stored = sessionStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
    fetchPagos();
  }, []);

  const fetchPagos = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${API}/admin/pagos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) { router.push("/login"); return; }
      const data = await res.json();
      setPagos(data.pagos);
      setStats(data.stats);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const handleConfirmar = async (id_pago) => {
    setConfirmando(id_pago);
    try {
      const token = getToken();
      const res = await fetch(`${API}/admin/pagos/${id_pago}/confirmar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) { showToast(`❌ ${data.detail}`); return; }
      showToast("✅ Pago confirmado y pedido actualizado");
      fetchPagos();
    } catch (e) {
      showToast("❌ Error de conexión");
    } finally {
      setConfirmando(null);
    }
  };

  const logout = () => {
    document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    sessionStorage.removeItem("user");
    router.push("/login");
  };

  const pagosFiltrados = filtro === "todos" ? pagos : pagos.filter(p => p.estado === filtro);

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
            <h1 style={s.pageTitle}>Gestión de Pagos</h1>
            <p style={s.pageSubtitle}>Confirma los comprobantes de pago de los clientes</p>
          </div>
        </div>

        {/* STATS */}
        {stats && (
          <div style={s.statsGrid}>
            {[
              { icon: "💳", label: "Total Pagos",   value: stats.total_pagos,                                          color: "#9a031e" },
              { icon: "⏳", label: "Pendientes",     value: stats.pendientes,                                           color: "#f59e0b" },
              { icon: "✅", label: "Confirmados",    value: stats.confirmados,                                          color: "#10b981" },
              { icon: "💵", label: "Monto Confirmado", value: `$${stats.monto_total.toLocaleString("en", { minimumFractionDigits: 2 })}`, color: "#3b82f6" },
            ].map(st => (
              <div key={st.label} style={{ ...s.statCard, borderLeftColor: st.color }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={s.statLabel}>{st.label}</p>
                    <p style={{ ...s.statValue, color: st.color }}>{st.value}</p>
                  </div>
                  <span style={{ fontSize: 30 }}>{st.icon}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* FILTROS */}
        <div style={s.filtros}>
          {["todos", "pendiente", "confirmado"].map(f => (
            <button key={f} onClick={() => setFiltro(f)} style={{
              ...s.filtroBtn,
              ...(filtro === f ? s.filtroBtnActive : {})
            }}>
              {f === "todos" ? "Todos" : f.charAt(0).toUpperCase() + f.slice(1)}
              {f !== "todos" && stats && (
                <span style={s.filtroBadge}>
                  {f === "pendiente" ? stats.pendientes : stats.confirmados}
                </span>
              )}
            </button>
          ))}
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
                    {["ID Pago", "Pedido", "Cliente", "Monto", "Método", "Comprobante", "Fecha", "Estado", "Acción"].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagosFiltrados.length === 0 ? (
                    <tr><td colSpan={9} style={{ ...s.td, textAlign: "center", color: "#a0a0a0", padding: 40 }}>
                      No hay pagos {filtro !== "todos" ? filtro + "s" : ""}
                    </td></tr>
                  ) : pagosFiltrados.map((p, i) => (
                    <tr key={p.id_pago} style={{ background: i % 2 === 0 ? "rgba(154,3,30,0.04)" : "transparent" }}>
                      <td style={s.td}>#{p.id_pago}</td>
                      <td style={s.td}>#{p.id_pedido}</td>
                      <td style={s.td}>{p.cliente_nombre}</td>
                      <td style={{ ...s.td, fontWeight: 700, color: "#10b981" }}>${p.monto.toFixed(2)}</td>
                      <td style={s.td}>
                        <span style={s.metodoBadge}>{p.metodo}</span>
                      </td>
                      <td style={s.td}>
                        {p.comprobante ? (
                          <img
                            src={`http://localhost:8000/uploads/payments/${p.comprobante}`}
                            alt="comprobante"
                            style={{ width: 80, height: 60, objectFit: "cover", borderRadius: 6, cursor: "pointer", border: "1px solid rgba(154,3,30,0.3)" }}
                            onClick={() => setModalImg(`http://localhost:8000/uploads/payments/${p.comprobante}`)}
                            onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "block"; }}
                          />
                        ) : (
                          <span style={{ color: "#a0a0a0", fontSize: 12 }}>Sin comprobante</span>
                        )}
                        <span style={{ display: "none", color: "#a0a0a0", fontSize: 12 }}>Sin comprobante</span>
                      </td>
                      <td style={{ ...s.td, fontSize: 12, color: "#a0a0a0" }}>{p.fecha_pago}</td>
                      <td style={s.td}>
                        <span style={{
                          ...s.estadoBadge,
                          background: ESTADO_COLORS[p.estado]?.bg,
                          color:      ESTADO_COLORS[p.estado]?.color,
                          border:     `1px solid ${ESTADO_COLORS[p.estado]?.border}`,
                        }}>
                          {p.estado.charAt(0).toUpperCase() + p.estado.slice(1)}
                        </span>
                      </td>
                      <td style={s.td}>
                        {p.estado !== "confirmado" ? (
                          <button
                            onClick={() => handleConfirmar(p.id_pago)}
                            disabled={confirmando === p.id_pago}
                            style={{ ...s.btnConfirmar, opacity: confirmando === p.id_pago ? 0.6 : 1 }}
                          >
                            {confirmando === p.id_pago ? "..." : "✅ Confirmar"}
                          </button>
                        ) : (
                          <span style={{ color: "#10b981", fontSize: 13, fontWeight: 600 }}>✓ Confirmado</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* MODAL IMAGEN COMPROBANTE */}
      {modalImg && (
        <div style={s.modalOverlay} onClick={() => setModalImg(null)}>
          <div style={s.imgModalBox} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>🧾 Comprobante de Pago</h2>
              <button onClick={() => setModalImg(null)} style={s.closeBtn}>✕</button>
            </div>
            <div style={{ padding: 20, textAlign: "center" }}>
              <img src={modalImg} alt="comprobante" style={{ maxWidth: "100%", maxHeight: "70vh", borderRadius: 8, border: "1px solid rgba(154,3,30,0.3)" }} />
            </div>
            <div style={s.modalFooter}>
              <a href={modalImg} target="_blank" rel="noopener noreferrer" style={s.btnPrimary}>
                🔗 Abrir en nueva pestaña
              </a>
              <button onClick={() => setModalImg(null)} style={s.btnSecondary}>Cerrar</button>
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

  statsGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 },
  statCard: { background: "#1f2429", padding: "18px 20px", borderRadius: 12, borderLeft: "4px solid #9a031e" },
  statLabel: { color: "#a0a0a0", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, margin: 0 },
  statValue: { fontSize: 26, fontWeight: 700, margin: "4px 0 0" },

  filtros: { display: "flex", gap: 8, marginBottom: 16 },
  filtroBtn: { padding: "8px 16px", background: "#1f2429", border: "1px solid rgba(154,3,30,0.2)", borderRadius: 8, color: "#a0a0a0", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 6 },
  filtroBtnActive: { background: "#9a031e", border: "1px solid #9a031e", color: "white" },
  filtroBadge: { background: "rgba(255,255,255,0.2)", borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 700 },

  card: { background: "#1f2429", borderRadius: 12, border: "1px solid rgba(154,3,30,0.2)", overflow: "hidden", marginBottom: 16 },
  tableWrapper: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { padding: "12px 14px", textAlign: "left", color: "#a0a0a0", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.8, background: "#121418", borderBottom: "2px solid rgba(154,3,30,0.3)" },
  td: { padding: "10px 14px", color: "#d9d9d9", borderBottom: "1px solid rgba(154,3,30,0.08)" },
  loadingRow: { display: "flex", justifyContent: "center", padding: 40 },
  spinner: { width: 32, height: 32, border: "3px solid rgba(154,3,30,0.3)", borderTop: "3px solid #9a031e", borderRadius: "50%", animation: "spin 0.8s linear infinite" },

  estadoBadge: { padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 },
  metodoBadge: { padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: "rgba(59,130,246,0.15)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.3)" },
  btnConfirmar: { padding: "6px 12px", background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.4)", borderRadius: 6, color: "#10b981", cursor: "pointer", fontSize: 12, fontWeight: 600 },

  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  imgModalBox: { background: "#1f2429", border: "2px solid #9a031e", borderRadius: 16, width: "100%", maxWidth: 600 },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "2px solid #9a031e", background: "#121418" },
  modalTitle: { color: "#c1121f", fontSize: 16, fontWeight: 700, margin: 0 },
  closeBtn: { background: "none", border: "none", color: "#a0a0a0", fontSize: 18, cursor: "pointer" },
  modalFooter: { display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 20px", borderTop: "1px solid rgba(154,3,30,0.2)", background: "#121418" },
  btnPrimary: { padding: "9px 20px", background: "#9a031e", border: "none", borderRadius: 8, color: "white", fontWeight: 600, fontSize: 13, cursor: "pointer", textDecoration: "none" },
  btnSecondary: { padding: "9px 20px", background: "rgba(154,3,30,0.1)", border: "1px solid rgba(154,3,30,0.3)", borderRadius: 8, color: "#d9d9d9", fontWeight: 600, fontSize: 13, cursor: "pointer" },
};