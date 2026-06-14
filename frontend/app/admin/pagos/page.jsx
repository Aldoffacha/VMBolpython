"use client";

import "@/styles/admin.css";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAdminCurrency } from "@/lib/AdminCurrencyContext";
import { CreditCard, Clock, CheckCircle, DollarSign, X, Link } from "lucide-react";


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
  const { formatPrice } = useAdminCurrency();
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
      if (!res.ok) { showToast(`${data.detail}`); return; }
      showToast("Pago confirmado y pedido actualizado");
      fetchPagos();
    } catch (e) {
      showToast("Error de conexión");
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
    <div>
      {/* TOAST */}
      {toast && <div className="admin-toast admin-toast--ok">{toast}</div>}

      {/* SIDEBAR */}
      

      {/* MAIN */}
      <main>
        {/* HEADER */}
        <div className="admin-header">
          <div>
            <h1 className="admin-header__title">Gesti&oacute;n de Pagos</h1>
            <p className="admin-header__sub">Confirma los comprobantes de pago de los clientes</p>
          </div>
        </div>

        {/* STATS */}
        {stats && (
          <div style={s.statsGrid}>
            {[
              { icon: <CreditCard size={30} />, label: "Total Pagos",   value: stats.total_pagos,                                          color: "#9a031e" },
              { icon: <Clock size={30} />,      label: "Pendientes",     value: stats.pendientes,                                           color: "#f59e0b" },
              { icon: <CheckCircle size={30} />, label: "Confirmados",    value: stats.confirmados,                                          color: "#10b981" },
               { icon: <DollarSign size={30} />, label: "Monto Confirmado", value: formatPrice(stats.monto_total), color: "#3b82f6" },
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
        <div className="admin-card" style={{ marginBottom: 16 }}>
          {loading ? (
            <div className="admin-loading"><div className="admin-spinner" /></div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    {["ID Pago", "Pedido", "Cliente", "Monto", "M&eacute;todo", "Comprobante", "Fecha", "Estado", "Acci&oacute;n"].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagosFiltrados.length === 0 ? (
                    <tr><td colSpan={9} style={{ textAlign: "center", color: "var(--admin-text-2)", padding: 40 }}>
                      No hay pagos {filtro !== "todos" ? filtro + "s" : ""}
                    </td></tr>
                  ) : pagosFiltrados.map((p, i) => (
                    <tr key={p.id_pago} style={{ background: i % 2 === 0 ? "rgba(154,3,30,0.04)" : "transparent" }}>
                      <td>#{p.id_pago}</td>
                      <td>#{p.id_pedido}</td>
                      <td>{p.cliente_nombre}</td>
                       <td style={{ fontWeight: 700, color: "#10b981" }}>{formatPrice(p.monto)}</td>
                      <td>
                        <span style={s.metodoBadge}>{p.metodo}</span>
                      </td>
                      <td>
                        {p.comprobante ? (
                          <img
                            src={`http://localhost:8000/uploads/payments/${p.comprobante}`}
                            alt="comprobante"
                            style={{ width: 80, height: 60, objectFit: "cover", borderRadius: 6, cursor: "pointer", border: "1px solid rgba(154,3,30,0.3)" }}
                            onClick={() => setModalImg(`http://localhost:8000/uploads/payments/${p.comprobante}`)}
                            onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "block"; }}
                          />
                        ) : (
                          <span style={{ color: "var(--admin-text-2)", fontSize: 12 }}>Sin comprobante</span>
                        )}
                        <span style={{ display: "none", color: "var(--admin-text-2)", fontSize: 12 }}>Sin comprobante</span>
                      </td>
                      <td style={{ fontSize: 12, color: "var(--admin-text-2)" }}>{p.fecha_pago}</td>
                      <td>
                        <span className="admin-badge" style={{
                          background: ESTADO_COLORS[p.estado]?.bg,
                          color:      ESTADO_COLORS[p.estado]?.color,
                          border:     `1px solid ${ESTADO_COLORS[p.estado]?.border}`,
                        }}>
                          {p.estado.charAt(0).toUpperCase() + p.estado.slice(1)}
                        </span>
                      </td>
                      <td>
                        {p.estado !== "confirmado" ? (
                          <button
                            onClick={() => handleConfirmar(p.id_pago)}
                            disabled={confirmando === p.id_pago}
                            style={{ ...s.btnConfirmar, opacity: confirmando === p.id_pago ? 0.6 : 1 }}
                          >
                            {confirmando === p.id_pago ? "..." : <> <CheckCircle size={14} /> Confirmar</>}
                          </button>
                        ) : (
                          <span style={{ color: "#10b981", fontSize: 13, fontWeight: 600 }}>Confirmado</span>
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
        <div className="admin-overlay" onClick={() => setModalImg(null)}>
          <div className="admin-modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div className="admin-modal__head">
              <h2 className="admin-modal__title">Comprobante de Pago</h2>
              <button onClick={() => setModalImg(null)} className="admin-modal__close"><X size={18} /></button>
            </div>
            <div style={{ padding: 20, textAlign: "center" }}>
              <img src={modalImg} alt="comprobante" style={{ maxWidth: "100%", maxHeight: "70vh", borderRadius: 8, border: "1px solid rgba(154,3,30,0.3)" }} />
            </div>
            <div className="admin-modal__foot">
              <a href={modalImg} target="_blank" rel="noopener noreferrer" className="admin-btn admin-btn--pri" style={{ textDecoration: "none" }}>
                <Link size={14} /> Abrir en nueva pesta&ntilde;a
              </a>
              <button onClick={() => setModalImg(null)} className="admin-btn admin-btn--sec">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 14,
    marginBottom: 18,
  },
  statCard: {
    background: "var(--admin-card)",
    border: "1px solid var(--admin-border)",
    borderRadius: 14,
    padding: "14px 16px",
    boxShadow: "0 10px 24px rgba(0,0,0,0.16)",
  },
  statLabel: {
    color: "var(--admin-text-2)",
    fontFamily: "var(--font-d)",
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "1.2px",
    margin: "0 0 4px",
  },
  statValue: {
    fontFamily: "var(--font-d)",
    fontSize: 26,
    fontWeight: 800,
    margin: 0,
  },
  filtros: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  filtroBtn: {
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--admin-border)",
    background: "var(--admin-surface)",
    color: "var(--admin-text)",
    borderRadius: 999,
    padding: "8px 12px",
    cursor: "pointer",
    fontFamily: "var(--font-d)",
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.8px",
  },
  filtroBtnActive: {
    background: "linear-gradient(135deg, var(--admin-accent), var(--admin-accent2))",
    color: "#fff",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--admin-accent)",
    boxShadow: "0 8px 18px rgba(154,3,30,0.25)",
  },
  filtroBadge: {
    marginLeft: 8,
    padding: "2px 8px",
    borderRadius: 999,
    background: "rgba(154,3,30,0.18)",
    fontSize: 11,
    fontWeight: 700,
  },
  metodoBadge: { padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: "rgba(59,130,246,0.15)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.3)" },
  btnConfirmar: { padding: "6px 12px", background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.4)", borderRadius: 6, color: "#10b981", cursor: "pointer", fontSize: 12, fontWeight: 600 },
};
