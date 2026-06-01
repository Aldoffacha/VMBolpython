"use client";

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
    <div style={s.page}>
      

      <main style={s.main}>
        {/* HEADER */}
        <div style={s.header}>
          <div>
            <h1 style={s.pageTitle}>Auditoría del Sistema</h1>
            <p style={s.pageSubtitle}>Registro de todas las acciones realizadas</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
  <button onClick={() => exportar("csv")}   style={{ ...s.btnSecondary, color: "#10b981", borderColor: "rgba(16,185,129,0.4)" }}><Download size={14} /> CSV</button>
  <button onClick={() => exportar("excel")} style={{ ...s.btnSecondary, color: "#3b82f6", borderColor: "rgba(59,130,246,0.4)"  }}><BarChart3 size={14} /> Excel</button>
  <button onClick={() => exportar("pdf")}   style={{ ...s.btnSecondary, color: "#ef4444", borderColor: "rgba(239,68,68,0.4)"   }}><FileText size={14} /> PDF</button>
</div>
        </div>

        {/* STATS */}
        {data?.stats && (
          <div style={s.statsGrid}>
            {[
              { icon: <Database size={28} />, label: "Total Registros",   value: data.stats.total_registros,  color: "#9a031e" },
              { icon: <Calendar size={28} />, label: "Registros Hoy",     value: data.stats.registros_hoy,    color: "#10b981" },
              { icon: <Users size={28} />, label: "Usuarios Activos",  value: data.stats.usuarios_activos, color: "#3b82f6" },
              { icon: <ClipboardList size={28} />, label: "Tablas Afectadas",  value: data.stats.tablas_afectadas, color: "#f59e0b" },
            ].map(st => (
              <div key={st.label} style={{ ...s.statCard, borderLeftColor: st.color }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={s.statLabel}>{st.label}</p>
                    <p style={{ ...s.statValue, color: st.color }}>{st.value}</p>
                  </div>
                  <span style={{ display: "inline-flex", alignItems: "center" }}>{st.icon}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* FILTROS */}
        <div style={s.card}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr auto", gap: 12, alignItems: "end" }}>
            <div style={s.formGroup}>
              <label style={s.formLabel}>Fecha Inicio</label>
              <input type="date" value={filtros.fecha_inicio}
                onChange={e => { setFiltros({ ...filtros, fecha_inicio: e.target.value }); setPagina(1); }}
                style={s.formInput} />
            </div>
            <div style={s.formGroup}>
              <label style={s.formLabel}>Fecha Fin</label>
              <input type="date" value={filtros.fecha_fin}
                onChange={e => { setFiltros({ ...filtros, fecha_fin: e.target.value }); setPagina(1); }}
                style={s.formInput} />
            </div>
            <div style={s.formGroup}>
              <label style={s.formLabel}>Tipo Usuario</label>
              <select value={filtros.tipo_usuario}
                onChange={e => { setFiltros({ ...filtros, tipo_usuario: e.target.value }); setPagina(1); }}
                style={s.formInput}>
                <option value="">Todos</option>
                <option value="admin">Admin</option>
                <option value="empleado">Empleado</option>
                <option value="cliente">Cliente</option>
              </select>
            </div>
            <div style={s.formGroup}>
              <label style={s.formLabel}>Acción</label>
              <select value={filtros.accion}
                onChange={e => { setFiltros({ ...filtros, accion: e.target.value }); setPagina(1); }}
                style={s.formInput}>
                <option value="">Todas</option>
                <option value="INSERT">INSERT</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <div style={s.formGroup}>
              <label style={s.formLabel}>Tabla</label>
              <select value={filtros.tabla}
                onChange={e => { setFiltros({ ...filtros, tabla: e.target.value }); setPagina(1); }}
                style={s.formInput}>
                <option value="">Todas</option>
                <option value="pedidos">Pedidos</option>
                <option value="clientes">Clientes</option>
                <option value="empleados">Empleados</option>
                <option value="productos">Productos</option>
              </select>
            </div>
            <button onClick={limpiar} style={s.btnSecondary}> Limpiar</button>
          </div>
        </div>

        {/* TABLA */}
        <div style={s.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <p style={{ ...s.cardTitle, margin: 0 }}>Registros de Auditoría</p>
            {data && <span style={s.badge}>{data.total} registros encontrados</span>}
          </div>

          {loading ? (
            <div style={s.loadingRow}><div style={s.spinner} /></div>
          ) : (
            <div style={s.tableWrapper}>
              <table style={s.table}>
                <thead>
                  <tr>
                    {["ID", "Fecha/Hora", "Usuario", "Tipo", "Tabla", "Acción", "ID Reg.", "IP", ""].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {!data?.registros?.length ? (
                    <tr><td colSpan={9} style={{ ...s.td, textAlign: "center", color: "#a0a0a0", padding: 40 }}>
                      No se encontraron registros
                    </td></tr>
                  ) : data.registros.map((r, i) => {
                    const ac = ACCION_STYLE[r.accion]   || ACCION_STYLE.UPDATE;
                    const ti = TIPO_STYLE[r.tipo_usuario] || TIPO_STYLE.cliente;
                    return (
                      <tr key={r.id_auditoria} style={{ background: i % 2 === 0 ? "rgba(154,3,30,0.04)" : "transparent" }}>
                        <td style={s.td}><strong style={{ color: "#c1121f" }}>#{r.id_auditoria}</strong></td>
                        <td style={{ ...s.td, fontSize: 12, color: "#a0a0a0" }}>{r.fecha}</td>
                        <td style={s.td}>{r.nombre_usuario}</td>
                        <td style={s.td}>
                          <span style={{ ...s.pill, background: ti.bg, color: ti.color, border: `1px solid ${ti.border}` }}>
                            {r.tipo_usuario}
                          </span>
                        </td>
                        <td style={s.td}>
                          <span style={{ ...s.pill, background: "rgba(154,3,30,0.1)", color: "#c1121f", border: "1px solid rgba(154,3,30,0.2)" }}>
                            {r.tabla_afectada}
                          </span>
                        </td>
                        <td style={s.td}>
                          <span style={{ ...s.pill, background: ac.bg, color: ac.color, border: `1px solid ${ac.border}` }}>
                            {r.accion}
                          </span>
                        </td>
                        <td style={s.td}>#{r.id_registro}</td>
                        <td style={{ ...s.td, fontSize: 11, color: "#a0a0a0" }}>{r.ip_address || "—"}</td>
                        <td style={s.td}>
                          <button onClick={() => setDetalle(r)} style={s.btnInfo}><Search size={14} /></button>
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
            <div style={s.pagination}>
              <button onClick={() => setPagina(1)} disabled={pagina === 1} style={{ ...s.pageBtn, opacity: pagina === 1 ? 0.4 : 1 }}>«</button>
              <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1} style={{ ...s.pageBtn, opacity: pagina === 1 ? 0.4 : 1 }}>‹</button>
              {Array.from({ length: data.total_paginas }, (_, i) => i + 1)
                .filter(p => p === 1 || p === data.total_paginas || Math.abs(p - pagina) <= 2)
                .map((p, idx, arr) => (
                  <Fragment key={p}>
                    {idx > 0 && arr[idx - 1] !== p - 1 && <span style={{ color: "#a0a0a0" }}>…</span>}
                    <button onClick={() => setPagina(p)}
                      style={{ ...s.pageBtn, ...(p === pagina ? s.pageBtnActive : {}) }}>{p}</button>
                  </Fragment>
                ))}
              <button onClick={() => setPagina(p => Math.min(data.total_paginas, p + 1))} disabled={pagina === data.total_paginas} style={{ ...s.pageBtn, opacity: pagina === data.total_paginas ? 0.4 : 1 }}>›</button>
              <button onClick={() => setPagina(data.total_paginas)} disabled={pagina === data.total_paginas} style={{ ...s.pageBtn, opacity: pagina === data.total_paginas ? 0.4 : 1 }}>»</button>
            </div>
          )}
          {data && (
            <p style={{ textAlign: "center", color: "#a0a0a0", fontSize: 12, marginTop: 8 }}>
              Página {pagina} de {data.total_paginas} — {data.total} registros totales
            </p>
          )}
        </div>
      </main>

      {/* MODAL DETALLE */}
      {detalle && (
        <div style={s.modalOverlay} onClick={() => setDetalle(null)}>
          <div style={{ ...s.modalBox, maxWidth: 680 }} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}><Search size={16} /> Detalle Auditoría #{detalle.id_auditoria}</h2>
              <button onClick={() => setDetalle(null)} style={s.closeBtn}><X size={18} /></button>
            </div>
            <div style={{ ...s.modalBody, overflowY: "auto", maxHeight: "65vh" }}>
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
            <div style={s.modalFooter}>
              <button onClick={() => setDetalle(null)} style={s.btnSecondary}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  page:       { display: "flex", minHeight: "100vh", background: "#121418", fontFamily: "'Lato', sans-serif", color: "#d9d9d9" },
  main:       { flex: 1, padding: "24px 28px" },
  header:     { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, paddingBottom: 16, borderBottom: "2px solid #9a031e" },
  pageTitle:  { color: "#c1121f", fontSize: 26, fontWeight: 700, margin: 0 },
  pageSubtitle: { color: "#a0a0a0", fontSize: 13, margin: "4px 0 0" },
  statsGrid:  { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 },
  statCard:   { background: "#1f2429", padding: "16px 18px", borderRadius: 12, borderLeft: "4px solid #9a031e" },
  statLabel:  { color: "#a0a0a0", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, margin: 0 },
  statValue:  { fontSize: 24, fontWeight: 700, margin: "4px 0 0" },
  card:       { background: "#1f2429", borderRadius: 12, border: "1px solid rgba(154,3,30,0.2)", padding: 20, marginBottom: 16 },
  cardTitle:  { color: "#c1121f", fontWeight: 700, fontSize: 14 },
  badge:      { padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: "rgba(154,3,30,0.15)", color: "#c1121f", border: "1px solid rgba(154,3,30,0.3)" },
  formGroup:  { marginBottom: 0 },
  formLabel:  { display: "block", color: "#a0a0a0", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 },
  formInput:  { width: "100%", padding: "9px 12px", background: "#121418", border: "1px solid rgba(154,3,30,0.3)", borderRadius: 8, color: "#d9d9d9", fontSize: 13, outline: "none", boxSizing: "border-box" },
  tableWrapper: { overflowX: "auto" },
  table:      { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th:         { padding: "10px 14px", textAlign: "left", color: "#a0a0a0", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.8, background: "#121418", borderBottom: "2px solid rgba(154,3,30,0.3)" },
  td:         { padding: "10px 14px", color: "#d9d9d9", borderBottom: "1px solid rgba(154,3,30,0.08)" },
  pill:       { padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 },
  btnInfo:    { padding: "5px 10px", background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.4)", borderRadius: 6, cursor: "pointer", fontSize: 13 },
  loadingRow: { display: "flex", justifyContent: "center", padding: 40 },
  spinner:    { width: 32, height: 32, border: "3px solid rgba(154,3,30,0.3)", borderTop: "3px solid #9a031e", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  pagination: { display: "flex", justifyContent: "center", gap: 6, marginTop: 16, flexWrap: "wrap", alignItems: "center" },
  pageBtn:    { padding: "7px 12px", background: "#1f2429", border: "1px solid rgba(154,3,30,0.3)", borderRadius: 6, color: "#d9d9d9", cursor: "pointer", fontSize: 13 },
  pageBtnActive: { background: "#9a031e", borderColor: "#9a031e", color: "white", fontWeight: 700 },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  modalBox:   { background: "#1f2429", border: "2px solid #9a031e", borderRadius: 16, width: "100%" },
  modalHeader:{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "2px solid #9a031e", background: "#121418" },
  modalTitle: { color: "#c1121f", fontSize: 16, fontWeight: 700, margin: 0 },
  closeBtn:   { background: "none", border: "none", color: "#a0a0a0", fontSize: 18, cursor: "pointer" },
  modalBody:  { padding: 20 },
  modalFooter:{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 20px", borderTop: "1px solid rgba(154,3,30,0.2)", background: "#121418" },
  infoBox:    { background: "#121418", borderRadius: 10, padding: 14, border: "1px solid rgba(154,3,30,0.15)" },
  infoTitle:  { color: "#c1121f", fontWeight: 700, fontSize: 13, marginBottom: 8 },
  infoRow:    { color: "#d9d9d9", fontSize: 13, margin: "4px 0" },
  pre:        { background: "#0d0f12", borderRadius: 8, padding: 10, fontSize: 11, color: "#10b981", overflowX: "auto", margin: 0, border: "1px solid rgba(16,185,129,0.2)" },
  btnSecondary: { padding: "8px 16px", background: "rgba(154,3,30,0.1)", border: "1px solid rgba(154,3,30,0.3)", borderRadius: 8, color: "#d9d9d9", fontWeight: 600, fontSize: 13, cursor: "pointer" },
};