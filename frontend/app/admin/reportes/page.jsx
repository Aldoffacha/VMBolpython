"use client";

import "@/styles/admin.css";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAdminCurrency } from "@/lib/AdminCurrencyContext";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Printer, Download, ChevronUp, ChevronDown, FileText, BarChart3 } from "lucide-react";


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
  const { formatPrice } = useAdminCurrency();

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

  const exportar = async (tipo) => {
    const token = getToken();
    const params = new URLSearchParams({
      fecha_inicio: filtros.fecha_inicio,
      fecha_fin:    filtros.fecha_fin,
      ...(filtros.producto_id && { producto_id: filtros.producto_id }),
      ...(filtros.cliente_id  && { cliente_id:  filtros.cliente_id  }),
    });

    if (tipo === "pdf") {
      const res = await fetch(`${API}/admin/reportes/exportar/${tipo}?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } else {
      const res = await fetch(`${API}/admin/reportes/exportar/${tipo}?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `reporte_ventas_${new Date().toISOString().split("T")[0]}.${tipo === "excel" ? "xlsx" : tipo}`;
      a.click();
      URL.revokeObjectURL(url);
    }
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
        {/* HEADER */}
        <div className="admin-header">
          <div>
            <h1 className="admin-header__title">Reportes y Estadísticas</h1>
            <p className="admin-header__sub">Análisis de ventas, pedidos y productos</p>
          </div>
          <div className="admin-header__right">
            <button onClick={() => exportar("pdf")} className="admin-btn admin-btn--sec" style={{ color: "#ef4444", borderColor: "rgba(239,68,68,0.4)" }}><Printer size={14} /> Imprimir</button>
            <button onClick={() => exportar("excel")} className="admin-btn admin-btn--sec" style={{ color: "#3b82f6", borderColor: "rgba(59,130,246,0.4)" }}><BarChart3 size={14} /> Excel</button>
            <button onClick={() => exportar("csv")} className="admin-btn admin-btn--sec" style={{ color: "#10b981", borderColor: "rgba(16,185,129,0.4)" }}><Download size={14} /> CSV</button>
          </div>
        </div>

        {/* FILTROS */}
        <div className="admin-card">
          <div className="admin-card__body" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: 12, alignItems: "end" }}>
            <div className="admin-form-group" style={{ marginBottom: 0 }}>
              <label className="admin-form-label">Fecha Inicio</label>
              <input type="date" value={filtros.fecha_inicio}
                onChange={e => setFiltros({ ...filtros, fecha_inicio: e.target.value })}
                className="admin-form-input" />
            </div>
            <div className="admin-form-group" style={{ marginBottom: 0 }}>
              <label className="admin-form-label">Fecha Fin</label>
              <input type="date" value={filtros.fecha_fin}
                onChange={e => setFiltros({ ...filtros, fecha_fin: e.target.value })}
                className="admin-form-input" />
            </div>
            <div className="admin-form-group" style={{ marginBottom: 0 }}>
              <label className="admin-form-label">Producto</label>
              <select value={filtros.producto_id}
                onChange={e => setFiltros({ ...filtros, producto_id: e.target.value })}
                className="admin-form-select">
                <option value="">Todos</option>
                {data?.lista_productos?.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
            <div className="admin-form-group" style={{ marginBottom: 0 }}>
              <label className="admin-form-label">Cliente</label>
              <select value={filtros.cliente_id}
                onChange={e => setFiltros({ ...filtros, cliente_id: e.target.value })}
                className="admin-form-select">
                <option value="">Todos</option>
                {data?.lista_clientes?.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <button onClick={() => setFiltros({ fecha_inicio: inicioMes(), fecha_fin: hoy(), producto_id: "", cliente_id: "" })}
              className="admin-btn admin-btn--sec"> Limpiar</button>
          </div>
        </div>

        {loading ? (
          <div className="admin-loading"><div className="admin-spinner" /></div>
        ) : data && (
          <>
            {/* STATS */}
            <div className="admin-stats" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
              {[
                { icon: "", label: "Ventas Totales",   value: formatPrice(data.stats.total_ventas), color: "var(--admin-accent)",  sub: "Período seleccionado" },
                { icon: "", label: "Pedidos Activos",  value: data.stats.total_pedidos,     color: "#10b981", sub: "Excluye cancelados" },
                { icon: "", label: "Clientes Nuevos",  value: data.stats.clientes_nuevos,   color: "#3b82f6", sub: "En el período" },
                { icon: "", label: "Ticket Promedio",  value: formatPrice(data.stats.ticket_promedio), color: "#f59e0b", sub: "Por pedido" },
              ].map(st => (
                <div key={st.label} className="admin-stat" style={{ borderLeftColor: st.color }}>
                  <div className="admin-stat__top">
                    <div>
                      <p className="admin-stat__label">{st.label}</p>
                      <p className="admin-stat__value" style={{ color: st.color }}>{st.value}</p>
                      <p className="admin-stat__sub">{st.sub}</p>
                    </div>
                    <span style={{ fontSize: 30 }}>{st.icon}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* GRÁFICAS FILA 1 */}
            <div className="admin-grid2" style={{ marginBottom: 16 }}>
              {/* Ventas mensuales */}
              <div className="admin-card">
                <div className="admin-card__body">
                  <p className="admin-card__title"> Ventas Mensuales (Últimos 6 meses)</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={data.ventas_mensuales}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border)" />
                      <XAxis dataKey="label" tick={{ fill: "var(--admin-text-2)", fontSize: 11 }} />
                      <YAxis tick={{ fill: "var(--admin-text-2)", fontSize: 11 }} tickFormatter={v => `$${v.toLocaleString()}`} />
                      <Tooltip formatter={v => [`$${Number(v).toLocaleString("en", { minimumFractionDigits: 2 })}`, "Ventas"]}
                        contentStyle={{ background: "var(--admin-card)", border: "1px solid var(--admin-accent)", color: "var(--admin-text)" }} />
                      <Line type="monotone" dataKey="total" stroke="var(--admin-accent)" strokeWidth={2} dot={{ fill: "var(--admin-accent2)", r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Ventas semanales */}
              <div className="admin-card">
                <div className="admin-card__body">
                  <p className="admin-card__title"> Ventas Semanales (Últimas 8 semanas)</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.ventas_semanales}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border)" />
                      <XAxis dataKey="label" tick={{ fill: "var(--admin-text-2)", fontSize: 11 }} />
                      <YAxis tick={{ fill: "var(--admin-text-2)", fontSize: 11 }} tickFormatter={v => `$${v.toLocaleString()}`} />
                      <Tooltip formatter={v => [`$${Number(v).toLocaleString("en", { minimumFractionDigits: 2 })}`, "Ventas"]}
                        contentStyle={{ background: "var(--admin-card)", border: "1px solid var(--admin-accent)", color: "var(--admin-text)" }} />
                      <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* GRÁFICAS FILA 2 */}
            <div className="admin-grid2" style={{ marginBottom: 16 }}>
              {/* Distribución estados */}
              <div className="admin-card">
                <div className="admin-card__body">
                  <p className="admin-card__title"> Distribución de Pedidos por Estado</p>
                  {data.distribucion_estados.length === 0 ? (
                    <p style={{ color: "var(--admin-text-2)", textAlign: "center", padding: 40 }}>Sin datos en el período</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={data.distribucion_estados} dataKey="total" nameKey="estado" cx="50%" cy="50%" outerRadius={80} label={({ estado, percent }) => `${estado} ${(percent * 100).toFixed(0)}%`}>
                          {data.distribucion_estados.map((_, i) => (
                            <Cell key={i} fill={ESTADO_COLORS[i % ESTADO_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: "var(--admin-card)", border: "1px solid var(--admin-accent)", color: "var(--admin-text)" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Top productos */}
              <div className="admin-card">
                <div className="admin-card__body">
                  <p className="admin-card__title"> Top Productos Más Vendidos</p>
                  {data.productos_top.length === 0 ? (
                    <p style={{ color: "var(--admin-text-2)", textAlign: "center", padding: 40 }}>Sin datos en el período</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={data.productos_top.slice(0, 6)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border)" />
                        <XAxis type="number" tick={{ fill: "var(--admin-text-2)", fontSize: 10 }} tickFormatter={v => `$${v}`} />
                        <YAxis type="category" dataKey="nombre" tick={{ fill: "var(--admin-text-2)", fontSize: 10 }} width={90}
                          tickFormatter={v => v.length > 12 ? v.slice(0, 12) + "…" : v} />
                        <Tooltip formatter={v => [`$${Number(v).toFixed(2)}`, "Total"]}
                          contentStyle={{ background: "var(--admin-card)", border: "1px solid var(--admin-accent)", color: "var(--admin-text)" }} />
                        <Bar dataKey="total" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            {/* TABLA PRODUCTOS */}
            <div className="admin-card">
              <div className="admin-card__body">
                <div className="admin-card__head" style={{ margin: "-20px -20px 16px", padding: "14px 20px" }}>
                  <span className="admin-card__title"> Detalle de Productos Más Vendidos</span>
                    <span style={{ color: "var(--admin-text-2)", fontSize: 12 }}>
                    {data.filtros.fecha_inicio} — {data.filtros.fecha_fin}
                  </span>
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        {["Producto", "Cantidad Vendida", "Total Vendido", "% del Total"].map(h => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.productos_top.length === 0 ? (
                          <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--admin-text-2)", padding: 32 }}>
                          Sin datos para el período seleccionado
                        </td></tr>
                      ) : data.productos_top.map((p, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? "rgba(154,3,30,0.04)" : "transparent" }}>
                          <td>{p.nombre}</td>
                          <td>{p.cantidad} unidades</td>
                          <td style={{ fontWeight: 700, color: "#10b981" }}>{formatPrice(p.total)}</td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ flex: 1, height: 6, background: "rgba(154,3,30,0.15)", borderRadius: 3 }}>
                                <div style={{ width: `${p.porcentaje}%`, height: "100%", background: "var(--admin-accent)", borderRadius: 3 }} />
                              </div>
                              <span style={{ fontSize: 12, color: "var(--admin-text-2)", minWidth: 36 }}>{p.porcentaje}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* TABLA VENTAS DETALLADAS (expandible) */}
            <div className="admin-card">
              <div className="admin-card__body">
                <div className="admin-card__head" style={{ margin: "-20px -20px 16px", padding: "14px 20px" }}>
                  <span className="admin-card__title"><FileText size={14} /> Ventas Detalladas ({data.ventas_detalladas.length} registros)</span>
                  <button onClick={() => setTablaVista(!tablaVista)} className="admin-btn admin-btn--sec">
                    {tablaVista ? <><ChevronUp size={14} /> Ocultar</> : <><ChevronDown size={14} /> Ver detalle</>}
                  </button>
                </div>
                {tablaVista && (
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          {["Pedido", "Fecha", "Cliente", "Producto", "Cantidad", "Precio", "Total", "Estado"].map(h => (
                            <th key={h}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.ventas_detalladas.map((v, i) => (
                          <tr key={i} style={{ background: i % 2 === 0 ? "rgba(154,3,30,0.04)" : "transparent" }}>
                            <td>#{v.id_pedido}</td>
                            <td style={{ fontSize: 12 }}>{v.fecha}</td>
                            <td>{v.cliente}</td>
                            <td>{v.producto}</td>
                            <td>{v.cantidad}</td>
                            <td>{formatPrice(v.precio)}</td>
                            <td style={{ fontWeight: 700, color: "#10b981" }}>{formatPrice(v.total_linea)}</td>
                            <td><span className="admin-badge" style={{ background: "rgba(154,3,30,0.1)", color: "var(--admin-accent2)", border: "1px solid rgba(154,3,30,0.2)" }}>{v.estado}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

const s = {
};