"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Printer, Download, ChevronUp, ChevronDown, FileText } from "lucide-react";


const API = "http://localhost:8000";
function getToken() {
  return document.cookie.split("; ").find(r => r.startsWith("access_token="))?.split("=")[1];
}



const ESTADO_COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#ef4444", "#8b5cf6"];

function hoy() { return new Date().toISOString().split("T")[0]; }
function inicioMes() {
  const d = new Date(); d.setDate(1);
  return d.toISOString().split("T")[0];
}

export default function AdminReportes() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [filtros, setFiltros] = useState({
    fecha_inicio: inicioMes(),
    fecha_fin:    hoy(),
    producto_id:  "",
    cliente_id:   "",
  });
  const [tablaVista, setTablaVista] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      const params = new URLSearchParams({
        fecha_inicio: filtros.fecha_inicio,
        fecha_fin:    filtros.fecha_fin,
        ...(filtros.producto_id && { producto_id: filtros.producto_id }),
        ...(filtros.cliente_id  && { cliente_id:  filtros.cliente_id  }),
      });
      const res = await fetch(`${API}/admin/reportes?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { router.push("/login"); return; }
      const json = await res.json();
      setData(json);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filtros]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const exportarCSV = () => {
    const token = getToken();
    const params = new URLSearchParams({
      fecha_inicio: filtros.fecha_inicio,
      fecha_fin:    filtros.fecha_fin,
      ...(filtros.producto_id && { producto_id: filtros.producto_id }),
      ...(filtros.cliente_id  && { cliente_id:  filtros.cliente_id  }),
    });
    window.open(`${API}/admin/reportes/exportar/csv?${params}&token=${token}`, "_blank");
  };

  const logout = () => {
    document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    sessionStorage.removeItem("user");
    router.push("/login");
  };

  return (
    <div style={s.page}>
      {/* SIDEBAR */}
      

      {/* MAIN */}
      <main style={s.main}>
        {/* HEADER */}
        <div style={s.header}>
          <div>
            <h1 style={s.pageTitle}>Reportes y Estadísticas</h1>
            <p style={s.pageSubtitle}>Análisis de ventas, pedidos y productos</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => window.print()} style={s.btnSecondary}><Printer size={14} /> Imprimir</button>
            <button onClick={exportarCSV} style={{ ...s.btnSecondary, color: "#10b981", borderColor: "rgba(16,185,129,0.4)" }}><Download size={14} /> Exportar CSV</button>
          </div>
        </div>

        {/* FILTROS */}
        <div style={s.card}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: 12, alignItems: "end" }}>
            <div style={s.formGroup}>
              <label style={s.formLabel}>Fecha Inicio</label>
              <input type="date" value={filtros.fecha_inicio}
                onChange={e => setFiltros({ ...filtros, fecha_inicio: e.target.value })}
                style={s.formInput} />
            </div>
            <div style={s.formGroup}>
              <label style={s.formLabel}>Fecha Fin</label>
              <input type="date" value={filtros.fecha_fin}
                onChange={e => setFiltros({ ...filtros, fecha_fin: e.target.value })}
                style={s.formInput} />
            </div>
            <div style={s.formGroup}>
              <label style={s.formLabel}>Producto</label>
              <select value={filtros.producto_id}
                onChange={e => setFiltros({ ...filtros, producto_id: e.target.value })}
                style={s.formInput}>
                <option value="">Todos</option>
                {data?.lista_productos?.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
            <div style={s.formGroup}>
              <label style={s.formLabel}>Cliente</label>
              <select value={filtros.cliente_id}
                onChange={e => setFiltros({ ...filtros, cliente_id: e.target.value })}
                style={s.formInput}>
                <option value="">Todos</option>
                {data?.lista_clientes?.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <button onClick={() => setFiltros({ fecha_inicio: inicioMes(), fecha_fin: hoy(), producto_id: "", cliente_id: "" })}
              style={s.btnSecondary}> Limpiar</button>
          </div>
        </div>

        {loading ? (
          <div style={s.loadingRow}><div style={s.spinner} /></div>
        ) : data && (
          <>
            {/* STATS */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
              {[
                { icon: "", label: "Ventas Totales",   value: `$${data.stats.total_ventas.toLocaleString("en", { minimumFractionDigits: 2 })}`, color: "#9a031e",  sub: "Período seleccionado" },
                { icon: "", label: "Pedidos Activos",  value: data.stats.total_pedidos,     color: "#10b981", sub: "Excluye cancelados" },
                { icon: "", label: "Clientes Nuevos",  value: data.stats.clientes_nuevos,   color: "#3b82f6", sub: "En el período" },
                { icon: "", label: "Ticket Promedio",  value: `$${data.stats.ticket_promedio.toFixed(2)}`, color: "#f59e0b", sub: "Por pedido" },
              ].map(st => (
                <div key={st.label} style={{ ...s.statCard, borderLeftColor: st.color }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <p style={s.statLabel}>{st.label}</p>
                      <p style={{ ...s.statValue, color: st.color }}>{st.value}</p>
                      <p style={{ color: "#a0a0a0", fontSize: 11, margin: 0 }}>{st.sub}</p>
                    </div>
                    <span style={{ fontSize: 30 }}>{st.icon}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* GRÁFICAS FILA 1 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              {/* Ventas mensuales */}
              <div style={s.card}>
                <p style={s.cardTitle}> Ventas Mensuales (Últimos 6 meses)</p>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={data.ventas_mensuales}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(154,3,30,0.1)" />
                    <XAxis dataKey="label" tick={{ fill: "#a0a0a0", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#a0a0a0", fontSize: 11 }} tickFormatter={v => `$${v.toLocaleString()}`} />
                    <Tooltip formatter={v => [`$${Number(v).toLocaleString("en", { minimumFractionDigits: 2 })}`, "Ventas"]}
                      contentStyle={{ background: "#1f2429", border: "1px solid #9a031e", color: "#d9d9d9" }} />
                    <Line type="monotone" dataKey="total" stroke="#9a031e" strokeWidth={2} dot={{ fill: "#c1121f", r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Ventas semanales */}
              <div style={s.card}>
                <p style={s.cardTitle}> Ventas Semanales (Últimas 8 semanas)</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.ventas_semanales}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(154,3,30,0.1)" />
                    <XAxis dataKey="label" tick={{ fill: "#a0a0a0", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#a0a0a0", fontSize: 11 }} tickFormatter={v => `$${v.toLocaleString()}`} />
                    <Tooltip formatter={v => [`$${Number(v).toLocaleString("en", { minimumFractionDigits: 2 })}`, "Ventas"]}
                      contentStyle={{ background: "#1f2429", border: "1px solid #9a031e", color: "#d9d9d9" }} />
                    <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* GRÁFICAS FILA 2 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              {/* Distribución estados */}
              <div style={s.card}>
                <p style={s.cardTitle}> Distribución de Pedidos por Estado</p>
                {data.distribucion_estados.length === 0 ? (
                  <p style={{ color: "#a0a0a0", textAlign: "center", padding: 40 }}>Sin datos en el período</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={data.distribucion_estados} dataKey="total" nameKey="estado" cx="50%" cy="50%" outerRadius={80} label={({ estado, percent }) => `${estado} ${(percent * 100).toFixed(0)}%`}>
                        {data.distribucion_estados.map((_, i) => (
                          <Cell key={i} fill={ESTADO_COLORS[i % ESTADO_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: "#1f2429", border: "1px solid #9a031e", color: "#d9d9d9" }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Top productos */}
              <div style={s.card}>
                <p style={s.cardTitle}> Top Productos Más Vendidos</p>
                {data.productos_top.length === 0 ? (
                  <p style={{ color: "#a0a0a0", textAlign: "center", padding: 40 }}>Sin datos en el período</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.productos_top.slice(0, 6)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(154,3,30,0.1)" />
                      <XAxis type="number" tick={{ fill: "#a0a0a0", fontSize: 10 }} tickFormatter={v => `$${v}`} />
                      <YAxis type="category" dataKey="nombre" tick={{ fill: "#a0a0a0", fontSize: 10 }} width={90}
                        tickFormatter={v => v.length > 12 ? v.slice(0, 12) + "…" : v} />
                      <Tooltip formatter={v => [`$${Number(v).toFixed(2)}`, "Total"]}
                        contentStyle={{ background: "#1f2429", border: "1px solid #9a031e", color: "#d9d9d9" }} />
                      <Bar dataKey="total" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* TABLA PRODUCTOS */}
            <div style={s.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <p style={s.cardTitle}> Detalle de Productos Más Vendidos</p>
                <span style={{ color: "#a0a0a0", fontSize: 12 }}>
                  {data.filtros.fecha_inicio} — {data.filtros.fecha_fin}
                </span>
              </div>
              <div style={s.tableWrapper}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      {["Producto", "Cantidad Vendida", "Total Vendido", "% del Total"].map(h => (
                        <th key={h} style={s.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.productos_top.length === 0 ? (
                      <tr><td colSpan={4} style={{ ...s.td, textAlign: "center", color: "#a0a0a0", padding: 32 }}>
                        Sin datos para el período seleccionado
                      </td></tr>
                    ) : data.productos_top.map((p, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? "rgba(154,3,30,0.04)" : "transparent" }}>
                        <td style={s.td}>{p.nombre}</td>
                        <td style={s.td}>{p.cantidad} unidades</td>
                        <td style={{ ...s.td, fontWeight: 700, color: "#10b981" }}>${p.total.toFixed(2)}</td>
                        <td style={s.td}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ flex: 1, height: 6, background: "rgba(154,3,30,0.15)", borderRadius: 3 }}>
                              <div style={{ width: `${p.porcentaje}%`, height: "100%", background: "#9a031e", borderRadius: 3 }} />
                            </div>
                            <span style={{ fontSize: 12, color: "#a0a0a0", minWidth: 36 }}>{p.porcentaje}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* TABLA VENTAS DETALLADAS (expandible) */}
            <div style={s.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: tablaVista ? 16 : 0 }}>
                <p style={{ ...s.cardTitle, margin: 0 }}><FileText size={14} /> Ventas Detalladas ({data.ventas_detalladas.length} registros)</p>
                <button onClick={() => setTablaVista(!tablaVista)} style={s.btnSecondary}>
                  {tablaVista ? <><ChevronUp size={14} /> Ocultar</> : <><ChevronDown size={14} /> Ver detalle</>}
                </button>
              </div>
              {tablaVista && (
                <div style={s.tableWrapper}>
                  <table style={s.table}>
                    <thead>
                      <tr>
                        {["Pedido", "Fecha", "Cliente", "Producto", "Cantidad", "Precio", "Total", "Estado"].map(h => (
                          <th key={h} style={s.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.ventas_detalladas.map((v, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? "rgba(154,3,30,0.04)" : "transparent" }}>
                          <td style={s.td}>#{v.id_pedido}</td>
                          <td style={{ ...s.td, fontSize: 12 }}>{v.fecha}</td>
                          <td style={s.td}>{v.cliente}</td>
                          <td style={s.td}>{v.producto}</td>
                          <td style={s.td}>{v.cantidad}</td>
                          <td style={s.td}>${v.precio.toFixed(2)}</td>
                          <td style={{ ...s.td, fontWeight: 700, color: "#10b981" }}>${v.total_linea.toFixed(2)}</td>
                          <td style={s.td}><span style={{ ...s.badge, background: "rgba(154,3,30,0.1)", color: "#c1121f", border: "1px solid rgba(154,3,30,0.2)" }}>{v.estado}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

const s = {
  page: { display: "flex", minHeight: "100vh", background: "#121418", fontFamily: "'Lato', sans-serif", color: "#d9d9d9" },
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
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, paddingBottom: 16, borderBottom: "2px solid #9a031e" },
  pageTitle: { color: "#c1121f", fontSize: 26, fontWeight: 700, margin: 0 },
  pageSubtitle: { color: "#a0a0a0", fontSize: 13, margin: "4px 0 0" },
  card: { background: "#1f2429", borderRadius: 12, border: "1px solid rgba(154,3,30,0.2)", padding: 20, marginBottom: 16 },
  cardTitle: { color: "#c1121f", fontWeight: 700, fontSize: 14, marginBottom: 12 },
  statCard: { background: "#1f2429", padding: "16px 18px", borderRadius: 12, borderLeft: "4px solid #9a031e" },
  statLabel: { color: "#a0a0a0", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, margin: 0 },
  statValue: { fontSize: 22, fontWeight: 700, margin: "4px 0 2px" },
  formGroup: { marginBottom: 0 },
  formLabel: { display: "block", color: "#a0a0a0", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 },
  formInput: { width: "100%", padding: "9px 12px", background: "#121418", border: "1px solid rgba(154,3,30,0.3)", borderRadius: 8, color: "#d9d9d9", fontSize: 13, outline: "none", boxSizing: "border-box" },
  tableWrapper: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { padding: "10px 14px", textAlign: "left", color: "#a0a0a0", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.8, background: "#121418", borderBottom: "2px solid rgba(154,3,30,0.3)" },
  td: { padding: "10px 14px", color: "#d9d9d9", borderBottom: "1px solid rgba(154,3,30,0.08)" },
  badge: { padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 },
  loadingRow: { display: "flex", justifyContent: "center", padding: 60 },
  spinner: { width: 36, height: 36, border: "3px solid rgba(154,3,30,0.3)", borderTop: "3px solid #9a031e", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  btnSecondary: { padding: "8px 16px", background: "rgba(154,3,30,0.1)", border: "1px solid rgba(154,3,30,0.3)", borderRadius: 8, color: "#d9d9d9", fontWeight: 600, fontSize: 13, cursor: "pointer" },
};