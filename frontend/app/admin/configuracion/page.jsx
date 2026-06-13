"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, Trash2, Save, CheckCircle, XCircle, Plus, Upload, RefreshCw } from "lucide-react";


const API = "http://localhost:8000";
function getToken() {
  return document.cookie.split("; ").find(r => r.startsWith("access_token="))?.split("=")[1];
}

const TIENDA_TIPOS = ["amazon", "ebay", "alibaba", "walmart", "otro"];

export default function AdminConfiguracion() {
  const router  = useRouter();
  const [user, setUser]     = useState(null);
  const [data, setData]     = useState(null);
  const [toast, setToast]   = useState(null);
  const [modal, setModal]   = useState(null); // 'deposito' | 'tienda'
  const [saving, setSaving] = useState(false);
  const [qrPreview, setQrPreview] = useState(null);
  const [actualizandoTc, setActualizandoTc] = useState(false);
  const [tcInfo, setTcInfo] = useState(null);
  const qrInputRef = useRef(null);

  // Form states
  const [general, setGeneral] = useState({
    nombre_empresa: "", email_contacto: "", telefono_contacto: "", moneda: "USD", tipo_cambio: 9.17
  });
  const [formDeposito, setFormDeposito] = useState({ nombre_deposito: "", direccion: "", telefono: "", contacto: "" });
  const [formTienda,   setFormTienda]   = useState({ nombre_tienda: "", url_tienda: "", tipo: "amazon", api_key: "" });

  useEffect(() => {
    const stored = sessionStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = getToken();
      const res   = await fetch(`${API}/admin/configuracion`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) { router.push("/login"); return; }
      const json = await res.json();
      if (!json?.config) return;
      setData(json);
      setGeneral({
        nombre_empresa:    json.config.nombre_empresa,
        email_contacto:    json.config.email_contacto,
        telefono_contacto: json.config.telefono_contacto,
        moneda:            json.config.moneda,
        tipo_cambio:       json.config.tipo_cambio,
      });
      setTcInfo({
        tipo_cambio: json.config.tipo_cambio,
        actualizacion: json.config.tipo_cambio_actualizacion,
      });
    } catch (e) {
      console.error("Error fetching config:", e);
    }
  };

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Guardar general ──
  const guardarGeneral = async () => {
    setSaving(true);
    const token = getToken();
    const fd    = new FormData();
    Object.entries(general).forEach(([k, v]) => fd.append(k, v));
    const res = await fetch(`${API}/admin/configuracion/general`, {
      method: "PUT", headers: { Authorization: `Bearer ${token}` }, body: fd,
    });
    const json = await res.json();
    setSaving(false);
    showToast(json.mensaje, res.ok);
  };

  // ── Actualizar tipo de cambio ──
  const actualizarTc = async () => {
    setActualizandoTc(true);
    const token = getToken();
    const res = await fetch(`${API}/admin/configuracion/actualizar-tipo-cambio`, {
      method: "POST", headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    setActualizandoTc(false);
    if (res.ok) {
      setTcInfo({ tipo_cambio: json.tipo_cambio, actualizacion: new Date().toISOString() });
      showToast(json.mensaje, true);
    } else {
      showToast(json.mensaje || "Error al actualizar tipo de cambio", false);
    }
  };

  // ── Subir QR ──
  const subirQR = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setQrPreview(URL.createObjectURL(file));
    const token = getToken();
    const fd    = new FormData();
    fd.append("qr_image", file);
    const res  = await fetch(`${API}/admin/configuracion/qr`, {
      method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd,
    });
    const json = await res.json();
    showToast(json.mensaje, res.ok);
    if (res.ok) fetchData();
  };

  // ── Agregar depósito ──
  const agregarDeposito = async () => {
    const token = getToken();
    const fd    = new FormData();
    Object.entries(formDeposito).forEach(([k, v]) => fd.append(k, v));
    const res  = await fetch(`${API}/admin/configuracion/depositos`, {
      method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd,
    });
    const json = await res.json();
    showToast(json.mensaje, res.ok);
    if (res.ok) { setModal(null); setFormDeposito({ nombre_deposito: "", direccion: "", telefono: "", contacto: "" }); fetchData(); }
  };

  // ── Eliminar depósito ──
  const eliminarDeposito = async (id) => {
    if (!confirm("¿Eliminar este depósito?")) return;
    const token = getToken();
    const res   = await fetch(`${API}/admin/configuracion/depositos/${id}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` },
    });
    const json  = await res.json();
    showToast(json.mensaje, res.ok);
    if (res.ok) fetchData();
  };

  // ── Agregar tienda ──
  const agregarTienda = async () => {
    const token = getToken();
    const fd    = new FormData();
    Object.entries(formTienda).forEach(([k, v]) => fd.append(k, v));
    const res  = await fetch(`${API}/admin/configuracion/tiendas`, {
      method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd,
    });
    const json = await res.json();
    showToast(json.mensaje, res.ok);
    if (res.ok) { setModal(null); setFormTienda({ nombre_tienda: "", url_tienda: "", tipo: "amazon", api_key: "" }); fetchData(); }
  };

  // ── Eliminar tienda ──
  const eliminarTienda = async (id) => {
    if (!confirm("¿Eliminar esta tienda?")) return;
    const token = getToken();
    const res   = await fetch(`${API}/admin/configuracion/tiendas/${id}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` },
    });
    const json  = await res.json();
    showToast(json.mensaje, res.ok);
    if (res.ok) fetchData();
  };

  const qrUrl = data?.config?.qr_filename
    ? `${API}/uploads/qr/${data.config.qr_filename}`
    : null;

  return (
    <div style={s.page}>
      

      <main style={s.main}>
        {/* HEADER */}
        <div style={s.header}>
          <div>
            <h1 style={s.pageTitle}>Configuración del Sistema</h1>
            <p style={s.pageSubtitle}>Gestiona la información general, QR de pago, depósitos y tiendas</p>
          </div>
        </div>

        {/* TOAST */}
        {toast && (
          <div style={{ ...s.toast, background: toast.ok ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
            borderColor: toast.ok ? "rgba(16,185,129,0.4)" : "rgba(239,68,68,0.4)",
            color: toast.ok ? "#10b981" : "#ef4444" }}>
            <>{toast.ok ? <CheckCircle size={14} /> : <XCircle size={14} />} {toast.msg}</>
          </div>
        )}

        <div style={s.grid2}>
          {/* ── COL IZQUIERDA ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Config general */}
            <div style={s.card}>
                <div style={s.cardHeader}><span style={s.cardTitle}>Configuración General</span></div>
              <div style={s.cardBody}>
                <div style={s.formGroup}>
                  <label style={s.label}>Nombre de la Empresa</label>
                  <input style={s.input} value={general.nombre_empresa}
                    onChange={e => setGeneral({ ...general, nombre_empresa: e.target.value })} />
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Email de Contacto</label>
                  <input style={s.input} type="email" value={general.email_contacto}
                    onChange={e => setGeneral({ ...general, email_contacto: e.target.value })} />
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Teléfono de Contacto</label>
                  <input style={s.input} value={general.telefono_contacto}
                    onChange={e => setGeneral({ ...general, telefono_contacto: e.target.value })} />
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Moneda Principal</label>
                  <select style={s.input} value={general.moneda}
                    onChange={e => setGeneral({ ...general, moneda: e.target.value })}>
                    <option value="USD">Dólar Americano (USD)</option>
                    <option value="BOB">Boliviano (BOB)</option>
                  </select>
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Tipo de Cambio (BOB/USD)</label>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input style={{ ...s.input, flex: 1 }} type="number" step="0.01" min="0"
                      value={general.tipo_cambio ?? tcInfo?.tipo_cambio ?? 9.17}
                      onChange={e => setGeneral({ ...general, tipo_cambio: parseFloat(e.target.value) || 0 })} />
                    <button onClick={actualizarTc} disabled={actualizandoTc} style={{
                      ...s.btnSecondary, padding: "9px 12px", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6,
                    }}>
                      <RefreshCw size={14} className={actualizandoTc ? "spin" : ""} />
                      {actualizandoTc ? "..." : "Auto"}
                    </button>
                  </div>
                  {tcInfo?.actualizacion && (
                    <span style={{ color: "#a0a0a0", fontSize: 11, marginTop: 4, display: "block" }}>
                      Última actualización: {new Date(tcInfo.actualizacion).toLocaleString("es-BO")}
                    </span>
                  )}
                </div>
                <button onClick={guardarGeneral} disabled={saving} style={s.btnPrimary}>
                  {saving ? "Guardando..." : <><Save size={14} /> Guardar Configuración</>}
                </button>
              </div>
            </div>

            {/* QR */}
            <div style={s.card}>
              <div style={s.cardHeader}><span style={s.cardTitle}>Código QR de Pago</span></div>
              <div style={s.cardBody}>
                {/* QR actual */}
                <div style={{ marginBottom: 16 }}>
                  <p style={s.label}>QR Actual</p>
                  {qrPreview || qrUrl ? (
                    <img src={qrPreview || qrUrl} alt="QR de pago"
                      style={{ maxWidth: 220, borderRadius: 10, border: "2px solid rgba(154,3,30,0.3)" }} />
                  ) : (
                    <div style={s.qrEmpty}>No se ha subido ningún QR todavía</div>
                  )}
                </div>

                {/* Subir nuevo */}
                <p style={s.label}>Subir Nuevo QR (JPG / PNG / WEBP — Máx 2MB)</p>
                <input ref={qrInputRef} type="file" accept="image/*" onChange={subirQR}
                  style={{ display: "none" }} />
                <button onClick={() => qrInputRef.current?.click()} style={s.btnSecondary}>
                  <Upload size={14} /> Seleccionar Imagen
                </button>
              </div>
            </div>
          </div>

          {/* ── COL DERECHA ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Depósitos */}
            <div style={s.card}>
              <div style={{ ...s.cardHeader, display: "flex", justifyContent: "space-between" }}>
                <span style={s.cardTitle}>Depósitos en Miami</span>
                <button onClick={() => setModal("deposito")} style={s.btnAdd}><Plus size={14} /> Agregar</button>
              </div>
              <div style={s.cardBody}>
                {!data?.depositos?.length ? (
                  <p style={{ color: "#a0a0a0", fontSize: 13 }}>No hay depósitos registrados</p>
                ) : (
                  <table style={s.table}>
                    <thead>
                      <tr>{["Nombre", "Contacto", ""].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {data.depositos.map((d, i) => (
                        <tr key={d.id_deposito} style={{ background: i % 2 === 0 ? "rgba(154,3,30,0.04)" : "transparent" }}>
                          <td style={s.td}>{d.nombre_deposito}</td>
                          <td style={s.td}>{d.contacto || "—"}</td>
                          <td style={s.td}>
                            <button onClick={() => eliminarDeposito(d.id_deposito)} style={s.btnDel}><Trash2 size={14} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Tiendas */}
            <div style={s.card}>
              <div style={{ ...s.cardHeader, display: "flex", justifyContent: "space-between" }}>
                <span style={s.cardTitle}>Tiendas USA Configuradas</span>
                <button onClick={() => setModal("tienda")} style={s.btnAdd}><Plus size={14} /> Agregar</button>
              </div>
              <div style={s.cardBody}>
                {!data?.tiendas?.length ? (
                  <p style={{ color: "#a0a0a0", fontSize: 13 }}>No hay tiendas registradas</p>
                ) : (
                  <table style={s.table}>
                    <thead>
                      <tr>{["Tienda", "Tipo", ""].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {data.tiendas.map((t, i) => (
                        <tr key={t.id_tienda} style={{ background: i % 2 === 0 ? "rgba(154,3,30,0.04)" : "transparent" }}>
                          <td style={s.td}>{t.nombre_tienda}</td>
                          <td style={s.td}>
                            <span style={s.pill}>{t.tipo}</span>
                          </td>
                          <td style={s.td}>
                            <button onClick={() => eliminarTienda(t.id_tienda)} style={s.btnDel}><Trash2 size={14} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL DEPÓSITO */}
      {modal === "deposito" && (
        <div style={s.overlay} onClick={() => setModal(null)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}><Plus size={16} /> Agregar Depósito</h2>
              <button onClick={() => setModal(null)} style={s.closeBtn}><X size={18} /></button>
            </div>
            <div style={s.modalBody}>
              {[
                { label: "Nombre del Depósito *", key: "nombre_deposito" },
                { label: "Dirección *",            key: "direccion" },
                { label: "Teléfono",               key: "telefono" },
                { label: "Persona de Contacto",    key: "contacto" },
              ].map(({ label, key }) => (
                <div key={key} style={s.formGroup}>
                  <label style={s.label}>{label}</label>
                  <input style={s.input} value={formDeposito[key]}
                    onChange={e => setFormDeposito({ ...formDeposito, [key]: e.target.value })} />
                </div>
              ))}
            </div>
            <div style={s.modalFooter}>
              <button onClick={() => setModal(null)} style={s.btnSecondary}>Cancelar</button>
              <button onClick={agregarDeposito} style={s.btnPrimary}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TIENDA */}
      {modal === "tienda" && (
        <div style={s.overlay} onClick={() => setModal(null)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}> Agregar Tienda USA</h2>
              <button onClick={() => setModal(null)} style={s.closeBtn}><X size={18} /></button>
            </div>
            <div style={s.modalBody}>
              <div style={s.formGroup}>
                <label style={s.label}>Nombre de la Tienda *</label>
                <input style={s.input} value={formTienda.nombre_tienda}
                  onChange={e => setFormTienda({ ...formTienda, nombre_tienda: e.target.value })} />
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>URL de la Tienda</label>
                <input style={s.input} type="url" value={formTienda.url_tienda}
                  onChange={e => setFormTienda({ ...formTienda, url_tienda: e.target.value })} />
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Tipo de Tienda *</label>
                <select style={s.input} value={formTienda.tipo}
                  onChange={e => setFormTienda({ ...formTienda, tipo: e.target.value })}>
                  {TIENDA_TIPOS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>API Key (opcional)</label>
                <input style={s.input} value={formTienda.api_key}
                  onChange={e => setFormTienda({ ...formTienda, api_key: e.target.value })}
                  placeholder="Clave API para integración" />
              </div>
            </div>
            <div style={s.modalFooter}>
              <button onClick={() => setModal(null)} style={s.btnSecondary}>Cancelar</button>
              <button onClick={agregarTienda} style={s.btnPrimary}>Guardar</button>
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
  grid2:      { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 },
  card:       { background: "#1f2429", borderRadius: 12, border: "1px solid rgba(154,3,30,0.2)", overflow: "hidden" },
  cardHeader: { padding: "14px 18px", borderBottom: "2px solid #9a031e", background: "#121418" },
  cardTitle:  { color: "#c1121f", fontWeight: 700, fontSize: 14 },
  cardBody:   { padding: 20 },
  formGroup:  { marginBottom: 14 },
  label:      { display: "block", color: "#a0a0a0", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 },
  input:      { width: "100%", padding: "9px 12px", background: "#121418", border: "1px solid rgba(154,3,30,0.3)", borderRadius: 8, color: "#d9d9d9", fontSize: 13, outline: "none", boxSizing: "border-box" },
  table:      { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th:         { padding: "8px 12px", textAlign: "left", color: "#a0a0a0", fontWeight: 700, fontSize: 11, textTransform: "uppercase", background: "#121418", borderBottom: "2px solid rgba(154,3,30,0.3)" },
  td:         { padding: "9px 12px", color: "#d9d9d9", borderBottom: "1px solid rgba(154,3,30,0.08)" },
  pill:       { padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "rgba(59,130,246,0.15)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.3)" },
  btnPrimary: { padding: "9px 20px", background: "#9a031e", border: "none", borderRadius: 8, color: "white", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  btnSecondary: { padding: "9px 16px", background: "rgba(154,3,30,0.1)", border: "1px solid rgba(154,3,30,0.3)", borderRadius: 8, color: "#d9d9d9", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  btnAdd:     { padding: "5px 12px", background: "rgba(154,3,30,0.15)", border: "1px solid rgba(154,3,30,0.4)", borderRadius: 6, color: "#c1121f", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  btnDel:     { padding: "4px 8px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, cursor: "pointer", fontSize: 13 },
  qrEmpty:    { padding: 20, background: "#121418", borderRadius: 10, border: "2px dashed rgba(154,3,30,0.3)", color: "#a0a0a0", fontSize: 13, textAlign: "center" },
  toast:      { position: "fixed", top: 24, right: 24, padding: "12px 20px", borderRadius: 10, border: "1px solid", fontWeight: 600, fontSize: 13, zIndex: 9999 },
  overlay:    { position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  modalBox:   { background: "#1f2429", border: "2px solid #9a031e", borderRadius: 16, width: "100%", maxWidth: 480 },
  modalHeader:{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "2px solid #9a031e", background: "#121418" },
  modalTitle: { color: "#c1121f", fontSize: 16, fontWeight: 700, margin: 0 },
  closeBtn:   { background: "none", border: "none", color: "#a0a0a0", fontSize: 18, cursor: "pointer" },
  modalBody:  { padding: 20 },
  modalFooter:{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 20px", borderTop: "1px solid rgba(154,3,30,0.2)", background: "#121418" },
};