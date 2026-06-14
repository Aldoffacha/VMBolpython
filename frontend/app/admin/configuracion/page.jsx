"use client";

import "@/styles/admin.css";
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
    <div>
      

      <main>
        {/* HEADER */}
        <div className="admin-header">
          <div>
            <h1 className="admin-header__title">Configuración del Sistema</h1>
            <p className="admin-header__sub">Gestiona la información general, QR de pago, depósitos y tiendas</p>
          </div>
        </div>

        {/* TOAST */}
        {toast && (
          <div className={`admin-toast ${toast.ok ? "admin-toast--ok" : "admin-toast--fail"}`}>
            <>{toast.ok ? <CheckCircle size={14} /> : <XCircle size={14} />} {toast.msg}</>
          </div>
        )}

        <div className="admin-grid2">
          {/* ── COL IZQUIERDA ── */}
          <div className="admin-col">

            {/* Config general */}
            <div className="admin-card">
                <div className="admin-card__head"><span className="admin-card__title">Configuración General</span></div>
              <div className="admin-card__body">
                <div className="admin-form-group">
                  <label className="admin-form-label">Nombre de la Empresa</label>
                  <input className="admin-form-input" value={general.nombre_empresa}
                    onChange={e => setGeneral({ ...general, nombre_empresa: e.target.value })} />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Email de Contacto</label>
                  <input className="admin-form-input" type="email" value={general.email_contacto}
                    onChange={e => setGeneral({ ...general, email_contacto: e.target.value })} />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Teléfono de Contacto</label>
                  <input className="admin-form-input" value={general.telefono_contacto}
                    onChange={e => setGeneral({ ...general, telefono_contacto: e.target.value })} />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Moneda Principal</label>
                  <select className="admin-form-select" value={general.moneda}
                    onChange={e => setGeneral({ ...general, moneda: e.target.value })}>
                    <option value="USD">Dólar Americano (USD)</option>
                    <option value="BOB">Boliviano (BOB)</option>
                  </select>
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Tipo de Cambio (BOB/USD)</label>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input className="admin-form-input" style={{ flex: 1 }} type="number" step="0.01" min="0"
                      value={general.tipo_cambio ?? tcInfo?.tipo_cambio ?? 9.17}
                      onChange={e => setGeneral({ ...general, tipo_cambio: parseFloat(e.target.value) || 0 })} />
                    <button onClick={actualizarTc} disabled={actualizandoTc} className="admin-btn admin-btn--sec" style={{ padding: "9px 12px", whiteSpace: "nowrap" }}>
                      <RefreshCw size={14} className={actualizandoTc ? "spin" : ""} />
                      {actualizandoTc ? "..." : "Auto"}
                    </button>
                  </div>
                  {tcInfo?.actualizacion && (
                    <span style={{ color: "var(--admin-text-2)", fontSize: 11, marginTop: 4, display: "block" }}>
                      Última actualización: {new Date(tcInfo.actualizacion).toLocaleString("es-BO")}
                    </span>
                  )}
                </div>
                <button onClick={guardarGeneral} disabled={saving} className="admin-btn admin-btn--pri">
                  {saving ? "Guardando..." : <><Save size={14} /> Guardar Configuración</>}
                </button>
              </div>
            </div>

            {/* QR */}
            <div className="admin-card">
              <div className="admin-card__head"><span className="admin-card__title">Código QR de Pago</span></div>
              <div className="admin-card__body">
                {/* QR actual */}
                <div style={{ marginBottom: 16 }}>
                  <p className="admin-form-label">QR Actual</p>
                  {qrPreview || qrUrl ? (
                    <img src={qrPreview || qrUrl} alt="QR de pago"
                      style={{ maxWidth: 220, borderRadius: 10, border: "2px solid rgba(154,3,30,0.3)" }} />
                  ) : (
                    <div style={s.qrEmpty}>No se ha subido ningún QR todavía</div>
                  )}
                </div>

                {/* Subir nuevo */}
                <p className="admin-form-label">Subir Nuevo QR (JPG / PNG / WEBP — Máx 2MB)</p>
                <input ref={qrInputRef} type="file" accept="image/*" onChange={subirQR}
                  style={{ display: "none" }} />
                <button onClick={() => qrInputRef.current?.click()} className="admin-btn admin-btn--sec">
                  <Upload size={14} /> Seleccionar Imagen
                </button>
              </div>
            </div>
          </div>

          {/* ── COL DERECHA ── */}
          <div className="admin-col">

            {/* Depósitos */}
            <div className="admin-card">
              <div className="admin-card__head">
                <span className="admin-card__title">Depósitos en Miami</span>
                <button onClick={() => setModal("deposito")} className="admin-btn admin-btn--sm admin-btn--pri"><Plus size={14} /> Agregar</button>
              </div>
              <div className="admin-card__body">
                {!data?.depositos?.length ? (
                  <p style={{ color: "var(--admin-text-2)", fontSize: 13 }}>No hay depósitos registrados</p>
                ) : (
                  <table className="admin-table">
                    <thead>
                      <tr>{["Nombre", "Contacto", ""].map(h => <th key={h}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {data.depositos.map((d, i) => (
                        <tr key={d.id_deposito} style={{ background: i % 2 === 0 ? "rgba(154,3,30,0.04)" : "transparent" }}>
                          <td>{d.nombre_deposito}</td>
                          <td>{d.contacto || "—"}</td>
                          <td>
                            <button onClick={() => eliminarDeposito(d.id_deposito)} className="admin-btn admin-btn--xs admin-btn--del"><Trash2 size={14} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Tiendas */}
            <div className="admin-card">
              <div className="admin-card__head">
                <span className="admin-card__title">Tiendas USA Configuradas</span>
                <button onClick={() => setModal("tienda")} className="admin-btn admin-btn--sm admin-btn--pri"><Plus size={14} /> Agregar</button>
              </div>
              <div className="admin-card__body">
                {!data?.tiendas?.length ? (
                  <p style={{ color: "var(--admin-text-2)", fontSize: 13 }}>No hay tiendas registradas</p>
                ) : (
                  <table className="admin-table">
                    <thead>
                      <tr>{["Tienda", "Tipo", ""].map(h => <th key={h}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {data.tiendas.map((t, i) => (
                        <tr key={t.id_tienda} style={{ background: i % 2 === 0 ? "rgba(154,3,30,0.04)" : "transparent" }}>
                          <td>{t.nombre_tienda}</td>
                          <td>
                            <span className="admin-badge" style={{ background: "rgba(59,130,246,0.15)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.3)" }}>{t.tipo}</span>
                          </td>
                          <td>
                            <button onClick={() => eliminarTienda(t.id_tienda)} className="admin-btn admin-btn--xs admin-btn--del"><Trash2 size={14} /></button>
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
        <div className="admin-overlay" onClick={() => setModal(null)}>
          <div className="admin-modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="admin-modal__head">
              <h2 className="admin-modal__title"><Plus size={16} /> Agregar Depósito</h2>
              <button onClick={() => setModal(null)} className="admin-modal__close"><X size={18} /></button>
            </div>
            <div className="admin-modal__body">
              {[
                { label: "Nombre del Depósito *", key: "nombre_deposito" },
                { label: "Dirección *",            key: "direccion" },
                { label: "Teléfono",               key: "telefono" },
                { label: "Persona de Contacto",    key: "contacto" },
              ].map(({ label, key }) => (
                <div key={key} className="admin-form-group">
                  <label className="admin-form-label">{label}</label>
                  <input className="admin-form-input" value={formDeposito[key]}
                    onChange={e => setFormDeposito({ ...formDeposito, [key]: e.target.value })} />
                </div>
              ))}
            </div>
            <div className="admin-modal__foot">
              <button onClick={() => setModal(null)} className="admin-btn admin-btn--sec">Cancelar</button>
              <button onClick={agregarDeposito} className="admin-btn admin-btn--pri">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TIENDA */}
      {modal === "tienda" && (
        <div className="admin-overlay" onClick={() => setModal(null)}>
          <div className="admin-modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="admin-modal__head">
              <h2 className="admin-modal__title"> Agregar Tienda USA</h2>
              <button onClick={() => setModal(null)} className="admin-modal__close"><X size={18} /></button>
            </div>
            <div className="admin-modal__body">
              <div className="admin-form-group">
                <label className="admin-form-label">Nombre de la Tienda *</label>
                <input className="admin-form-input" value={formTienda.nombre_tienda}
                  onChange={e => setFormTienda({ ...formTienda, nombre_tienda: e.target.value })} />
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">URL de la Tienda</label>
                <input className="admin-form-input" type="url" value={formTienda.url_tienda}
                  onChange={e => setFormTienda({ ...formTienda, url_tienda: e.target.value })} />
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">Tipo de Tienda *</label>
                <select className="admin-form-select" value={formTienda.tipo}
                  onChange={e => setFormTienda({ ...formTienda, tipo: e.target.value })}>
                  {TIENDA_TIPOS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">API Key (opcional)</label>
                <input className="admin-form-input" value={formTienda.api_key}
                  onChange={e => setFormTienda({ ...formTienda, api_key: e.target.value })}
                  placeholder="Clave API para integración" />
              </div>
            </div>
            <div className="admin-modal__foot">
              <button onClick={() => setModal(null)} className="admin-btn admin-btn--sec">Cancelar</button>
              <button onClick={agregarTienda} className="admin-btn admin-btn--pri">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  qrEmpty:    { padding: 20, background: "var(--admin-bg)", borderRadius: 10, border: "2px dashed var(--admin-border)", color: "var(--admin-text-2)", fontSize: 13, textAlign: "center" },
};