"use client";

import "@/styles/admin.css";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit3, Trash2, Save, X, MapPin, CheckCircle, XCircle, Upload } from "lucide-react";

const API = "http://localhost:8000";
function getToken() {
  return document.cookie.split("; ").find(r => r.startsWith("access_token="))?.split("=")[1];
}

const DEPARTAMENTOS = [
  "La Paz", "Pando", "Beni", "Santa Cruz", "Cochabamba",
  "Oruro", "Chuquisaca", "Potosí", "Tarija",
];

const CIUDADES_SUGERIDAS = {
  "La Paz": ["La Paz", "El Alto", "Viacha"],
  "Pando": ["Cobija"],
  "Beni": ["Trinidad", "Riberalta", "Guayaramerín"],
  "Santa Cruz": ["Santa Cruz de la Sierra", "Montero", "Warnes"],
  "Cochabamba": ["Cochabamba", "Quillacollo", "Sacaba"],
  "Oruro": ["Oruro", "Huanuni"],
  "Chuquisaca": ["Sucre", "Monteagudo"],
  "Potosí": ["Potosí", "Llallagua", "Villazón"],
  "Tarija": ["Tarija", "Yacuiba", "Bermejo"],
};

function MiniMapaPreview({ lat, lng }) {
  const ref = useRef(null);
  const inst = useRef(null);
  const [ready, setReady] = useState(false);
  const esDefault = lat === -16.5 && lng === -68.15;

  useEffect(() => {
    cargarLeaflet().then((L) => { if (L) setReady(true); });
  }, []);

  useEffect(() => {
    if (!ready || esDefault) return;
    const L = window.L;
    if (!inst.current) {
      const map = L.map(ref.current, {
        center: [lat, lng], zoom: 15, zoomControl: false, attributionControl: false,
        dragging: false, scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false,
      });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", { maxZoom: 19 }).addTo(map);
      map.markerRef = L.marker([lat, lng]).addTo(map);
      inst.current = map;
    } else {
      inst.current.setView([lat, lng], 15);
      if (inst.current.markerRef) inst.current.markerRef.setLatLng([lat, lng]);
    }
    return () => { if (inst.current) { inst.current.remove(); inst.current = null; } };
  }, [ready, lat, lng]);

  if (esDefault) {
    return (
      <div style={{
        width: "100%", height: 180,
        background: "var(--admin-bg-2)", borderRadius: "var(--r-md)",
        border: "1px solid var(--admin-border)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--admin-text-3)", fontSize: 12, flexDirection: "column", gap: 6,
      }}>
        <MapPin size={24} opacity={0.3} />
        <span>Haz clic en "Mapa" para ubicar</span>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: 180, borderRadius: "var(--r-md)", overflow: "hidden", border: "1px solid var(--admin-border)" }}>
      {!ready && (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--admin-bg-2)", color: "var(--admin-text-3)", fontSize: 12 }}>
          Cargando mapa...
        </div>
      )}
      <div ref={ref} style={{ width: "100%", height: "100%", display: ready && !esDefault ? "block" : "none" }} />
    </div>
  );
}

function cargarLeaflet() {
  return new Promise((resolve) => {
    if (window.L) return resolve(window.L);
    if (!document.querySelector('link[href*="leaflet.css"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    if (!document.querySelector('script[src*="leaflet.js"]')) {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => {
        const iv = setInterval(() => {
          if (window.L) { clearInterval(iv); resolve(window.L); }
        }, 50);
      };
      script.onerror = () => resolve(null);
      document.head.appendChild(script);
    } else {
      const iv = setInterval(() => {
        if (window.L) { clearInterval(iv); resolve(window.L); }
      }, 50);
    }
  });
}

