"use client";

import "@/styles/admin.css";
import { useEffect, useState, useCallback, Fragment } from "react";
import { useRouter } from "next/navigation";
import { Download, BarChart3, FileText, Database, Calendar, Users, ClipboardList, X, Info, Search, Upload } from "lucide-react";


const API = "http://localhost:8000";
function getToken() {
  return document.cookie.split("; ").find(r => r.startsWith("access_token="))?.split("=")[1];
}

function hoy()      { return new Date().toISOString().split("T")[0]; }
function inicioMes(){ return "2025-01-01"; }

const ACCION_STYLE = {
  INSERT: { bg: "rgba(16,185,129,0.15)",  color: "#10b981", border: "rgba(16,185,129,0.4)"  },
  UPDATE: { bg: "rgba(245,158,11,0.15)",  color: "#f59e0b", border: "rgba(245,158,11,0.4)"  },
  DELETE: { bg: "rgba(239,68,68,0.15)",   color: "#ef4444", border: "rgba(239,68,68,0.4)"   },
};

const TIPO_STYLE = {
  admin:    { bg: "rgba(193,18,31,0.15)",  color: "#c1121f", border: "rgba(193,18,31,0.4)"  },
  empleado: { bg: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "rgba(245,158,11,0.4)" },
  cliente:  { bg: "rgba(59,130,246,0.15)", color: "#3b82f6", border: "rgba(59,130,246,0.4)" },
};

