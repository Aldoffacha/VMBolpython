"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminCurrency } from "@/lib/AdminCurrencyContext";
import { Users, DollarSign, ShoppingCart, Package, ClipboardList, TrendingUp, Zap, ShoppingBag, X } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import "@/styles/admin.css";
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
  const { formatPrice } = useAdminCurrency();

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
    <div className="admin-loading">
      <div className="admin-spinner" />
      <p style={{ color: "var(--admin-text-2)", marginTop: 16 }}>Cargando dashboard...</p>
    </div>
  );

  const { stats, ventas_mensuales, pedidos_recientes, clientes_recientes,
          ventas_detalladas, productos_recientes, pedidos_activos,
          productos_mas_vendidos = [] } = data;

  const pieData = [
    { name: "Pendientes", value: stats.pendientes },
    { name: "Pagados",    value: stats.pagados },
    { name: "Enviados",   value: stats.enviados },
  ];

  return (
    <>
      <div className="admin-header">
        <div>
          <h1 className="admin-header__title">Dashboard</h1>
          <p className="admin-header__sub">{new Date().toLocaleDateString("es-BO", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
      </div>

      <div className="admin-stats">
        <StatCard icon={<Users size={28} />} label="Clientes Activos" value={stats.clientes}
          sub="Click para ver últimos 5" accent="#9a031e"
          onClick={() => setModal("clientes")} />
        <StatCard icon={<DollarSign size={28} />} label="Ventas del Mes" value={formatPrice(stats.ventas_mes)}
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

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
          <div className="admin-card">
            <div className="admin-card__head">
              <span className="admin-card__title"><ClipboardList size={16} style={{ verticalAlign: "middle", marginRight: 6 }} /> Pedidos Recientes</span>
              <a href="/admin/pedidos" style={{ color: "var(--admin-accent)", fontSize: 12, textDecoration: "none" }}>Ver todos →</a>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    {["ID", "Cliente", "Total", "Estado", "Fecha"].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pedidos_recientes.map((p, i) => (
                    <tr key={p.id_pedido} style={{ background: i % 2 === 0 ? "rgba(154,3,30,0.04)" : "transparent" }}>
                      <td>#{p.id_pedido}</td>
                      <td>{p.cliente}</td>
                      <td>{formatPrice(p.total)}</td>
                      <td>
                        <span className="admin-badge" style={{ background: ESTADO_BADGE[p.estado]?.color + "25", color: ESTADO_BADGE[p.estado]?.color, border: `1px solid ${ESTADO_BADGE[p.estado]?.color}` }}>
                          {ESTADO_BADGE[p.estado]?.label}
                        </span>
                      </td>
                      <td>{p.fecha}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="admin-card">
            <div className="admin-card__head">
              <span className="admin-card__title"><TrendingUp size={16} style={{ verticalAlign: "middle", marginRight: 6 }} /> Ventas Mensuales (últimos 6 meses)</span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={ventas_mensuales}>
                <XAxis dataKey="mes" tick={{ fill: "var(--admin-text-2)", fontSize: 12 }} />
                <YAxis tick={{ fill: "var(--admin-text-2)", fontSize: 12 }} tickFormatter={v => `$${v}`} />
                <Tooltip
                  contentStyle={{ background: "var(--admin-card)", border: "1px solid var(--admin-accent)", borderRadius: 8, color: "var(--admin-text)" }}
                  formatter={v => [`$${v.toFixed(2)}`, "Ventas"]}
                />
                <Line type="monotone" dataKey="total" stroke="#9a031e" strokeWidth={2.5}
                  dot={{ fill: "#c1121f", r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
          <div className="admin-card">
            <div className="admin-card__head">
              <span className="admin-card__title"> Estado de Pedidos</span>
            </div>
            <PieChart width={260} height={200} style={{ margin: "0 auto" }}>
              <Pie data={pieData} cx={130} cy={90} innerRadius={55} outerRadius={85}
                dataKey="value" paddingAngle={3}>
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Legend wrapperStyle={{ color: "var(--admin-text)", fontSize: 12 }} />
              <Tooltip contentStyle={{ background: "var(--admin-card)", border: "1px solid var(--admin-accent)", borderRadius: 8, color: "var(--admin-text)" }} />
            </PieChart>
            <div style={{ display: "flex", justifyContent: "space-around", padding: "12px 16px 16px" }}>
              {[
                { icon: "", label: "Pendientes", value: stats.pendientes, color: "#f59e0b" },
                { icon: "", label: "Pagados",    value: stats.pagados,    color: "#3b82f6" },
                { icon: "", label: "Enviados",   value: stats.enviados,   color: "#10b981" },
              ].map(s => (
                <div key={s.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <span style={{ fontSize: 22 }}>{s.icon}</span>
                  <span style={{ color: s.color, fontWeight: 700, fontSize: 20 }}>{s.value}</span>
                  <span style={{ color: "var(--admin-text-2)", fontSize: 11 }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="admin-card admin-card--soft">
            <div className="admin-card__head">
              <span className="admin-card__title"><Zap size={16} style={{ verticalAlign: "middle", marginRight: 6 }} /> Resumen Rápido</span>
            </div>
            <div className="admin-quick-grid" style={{ padding: 16 }}>
              {[
                { icon: <DollarSign size={28} />, label: "Ventas Mes",     value: formatPrice(stats.ventas_mes), color: "#10b981" },
                { icon: <ShoppingCart size={28} />, label: "Total Pedidos",  value: stats.pedidos,                      color: "#3b82f6" },
                { icon: <Users size={28} />, label: "Clientes",       value: stats.clientes,                     color: "#9a031e" },
                { icon: <Package size={28} />, label: "Productos",      value: stats.productos,                    color: "#f59e0b" },
              ].map(q => (
                <div key={q.label} className="admin-chip admin-stat--mini" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, textAlign: "center" }}>
                  {q.icon}
                  <span style={{ color: q.color, fontWeight: 700, fontSize: 22 }}>{q.value}</span>
                  <span style={{ color: "var(--admin-text-2)", fontSize: 11 }}>{q.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <div className="admin-card">
          <div className="admin-card__head">
            <span className="admin-card__title"><ShoppingBag size={16} style={{ verticalAlign: "middle", marginRight: 6 }} /> Productos más vendidos</span>
              <a href="/admin/reabastecimiento" style={{ color: "var(--admin-accent)", fontSize: 12, textDecoration: "none" }}>Ver reabastecimiento →</a>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  {["#", "Nombre", "Categoría", "Vendido", "Stock", "Precio"].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {productos_mas_vendidos.map((p, i) => (
                  <tr key={p.id_producto} style={{ background: i % 2 === 0 ? "rgba(154,3,30,0.04)" : "transparent" }}>
                    <td>{i + 1}</td>
                    <td>{p.nombre}</td>
                    <td>{p.categoria}</td>
                    <td style={{ color: "#10b981", fontWeight: 700 }}>{p.total_vendido}</td>
                    <td style={{ color: p.stock <= 5 ? "#ef4444" : "var(--admin-text)", fontWeight: p.stock <= 5 ? 700 : 400 }}>{p.stock}</td>
                    <td>{formatPrice(p.precio)}</td>
                  </tr>
                ))}
                {productos_mas_vendidos.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--admin-text-2)" }}>Sin datos de ventas aún</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modal && (
        <div className="admin-overlay" onClick={() => setModal(null)}>
          <div className="admin-modal admin-modal--wide" onClick={e => e.stopPropagation()}>
            <div className="admin-modal__head">
              <h2 className="admin-modal__title">
                {modal === "clientes"  && <><Users size={16} style={{ verticalAlign: "middle", marginRight: 6 }} /> Últimos 5 Clientes Activos</>}
                {modal === "ventas"    && <><DollarSign size={16} style={{ verticalAlign: "middle", marginRight: 6 }} /> Últimas 5 Ventas del Mes</>}
                {modal === "pedidos"   && <><Package size={16} style={{ verticalAlign: "middle", marginRight: 6 }} /> Últimos 5 Pedidos Activos</>}
                {modal === "productos" && <><ShoppingBag size={16} style={{ verticalAlign: "middle", marginRight: 6 }} /> Últimos 5 Productos Activos</>}
              </h2>
              <button onClick={() => setModal(null)} className="admin-modal__close"><X size={18} /></button>
            </div>

            <div className="admin-modal__body">
              {modal === "ventas" && (
                <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                  {[
                    { label: "Total Mes",   value: formatPrice(stats.ventas_mes),        color: "#9a031e" },
                    { label: "Mes Anterior",value: formatPrice(stats.ventas_mes_anterior ?? 0), color: "#3b82f6" },
                    { label: "Crecimiento", value: `${stats.crecimiento}%`, color: stats.crecimiento >= 0 ? "#10b981" : "#ef4444" },
                  ].map(c => (
                    <div key={c.label} style={{ flex: 1, minWidth: 120, background: "var(--admin-surface)", borderRadius: 12, padding: "12px 16px", display: "flex", flexDirection: "column", gap: 4, borderWidth: "1px", borderStyle: "solid", borderColor: c.color, boxShadow: "0 8px 18px rgba(0,0,0,0.08)" }}>
                      <span style={{ color: c.color, fontSize: 20, fontWeight: 700 }}>{c.value}</span>
                      <span style={{ color: "var(--admin-text-2)", fontSize: 12 }}>{c.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {modal === "pedidos" && (
                <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                  {[
                    { label: "Total Activos", value: stats.pedidos,    color: "#9a031e" },
                    { label: "Pendientes",    value: stats.pendientes, color: "#f59e0b" },
                    { label: "Pagados",       value: stats.pagados,    color: "#3b82f6" },
                    { label: "Enviados",      value: stats.enviados,   color: "#10b981" },
                  ].map(c => (
                    <div key={c.label} style={{ flex: 1, minWidth: 120, background: "var(--admin-surface)", borderRadius: 12, padding: "12px 16px", display: "flex", flexDirection: "column", gap: 4, borderWidth: "1px", borderStyle: "solid", borderColor: c.color, boxShadow: "0 8px 18px rgba(0,0,0,0.08)" }}>
                      <span style={{ color: c.color, fontSize: 20, fontWeight: 700 }}>{c.value}</span>
                      <span style={{ color: "var(--admin-text-2)", fontSize: 12 }}>{c.label}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      {modal === "clientes"  && ["ID", "Nombre", "Correo", "Teléfono", "Registro"].map(h => <th key={h}>{h}</th>)}
                      {modal === "ventas"    && ["Pedido", "Cliente", "Total", "Estado", "Fecha"].map(h => <th key={h}>{h}</th>)}
                      {modal === "pedidos"   && ["ID", "Cliente", "Total", "Estado", "Fecha"].map(h => <th key={h}>{h}</th>)}
                      {modal === "productos" && ["ID", "Nombre", "Precio", "Stock", "Registro"].map(h => <th key={h}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {modal === "clientes" && clientes_recientes.map((c, i) => (
                      <tr key={c.id_cliente} style={{ background: i % 2 === 0 ? "rgba(154,3,30,0.04)" : "transparent" }}>
                        <td>{c.id_cliente}</td>
                        <td>{c.nombre}</td>
                        <td>{c.correo}</td>
                        <td>{c.telefono}</td>
                        <td>{c.fecha_registro}</td>
                      </tr>
                    ))}
                    {modal === "ventas" && ventas_detalladas.map((p, i) => (
                      <tr key={p.id_pedido} style={{ background: i % 2 === 0 ? "rgba(154,3,30,0.04)" : "transparent" }}>
                        <td>#{p.id_pedido}</td>
                        <td>{p.cliente}</td>
                        <td>{formatPrice(p.total)}</td>
                        <td><span className="admin-badge" style={{ background: ESTADO_BADGE[p.estado]?.color + "25", color: ESTADO_BADGE[p.estado]?.color, border: `1px solid ${ESTADO_BADGE[p.estado]?.color}` }}>{ESTADO_BADGE[p.estado]?.label}</span></td>
                        <td>{p.fecha}</td>
                      </tr>
                    ))}
                    {modal === "pedidos" && pedidos_activos.map((p, i) => (
                      <tr key={p.id_pedido} style={{ background: i % 2 === 0 ? "rgba(154,3,30,0.04)" : "transparent" }}>
                        <td>#{p.id_pedido}</td>
                        <td>{p.cliente}</td>
                        <td>{formatPrice(p.total)}</td>
                        <td><span className="admin-badge" style={{ background: ESTADO_BADGE[p.estado]?.color + "25", color: ESTADO_BADGE[p.estado]?.color, border: `1px solid ${ESTADO_BADGE[p.estado]?.color}` }}>{ESTADO_BADGE[p.estado]?.label}</span></td>
                        <td>{p.fecha}</td>
                      </tr>
                    ))}
                    {modal === "productos" && productos_recientes.map((p, i) => (
                      <tr key={p.id_producto} style={{ background: i % 2 === 0 ? "rgba(154,3,30,0.04)" : "transparent" }}>
                        <td>{p.id_producto}</td>
                        <td>{p.nombre}</td>
                        <td>{formatPrice(p.precio)}</td>
                    <td style={{ color: p.stock <= 5 ? "#ef4444" : "var(--admin-text)", fontWeight: p.stock <= 5 ? 700 : 400 }}>{p.stock}</td>
                        <td>{p.fecha_registro}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="admin-modal__foot">
              <button onClick={() => setModal(null)} className="admin-btn admin-btn--sec">Cerrar</button>
              <a href={
                modal === "clientes"  ? "/admin/usuarios" :
                modal === "ventas"    ? "/admin/reportes" :
                modal === "pedidos"   ? "/admin/pedidos"  : "/admin/productos"
              } className="admin-btn admin-btn--pri">
                {modal === "clientes"  ? "Gestionar Clientes" :
                 modal === "ventas"    ? "Ver Reportes" :
                 modal === "pedidos"   ? "Gestionar Pedidos" : "Gestionar Productos"}
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function StatCard({ icon, label, value, sub, subColor, accent, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="admin-stat"
      style={{
        borderLeftColor: accent,
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        boxShadow: hovered ? `0 8px 25px rgba(0,0,0,0.4), 0 0 15px ${accent}30` : "0 4px 15px rgba(0,0,0,0.3)",
      }}
    >
      <div className="admin-stat__top">
        <div>
          <p className="admin-stat__label">{label}</p>
          <p className="admin-stat__value">{value}</p>
        </div>
        {icon}
      </div>
      <p className="admin-stat__sub" style={{ color: subColor || "var(--admin-text-2)" }}>{sub}</p>
    </div>
  );
}
