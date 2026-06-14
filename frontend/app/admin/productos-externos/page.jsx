"use client";

import "@/styles/admin.css";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag, Plus, Pencil, Trash2, Package, ShoppingCart, X, Save, Star, AlertTriangle, Link, Smartphone, Gamepad2, Headphones, Laptop, Camera, Shirt, Home, CookingPot, Bed, Image, Dumbbell, Tent, Gift, Book, Footprints, Circle } from "lucide-react";
import { useAdminCurrency } from "@/lib/AdminCurrencyContext";


const API = "http://localhost:8000";

function getToken() {
  return document.cookie.split("; ").find(r => r.startsWith("access_token="))?.split("=")[1];
}

// ── Colores base ──────────────────────────────────────────────────────────────
const C = {
  warning: "#f59e0b", info: "#3b82f6",
};

// ── Categorías agrupadas ──────────────────────────────────────────────────────
const CATEGORIAS_EXTERNOS = [
  { group: "Electrónico", options: [
    { value: "electronico",  label: "Electrónicos (General)" },
    { value: "gaming",       label: "Gaming"                 },
    { value: "audio",        label: "Audio"                  },
    { value: "celulares",    label: "Celulares"              },
    { value: "computadoras", label: "Computadoras"           },
    { value: "fotografia",   label: "Fotografía"             },
  ]},
  { group: "Ropa", options: [
    { value: "ropa",         label: "Ropa (General)"         },
    { value: "ropa_hombre",  label: "Ropa Hombre"            },
    { value: "ropa_mujer",   label: "Ropa Mujer"             },
    { value: "calzado",      label: "Calzado"                },
    { value: "accesorios",   label: "Accesorios"             },
  ]},
  { group: "Hogar", options: [
    { value: "hogar",        label: "Hogar (General)"        },
    { value: "cocina",       label: "Cocina"                 },
    { value: "dormitorio",   label: "Dormitorio"             },
    { value: "decoracion",   label: "Decoración"             },
  ]},
  { group: "Deportes", options: [
    { value: "deportes",     label: "Deportes (General)"     },
    { value: "fitness",      label: "Fitness"                },
    { value: "futbol",       label: "Fútbol"                 },
    { value: "outdoor",      label: "Outdoor"                },
  ]},
  { group: "Otros", options: [
    { value: "otros",        label: "Otros"                  },
    { value: "juguetes",     label: "Juguetes"               },
    { value: "libros",       label: "Libros"                 },
  ]},
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function detectPlat(url = "") {
  if (url.toLowerCase().includes("amazon")) return "amazon";
  if (url.toLowerCase().includes("ebay"))   return "ebay";
  return "amazon";
}

function PlatBadge({ plat }) {
  const m = {
    amazon:{ bg:"rgba(245,158,11,0.15)", color:C.warning, txt:<> <Package size={12} /> Amazon</> },
    ebay:  { bg:"rgba(59,130,246,0.15)",  color:C.info,    txt:<> <ShoppingCart size={12} /> eBay</>   },
  };
  const p = m[plat] || m.amazon;
  return (
    <span style={{ background:p.bg, color:p.color, padding:"2px 10px",
      borderRadius:10, fontSize:11, fontWeight:700, border:`1px solid ${p.color}40` }}>
      {p.txt}
    </span>
  );
}

// ── Formulario vacío ──────────────────────────────────────────────────────────
const FORM_EMPTY = {
  nombre:"", precio:"", descripcion:"", categoria:"",
  peso:"0.50", enlace:"", imagen:"", destacado:true,
};

// ── Modal Agregar / Editar ────────────────────────────────────────────────────
function ModalForm({ inicial, onClose, onSaved, token }) {
  const esEdicion = !!inicial?.id_producto_exterior;
  const [form,    setForm]    = useState(inicial || FORM_EMPTY);
  const [load,    setLoad]    = useState(false);
  const [preview, setPreview] = useState(inicial?.imagen || "");
  const [platDet, setPlatDet] = useState(detectPlat(inicial?.enlace || ""));

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function onEnlaceChange(v) {
    set("enlace", v);
    setPlatDet(detectPlat(v));
  }

  function onImagenChange(v) {
    set("imagen", v);
    setPreview(v);
  }

  async function guardar() {
    if (!form.nombre || !form.precio || !form.descripcion || !form.categoria || !form.enlace) {
      alert("Completa todos los campos obligatorios (*)");
      return;
    }
    setLoad(true);
    const body = {
      nombre:      form.nombre,
      precio:      parseFloat(form.precio),
      descripcion: form.descripcion,
      categoria:   form.categoria,
      peso:        parseFloat(form.peso) || 0.5,
      enlace:      form.enlace,
      imagen:      form.imagen || "",
      plataforma:  detectPlat(form.enlace),
      destacado:   form.destacado ? 1 : 0,
      estado:      1,
    };

    const url    = esEdicion
      ? `${API}/admin/productos-externos/${inicial.id_producto_exterior}`
      : `${API}/admin/productos-externos`;
    const method = esEdicion ? "PUT" : "POST";

    const r = await fetch(url, {
      method,
      headers: { "Content-Type":"application/json", Authorization:`Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    setLoad(false);
    if (r.ok && (d.success !== false)) {
      onSaved(esEdicion ? "Producto actualizado" : "Producto agregado");
    } else {
      alert(d.detail || d.message || "Error al guardar");
    }
  }

  return (
    <div className="admin-overlay">
      <div className="admin-modal" style={{ maxWidth:640, maxHeight:"92vh", display:"flex", flexDirection:"column" }}>
        <div className="admin-modal__head">
          <h3 className="admin-modal__title">{esEdicion ? <> <Pencil size={16} /> Editar Producto Externo</> : <> <Plus size={16} /> Agregar Producto Externo</>}</h3>
          <button onClick={onClose} className="admin-modal__close"><X size={18} /></button>
        </div>
        <div className="admin-modal__body">

          {/* Nombre + Precio */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label className="admin-form-label">Nombre del Producto *</label>
              <input className="admin-form-input" placeholder="Ej: Sony WH-1000XM4"
                value={form.nombre} onChange={e=>set("nombre", e.target.value)} />
            </div>
            <div>
              <label className="admin-form-label">Precio (USD) *</label>
              <input className="admin-form-input" type="number" step="0.01" placeholder="299.99"
                value={form.precio} onChange={e=>set("precio", e.target.value)} />
            </div>
          </div>

          {/* Descripción */}
          <div className="admin-form-group">
            <label className="admin-form-label">Descripción *</label>
            <textarea className="admin-form-input" style={{ resize:"vertical", minHeight:72 }}
              placeholder="Descripción del producto..."
              value={form.descripcion} onChange={e=>set("descripcion", e.target.value)} />
          </div>

          {/* Categoría + Peso */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label className="admin-form-label">Categoría *</label>
              <select className="admin-form-select" value={form.categoria} onChange={e=>set("categoria", e.target.value)}>
                <option value="">Selecciona una categoría</option>
                {CATEGORIAS_EXTERNOS.map(grupo => (
                  <optgroup key={grupo.group} label={grupo.group}>
                    {grupo.options.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className="admin-form-label">Peso (kg)</label>
              <input className="admin-form-input" type="number" step="0.01" placeholder="0.50"
                value={form.peso} onChange={e=>set("peso", e.target.value)} />
            </div>
          </div>

          {/* Enlace */}
          <div className="admin-form-group">
            <label className="admin-form-label">Enlace del Producto *</label>
            <input className="admin-form-input" type="url"
              placeholder="https://amazon.com/dp/... o https://ebay.com/itm/..."
              value={form.enlace} onChange={e=>onEnlaceChange(e.target.value)} />
            {form.enlace && (
              <div style={{ marginTop:6, display:"flex", alignItems:"center", gap:8 }}>
                <PlatBadge plat={platDet} />
                <span style={{ color:"var(--admin-text-2)", fontSize:11 }}>Plataforma detectada automáticamente</span>
              </div>
            )}
          </div>

          {/* Imagen */}
          <div className="admin-form-group">
            <label className="admin-form-label">URL de Imagen</label>
            <input className="admin-form-input" type="url" placeholder="https://..."
              value={form.imagen} onChange={e=>onImagenChange(e.target.value)} />
            {preview && (
              <img src={preview} alt="preview"
                style={{ marginTop:8, maxWidth:180, maxHeight:130, borderRadius:6,
                  border:"1px solid rgba(154,3,30,0.3)", objectFit:"cover" }}
                onError={e=>{ e.target.style.display="none"; }} />
            )}
          </div>

          {/* Destacado */}
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <input type="checkbox" id="destacado" checked={form.destacado}
              onChange={e=>set("destacado", e.target.checked)}
              style={{ accentColor:"var(--admin-accent)", width:16, height:16, cursor:"pointer" }} />
            <label htmlFor="destacado" style={{ color:"var(--admin-text)", fontSize:13, cursor:"pointer" }}>
              <Star size={14} /> Mostrar como destacado en el dashboard del cliente
            </label>
          </div>
        </div>
        <div className="admin-modal__foot">
          <button onClick={onClose} className="admin-btn admin-btn--sec">Cancelar</button>
          <button onClick={guardar} disabled={load} className="admin-btn admin-btn--pri" style={{ opacity:load?0.7:1 }}>
            {load ? "Guardando..." : (esEdicion ? <> <Save size={14} /> Actualizar</> : <> <Save size={14} /> Guardar</>)}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal confirmar eliminación ───────────────────────────────────────────────
function ModalConfirm({ prod, onClose, onConfirm, load }) {
  return (
    <div className="admin-overlay">
      <div className="admin-modal" style={{ maxWidth:400, display:"flex", flexDirection:"column" }}>
        <div className="admin-modal__head">
          <h3 className="admin-modal__title" style={{ color:"#ef4444" }}><Trash2 size={16} /> Eliminar</h3>
          <button onClick={onClose} className="admin-modal__close"><X size={18} /></button>
        </div>
        <div className="admin-modal__body" style={{ textAlign:"center", padding:"28px 20px" }}>
          <div style={{ marginBottom:12 }}><AlertTriangle size={36} /></div>
          <p style={{ color:"var(--admin-text)", fontSize:14, lineHeight:1.6 }}>
            ¿Eliminar <strong style={{ color:"var(--admin-accent2)" }}>{prod?.nombre}</strong>?<br />
            <span style={{ color:"var(--admin-text-2)", fontSize:12 }}>Esta acción no se puede deshacer.</span>
          </p>
        </div>
        <div className="admin-modal__foot">
          <button onClick={onClose} className="admin-btn admin-btn--sec">Cancelar</button>
          <button onClick={onConfirm} disabled={load}
            className="admin-btn admin-btn--pri" style={{ background:"#ef4444", opacity:load?0.7:1 }}>
            {load ? "Eliminando..." : "Sí, eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── PÁGINA PRINCIPAL ──────────────────────────────────────────────────────────
export default function AdminProductosExternos() {
  const router = useRouter();
  const [user,     setUser]     = useState(null);
  const [prods,    setProds]    = useState([]);
  const [load,     setLoad]     = useState(true);
  const [mAgregar, setMAgregar] = useState(false);
  const [mEditar,  setMEditar]  = useState(null);
  const [mElim,    setMElim]    = useState(null);
  const [elimLoad, setElimLoad] = useState(false);
  const [toast,    setToast]    = useState("");
  const [token,    setToken]    = useState("");
  const { formatPrice } = useAdminCurrency();

  useEffect(() => {
    const stored = sessionStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
    const t = document.cookie.split("; ").find(r => r.startsWith("access_token="))?.split("=")[1];
    if (!t) { router.push("/login"); return; }
    setToken(t);
  }, []);

  const showToast = useCallback((msg) => {
    setToast(msg); setTimeout(() => setToast(""), 3500);
  }, []);

  const fetchProds = useCallback(async () => {
    setLoad(true);
    try {
      const t = getToken();
      const r = await fetch(`${API}/admin/productos-externos`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (r.status === 401 || r.status === 403) { router.push("/login"); return; }
      const d = await r.json();
      setProds(d.productos || d || []);
    } catch (e) { console.error(e); }
    finally { setLoad(false); }
  }, []);

  useEffect(() => { fetchProds(); }, [fetchProds]);

  async function eliminar() {
    if (!mElim) return;
    setElimLoad(true);
    try {
      const t = getToken();
      const r = await fetch(`${API}/admin/productos-externos/${mElim.id_producto_exterior}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${t}` },
      });
      const d = await r.json();
      if (r.ok && d.success !== false) {
        showToast("Producto eliminado");
        setMElim(null);
        fetchProds();
      } else {
        alert(d.detail || d.message || "Error al eliminar");
      }
    } catch (e) { alert("Error de conexión"); }
    finally { setElimLoad(false); }
  }

  function onSaved(msg) {
    showToast(msg);
    setMAgregar(false);
    setMEditar(null);
    fetchProds();
  }

  // Mapa extendido de íconos para todas las categorías
  const CAT_ICONS = {
    electronico:<Smartphone size={14} />, gaming:<Gamepad2 size={14} />, audio:<Headphones size={14} />, celulares:<Smartphone size={14} />,
    computadoras:<Laptop size={14} />, fotografia:<Camera size={14} />,
    ropa:<Shirt size={14} />, ropa_hombre:<Shirt size={14} />, ropa_mujer:<Shirt size={14} />, calzado:<Footprints size={14} />, accesorios:<ShoppingBag size={14} />,
    hogar:<Home size={14} />, cocina:<CookingPot size={14} />, dormitorio:<Bed size={14} />, decoracion:<Image size={14} />,
    deportes:<Circle size={14} />, fitness:<Dumbbell size={14} />, futbol:<Circle size={14} />, outdoor:<Tent size={14} />,
    otros:<Package size={14} />, juguetes:<Gift size={14} />, libros:<Book size={14} />,
  };

  return (
    <>
      {toast && (
        <div className="admin-toast admin-toast--ok">{toast}</div>
      )}

      <main>
        {/* Header */}
        <div className="admin-header">
          <div>
            <h1 className="admin-header__title">
              <ShoppingBag size={20} /> Productos Externos
            </h1>
            <p className="admin-header__sub">
              Amazon & eBay — {prods.length} producto{prods.length !== 1 ? "s" : ""} registrado{prods.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button onClick={() => setMAgregar(true)} className="admin-btn admin-btn--pri">
            <Plus size={16} /> Agregar Producto Externo
          </button>
        </div>

        {/* Tabla */}
        <div className="admin-card">
          {load ? (
            <div style={{ display:"flex", justifyContent:"center", padding:50 }}>
              <div className="admin-spinner" />
            </div>
          ) : (
            <div style={{ overflowX:"auto" }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    {["Producto", "Plataforma", "Categoría", "Precio", "Peso", "Destacado", "Estado", "Acciones"].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {prods.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding:50, textAlign:"center", color:"var(--admin-text-2)" }}>
                        <div style={{ marginBottom:10 }}><Package size={36} /></div>
                        No hay productos externos registrados.<br />
                        <button onClick={() => setMAgregar(true)}
                          className="admin-btn admin-btn--pri" style={{ marginTop:14, fontSize:12 }}>
                          Agregar el primero
                        </button>
                      </td>
                    </tr>
                  ) : prods.map((p, i) => (
                    <tr key={p.id_producto_exterior}
                      style={{ background: i % 2 === 0 ? "rgba(154,3,30,0.03)" : "transparent" }}>

                      {/* Producto */}
                      <td>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <img src={p.imagen || `https://via.placeholder.com/42x42/3a3f47/9a031e?text=${encodeURIComponent((p.nombre||"").slice(0,2))}`}
                            alt={p.nombre}
                            style={{ width:42, height:42, objectFit:"cover", borderRadius:6,
                              border:"1px solid rgba(154,3,30,0.25)", flexShrink:0 }}
                            onError={e=>{ e.target.src=`https://via.placeholder.com/42x42/3a3f47/9a031e?text=IMG`; }} />
                          <div>
                            <div style={{ fontWeight:600, color:"var(--admin-text)" }}>
                              {(p.nombre||"").slice(0,42)}{(p.nombre||"").length>42?"...":""}
                            </div>
                            <div style={{ color:"var(--admin-text-2)", fontSize:11, marginTop:2 }}>
                              {(p.descripcion||"").slice(0,48)}{(p.descripcion||"").length>48?"...":""}
                            </div>
                            {p.enlace && (
                              <a href={p.enlace} target="_blank" rel="noreferrer"
                                style={{ color:"#3b82f6", fontSize:10, textDecoration:"none" }}>
                                <Link size={12} /> Ver original
                              </a>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Plataforma */}
                      <td>
                        <PlatBadge plat={p.plataforma} />
                      </td>

                      {/* Categoría */}
                      <td style={{ color:"var(--admin-text)" }}>
                        {CAT_ICONS[p.categoria] || <Package size={14} />} {p.categoria ? p.categoria.charAt(0).toUpperCase() + p.categoria.slice(1).replace("_", " ") : "—"}
                      </td>

                      {/* Precio */}
                      <td style={{ fontWeight:700, color:"#10b981" }}>
                        {formatPrice(p.precio)}
                      </td>

                      {/* Peso */}
                      <td style={{ color:"var(--admin-text-2)" }}>
                        {parseFloat(p.peso||0).toFixed(2)} kg
                      </td>

                      {/* Destacado */}
                      <td>
                        {p.destacado
                          ? <span style={{ color:"#f59e0b" }}><Star size={14} /></span>
                          : <span style={{ color:"var(--admin-text-3)", fontSize:12 }}>—</span>}
                      </td>

                      {/* Estado */}
                      <td>
                        {p.estado
                          ? <span className="admin-badge" style={{ background:"rgba(16,185,129,0.15)", color:"#10b981", border:"1px solid rgba(16,185,129,0.3)" }}>Activo</span>
                          : <span className="admin-badge" style={{ background:"rgba(239,68,68,0.15)", color:"#ef4444", border:"1px solid rgba(239,68,68,0.3)" }}>Inactivo</span>}
                      </td>

                      {/* Acciones */}
                      <td>
                        <div style={{ display:"flex", gap:6 }}>
                          <button onClick={() => setMEditar(p)}
                            className="admin-btn admin-btn--xs admin-btn--sec2"
                            title="Editar"><Pencil size={14} /></button>
                          <button onClick={() => setMElim(p)}
                            className="admin-btn admin-btn--xs admin-btn--del"
                            title="Eliminar"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal agregar */}
      {mAgregar && (
        <ModalForm token={token} onClose={() => setMAgregar(false)} onSaved={onSaved} />
      )}

      {/* Modal editar */}
      {mEditar && (
        <ModalForm token={token} inicial={mEditar}
          onClose={() => setMEditar(null)} onSaved={onSaved} />
      )}

      {/* Modal eliminar */}
      {mElim && (
        <ModalConfirm prod={mElim} load={elimLoad}
          onClose={() => setMElim(null)} onConfirm={eliminar} />
      )}
    </>
  );
}
