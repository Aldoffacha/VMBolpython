"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminCurrency } from "@/lib/AdminCurrencyContext";
import { Users, DollarSign, ShoppingCart, Package, ClipboardList, TrendingUp, ShoppingBag, X, ChevronDown, ChevronRight, Clock } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, Cell
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

// ── Sparkline fuera del componente principal ──────────────────
function Sparkline({ data }) {
  if (!data || data.length < 2 || data.every(v => v === 0)) {
    return <span style={{ color: "var(--admin-text-2)", fontSize: 11 }}>Sin ventas</span>;
  }

  const w = 120, h = 40, pad = 4;
  const max = Math.max(...data, 1);
  const n = data.length;
  const x = i => pad + (i / (n - 1)) * (w - 2 * pad);
  const y = v => h - pad - (v / max) * (h - 2 * pad);
  const pts = data.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const areapts = `${x(0).toFixed(1)},${h} ` + pts + ` ${x(n - 1).toFixed(1)},${h}`;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9a031e" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#9a031e" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areapts} fill="url(#sg)" />
      <polyline fill="none" stroke="#c1121f" strokeWidth={2} points={pts} />
      {data.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r={v > 0 ? 2.5 : 1.5}
          fill={v > 0 ? "#c1121f" : "var(--admin-border)"} />
      ))}
    </svg>
  );
}

// ── StatCard fuera del componente principal ───────────────────
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