function LeafletMapPicker({ lat, lng, onPick, onClose }) {
  const mapRef = useRef(null);
  const mapInst = useRef(null);
  const [ready, setReady] = useState(false);
  const [geocodificando, setGeocodificando] = useState(false);

  useEffect(() => {
    cargarLeaflet().then((L) => { if (L) setReady(true); });
  }, []);

  async function reverseGeocode(lat, lng) {
    setGeocodificando(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&zoom=18`,
        { headers: { "Accept-Language": "es" } }
      );
      const data = await res.json();
      const addr = data?.address || {};
      const calle = addr.road || addr.pedestrian || addr.street || "";
      const numero = addr.house_number || "";
      const direccion = `${calle}${numero ? " #" + numero : ""}`.trim() || data?.display_name?.split(",")[0]?.trim() || "";
      const ciudad = addr.city || addr.town || addr.village || addr.municipality || addr.county || "";
      const depto = addr.state || "";
      return { direccion, ciudad, depto };
    } catch {
      return { direccion: "", ciudad: "", depto: "" };
    } finally {
      setGeocodificando(false);
    }
  }

  useEffect(() => {
    if (!ready || mapInst.current) return;
    const L = window.L;

    const map = L.map(mapRef.current, {
      center: [lat || -16.5, lng || -68.15],
      zoom: lat && lng ? 15 : 6,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker([lat || -16.5, lng || -68.15], { draggable: true }).addTo(map);

    async function handleMove(pos) {
      const info = await reverseGeocode(pos.lat, pos.lng);
      onPick(pos.lat, pos.lng, info.direccion, info.ciudad, info.depto);
    }

    marker.on("dragend", () => { handleMove(marker.getLatLng()); });

    map.on("click", (e) => {
      marker.setLatLng(e.latlng);
      handleMove(e.latlng);
    });

    mapInst.current = map;

    return () => { map.remove(); mapInst.current = null; };
  }, [ready]);

  return (
    <div className="admin-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="admin-modal admin-modal--wide">
        <div className="admin-modal__head">
          <h3 className="admin-modal__title">Seleccionar ubicación</h3>
          <button className="admin-modal__close" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="admin-modal__body" style={{ padding: 0 }}>
          {!ready && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 450, color: "var(--admin-text-3)" }}>
              Cargando mapa...
            </div>
          )}
          {geocodificando && (
            <div style={{ position: "absolute", top: 12, left: 12, zIndex: 1000, background: "var(--admin-card)", padding: "6px 12px", borderRadius: 8, fontSize: 12, color: "var(--admin-text-2)" }}>
              Obteniendo dirección...
            </div>
          )}
          <div ref={mapRef} style={{ width: "100%", height: "450px", display: ready ? "block" : "none" }} />
        </div>
        <div className="admin-modal__foot">
          <button className="admin-btn admin-btn--sec" onClick={onClose}>Cancelar</button>
          <button className="admin-btn admin-btn--pri" onClick={onClose}>
            <CheckCircle size={14} /> Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminSucursales() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [sucursales, setSucursales] = useState([]);
  const [toast, setToast] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    departamento: "La Paz",
    ciudad: "",
    direccion: "",
    latitud: -16.5,
    longitud: -68.15,
    descripcion: "",
    foto: null,
  });
  const [fotoPreview, setFotoPreview] = useState(null);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const stored = sessionStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
    fetchSucursales();
  }, []);

  const fetchSucursales = async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API}/api/admin/sucursales`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { router.push("/login"); return; }
      const json = await res.json();
      if (json.success) setSucursales(json.sucursales);
    } catch {}
  };

  const resetForm = () => {
    setForm({ departamento: "La Paz", ciudad: "", direccion: "", latitud: -16.5, longitud: -68.15, descripcion: "", foto: null });
    setFotoPreview(null);
    setEditId(null);
  };

  const openNew = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (s) => {
    setEditId(s.id_sucursal);
    setForm({
      departamento: s.departamento,
      ciudad: s.ciudad,
      direccion: s.direccion,
      latitud: s.latitud,
      longitud: s.longitud,
      descripcion: s.descripcion || "",
      foto: null,
    });
    setFotoPreview(s.foto_url ? `${API}/${s.foto_url}` : null);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.ciudad || !form.direccion) {
      showToast("Completa ciudad y dirección", false);
      return;
    }
    setSaving(true);
    const token = getToken();
    const fd = new FormData();
    fd.append("departamento", form.departamento);
    fd.append("ciudad", form.ciudad);
    fd.append("direccion", form.direccion);
    fd.append("latitud", form.latitud);
    fd.append("longitud", form.longitud);
    fd.append("descripcion", form.descripcion);
    if (form.foto) fd.append("foto", form.foto);

    try {
      const url = editId
        ? `${API}/api/admin/sucursales/${editId}`
        : `${API}/api/admin/sucursales`;
      const res = await fetch(url, {
        method: editId ? "PUT" : "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const json = await res.json();
      if (res.ok) {
        showToast(json.mensaje, true);
        setShowModal(false);
        resetForm();
        fetchSucursales();
      } else {
        showToast(json.detail || "Error al guardar", false);
      }
    } catch {
      showToast("Error de conexión", false);
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar esta sucursal permanentemente?")) return;
    const token = getToken();
    try {
      const res = await fetch(`${API}/api/admin/sucursales/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      showToast(json.mensaje, res.ok);
      if (res.ok) fetchSucursales();
    } catch {
      showToast("Error al eliminar", false);
    }
  };

  return (
    <div>
      <main>
        <div className="admin-header">
          <div>
            <h1 className="admin-header__title">Sucursales</h1>
            <p className="admin-header__sub">Gestiona las sucursales y ubicaciones</p>
          </div>
          <div className="admin-header__right">
            <button className="admin-btn admin-btn--pri" onClick={openNew}>
              <Plus size={15} /> Nueva Sucursal
            </button>
          </div>
        </div>

        {toast && (
          <div className={`admin-toast ${toast.ok ? "admin-toast--ok" : "admin-toast--fail"}`}>
            {toast.ok ? <CheckCircle size={16} /> : <XCircle size={16} />}
            {toast.msg}
          </div>
        )}

        <div className="admin-card">
          <div className="admin-card__head">
            <h2 className="admin-card__title">Listado de Sucursales</h2>
            <span style={{ color: "var(--admin-text-2)", fontSize: "12px", fontFamily: "var(--font-d)" }}>
              {sucursales.length} registros
            </span>
          </div>
          <div className="admin-card__body" style={{ padding: 0 }}>
            {sucursales.length === 0 ? (
              <div className="admin-empty">
                <MapPin size={40} style={{ opacity: 0.4 }} />
                <div className="admin-empty__txt">No hay sucursales registradas</div>
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Departamento</th>
                      <th>Ciudad</th>
                      <th>Dirección</th>
                      <th>Ubicación</th>
                      <th>Foto</th>
                      <th style={{ width: 100 }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sucursales.map((s) => (
                      <tr key={s.id_sucursal}>
                        <td><strong>{s.departamento}</strong></td>
                        <td>{s.ciudad}</td>
                        <td style={{ maxWidth: 250, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {s.direccion}
                        </td>
                        <td>
                          <span className="admin-badge" style={{ background: "rgba(59,130,246,0.12)", color: "#3b82f6" }}>
                            {s.latitud.toFixed(4)}, {s.longitud.toFixed(4)}
                          </span>
                        </td>
                        <td>
                          {s.foto_url ? (
                            <img src={`${API}/${s.foto_url}`} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: "cover" }} />
                          ) : (
                            <span style={{ color: "var(--admin-text-3)", fontSize: 11 }}>—</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button className="admin-btn admin-btn--sec admin-btn--xs" onClick={() => openEdit(s)}>
                              <Edit3 size={12} />
                            </button>
                            <button className="admin-btn admin-btn--del admin-btn--xs" onClick={() => handleDelete(s.id_sucursal)}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {showModal && (
        <div className="admin-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowModal(false); resetForm(); } }}>
          <div className="admin-modal">
            <div className="admin-modal__head">
              <h3 className="admin-modal__title">{editId ? "Editar Sucursal" : "Nueva Sucursal"}</h3>
              <button className="admin-modal__close" onClick={() => { setShowModal(false); resetForm(); }}><X size={20} /></button>
            </div>
            <div className="admin-modal__body">
              <div className="admin-grid2">
                <div className="admin-col">
                  <div className="admin-form-group">
                    <label className="admin-form-label">Departamento</label>
                    <select
                      className="admin-form-select"
                      value={form.departamento}
                      onChange={(e) => {
                        setForm({ ...form, departamento: e.target.value, ciudad: "" });
                      }}
                    >
                      {DEPARTAMENTOS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">Ciudad</label>
                    <input
                      className="admin-form-input"
                      list="ciudades-list"
                      value={form.ciudad}
                      onChange={(e) => setForm({ ...form, ciudad: e.target.value })}
                      placeholder="Ej: La Paz"
                    />
                    <datalist id="ciudades-list">
                      {(CIUDADES_SUGERIDAS[form.departamento] || []).map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">Dirección</label>
                    <input
                      className="admin-form-input"
                      value={form.direccion}
                      onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                      placeholder="Calle, número, zona..."
                    />
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">Descripción</label>
                    <textarea
                      className="admin-form-textarea"
                      value={form.descripcion}
                      onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                      placeholder="Breve descripción de la sucursal..."
                    />
                  </div>
                </div>

                <div className="admin-col">
                  <div className="admin-form-group">
                    <label className="admin-form-label">Ubicación en el mapa</label>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
                      <input
                        className="admin-form-input"
                        style={{ flex: 1, fontSize: 11 }}
                        value={`${form.latitud.toFixed(6)}, ${form.longitud.toFixed(6)}`}
                        readOnly
                      />
                      <button
                        className="admin-btn admin-btn--sec2 admin-btn--sm"
                        onClick={() => setShowMap(true)}
                      >
                        <MapPin size={13} /> Mapa
                      </button>
                    </div>
                    <MiniMapaPreview lat={form.latitud} lng={form.longitud} />
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">Foto de la sucursal</label>
                    <div
                      onClick={() => fileRef.current?.click()}
                      style={{
                        width: "100%", height: 160,
                        background: "var(--admin-bg-2)", borderRadius: "var(--r-md)",
                        border: "1px dashed var(--admin-border)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", overflow: "hidden",
                        flexDirection: "column", gap: 6,
                      }}
                    >
                      {fotoPreview ? (
                        <img src={fotoPreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <>
                          <Upload size={24} style={{ opacity: 0.3 }} />
                          <span style={{ color: "var(--admin-text-3)", fontSize: 12 }}>Haz clic para subir foto</span>
                        </>
                      )}
                    </div>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setForm({ ...form, foto: file });
                          setFotoPreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="admin-modal__foot">
              <button className="admin-btn admin-btn--sec" onClick={() => { setShowModal(false); resetForm(); }}>Cancelar</button>
              <button className="admin-btn admin-btn--pri" onClick={handleSave} disabled={saving}>
                <Save size={14} /> {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showMap && (
        <LeafletMapPicker
          lat={form.latitud}
          lng={form.longitud}
          onPick={(lat, lng, direccion, ciudad, depto) => setForm({
            ...form, latitud: lat, longitud: lng,
            direccion: direccion || form.direccion,
            ciudad: ciudad || form.ciudad,
            departamento: depto && DEPARTAMENTOS.includes(depto) ? depto : form.departamento,
          })}
          onClose={() => setShowMap(false)}
        />
      )}
    </div>
  );
}
