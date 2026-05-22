"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, DollarSign, ShoppingCart, Package, ClipboardList, TrendingUp, Zap, ShoppingBag, X } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
const API = "http://localhost:8000";

function getToken() {
  return document.cookie.split("; ").find(r => r.startsWith("access_token="))?.split("=")[1];
}

const ESTADO_BADGE = {
  pendiente: { color: "#f59e0b", label: "Pendiente" },
  pagado:    { color: "#3b82f6", label: "Pagado" },
  enviado:   { color: "#10b981", label: "Enviado" },
  cancelado: { color: "#ef4444", label: "Cancelado" },
};

const PIE_COLORS = ["#f59e0b", "#3b82f6", "#10b981"];

export default function AdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) {
        router.push("/login");
        return;
      }
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    sessionStorage.removeItem("user");
    router.push("/login");
  };

  if (loading) return (
    <div style={styles.loadingPage}>
      <div style={styles.spinner} />
      <p style={{ color: "#d9d9d9", marginTop: 16 }}>Cargando dashboard...</p>
    </div>
  );

  const { stats, ventas_mensuales, pedidos_recientes, clientes_recientes,
          ventas_detalladas, productos_recientes, pedidos_activos } = data;

  const pieData = [
    { name: "Pendientes", value: stats.pendientes },
    { name: "Pagados",    value: stats.pagados },
    { name: "Enviados",   value: stats.enviados },
  ];

  return (
    <div style={styles.page}>
      

      <main style={styles.main}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.pageTitle}>Dashboard</h1>
            <p style={styles.pageSubtitle}>{new Date().toLocaleDateString("es-BO", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
          </div>
        </div>

        <div style={styles.statsGrid}>
          <StatCard icon={<Users size={28} />} label="Clientes Activos" value={stats.clientes}
            sub="Click para ver últimos 5" accent="#9a031e"
            onClick={() => setModal("clientes")} />
          <StatCard icon={<DollarSign size={28} />} label="Ventas del Mes" value={`$${stats.ventas_mes.toLocaleString("en", { minimumFractionDigits: 2 })}`}
            sub={`${stats.crecimiento >= 0 ? "↑" : "↓"} ${Math.abs(stats.crecimiento)}% vs mes anterior`}
            subColor={stats.crecimiento >= 0 ? "#10b981" : "#ef4444"}
            accent="#10b981" onClick={() => setModal("ventas")} />
          <StatCard icon={<ShoppingCart size={28} />} label="Pedidos Activos" value={stats.pedidos}
            sub={`${stats.pendientes} pendientes`} subColor="#f59e0b"
            accent="#3b82f6" onClick={() => setModal("pedidos")} />
          <StatCard icon={<Package size={28} />} label="Productos Activos" value={stats.productos}
            sub="Click para ver últimos 5" accent="#f59e0b"
            onClick={() => setModal("productos")} />
        </div>

        <div style={styles.contentRow}>
          <div style={styles.leftCol}>
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <span style={styles.cardTitle}><ClipboardList size={16} style={{ verticalAlign: "middle", marginRight: 6 }} /> Pedidos Recientes</span>
                <a href="/admin/pedidos" style={styles.cardLink}>Ver todos →</a>
              </div>
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      {["ID", "Cliente", "Total", "Estado", "Fecha"].map(h => (
                        <th key={h} style={styles.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pedidos_recientes.map((p, i) => (
                      <tr key={p.id_pedido} style={{ background: i % 2 === 0 ? "rgba(154,3,30,0.04)" : "transparent" }}>
                        <td style={styles.td}>#{p.id_pedido}</td>
                        <td style={styles.td}>{p.cliente}</td>
                        <td style={styles.td}>${p.total.toFixed(2)}</td>
                        <td style={styles.td}>
                          <span style={{ ...styles.badge, background: ESTADO_BADGE[p.estado]?.color + "25", color: ESTADO_BADGE[p.estado]?.color, border: `1px solid ${ESTADO_BADGE[p.estado]?.color}` }}>
                            {ESTADO_BADGE[p.estado]?.label}
                          </span>
                        </td>
                        <td style={styles.td}>{p.fecha}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <span style={styles.cardTitle}><TrendingUp size={16} style={{ verticalAlign: "middle", marginRight: 6 }} /> Ventas Mensuales (últimos 6 meses)</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={ventas_mensuales}>
                  <XAxis dataKey="mes" tick={{ fill: "#a0a0a0", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#a0a0a0", fontSize: 12 }} tickFormatter={v => `$${v}`} />
                  <Tooltip
                    contentStyle={{ background: "#1f2429", border: "1px solid #9a031e", borderRadius: 8, color: "#d9d9d9" }}
                    formatter={v => [`$${v.toFixed(2)}`, "Ventas"]}
                  />
                  <Line type="monotone" dataKey="total" stroke="#9a031e" strokeWidth={2.5}
                    dot={{ fill: "#c1121f", r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={styles.rightCol}>
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <span style={styles.cardTitle}> Estado de Pedidos</span>
              </div>
              <PieChart width={260} height={200} style={{ margin: "0 auto" }}>
                <Pie data={pieData} cx={130} cy={90} innerRadius={55} outerRadius={85}
                  dataKey="value" paddingAngle={3}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Legend wrapperStyle={{ color: "#d9d9d9", fontSize: 12 }} />
                <Tooltip contentStyle={{ background: "#1f2429", border: "1px solid #9a031e", borderRadius: 8, color: "#d9d9d9" }} />
              </PieChart>
              <div style={styles.pieStats}>
                {[
                  { icon: "", label: "Pendientes", value: stats.pendientes, color: "#f59e0b" },
                  { icon: "", label: "Pagados",    value: stats.pagados,    color: "#3b82f6" },
                  { icon: "", label: "Enviados",   value: stats.enviados,   color: "#10b981" },
                ].map(s => (
                  <div key={s.label} style={styles.pieStat}>
                    <span style={{ fontSize: 22 }}>{s.icon}</span>
                    <span style={{ color: s.color, fontWeight: 700, fontSize: 20 }}>{s.value}</span>
                    <span style={{ color: "#a0a0a0", fontSize: 11 }}>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <span style={styles.cardTitle}><Zap size={16} style={{ verticalAlign: "middle", marginRight: 6 }} /> Resumen Rápido</span>
              </div>
              <div style={styles.quickGrid}>
                {[
                  { icon: <DollarSign size={28} />, label: "Ventas Mes",     value: `$${stats.ventas_mes.toFixed(0)}`, color: "#10b981" },
                  { icon: <ShoppingCart size={28} />, label: "Total Pedidos",  value: stats.pedidos,                      color: "#3b82f6" },
                  { icon: <Users size={28} />, label: "Clientes",       value: stats.clientes,                     color: "#9a031e" },
                  { icon: <Package size={28} />, label: "Productos",      value: stats.productos,                    color: "#f59e0b" },
                ].map(q => (
                  <div key={q.label} style={styles.quickCard}>
                    {q.icon}
                    <span style={{ color: q.color, fontWeight: 700, fontSize: 22 }}>{q.value}</span>
                    <span style={{ color: "#a0a0a0", fontSize: 11 }}>{q.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {modal && (
        <div style={styles.modalOverlay} onClick={() => setModal(null)}>
          <div style={styles.modalBox} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                {modal === "clientes"  && <><Users size={16} style={{ verticalAlign: "middle", marginRight: 6 }} /> Últimos 5 Clientes Activos</>}
                {modal === "ventas"    && <><DollarSign size={16} style={{ verticalAlign: "middle", marginRight: 6 }} /> Últimas 5 Ventas del Mes</>}
                {modal === "pedidos"   && <><Package size={16} style={{ verticalAlign: "middle", marginRight: 6 }} /> Últimos 5 Pedidos Activos</>}
                {modal === "productos" && <><ShoppingBag size={16} style={{ verticalAlign: "middle", marginRight: 6 }} /> Últimos 5 Productos Activos</>}
              </h2>
              <button onClick={() => setModal(null)} style={styles.closeBtn}><X size={18} /></button>
            </div>

            <div style={styles.modalBody}>
              {modal === "ventas" && (
                <div style={styles.modalCards}>
                  {[
                    { label: "Total Mes",   value: `$${stats.ventas_mes.toFixed(2)}`,        color: "#9a031e" },
                    { label: "Mes Anterior",value: `$${stats.ventas_mes_anterior?.toFixed(2) ?? "0.00"}`, color: "#3b82f6" },
                    { label: "Crecimiento", value: `${stats.crecimiento}%`, color: stats.crecimiento >= 0 ? "#10b981" : "#ef4444" },
                  ].map(c => (
                    <div key={c.label} style={{ ...styles.modalCard, borderColor: c.color }}>
                      <span style={{ color: c.color, fontSize: 20, fontWeight: 700 }}>{c.value}</span>
                      <span style={{ color: "#a0a0a0", fontSize: 12 }}>{c.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {modal === "pedidos" && (
                <div style={styles.modalCards}>
                  {[
                    { label: "Total Activos", value: stats.pedidos,    color: "#9a031e" },
                    { label: "Pendientes",    value: stats.pendientes, color: "#f59e0b" },
                    { label: "Pagados",       value: stats.pagados,    color: "#3b82f6" },
                    { label: "Enviados",      value: stats.enviados,   color: "#10b981" },
                  ].map(c => (
                    <div key={c.label} style={{ ...styles.modalCard, borderColor: c.color }}>
                      <span style={{ color: c.color, fontSize: 20, fontWeight: 700 }}>{c.value}</span>
                      <span style={{ color: "#a0a0a0", fontSize: 12 }}>{c.label}</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      {modal === "clientes"  && ["ID", "Nombre", "Correo", "Teléfono", "Registro"].map(h => <th key={h} style={styles.th}>{h}</th>)}
                      {modal === "ventas"    && ["Pedido", "Cliente", "Total", "Estado", "Fecha"].map(h => <th key={h} style={styles.th}>{h}</th>)}
                      {modal === "pedidos"   && ["ID", "Cliente", "Total", "Estado", "Fecha"].map(h => <th key={h} style={styles.th}>{h}</th>)}
                      {modal === "productos" && ["ID", "Nombre", "Precio", "Stock", "Registro"].map(h => <th key={h} style={styles.th}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {modal === "clientes" && clientes_recientes.map((c, i) => (
                      <tr key={c.id_cliente} style={{ background: i % 2 === 0 ? "rgba(154,3,30,0.04)" : "transparent" }}>
                        <td style={styles.td}>{c.id_cliente}</td>
                        <td style={styles.td}>{c.nombre}</td>
                        <td style={styles.td}>{c.correo}</td>
                        <td style={styles.td}>{c.telefono}</td>
                        <td style={styles.td}>{c.fecha_registro}</td>
                      </tr>
                    ))}
                    {modal === "ventas" && ventas_detalladas.map((p, i) => (
                      <tr key={p.id_pedido} style={{ background: i % 2 === 0 ? "rgba(154,3,30,0.04)" : "transparent" }}>
                        <td style={styles.td}>#{p.id_pedido}</td>
                        <td style={styles.td}>{p.cliente}</td>
                        <td style={styles.td}>${p.total.toFixed(2)}</td>
                        <td style={styles.td}><span style={{ ...styles.badge, background: ESTADO_BADGE[p.estado]?.color + "25", color: ESTADO_BADGE[p.estado]?.color, border: `1px solid ${ESTADO_BADGE[p.estado]?.color}` }}>{ESTADO_BADGE[p.estado]?.label}</span></td>
                        <td style={styles.td}>{p.fecha}</td>
                      </tr>
                    ))}
                    {modal === "pedidos" && pedidos_activos.map((p, i) => (
                      <tr key={p.id_pedido} style={{ background: i % 2 === 0 ? "rgba(154,3,30,0.04)" : "transparent" }}>
                        <td style={styles.td}>#{p.id_pedido}</td>
                        <td style={styles.td}>{p.cliente}</td>
                        <td style={styles.td}>${p.total.toFixed(2)}</td>
                        <td style={styles.td}><span style={{ ...styles.badge, background: ESTADO_BADGE[p.estado]?.color + "25", color: ESTADO_BADGE[p.estado]?.color, border: `1px solid ${ESTADO_BADGE[p.estado]?.color}` }}>{ESTADO_BADGE[p.estado]?.label}</span></td>
                        <td style={styles.td}>{p.fecha}</td>
                      </tr>
                    ))}
                    {modal === "productos" && productos_recientes.map((p, i) => (
                      <tr key={p.id_producto} style={{ background: i % 2 === 0 ? "rgba(154,3,30,0.04)" : "transparent" }}>
                        <td style={styles.td}>{p.id_producto}</td>
                        <td style={styles.td}>{p.nombre}</td>
                        <td style={styles.td}>${p.precio.toFixed(2)}</td>
                        <td style={{ ...styles.td, color: p.stock <= 5 ? "#ef4444" : "#d9d9d9", fontWeight: p.stock <= 5 ? 700 : 400 }}>{p.stock}</td>
                        <td style={styles.td}>{p.fecha_registro}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button onClick={() => setModal(null)} style={styles.btnSecondary}>Cerrar</button>
              <a href={
                modal === "clientes"  ? "/admin/usuarios" :
                modal === "ventas"    ? "/admin/reportes" :
                modal === "pedidos"   ? "/admin/pedidos"  : "/admin/productos"
              } style={styles.btnPrimary}>
                {modal === "clientes"  ? "Gestionar Clientes" :
                 modal === "ventas"    ? "Ver Reportes" :
                 modal === "pedidos"   ? "Gestionar Pedidos" : "Gestionar Productos"}
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, sub, subColor, accent, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...styles.statCard,
        borderLeftColor: accent,
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        boxShadow: hovered ? `0 8px 25px rgba(0,0,0,0.4), 0 0 15px ${accent}30` : "0 4px 15px rgba(0,0,0,0.3)",
      }}
    >
      <div style={styles.statTop}>
        <div>
          <p style={styles.statLabel}>{label}</p>
          <p style={styles.statValue}>{value}</p>
        </div>
        {icon}
      </div>
      <p style={{ ...styles.statSub, color: subColor || "#a0a0a0" }}>{sub}</p>
    </div>
  );
}

const styles = {
  page: { display: "flex", minHeight: "100vh", background: "#121418", fontFamily: "'Lato', sans-serif", color: "#d9d9d9" },
  loadingPage: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#121418" },
  spinner: { width: 40, height: 40, border: "3px solid rgba(154,3,30,0.3)", borderTop: "3px solid #9a031e", borderRadius: "50%", animation: "spin 0.8s linear infinite" },

  sidebar: { width: 240, background: "#0d0f12", borderRight: "2px solid #9a031e", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh" },
  sidebarLogo: { padding: "24px 20px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid rgba(154,3,30,0.3)" },
  logoIcon: { fontSize: 24 },
  logoText: { color: "#c1121f", fontWeight: 700, fontSize: 16, letterSpacing: 0.5 },
  nav: { flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 4 },
  navLink: { display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 8, color: "#d9d9d9", textDecoration: "none", fontSize: 14, transition: "all 0.2s", borderLeft: "3px solid transparent" },
  navLinkActive: { background: "#9a031e", color: "white", borderLeftColor: "white" },
  sidebarFooter: { padding: "16px", borderTop: "1px solid rgba(154,3,30,0.3)" },
  userInfo: { display: "flex", alignItems: "center", gap: 10, marginBottom: 12 },
  userAvatar: { fontSize: 28 },
  userName: { color: "#d9d9d9", fontSize: 13, fontWeight: 600, margin: 0 },
  userRole: { color: "#9a031e", fontSize: 11, margin: 0 },
  logoutBtn: { width: "100%", padding: "8px", background: "rgba(154,3,30,0.15)", border: "1px solid rgba(154,3,30,0.4)", borderRadius: 8, color: "#d9d9d9", cursor: "pointer", fontSize: 13 },

  main: { flex: 1, padding: "24px 28px", overflowY: "auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, paddingBottom: 16, borderBottom: "2px solid #9a031e" },
  pageTitle: { color: "#c1121f", fontSize: 26, fontWeight: 700, margin: 0 },
  pageSubtitle: { color: "#a0a0a0", fontSize: 13, margin: "4px 0 0" },

  statsGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 },
  statCard: { background: "#1f2429", padding: "20px", borderRadius: 12, borderLeft: "4px solid #9a031e", cursor: "pointer", transition: "all 0.3s ease" },
  statTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  statLabel: { color: "#a0a0a0", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, margin: 0 },
  statValue: { color: "#d9d9d9", fontSize: 26, fontWeight: 700, margin: "4px 0 0" },
  statIcon: { fontSize: 28 },
  statSub: { fontSize: 12, margin: 0 },

  contentRow: { display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 },
  leftCol: { display: "flex", flexDirection: "column", gap: 20 },
  rightCol: { display: "flex", flexDirection: "column", gap: 20 },

  card: { background: "#1f2429", borderRadius: 12, border: "1px solid rgba(154,3,30,0.2)", overflow: "hidden" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: "2px solid #9a031e", background: "#121418" },
  cardTitle: { color: "#c1121f", fontWeight: 700, fontSize: 14 },
  cardLink: { color: "#9a031e", fontSize: 12, textDecoration: "none" },

  tableWrapper: { overflowX: "auto", padding: "0 0 4px" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { padding: "10px 16px", textAlign: "left", color: "#a0a0a0", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.8, background: "#121418", borderBottom: "2px solid rgba(154,3,30,0.3)" },
  td: { padding: "10px 16px", color: "#d9d9d9", borderBottom: "1px solid rgba(154,3,30,0.08)" },
  badge: { padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 },

  pieStats: { display: "flex", justifyContent: "space-around", padding: "12px 16px 16px" },
  pieStat: { display: "flex", flexDirection: "column", alignItems: "center", gap: 2 },
  quickGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: 16 },
  quickCard: { background: "#121418", borderRadius: 10, padding: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, border: "1px solid rgba(154,3,30,0.15)" },

  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  modalBox: { background: "#1f2429", border: "2px solid #9a031e", borderRadius: 16, width: "100%", maxWidth: 720, maxHeight: "85vh", display: "flex", flexDirection: "column" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "2px solid #9a031e", background: "#121418" },
  modalTitle: { color: "#c1121f", fontSize: 16, fontWeight: 700, margin: 0 },
  closeBtn: { background: "none", border: "none", color: "#a0a0a0", fontSize: 18, cursor: "pointer" },
  modalBody: { flex: 1, overflowY: "auto", padding: "16px 20px" },
  modalCards: { display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" },
  modalCard: { flex: 1, minWidth: 120, background: "#121418", borderRadius: 10, padding: "12px 16px", display: "flex", flexDirection: "column", gap: 4, border: "2px solid" },
  modalFooter: { display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 20px", borderTop: "1px solid rgba(154,3,30,0.2)", background: "#121418" },
  btnPrimary: { padding: "9px 20px", background: "#9a031e", border: "none", borderRadius: 8, color: "white", fontWeight: 600, fontSize: 13, cursor: "pointer", textDecoration: "none" },
  btnSecondary: { padding: "9px 20px", background: "rgba(154,3,30,0.1)", border: "1px solid rgba(154,3,30,0.3)", borderRadius: 8, color: "#d9d9d9", fontWeight: 600, fontSize: 13, cursor: "pointer" },
};