export default function AdminAuditoria() {
  const router = useRouter();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser]       = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [filtros, setFiltros] = useState({
    fecha_inicio: inicioMes(),
    fecha_fin:    hoy(),
    tipo_usuario: "",
    accion:       "",
    tabla:        "",
  });
  const [pagina, setPagina] = useState(1);

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
        pagina,
        por_pagina:   10,
        ...(filtros.tipo_usuario && { tipo_usuario: filtros.tipo_usuario }),
        ...(filtros.accion       && { accion:       filtros.accion }),
        ...(filtros.tabla        && { tabla:        filtros.tabla }),
      });
      const res = await fetch(`${API}/admin/auditoria?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { router.push("/login"); return; }
      setData(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filtros, pagina]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const exportar = async (tipo) => {
  const token = getToken();
  const params = new URLSearchParams({
    fecha_inicio: filtros.fecha_inicio,
    fecha_fin:    filtros.fecha_fin,
    ...(filtros.tipo_usuario && { tipo_usuario: filtros.tipo_usuario }),
    ...(filtros.accion       && { accion:       filtros.accion }),
    ...(filtros.tabla        && { tabla:        filtros.tabla }),
  });

  const res = await fetch(`${API}/admin/auditoria/exportar/${tipo}?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `auditoria_${new Date().toISOString().split("T")[0]}.${tipo === "excel" ? "xlsx" : tipo}`;
  a.click();
  URL.revokeObjectURL(url);
};

  const limpiar = () => {
    setFiltros({ fecha_inicio: inicioMes(), fecha_fin: hoy(), tipo_usuario: "", accion: "", tabla: "" });
    setPagina(1);
  };

  const tryParseJSON = (str) => {
    try { return JSON.stringify(JSON.parse(str), null, 2); }
    catch { return str; }
  };

  return (
    <div>
      

      <main>
        {/* HEADER */}
        <div className="admin-header">
          <div>
            <h1 className="admin-header__title">Auditoría del Sistema</h1>
            <p className="admin-header__sub">Registro de todas las acciones realizadas</p>
          </div>
          <div className="admin-header__right">
            <button onClick={() => exportar("csv")}   className="admin-btn admin-btn--sec" style={{ color: "#10b981", borderColor: "rgba(16,185,129,0.4)" }}><Download size={14} /> CSV</button>
            <button onClick={() => exportar("excel")} className="admin-btn admin-btn--sec" style={{ color: "#3b82f6", borderColor: "rgba(59,130,246,0.4)"  }}><BarChart3 size={14} /> Excel</button>
            <button onClick={() => exportar("pdf")}   className="admin-btn admin-btn--sec" style={{ color: "#ef4444", borderColor: "rgba(239,68,68,0.4)"   }}><FileText size={14} /> PDF</button>
          </div>
        </div>

        {/* STATS */}
        {data?.stats && (
          <div className="admin-stats" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
            {[
              { icon: <Database size={28} />, label: "Total Registros",   value: data.stats.total_registros,  color: "#9a031e" },
              { icon: <Calendar size={28} />, label: "Registros Hoy",     value: data.stats.registros_hoy,    color: "#10b981" },
              { icon: <Users size={28} />, label: "Usuarios Activos",  value: data.stats.usuarios_activos, color: "#3b82f6" },
              { icon: <ClipboardList size={28} />, label: "Tablas Afectadas",  value: data.stats.tablas_afectadas, color: "#f59e0b" },
            ].map(st => (
              <div key={st.label} className="admin-stat" style={{ borderLeftColor: st.color }}>
                <div className="admin-stat__top">
                  <div>
                    <p className="admin-stat__label">{st.label}</p>
                    <p className="admin-stat__value" style={{ color: st.color }}>{st.value}</p>
                  </div>
                  <span style={{ display: "inline-flex", alignItems: "center" }}>{st.icon}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* FILTROS */}
        <div className="admin-card">
          <div className="admin-card__body" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr auto", gap: 12, alignItems: "end" }}>
            <div className="admin-form-group" style={{ marginBottom: 0 }}>
              <label className="admin-form-label">Fecha Inicio</label>
              <input type="date" value={filtros.fecha_inicio}
                onChange={e => { setFiltros({ ...filtros, fecha_inicio: e.target.value }); setPagina(1); }}
                className="admin-form-input" />
            </div>
            <div className="admin-form-group" style={{ marginBottom: 0 }}>
              <label className="admin-form-label">Fecha Fin</label>
              <input type="date" value={filtros.fecha_fin}
                onChange={e => { setFiltros({ ...filtros, fecha_fin: e.target.value }); setPagina(1); }}
                className="admin-form-input" />
            </div>
            <div className="admin-form-group" style={{ marginBottom: 0 }}>
              <label className="admin-form-label">Tipo Usuario</label>
              <select value={filtros.tipo_usuario}
                onChange={e => { setFiltros({ ...filtros, tipo_usuario: e.target.value }); setPagina(1); }}
                className="admin-form-select">
                <option value="">Todos</option>
                <option value="admin">Admin</option>
                <option value="empleado">Empleado</option>
                <option value="cliente">Cliente</option>
              </select>
            </div>
            <div className="admin-form-group" style={{ marginBottom: 0 }}>
              <label className="admin-form-label">Acción</label>
              <select value={filtros.accion}
                onChange={e => { setFiltros({ ...filtros, accion: e.target.value }); setPagina(1); }}
                className="admin-form-select">
                <option value="">Todas</option>
                <option value="INSERT">INSERT</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <div className="admin-form-group" style={{ marginBottom: 0 }}>
              <label className="admin-form-label">Tabla</label>
              <select value={filtros.tabla}
                onChange={e => { setFiltros({ ...filtros, tabla: e.target.value }); setPagina(1); }}
                className="admin-form-select">
                <option value="">Todas</option>
                <option value="pedidos">Pedidos</option>
                <option value="clientes">Clientes</option>
                <option value="empleados">Empleados</option>
                <option value="productos">Productos</option>
              </select>
            </div>
            <button onClick={limpiar} className="admin-btn admin-btn--sec"> Limpiar</button>
          </div>
        </div>

        {/* TABLA */}
        <div className="admin-card">
          <div className="admin-card__head">
            <span className="admin-card__title">Registros de Auditoría</span>
            {data && <span className="admin-badge" style={s.badge}>{data.total} registros encontrados</span>}
          </div>

          {loading ? (
            <div className="admin-loading"><div className="admin-spinner" /></div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    {["ID", "Fecha/Hora", "Usuario", "Tipo", "Tabla", "Acción", "ID Reg.", "IP", ""].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {!data?.registros?.length ? (
                    <tr><td colSpan={9} style={{ textAlign: "center", color: "var(--admin-text-2)", padding: 40 }}>
                      No se encontraron registros
                    </td></tr>
                  ) : data.registros.map((r, i) => {
                    const ac = ACCION_STYLE[r.accion]   || ACCION_STYLE.UPDATE;
                    const ti = TIPO_STYLE[r.tipo_usuario] || TIPO_STYLE.cliente;
                    return (
                      <tr key={r.id_auditoria} style={{ background: i % 2 === 0 ? "rgba(154,3,30,0.04)" : "transparent" }}>
                        <td><strong style={{ color: "var(--admin-accent2)" }}>#{r.id_auditoria}</strong></td>
                        <td style={{ fontSize: 12, color: "var(--admin-text-2)" }}>{r.fecha}</td>
                        <td>{r.nombre_usuario}</td>
                        <td>
                          <span className="admin-badge" style={{ background: ti.bg, color: ti.color, border: `1px solid ${ti.border}` }}>
                            {r.tipo_usuario}
                          </span>
                        </td>
                        <td>
                          <span className="admin-badge" style={{ background: "rgba(154,3,30,0.1)", color: "#c1121f", border: "1px solid rgba(154,3,30,0.2)" }}>
                            {r.tabla_afectada}
                          </span>
                        </td>
                        <td>
                          <span className="admin-badge" style={{ background: ac.bg, color: ac.color, border: `1px solid ${ac.border}` }}>
                            {r.accion}
                          </span>
                        </td>
                        <td>#{r.id_registro}</td>
                        <td style={{ fontSize: 11, color: "var(--admin-text-2)" }}>{r.ip_address || "—"}</td>
                        <td>
                          <button onClick={() => setDetalle(r)} className="admin-btn admin-btn--xs admin-btn--sec2"><Search size={14} /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* PAGINACIÓN */}
          {data?.total_paginas > 1 && (
            <div className="admin-pagination" style={{ padding: "0 20px 20px" }}>
              <button onClick={() => setPagina(1)} disabled={pagina === 1} className="admin-page-btn" style={{ opacity: pagina === 1 ? 0.4 : 1 }}>«</button>
              <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1} className="admin-page-btn" style={{ opacity: pagina === 1 ? 0.4 : 1 }}>‹</button>
              {Array.from({ length: data.total_paginas }, (_, i) => i + 1)
                .filter(p => p === 1 || p === data.total_paginas || Math.abs(p - pagina) <= 2)
                .map((p, idx, arr) => (
                  <Fragment key={p}>
                    {idx > 0 && arr[idx - 1] !== p - 1 && <span style={{ color: "var(--admin-text-2)" }}>…</span>}
                    <button onClick={() => setPagina(p)}
                      className="admin-page-btn" style={p === pagina ? { background: "var(--admin-accent)", borderColor: "var(--admin-accent)", color: "white", fontWeight: 700 } : {}}>{p}</button>
                  </Fragment>
                ))}
              <button onClick={() => setPagina(p => Math.min(data.total_paginas, p + 1))} disabled={pagina === data.total_paginas} className="admin-page-btn" style={{ opacity: pagina === data.total_paginas ? 0.4 : 1 }}>›</button>
              <button onClick={() => setPagina(data.total_paginas)} disabled={pagina === data.total_paginas} className="admin-page-btn" style={{ opacity: pagina === data.total_paginas ? 0.4 : 1 }}>»</button>
            </div>
          )}
          {data && (
            <p style={{ textAlign: "center", color: "var(--admin-text-2)", fontSize: 12, marginTop: 8 }}>
              Página {pagina} de {data.total_paginas} — {data.total} registros totales
            </p>
          )}
        </div>
      </main>

      {/* MODAL DETALLE */}
      {detalle && (
        <div className="admin-overlay" onClick={() => setDetalle(null)}>
          <div className="admin-modal admin-modal--wide" onClick={e => e.stopPropagation()}>
            <div className="admin-modal__head">
              <h2 className="admin-modal__title"><Search size={16} /> Detalle Auditoría #{detalle.id_auditoria}</h2>
              <button onClick={() => setDetalle(null)} className="admin-modal__close"><X size={18} /></button>
            </div>
            <div className="admin-modal__body" style={{ overflowY: "auto", maxHeight: "65vh" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div style={s.infoBox}>
                  <p style={s.infoTitle}><Info size={16} /> Información General</p>
                  {[
                    ["ID Auditoría", `#${detalle.id_auditoria}`],
                    ["Fecha",        detalle.fecha],
                    ["Usuario",      detalle.nombre_usuario],
                    ["Tipo",         detalle.tipo_usuario],
                    ["Tabla",        detalle.tabla_afectada],
                    ["Acción",       detalle.accion],
                    ["ID Registro",  `#${detalle.id_registro}`],
                    ["IP",           detalle.ip_address || "—"],
                  ].map(([k, v]) => (
                    <p key={k} style={s.infoRow}><b>{k}:</b> {v}</p>
                  ))}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {detalle.datos_anteriores && (
                    <div style={s.infoBox}>
                      <p style={{ ...s.infoTitle, color: "#f59e0b" }}><Upload size={16} /> Datos Anteriores</p>
                      <pre style={s.pre}>{tryParseJSON(detalle.datos_anteriores)}</pre>
                    </div>
                  )}
                  {detalle.datos_nuevos && (
                    <div style={s.infoBox}>
                      <p style={{ ...s.infoTitle, color: "#10b981" }}><Download size={16} /> Datos Nuevos</p>
                      <pre style={s.pre}>{tryParseJSON(detalle.datos_nuevos)}</pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="admin-modal__foot">
              <button onClick={() => setDetalle(null)} className="admin-btn admin-btn--sec">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  badge:      { padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: "rgba(154,3,30,0.15)", color: "var(--admin-accent2)", border: "1px solid rgba(154,3,30,0.3)" },
  infoBox:    { background: "var(--admin-bg)", borderRadius: 10, padding: 14, border: "1px solid var(--admin-border)" },
  infoTitle:  { color: "var(--admin-accent2)", fontWeight: 700, fontSize: 13, marginBottom: 8 },
  infoRow:    { color: "var(--admin-text)", fontSize: 13, margin: "4px 0" },
  pre:        { background: "var(--admin-bg-2)", borderRadius: 8, padding: 10, fontSize: 11, color: "#10b981", overflowX: "auto", margin: 0, border: "1px solid rgba(16,185,129,0.2)" },
};