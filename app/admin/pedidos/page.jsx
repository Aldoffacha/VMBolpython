"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";


const API = "http://localhost:8000";

function getToken() {
  return document.cookie.split("; ").find(r => r.startsWith("access_token="))?.split("=")[1];
}

const ESTADO_STYLE = {
  pendiente: { bg: "rgba(245,158,11,0.15)",  color: "#f59e0b", border: "rgba(245,158,11,0.4)",  label: "Pendiente"  },
  pagado:    { bg: "rgba(59,130,246,0.15)",   color: "#3b82f6", border: "rgba(59,130,246,0.4)",   label: "Pagado"     },
  enviado:   { bg: "rgba(16,185,129,0.15)",   color: "#10b981", border: "rgba(16,185,129,0.4)",   label: "Enviado"    },
  cancelado: { bg: "rgba(239,68,68,0.15)",    color: "#ef4444", border: "rgba(239,68,68,0.4)",    label: "Cancelado"  },
};

const ACCION_STYLE = {
  pagado:    { bg: "rgba(59,130,246,0.15)",  color: "#3b82f6", border: "rgba(59,130,246,0.4)",  icon: "💳", label: "Marcar Pagado"  },
  enviado:   { bg: "rgba(16,185,129,0.15)",  color: "#10b981", border: "rgba(16,185,129,0.4)",  icon: "🚚", label: "Marcar Enviado" },
  cancelado: { bg: "rgba(239,68,68,0.15)",   color: "#ef4444", border: "rgba(239,68,68,0.4)",   icon: "❌", label: "Cancelar"       },
  pendiente: { bg: "rgba(245,158,11,0.15)",  color: "#f59e0b", border: "rgba(245,158,11,0.4)",  icon: "↩️", label: "Reactivar"      },
};

// ── Badge de plataforma ───────────────────────────────────────────────────────
function PlatBadge({ plat }) {
  const m = {
    amazon: { bg: "rgba(245,158,11,0.2)", color: "#f59e0b", txt: "📦 Amazon" },
    ebay:   { bg: "rgba(59,130,246,0.2)", color: "#3b82f6", txt: "🛒 eBay"   },
    local:  { bg: "rgba(16,185,129,0.2)", color: "#10b981", txt: "🏠 Local"  },
    otros:  { bg: "rgba(160,160,160,0.2)",color: "#a0a0a0", txt: "🌐 Externo"},
  };
  const p = m[plat] || m.otros;
  return (
    <span style={{
      background: p.bg, color: p.color,
      padding: "2px 8px", borderRadius: 10,
      fontSize: 11, fontWeight: 700,
      border: `1px solid ${p.color}40`,
    }}>{p.txt}</span>
  );
}

