"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";


const API = "http://localhost:8000";

function getToken() {
  return document.cookie.split("; ").find(r => r.startsWith("access_token="))?.split("=")[1];
}

// ── Estilos base ──────────────────────────────────────────────────────────────
const C = {
  bg: "#121418", card: "#1f2429", accent: "#9a031e", accent2: "#c1121f",
  text: "#d9d9d9", muted: "#a0a0a0", success: "#10b981", warning: "#f59e0b",
  danger: "#ef4444", info: "#3b82f6",
};

const ov   = { position:"fixed", inset:0, background:"rgba(0,0,0,0.82)", zIndex:1000,
  display:"flex", alignItems:"center", justifyContent:"center", padding:20 };
const mBox = { background:C.card, border:`2px solid ${C.accent}`, borderRadius:16,
  width:"100%", maxWidth:640, maxHeight:"92vh", display:"flex", flexDirection:"column" };
const mHd  = { display:"flex", justifyContent:"space-between", alignItems:"center",
  padding:"16px 20px", borderBottom:`2px solid ${C.accent}`, background:C.bg, flexShrink:0 };
const mBd  = { padding:20, overflowY:"auto", flex:1 };
const mFt  = { display:"flex", justifyContent:"flex-end", gap:10, padding:"14px 20px",
  borderTop:`1px solid rgba(154,3,30,0.2)`, background:C.bg, flexShrink:0 };
const mTit = { margin:0, color:C.accent2, fontSize:15, fontWeight:700 };
const btnX = { background:"transparent", border:"none", color:C.muted, cursor:"pointer", fontSize:18 };
const btnP = { padding:"9px 20px", background:C.accent, border:"none", borderRadius:8,
  color:"#fff", fontWeight:600, fontSize:13, cursor:"pointer" };
const btnS = { padding:"9px 20px", background:"rgba(154,3,30,0.1)",
  border:"1px solid rgba(154,3,30,0.3)", borderRadius:8,
  color:C.text, fontWeight:600, fontSize:13, cursor:"pointer" };
const lbl  = { display:"block", color:C.muted, fontSize:12, marginBottom:5, fontWeight:600 };
const inp  = { width:"100%", padding:"9px 12px", background:C.bg,
  border:"2px solid rgba(154,3,30,0.2)", borderRadius:6, color:C.text,
  fontSize:13, outline:"none", boxSizing:"border-box" };