// ── Dashboard principal ───────────────────────────────────────
export default function AdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [user, setUser] = useState(null);
  const [collapsedRecientes, setCollapsedRecientes] = useState(true);
  const [collapsedVendidos, setCollapsedVendidos] = useState(true);
  const { formatPrice } = useAdminCurrency();

  useEffect(() => {
    const stored = sessionStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
    fetchDashboard();
    fetchAudit();
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

  const fetchAudit = async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API}/admin/auditoria?por_pagina=5`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setAuditLogs(json.registros || []);
      }
    } catch (e) {
      console.error(e);
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

  const barData = [
    { name: "Pendientes", value: stats.pendientes, fill: "#f59e0b" },
    { name: "Pagados",    value: stats.pagados,    fill: "#3b82f6" },
    { name: "Enviados",   value: stats.enviados,   fill: "#10b981" },
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

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 20, marginTop: 20 }}>
        <div className="admin-card">
          <div className="admin-card__head">
            <span className="admin-card__title" style={{ display: "flex", alignItems: "center", gap: 6 }}>Estado de Pedidos</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border)" />
              <XAxis dataKey="name" tick={{ fill: "var(--admin-text-2)", fontSize: 12 }} />
              <YAxis tick={{ fill: "var(--admin-text-2)", fontSize: 12 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "var(--admin-card)", border: "1px solid var(--admin-accent)", borderRadius: 8, color: "var(--admin-text)" }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", justifyContent: "space-around", padding: "8px 16px 16px" }}>
            {[
              { label: "Pendientes", value: stats.pendientes, color: "#f59e0b" },
              { label: "Pagados",    value: stats.pagados,    color: "#3b82f6" },
              { label: "Enviados",   value: stats.enviados,   color: "#10b981" },
            ].map(s => (
              <div key={s.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <span style={{ color: s.color, fontWeight: 700, fontSize: 20 }}>{s.value}</span>
                <span style={{ color: "var(--admin-text-2)", fontSize: 11 }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card__head">
            <span className="admin-card__title"><Clock size={16} style={{ verticalAlign: "middle", marginRight: 6 }} /> Auditoría</span>
          </div>
          <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {auditLogs.length === 0 && (
              <p style={{ color: "var(--admin-text-2)", fontSize: 13, textAlign: "center", padding: "12px 0" }}>Sin registros recientes</p>
            )}
            {auditLogs.slice(0, 5).map((a, i) => (
              <div key={a.id_auditoria || i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 10px", borderRadius: 8,
                background: i % 2 === 0 ? "rgba(154,3,30,0.04)" : "transparent",
                gap: 8,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
                  <span style={{
                    fontSize: 9, fontWeight: 700, textTransform: "uppercase",
                    padding: "2px 6px", borderRadius: 4,
                    background: a.accion === "INSERT" ? "rgba(16,185,129,0.2)" :
                               a.accion === "UPDATE" ? "rgba(59,130,246,0.2)" : "rgba(239,68,68,0.2)",
                    color: a.accion === "INSERT" ? "#10b981" :
                           a.accion === "UPDATE" ? "#3b82f6" : "#ef4444",
                    whiteSpace: "nowrap",
                  }}>
                    {a.accion}
                  </span>
                  <span style={{ color: "var(--admin-text)", fontSize: 13, fontWeight: 500 }}>{a.nombre_usuario}</span>
                </div>
                <span style={{ color: "var(--admin-text-2)", fontSize: 11, whiteSpace: "nowrap" }}>
                  {a.fecha ? a.fecha.split(" ")[1] : ""}
                </span>
              </div>
            ))}
          </div>
          {auditLogs.length > 0 && (
            <div style={{ padding: "0 12px 10px", textAlign: "right" }}>
              <a href="/admin/auditoria" style={{ color: "var(--admin-accent)", fontSize: 12, textDecoration: "none" }}>Ver auditoría →</a>
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <div className="admin-card">
          <div className="admin-card__head" onClick={() => setCollapsedRecientes(!collapsedRecientes)} style={{ cursor: "pointer" }}>
            <span className="admin-card__title">
              {collapsedRecientes ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
              <ClipboardList size={16} style={{ verticalAlign: "middle", marginLeft: 4, marginRight: 6 }} />
              Pedidos Recientes
            </span>
            <a href="/admin/pedidos" style={{ color: "var(--admin-accent)", fontSize: 12, textDecoration: "none" }} onClick={e => e.stopPropagation()}>Ver todos →</a>
          </div>
          {!collapsedRecientes && (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>{["ID", "Cliente", "Total", "Estado", "Fecha"].map(h => <th key={h}>{h}</th>)}</tr>
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
          )}
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <div className="admin-card">
          <div className="admin-card__head" onClick={() => setCollapsedVendidos(!collapsedVendidos)} style={{ cursor: "pointer" }}>
            <span className="admin-card__title">
              {collapsedVendidos ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
              <ShoppingBag size={16} style={{ verticalAlign: "middle", marginLeft: 4, marginRight: 6 }} />
              Productos más vendidos
            </span>
            <a href="/admin/reabastecimiento" style={{ color: "var(--admin-accent)", fontSize: 12, textDecoration: "none" }} onClick={e => e.stopPropagation()}>Ver reabastecimiento →</a>
          </div>
          {!collapsedVendidos && (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>{["#", "Nombre", "Categoría", "Vendido", "Tendencia (12 meses)", "Stock", "Precio"].map(h => <th key={h}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {productos_mas_vendidos.map((p, i) => (
                    <tr key={p.id_producto} style={{ background: i % 2 === 0 ? "rgba(154,3,30,0.04)" : "transparent" }}>
                      <td>{i + 1}</td>
                      <td>{p.nombre}</td>
                      <td>{p.categoria}</td>
                      <td style={{ color: "#10b981", fontWeight: 700 }}>{p.total_vendido}</td>
                      <td><Sparkline data={p.ventas_mensuales} /></td>
                      <td style={{ color: p.stock <= 5 ? "#ef4444" : "var(--admin-text)", fontWeight: p.stock <= 5 ? 700 : 400 }}>{p.stock}</td>
                      <td>{formatPrice(p.precio)}</td>
                    </tr>
                  ))}
                  {productos_mas_vendidos.length === 0 && (
                    <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--admin-text-2)" }}>Sin datos de ventas aún</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
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
                    { label: "Total Mes",    value: formatPrice(stats.ventas_mes),              color: "#9a031e" },
                    { label: "Mes Anterior", value: formatPrice(stats.ventas_mes_anterior ?? 0), color: "#3b82f6" },
                    { label: "Crecimiento",  value: `${stats.crecimiento}%`,                    color: stats.crecimiento >= 0 ? "#10b981" : "#ef4444" },
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
                        <td>{c.id_cliente}</td><td>{c.nombre}</td><td>{c.correo}</td>
                        <td>{c.telefono}</td><td>{c.fecha_registro}</td>
                      </tr>
                    ))}
                    {modal === "ventas" && ventas_detalladas.map((p, i) => (
                      <tr key={p.id_pedido} style={{ background: i % 2 === 0 ? "rgba(154,3,30,0.04)" : "transparent" }}>
                        <td>#{p.id_pedido}</td><td>{p.cliente}</td><td>{formatPrice(p.total)}</td>
                        <td><span className="admin-badge" style={{ background: ESTADO_BADGE[p.estado]?.color + "25", color: ESTADO_BADGE[p.estado]?.color, border: `1px solid ${ESTADO_BADGE[p.estado]?.color}` }}>{ESTADO_BADGE[p.estado]?.label}</span></td>
                        <td>{p.fecha}</td>
                      </tr>
                    ))}
                    {modal === "pedidos" && pedidos_activos.map((p, i) => (
                      <tr key={p.id_pedido} style={{ background: i % 2 === 0 ? "rgba(154,3,30,0.04)" : "transparent" }}>
                        <td>#{p.id_pedido}</td><td>{p.cliente}</td><td>{formatPrice(p.total)}</td>
                        <td><span className="admin-badge" style={{ background: ESTADO_BADGE[p.estado]?.color + "25", color: ESTADO_BADGE[p.estado]?.color, border: `1px solid ${ESTADO_BADGE[p.estado]?.color}` }}>{ESTADO_BADGE[p.estado]?.label}</span></td>
                        <td>{p.fecha}</td>
                      </tr>
                    ))}
                    {modal === "productos" && productos_recientes.map((p, i) => (
                      <tr key={p.id_producto} style={{ background: i % 2 === 0 ? "rgba(154,3,30,0.04)" : "transparent" }}>
                        <td>{p.id_producto}</td><td>{p.nombre}</td><td>{formatPrice(p.precio)}</td>
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