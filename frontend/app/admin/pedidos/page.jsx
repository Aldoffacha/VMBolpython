"use client";

import "@/styles/admin.css";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAdminCurrency } from "@/lib/AdminCurrencyContext";


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

const POR_PAGINA = 15;

export default function AdminPedidos() {
  const router = useRouter();
  const { formatPrice } = useAdminCurrency();
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
  const [pagina, setPagina] = useState(1);

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

  useEffect(() => { setPagina(1); }, [filtro]);
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
    <div>
      {toast && <div className="admin-toast admin-toast--ok">{toast}</div>}

      

      <main>
        <div className="admin-header">
          <div>
            <h1 className="admin-header__title">Gestión de Pedidos</h1>
            <p className="admin-header__sub">{contadores.total} pedidos en total</p>
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
        <div className="admin-card">
          {loading ? (
            <div className="admin-loading"><div className="admin-spinner" /></div>
          ) : (
            <>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      {["ID Pedido", "Cliente", "Total", "T/Cambio", "Estado", "Fecha y Hora", "Acciones"].map(h => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pedidos.length === 0 ? (
                      <tr>
                          <td colSpan={7} style={{ textAlign: "center", color: "var(--admin-text-2)", padding: 40 }}>
                          No hay pedidos {filtro !== "todos" ? `con estado "${filtro}"` : ""}
                        </td>
                      </tr>
                    ) : pedidos.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA).map((p, i) => {
                      const est = ESTADO_STYLE[p.estado] || ESTADO_STYLE.pendiente;
                      return (
                        <tr key={p.id_pedido} style={{ background: i % 2 === 0 ? "rgba(154,3,30,0.04)" : "transparent" }}>
                          <td>
                            <strong style={{ color: "var(--admin-accent2)" }}>#{p.id_pedido}</strong>
                            <br /><span style={{ color: "var(--admin-text-2)", fontSize: 11 }}>Cliente ID: {p.id_cliente}</span>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{p.cliente_nombre}</div>
                            <div style={{ color: "var(--admin-text-2)", fontSize: 12 }}>{p.cliente_email}</div>
                          </td>
                          <td style={{ fontWeight: 700, color: "#10b981" }}>{formatPrice(p.total)}</td>
                          <td style={{ color: "var(--admin-text-2)", fontSize: 12 }}>{p.tipo_cambio ?? 9.17}</td>
                          <td>
                            <span className="admin-badge" style={{ background: est.bg, color: est.color, border: `1px solid ${est.border}` }}>
                              {est.label}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontSize: 13 }}>{p.fecha.split(" ")[0]}</div>
                            <div style={{ color: "var(--admin-text-2)", fontSize: 11 }}>{p.fecha.split(" ")[1]}</div>
                          </td>
                          <td>
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

              {/* PAGINACION */}
              {pedidos.length > POR_PAGINA && (
                <div className="admin-pagination">
                  <button onClick={() => setPagina(1)} disabled={pagina === 1} className="admin-page-btn" style={{ opacity: pagina === 1 ? 0.4 : 1 }}>«</button>
                  <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1} className="admin-page-btn" style={{ opacity: pagina === 1 ? 0.4 : 1 }}>‹ Anterior</button>
                    <span style={{ color: "var(--admin-text-2)", fontSize: 13, padding: "0 8px" }}>
                    Página {pagina} de {Math.ceil(pedidos.length / POR_PAGINA)}
                  </span>
                  <button onClick={() => setPagina(p => Math.min(Math.ceil(pedidos.length / POR_PAGINA), p + 1))} disabled={pagina === Math.ceil(pedidos.length / POR_PAGINA)} className="admin-page-btn" style={{ opacity: pagina === Math.ceil(pedidos.length / POR_PAGINA) ? 0.4 : 1 }}>Siguiente ›</button>
                  <button onClick={() => setPagina(Math.ceil(pedidos.length / POR_PAGINA))} disabled={pagina === Math.ceil(pedidos.length / POR_PAGINA)} className="admin-page-btn" style={{ opacity: pagina === Math.ceil(pedidos.length / POR_PAGINA) ? 0.4 : 1 }}>»</button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* ── MODAL DETALLE ────────────────────────────────────────────────────── */}
      {detalle && (
        <div className="admin-overlay" onClick={() => setDetalle(null)}>
          <div className="admin-modal admin-modal--wide" onClick={e => e.stopPropagation()}>
            <div className="admin-modal__head">
              <h2 className="admin-modal__title">
                📦 Detalle del Pedido #{detalle.pedido?.id_pedido}
              </h2>
              <button onClick={() => setDetalle(null)} className="admin-modal__close">✕</button>
            </div>

            <div className="admin-modal__body" style={{ overflowY: "auto", maxHeight: "72vh" }}>
              {loadingDetalle ? (
                <div className="admin-loading"><div className="admin-spinner" /></div>
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
                        <span className="admin-badge" style={{
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
                          {formatPrice(detalle.pedido.total)}
                        </span>
                      </p>
                      <p style={s.infoRow}><b>T/Cambio:</b> {detalle.pedido.tipo_cambio ?? 9.17}</p>
                    </div>
                  </div>

                  {/* ── Tabla de productos con link para externos ─────────── */}
                  <p style={s.sectionLabel}>🛍️ Productos del Pedido</p>

                  <table className="admin-table" style={{ fontSize: 13 }}>
                    <thead>
                      <tr>
                        {["Producto", "Plataforma", "Cantidad", "Precio Unit.", "Subtotal"].map(h => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {detalle.productos.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ textAlign: "center", color: "var(--admin-text-2)" }}>
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
                            <td>
                              <div style={{ fontWeight: 600, color: "var(--admin-text)", marginBottom: 4 }}>
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
                            <td>
                              <PlatBadge plat={plataforma} />
                            </td>

                            <td>{prod.cantidad}</td>
                            <td>{formatPrice(prod.precio_unit)}</td>
                            <td style={{ fontWeight: 700, color: "#10b981" }}>
                              {formatPrice(prod.subtotal)}
                            </td>
                          </tr>
                        );
                      })}

                      {/* Fila total */}
                      <tr>
                        <td colSpan={4} style={{ textAlign: "right", fontWeight: 700 }}>Total:</td>
                        <td style={{ fontWeight: 700, color: "#10b981", fontSize: 16 }}>
                          {formatPrice(detalle.pedido.total)}
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
                      fontSize: 12, color: "var(--admin-text-2)",
                    }}>
                      💡 Este pedido contiene productos de importación (Amazon/eBay).
                      Haz click en <strong style={{ color: "#3b82f6" }}>🔗 Ver en tienda original</strong> para
                      ver el producto exacto que el cliente quiere importar.
                    </div>
                  )}
                </>
              ) : (
                <div style={{ textAlign: "center", color: "var(--admin-text-2)", padding: 40 }}>
                  No se pudo cargar el detalle del pedido.
                </div>
              )}
            </div>

            <div className="admin-modal__foot">
              <button onClick={() => setDetalle(null)} className="admin-btn admin-btn--sec">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CONFIRMAR CAMBIO ───────────────────────────────────────────── */}
      {confirm && (
        <div className="admin-overlay" onClick={() => setConfirm(null)}>
          <div className="admin-modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="admin-modal__head">
              <h2 className="admin-modal__title" style={{ color: "#f59e0b" }}>Confirmar Cambio</h2>
              <button onClick={() => setConfirm(null)} className="admin-modal__close">✕</button>
            </div>
            <div className="admin-modal__body" style={{ textAlign: "center", padding: 24 }}>
              <p style={{ color: "var(--admin-text)", fontSize: 15 }}>
                ¿Cambiar el pedido{" "}
                <strong style={{ color: "var(--admin-accent2)" }}>#{confirm.pedido.id_pedido}</strong> de{" "}
                <strong>{confirm.pedido.estado}</strong> a{" "}
                <strong style={{ color: ESTADO_STYLE[confirm.nuevoEstado]?.color }}>
                  {ESTADO_STYLE[confirm.nuevoEstado]?.label}
                </strong>?
              </p>
            </div>
            <div className="admin-modal__foot">
              <button onClick={() => setConfirm(null)} className="admin-btn admin-btn--sec">Cancelar</button>
              <button onClick={confirmarCambio} disabled={!!procesando}
                className="admin-btn admin-btn--pri" style={{ opacity: procesando ? 0.6 : 1 }}>
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
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
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
  infoBox: {
    background: "var(--admin-surface)",
    borderRadius: 10,
    padding: 14,
    border: "1px solid var(--admin-border)",
    boxShadow: "0 8px 18px rgba(0,0,0,0.12)",
  },
  infoTitle: { color: "var(--admin-accent2)", fontWeight: 700, fontSize: 13, marginBottom: 8 },
  infoRow: { color: "var(--admin-text)", fontSize: 13, margin: "4px 0" },
  sectionLabel: { color: "var(--admin-text-2)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 },
  btnAccion: { padding: "5px 10px", background: "rgba(154,3,30,0.1)", border: "1px solid rgba(154,3,30,0.3)", borderRadius: 6, cursor: "pointer", fontSize: 14 },
};