export default function AdminPedidos() {
  const router = useRouter();
  const [pedidos, setPedidos] = useState([]);
  const [contadores, setContadores] = useState({ total: 0, pendiente: 0, pagado: 0, enviado: 0, cancelado: 0 });
  const [filtro, setFiltro] = useState("todos");
  const [loading, setLoading] = useState(true);
  const [detalle, setDetalle] = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [procesando, setProcesando] = useState(null);
  const [toast, setToast] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const fetchPedidos = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      const params = new URLSearchParams({ estado: filtro });
      const res = await fetch(`${API}/admin/pedidos?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) { router.push("/login"); return; }
      const data = await res.json();
      setPedidos(data.pedidos);
      setContadores(data.contadores);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filtro]);

  useEffect(() => { fetchPedidos(); }, [fetchPedidos]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

  const verDetalle = async (id) => {
    setDetalle({ loading: true });
    setLoadingDetalle(true);
    try {
      const token = getToken();
      const res = await fetch(`${API}/admin/pedidos/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setDetalle(data);
    } catch (e) { setDetalle(null); }
    finally { setLoadingDetalle(false); }
  };

  const confirmarCambio = async () => {
    if (!confirm) return;
    setProcesando(confirm.pedido.id_pedido);
    try {
      const token = getToken();
      const res = await fetch(`${API}/admin/pedidos/${confirm.pedido.id_pedido}/estado`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ estado: confirm.nuevoEstado }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.detail); return; }
      showToast(data.mensaje);
      setConfirm(null);
      fetchPedidos();
    } catch (e) { showToast("❌ Error de conexión"); }
    finally { setProcesando(null); }
  };

  // ── Helpers para productos externos ────────────────────────────────────────
  // Parsea datos_externos que puede venir como string JSON o ya como objeto
  function parseDatosExternos(prod) {
    if (!prod.datos_externos) return null;
    if (typeof prod.datos_externos === "object") return prod.datos_externos;
    try { return JSON.parse(prod.datos_externos); } catch { return null; }
  }

  // Devuelve el nombre final del producto (externo o local)
  function getNombre(prod) {
    if (prod.tipo_producto === "externo") {
      const ext = parseDatosExternos(prod);
      return ext?.nombre || prod.nombre || "Producto externo";
    }
    return prod.nombre || "—";
  }

  // Devuelve URL del producto externo si existe
  function getLink(prod) {
    if (prod.tipo_producto !== "externo") return null;
    const ext = parseDatosExternos(prod);
    return ext?.url || ext?.enlace || null;
  }

  // Devuelve plataforma del producto
  function getPlataforma(prod) {
    if (prod.tipo_producto !== "externo") return "local";
    const ext = parseDatosExternos(prod);
    return ext?.plataforma || "otros";
  }

  return (
    <div style={s.page}>
      {toast && <div style={s.toast}>{toast}</div>}

      

      <main style={s.main}>
        <div style={s.header}>
          <div>
            <h1 style={s.pageTitle}>Gestión de Pedidos</h1>
            <p style={s.pageSubtitle}>{contadores.total} pedidos en total</p>
          </div>
        </div>

        {/* STAT CARDS */}
        <div style={s.statsGrid}>
          {[
            { icon: "🛒", label: "Total",      value: contadores.total,     color: "#9a031e",  filtro: "todos"     },
            { icon: "⏳", label: "Pendientes", value: contadores.pendiente, color: "#f59e0b",  filtro: "pendiente" },
            { icon: "💳", label: "Pagados",    value: contadores.pagado,    color: "#3b82f6",  filtro: "pagado"    },
            { icon: "🚚", label: "Enviados",   value: contadores.enviado,   color: "#10b981",  filtro: "enviado"   },
            { icon: "❌", label: "Cancelados", value: contadores.cancelado, color: "#ef4444",  filtro: "cancelado" },
          ].map(st => (
            <div key={st.label}
              style={{ ...s.statCard, borderLeftColor: st.color, cursor: "pointer" }}
              onClick={() => setFiltro(st.filtro)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={s.statLabel}>{st.label}</p>
                  <p style={{ ...s.statValue, color: st.color }}>{st.value}</p>
                </div>
                <span style={{ fontSize: 28 }}>{st.icon}</span>
              </div>
            </div>
          ))}
        </div>

        {/* FILTROS */}
        <div style={s.filtros}>
          {["todos", "pendiente", "pagado", "enviado", "cancelado"].map(f => (
            <button key={f} onClick={() => setFiltro(f)} style={{
              ...s.filtroBtn,
              ...(filtro === f ? s.filtroBtnActive : {})
            }}>
              {f === "todos"
                ? `Todos (${contadores.total})`
                : `${f.charAt(0).toUpperCase() + f.slice(1)} (${contadores[f] ?? 0})`}
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
                    {["ID Pedido", "Cliente", "Total", "Estado", "Fecha y Hora", "Acciones"].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pedidos.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ ...s.td, textAlign: "center", color: "#a0a0a0", padding: 40 }}>
                        No hay pedidos {filtro !== "todos" ? `con estado "${filtro}"` : ""}
                      </td>
                    </tr>
                  ) : pedidos.map((p, i) => {
                    const est = ESTADO_STYLE[p.estado] || ESTADO_STYLE.pendiente;
                    return (
                      <tr key={p.id_pedido} style={{ background: i % 2 === 0 ? "rgba(154,3,30,0.04)" : "transparent" }}>
                        <td style={s.td}>
                          <strong style={{ color: "#c1121f" }}>#{p.id_pedido}</strong>
                          <br /><span style={{ color: "#a0a0a0", fontSize: 11 }}>Cliente ID: {p.id_cliente}</span>
                        </td>
                        <td style={s.td}>
                          <div style={{ fontWeight: 600 }}>{p.cliente_nombre}</div>
                          <div style={{ color: "#a0a0a0", fontSize: 12 }}>{p.cliente_email}</div>
                        </td>
                        <td style={{ ...s.td, fontWeight: 700, color: "#10b981" }}>${p.total.toFixed(2)}</td>
                        <td style={s.td}>
                          <span style={{ ...s.badge, background: est.bg, color: est.color, border: `1px solid ${est.border}` }}>
                            {est.label}
                          </span>
                        </td>
                        <td style={s.td}>
                          <div style={{ fontSize: 13 }}>{p.fecha.split(" ")[0]}</div>
                          <div style={{ color: "#a0a0a0", fontSize: 11 }}>{p.fecha.split(" ")[1]}</div>
                        </td>
                        <td style={s.td}>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <button onClick={() => verDetalle(p.id_pedido)} style={s.btnAccion} title="Ver detalle">
                              👁️
                            </button>
                            {p.siguientes_estados?.map(sig => {
                              const ac = ACCION_STYLE[sig];
                              return (
                                <button key={sig}
                                  onClick={() => setConfirm({ pedido: p, nuevoEstado: sig })}
                                  disabled={procesando === p.id_pedido}
                                  style={{ ...s.btnAccion, background: ac.bg, color: ac.color, border: `1px solid ${ac.border}` }}
                                  title={ac.label}>
                                  {ac.icon}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* ── MODAL DETALLE ────────────────────────────────────────────────────── */}
      {detalle && (
        <div style={s.modalOverlay} onClick={() => setDetalle(null)}>
          <div style={{ ...s.modalBox, maxWidth: 760 }} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>
                📦 Detalle del Pedido #{detalle.pedido?.id_pedido}
              </h2>
              <button onClick={() => setDetalle(null)} style={s.closeBtn}>✕</button>
            </div>

            <div style={{ ...s.modalBody, overflowY: "auto", maxHeight: "72vh" }}>
              {loadingDetalle ? (
                <div style={s.loadingRow}><div style={s.spinner} /></div>
              ) : detalle.pedido ? (
                <>
                  {/* Info cliente y pedido */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                    <div style={s.infoBox}>
                      <p style={s.infoTitle}> Cliente</p>
                      <p style={s.infoRow}><b>Nombre:</b> {detalle.pedido.cliente_nombre}</p>
                      <p style={s.infoRow}><b>Email:</b> {detalle.pedido.cliente_email}</p>
                      <p style={s.infoRow}><b>Teléfono:</b> {detalle.pedido.telefono}</p>
                      <p style={s.infoRow}><b>Dirección:</b> {detalle.pedido.direccion}</p>
                    </div>
                    <div style={s.infoBox}>
                      <p style={s.infoTitle}> Pedido</p>
                      <p style={s.infoRow}><b>ID:</b> #{detalle.pedido.id_pedido}</p>
                      <p style={s.infoRow}><b>Fecha:</b> {detalle.pedido.fecha}</p>
                      <p style={s.infoRow}><b>Estado:</b>{" "}
                        <span style={{
                          ...s.badge,
                          background: ESTADO_STYLE[detalle.pedido.estado]?.bg,
                          color: ESTADO_STYLE[detalle.pedido.estado]?.color,
                          border: `1px solid ${ESTADO_STYLE[detalle.pedido.estado]?.border}`
                        }}>
                          {ESTADO_STYLE[detalle.pedido.estado]?.label}
                        </span>
                      </p>
                      <p style={s.infoRow}>
                        <b>Total:</b>{" "}
                        <span style={{ color: "#10b981", fontWeight: 700 }}>
                          ${detalle.pedido.total.toFixed(2)}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* ── Tabla de productos con link para externos ─────────── */}
                  <p style={s.sectionLabel}>🛍️ Productos del Pedido</p>

                  <table style={{ ...s.table, fontSize: 13 }}>
                    <thead>
                      <tr>
                        {["Producto", "Plataforma", "Cantidad", "Precio Unit.", "Subtotal"].map(h => (
                          <th key={h} style={s.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {detalle.productos.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ ...s.td, textAlign: "center", color: "#a0a0a0" }}>
                            Sin productos registrados
                          </td>
                        </tr>
                      ) : detalle.productos.map((prod, i) => {
                        const nombre    = getNombre(prod);
                        const link      = getLink(prod);
                        const plataforma= getPlataforma(prod);
                        const ext       = parseDatosExternos(prod);

                        return (
                          <tr key={i} style={{ background: i % 2 === 0 ? "rgba(154,3,30,0.04)" : "transparent" }}>
                            {/* Nombre + link si es externo */}
                            <td style={s.td}>
                              <div style={{ fontWeight: 600, color: "#d9d9d9", marginBottom: 4 }}>
                                {nombre}
                              </div>
                              {link && (
                                <a
                                  href={link}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    color: "#3b82f6", fontSize: 11, textDecoration: "none",
                                    display: "inline-flex", alignItems: "center", gap: 4,
                                    background: "rgba(59,130,246,0.08)",
                                    padding: "2px 8px", borderRadius: 6,
                                    border: "1px solid rgba(59,130,246,0.25)",
                                  }}
                                >
                                  🔗 Ver en tienda original
                                </a>
                              )}
                            </td>

                            {/* Badge plataforma */}
                            <td style={s.td}>
                              <PlatBadge plat={plataforma} />
                            </td>

                            <td style={s.td}>{prod.cantidad}</td>
                            <td style={s.td}>${parseFloat(prod.precio_unit || 0).toFixed(2)}</td>
                            <td style={{ ...s.td, fontWeight: 700, color: "#10b981" }}>
                              ${parseFloat(prod.subtotal || 0).toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}

                      {/* Fila total */}
                      <tr>
                        <td colSpan={4} style={{ ...s.td, textAlign: "right", fontWeight: 700 }}>Total:</td>
                        <td style={{ ...s.td, fontWeight: 700, color: "#10b981", fontSize: 16 }}>
                          ${detalle.pedido.total.toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* ── Aviso si hay productos externos ──────────────────── */}
                  {detalle.productos.some(p => p.tipo_producto === "externo") && (
                    <div style={{
                      marginTop: 14,
                      background: "rgba(59,130,246,0.06)",
                      border: "1px solid rgba(59,130,246,0.2)",
                      borderRadius: 8, padding: "10px 14px",
                      fontSize: 12, color: "#a0a0a0",
                    }}>
                      💡 Este pedido contiene productos de importación (Amazon/eBay).
                      Haz click en <strong style={{ color: "#3b82f6" }}>🔗 Ver en tienda original</strong> para
                      ver el producto exacto que el cliente quiere importar.
                    </div>
                  )}
                </>
              ) : (
                <div style={{ textAlign: "center", color: "#a0a0a0", padding: 40 }}>
                  No se pudo cargar el detalle del pedido.
                </div>
              )}
            </div>

            <div style={s.modalFooter}>
              <button onClick={() => setDetalle(null)} style={s.btnSecondary}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CONFIRMAR CAMBIO ───────────────────────────────────────────── */}
      {confirm && (
        <div style={s.modalOverlay} onClick={() => setConfirm(null)}>
          <div style={{ ...s.modalBox, maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h2 style={{ ...s.modalTitle, color: "#f59e0b" }}>Confirmar Cambio</h2>
              <button onClick={() => setConfirm(null)} style={s.closeBtn}>✕</button>
            </div>
            <div style={{ ...s.modalBody, textAlign: "center", padding: 24 }}>
              <p style={{ color: "#d9d9d9", fontSize: 15 }}>
                ¿Cambiar el pedido{" "}
                <strong style={{ color: "#c1121f" }}>#{confirm.pedido.id_pedido}</strong> de{" "}
                <strong>{confirm.pedido.estado}</strong> a{" "}
                <strong style={{ color: ESTADO_STYLE[confirm.nuevoEstado]?.color }}>
                  {ESTADO_STYLE[confirm.nuevoEstado]?.label}
                </strong>?
              </p>
            </div>
            <div style={s.modalFooter}>
              <button onClick={() => setConfirm(null)} style={s.btnSecondary}>Cancelar</button>
              <button onClick={confirmarCambio} disabled={!!procesando}
                style={{ ...s.btnPrimary, opacity: procesando ? 0.6 : 1 }}>
                {procesando ? "Procesando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  page:           { display: "flex", minHeight: "100vh", background: "#121418", fontFamily: "'Lato', sans-serif", color: "#d9d9d9" },
  toast:          { position: "fixed", top: 20, right: 20, background: "#1f2429", border: "1px solid #10b981", borderRadius: 10, padding: "12px 20px", color: "#10b981", fontWeight: 600, fontSize: 14, zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.5)" },
  main:           { flex: 1, padding: "24px 28px" },
  header:         { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, paddingBottom: 16, borderBottom: "2px solid #9a031e" },
  pageTitle:      { color: "#c1121f", fontSize: 26, fontWeight: 700, margin: 0 },
  pageSubtitle:   { color: "#a0a0a0", fontSize: 13, margin: "4px 0 0" },
  statsGrid:      { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 20 },
  statCard:       { background: "#1f2429", padding: "16px 18px", borderRadius: 12, borderLeft: "4px solid #9a031e" },
  statLabel:      { color: "#a0a0a0", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, margin: 0 },
  statValue:      { fontSize: 24, fontWeight: 700, margin: "4px 0 0" },
  filtros:        { display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" },
  filtroBtn:      { padding: "8px 14px", background: "#1f2429", border: "1px solid rgba(154,3,30,0.2)", borderRadius: 8, color: "#a0a0a0", cursor: "pointer", fontSize: 13 },
  filtroBtnActive:{ background: "#9a031e", border: "1px solid #9a031e", color: "white" },
  card:           { background: "#1f2429", borderRadius: 12, border: "1px solid rgba(154,3,30,0.2)", overflow: "hidden" },
  tableWrapper:   { overflowX: "auto" },
  table:          { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th:             { padding: "12px 14px", textAlign: "left", color: "#a0a0a0", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.8, background: "#121418", borderBottom: "2px solid rgba(154,3,30,0.3)" },
  td:             { padding: "10px 14px", color: "#d9d9d9", borderBottom: "1px solid rgba(154,3,30,0.08)", verticalAlign: "middle" },
  badge:          { padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 },
  sectionLabel:   { color: "#a0a0a0", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 },
  loadingRow:     { display: "flex", justifyContent: "center", padding: 40 },
  spinner:        { width: 32, height: 32, border: "3px solid rgba(154,3,30,0.3)", borderTop: "3px solid #9a031e", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  btnAccion:      { padding: "5px 10px", background: "rgba(154,3,30,0.1)", border: "1px solid rgba(154,3,30,0.3)", borderRadius: 6, cursor: "pointer", fontSize: 14 },
  modalOverlay:   { position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  modalBox:       { background: "#1f2429", border: "2px solid #9a031e", borderRadius: 16, width: "100%" },
  modalHeader:    { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "2px solid #9a031e", background: "#121418" },
  modalTitle:     { color: "#c1121f", fontSize: 16, fontWeight: 700, margin: 0 },
  closeBtn:       { background: "none", border: "none", color: "#a0a0a0", fontSize: 18, cursor: "pointer" },
  modalBody:      { padding: 20 },
  modalFooter:    { display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 20px", borderTop: "1px solid rgba(154,3,30,0.2)", background: "#121418" },
  infoBox:        { background: "#121418", borderRadius: 10, padding: 14, border: "1px solid rgba(154,3,30,0.15)" },
  infoTitle:      { color: "#c1121f", fontWeight: 700, fontSize: 13, marginBottom: 8 },
  infoRow:        { color: "#d9d9d9", fontSize: 13, margin: "4px 0" },
  btnPrimary:     { padding: "9px 20px", background: "#9a031e", border: "none", borderRadius: 8, color: "white", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  btnSecondary:   { padding: "9px 20px", background: "rgba(154,3,30,0.1)", border: "1px solid rgba(154,3,30,0.3)", borderRadius: 8, color: "#d9d9d9", fontWeight: 600, fontSize: 13, cursor: "pointer" },
};