const sel  = { width:"100%", padding:"9px 12px", background:C.bg,
  border:"2px solid rgba(154,3,30,0.2)", borderRadius:6, color:C.text,
  fontSize:13, outline:"none", boxSizing:"border-box" };

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
    amazon:{ bg:"rgba(245,158,11,0.15)", color:C.warning, txt:"📦 Amazon" },
    ebay:  { bg:"rgba(59,130,246,0.15)",  color:C.info,    txt:"🛒 eBay"   },
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
      onSaved(esEdicion ? "✅ Producto actualizado" : "✅ Producto agregado");
    } else {
      alert(d.detail || d.message || "Error al guardar");
    }
  }

  return (
    <div style={ov}>
      <div style={mBox}>
        <div style={mHd}>
          <h3 style={mTit}>{esEdicion ? "✏️ Editar Producto Externo" : "➕ Agregar Producto Externo"}</h3>
          <button onClick={onClose} style={btnX}>✕</button>
        </div>
        <div style={mBd}>

          {/* Nombre + Precio */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
            <div>
              <label style={lbl}>Nombre del Producto *</label>
              <input style={inp} placeholder="Ej: Sony WH-1000XM4"
                value={form.nombre} onChange={e=>set("nombre", e.target.value)} />
            </div>
            <div>
              <label style={lbl}>Precio (USD) *</label>
              <input style={inp} type="number" step="0.01" placeholder="299.99"
                value={form.precio} onChange={e=>set("precio", e.target.value)} />
            </div>
          </div>

          {/* Descripción */}
          <div style={{ marginBottom:14 }}>
            <label style={lbl}>Descripción *</label>
            <textarea style={{ ...inp, resize:"vertical", minHeight:72 }}
              placeholder="Descripción del producto..."
              value={form.descripcion} onChange={e=>set("descripcion", e.target.value)} />
          </div>

          {/* Categoría + Peso */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
            <div>
              <label style={lbl}>Categoría *</label>
              <select style={sel} value={form.categoria} onChange={e=>set("categoria", e.target.value)}>
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
              <label style={lbl}>Peso (kg)</label>
              <input style={inp} type="number" step="0.01" placeholder="0.50"
                value={form.peso} onChange={e=>set("peso", e.target.value)} />
            </div>
          </div>

          {/* Enlace */}
          <div style={{ marginBottom:14 }}>
            <label style={lbl}>Enlace del Producto *</label>
            <input style={inp} type="url"
              placeholder="https://amazon.com/dp/... o https://ebay.com/itm/..."
              value={form.enlace} onChange={e=>onEnlaceChange(e.target.value)} />
            {form.enlace && (
              <div style={{ marginTop:6, display:"flex", alignItems:"center", gap:8 }}>
                <PlatBadge plat={platDet} />
                <span style={{ color:C.muted, fontSize:11 }}>Plataforma detectada automáticamente</span>
              </div>
            )}
          </div>

          {/* Imagen */}
          <div style={{ marginBottom:14 }}>
            <label style={lbl}>URL de Imagen</label>
            <input style={inp} type="url" placeholder="https://..."
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
              style={{ accentColor:C.accent, width:16, height:16, cursor:"pointer" }} />
            <label htmlFor="destacado" style={{ color:C.text, fontSize:13, cursor:"pointer" }}>
              ⭐ Mostrar como destacado en el dashboard del cliente
            </label>
          </div>
        </div>
        <div style={mFt}>
          <button onClick={onClose} style={btnS}>Cancelar</button>
          <button onClick={guardar} disabled={load} style={{ ...btnP, opacity:load?0.7:1 }}>
            {load ? "Guardando..." : (esEdicion ? "💾 Actualizar" : "💾 Guardar")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal confirmar eliminación ───────────────────────────────────────────────
function ModalConfirm({ prod, onClose, onConfirm, load }) {
  return (
    <div style={ov}>
      <div style={{ ...mBox, maxWidth:400 }}>
        <div style={mHd}>
          <h3 style={{ ...mTit, color:C.danger }}>🗑️ Eliminar Producto</h3>
          <button onClick={onClose} style={btnX}>✕</button>
        </div>
        <div style={{ ...mBd, textAlign:"center", padding:"28px 20px" }}>
          <div style={{ fontSize:36, marginBottom:12 }}>⚠️</div>
          <p style={{ color:C.text, fontSize:14, lineHeight:1.6 }}>
            ¿Eliminar <strong style={{ color:C.accent2 }}>{prod?.nombre}</strong>?<br />
            <span style={{ color:C.muted, fontSize:12 }}>Esta acción no se puede deshacer.</span>
          </p>
        </div>
        <div style={mFt}>
          <button onClick={onClose} style={btnS}>Cancelar</button>
          <button onClick={onConfirm} disabled={load}
            style={{ ...btnP, background:C.danger, opacity:load?0.7:1 }}>
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
        showToast("🗑️ Producto eliminado");
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
    electronico:"📱", gaming:"🎮", audio:"🎧", celulares:"📲",
    computadoras:"💻", fotografia:"📷",
    ropa:"👕", ropa_hombre:"👔", ropa_mujer:"👗", calzado:"👟", accesorios:"👜",
    hogar:"🏠", cocina:"🍳", dormitorio:"🛏️", decoracion:"🖼️",
    deportes:"⚽", fitness:"🏋️", futbol:"⚽", outdoor:"🏕️",
    otros:"📦", juguetes:"🧸", libros:"📚",
  };

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"'Lato',sans-serif" }}>
      {toast && (
        <div style={{ position:"fixed", top:20, right:20, background:C.card,
          border:`1px solid ${C.success}`, borderRadius:10, padding:"12px 20px",
          color:C.success, fontWeight:600, fontSize:14, zIndex:9999,
          boxShadow:"0 4px 20px rgba(0,0,0,0.5)" }}>{toast}</div>
      )}

      <main style={{ flex:1, padding:"24px 28px" }}>
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
          marginBottom:24, paddingBottom:16, borderBottom:`2px solid ${C.accent}`,
          flexWrap:"wrap", gap:12 }}>
          <div>
            <h1 style={{ color:C.accent2, fontSize:26, fontWeight:700, margin:0 }}>
              🛍️ Productos Externos
            </h1>
            <p style={{ color:C.muted, fontSize:13, margin:"4px 0 0" }}>
              Amazon & eBay — {prods.length} producto{prods.length !== 1 ? "s" : ""} registrado{prods.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button onClick={() => setMAgregar(true)} style={btnP}>
            ➕ Agregar Producto Externo
          </button>
        </div>

        {/* Tabla */}
        <div style={{ background:C.card, borderRadius:12, border:"1px solid rgba(154,3,30,0.2)", overflow:"hidden" }}>
          {load ? (
            <div style={{ display:"flex", justifyContent:"center", padding:50 }}>
              <div style={{ width:36, height:36, border:"3px solid rgba(154,3,30,0.3)",
                borderTop:`3px solid ${C.accent}`, borderRadius:"50%",
                animation:"spin 0.8s linear infinite" }} />
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : (
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr>
                    {["Producto", "Plataforma", "Categoría", "Precio", "Peso", "Destacado", "Estado", "Acciones"].map(h => (
                      <th key={h} style={{ padding:"12px 14px", textAlign:"left", color:C.muted,
                        fontWeight:700, fontSize:11, textTransform:"uppercase", letterSpacing:0.8,
                        background:C.bg, borderBottom:`2px solid rgba(154,3,30,0.3)` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {prods.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding:50, textAlign:"center", color:C.muted }}>
                        <div style={{ fontSize:36, marginBottom:10 }}>📭</div>
                        No hay productos externos registrados.<br />
                        <button onClick={() => setMAgregar(true)}
                          style={{ ...btnP, marginTop:14, fontSize:12 }}>
                          Agregar el primero
                        </button>
                      </td>
                    </tr>
                  ) : prods.map((p, i) => (
                    <tr key={p.id_producto_exterior}
                      style={{ background: i % 2 === 0 ? "rgba(154,3,30,0.03)" : "transparent",
                        borderBottom:"1px solid rgba(154,3,30,0.07)" }}>

                      {/* Producto */}
                      <td style={{ padding:"10px 14px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <img src={p.imagen || `https://via.placeholder.com/42x42/1f2429/9a031e?text=${encodeURIComponent((p.nombre||"").slice(0,2))}`}
                            alt={p.nombre}
                            style={{ width:42, height:42, objectFit:"cover", borderRadius:6,
                              border:"1px solid rgba(154,3,30,0.25)", flexShrink:0 }}
                            onError={e=>{ e.target.src=`https://via.placeholder.com/42x42/1f2429/9a031e?text=IMG`; }} />
                          <div>
                            <div style={{ fontWeight:600, color:C.text }}>
                              {(p.nombre||"").slice(0,42)}{(p.nombre||"").length>42?"...":""}
                            </div>
                            <div style={{ color:C.muted, fontSize:11, marginTop:2 }}>
                              {(p.descripcion||"").slice(0,48)}{(p.descripcion||"").length>48?"...":""}
                            </div>
                            {p.enlace && (
                              <a href={p.enlace} target="_blank" rel="noreferrer"
                                style={{ color:C.info, fontSize:10, textDecoration:"none" }}>
                                🔗 Ver original
                              </a>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Plataforma */}
                      <td style={{ padding:"10px 14px" }}>
                        <PlatBadge plat={p.plataforma} />
                      </td>

                      {/* Categoría */}
                      <td style={{ padding:"10px 14px", color:C.text }}>
                        {CAT_ICONS[p.categoria] || "📦"} {p.categoria ? p.categoria.charAt(0).toUpperCase() + p.categoria.slice(1).replace("_", " ") : "—"}
                      </td>

                      {/* Precio */}
                      <td style={{ padding:"10px 14px", fontWeight:700, color:C.success }}>
                        ${parseFloat(p.precio||0).toFixed(2)}
                      </td>

                      {/* Peso */}
                      <td style={{ padding:"10px 14px", color:C.muted }}>
                        {parseFloat(p.peso||0).toFixed(2)} kg
                      </td>

                      {/* Destacado */}
                      <td style={{ padding:"10px 14px" }}>
                        {p.destacado
                          ? <span style={{ color:C.warning, fontSize:14 }}>⭐</span>
                          : <span style={{ color:"#444", fontSize:12 }}>—</span>}
                      </td>

                      {/* Estado */}
                      <td style={{ padding:"10px 14px" }}>
                        {p.estado
                          ? <span style={{ background:"rgba(16,185,129,0.15)", color:C.success,
                              padding:"2px 10px", borderRadius:10, fontSize:11, fontWeight:700,
                              border:"1px solid rgba(16,185,129,0.3)" }}>Activo</span>
                          : <span style={{ background:"rgba(239,68,68,0.15)", color:C.danger,
                              padding:"2px 10px", borderRadius:10, fontSize:11, fontWeight:700,
                              border:"1px solid rgba(239,68,68,0.3)" }}>Inactivo</span>}
                      </td>

                      {/* Acciones */}
                      <td style={{ padding:"10px 14px" }}>
                        <div style={{ display:"flex", gap:6 }}>
                          <button onClick={() => setMEditar(p)}
                            style={{ padding:"5px 10px", background:"rgba(59,130,246,0.12)",
                              border:"1px solid rgba(59,130,246,0.3)", borderRadius:6,
                              color:C.info, cursor:"pointer", fontSize:13 }}
                            title="Editar">✏️</button>
                          <button onClick={() => setMElim(p)}
                            style={{ padding:"5px 10px", background:"rgba(239,68,68,0.12)",
                              border:"1px solid rgba(239,68,68,0.3)", borderRadius:6,
                              color:C.danger, cursor:"pointer", fontSize:13 }}
                            title="Eliminar">🗑️</button>
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
    </div>
  );
}