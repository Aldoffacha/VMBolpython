"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ClienteSidebar from "@/components/ClienteSidebar";

const API = "http://localhost:8000";
const C = {
  pageBg:"#121418", cardBg:"#1f2429", accent:"#2563eb", accent2:"#3b82f6",
  text:"#d9d9d9", muted:"#a0a0a0", success:"#10b981", warning:"#f59e0b",
  danger:"#ef4444", indigo:"#6366f1",
};

const IMPUESTOS = { electronico:0.30, ropa:0.20, hogar:0.15, deportes:0.25, otros:0.18 };
function calcImport(precio, peso=0.5, cat="otros", tc=9.17) {
  const flete  = Math.max(15, peso * 3);
  const seguro = precio * 0.02;
  const aduana = precio * (IMPUESTOS[cat]??0.18);
  const alm    = 135 / tc;
  return precio + flete + seguro + aduana + alm;
}

const fmt = n => `$${parseFloat(n||0).toFixed(2)}`;

// ── Productos simulados de Amazon/eBay (fallback igual que dashboard) ─────────
const PRODUCTOS_SIMULADOS = [
  {
    id_producto_exterior: "amz001",
    id_producto_externo: "amz001",
    nombre: "Razer DeathAdder Essential - Mouse Gaming",
    descripcion: "Mouse gaming Razer con sensor óptico de 6400 DPI, 5 botones programables y diseño ergonómico para diestros.",
    precio: 29.99, peso: 0.3, categoria: "electronico", stock: 15,
    plataforma: "amazon",
    imagen: "https://images.unsplash.com/photo-1527814050087-3793815479db?w=400&h=300&fit=crop",
    imagen_url: "https://images.unsplash.com/photo-1527814050087-3793815479db?w=400&h=300&fit=crop",
    enlace: "https://amazon.com/dp/B07QSCM51V",
  },
  {
    id_producto_exterior: "amz002",
    id_producto_externo: "amz002",
    nombre: "Sony WH-1000XM4 - Audífonos Inalámbricos",
    descripcion: "Audífonos noise canceling con sonido de alta resolución, 30 horas de batería y asistente de voz integrado.",
    precio: 348.00, peso: 0.6, categoria: "electronico", stock: 8,
    plataforma: "amazon",
    imagen: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop",
    imagen_url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop",
    enlace: "https://amazon.com/dp/B0863TXGM3",
  },
  {
    id_producto_exterior: "eby001",
    id_producto_externo: "eby001",
    nombre: "Logitech G Pro X - Headset Gaming",
    descripcion: "Headset gaming con sonido surround 7.1, micrófono desmontable Blue Voice y memoria integrada para perfiles.",
    precio: 89.99, peso: 0.4, categoria: "electronico", stock: 10,
    plataforma: "ebay",
    imagen: "https://images.unsplash.com/photo-1599669454699-248893623440?w=400&h=300&fit=crop",
    imagen_url: "https://images.unsplash.com/photo-1599669454699-248893623440?w=400&h=300&fit=crop",
    enlace: "https://ebay.com/itm/Logitech-G-PRO-X-Gaming-Headset",
  },
  {
    id_producto_exterior: "eby002",
    id_producto_externo: "eby002",
    nombre: "SteelSeries Apex Pro - Teclado Mecánico",
    descripcion: "Teclado gaming mecánico con switches ajustables OmniPoint, iluminación RGB y reposamuñecas magnético.",
    precio: 179.99, peso: 1.2, categoria: "electronico", stock: 6,
    plataforma: "ebay",
    imagen: "https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=400&h=300&fit=crop",
    imagen_url: "https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=400&h=300&fit=crop",
    enlace: "https://ebay.com/itm/SteelSeries-Apex-Pro-TKL-Gaming-Keyboard",
  },
];

// ── Estilos compartidos ────────────────────────────────────────────────────────
const ov    = { position:"fixed", inset:0, background:"rgba(0,0,0,0.78)", display:"flex",
  alignItems:"center", justifyContent:"center", zIndex:9000, padding:"20px" };
const mWrap = { background:C.cardBg, borderRadius:"12px", width:"100%", maxWidth:"640px",
  border:`2px solid ${C.accent}`, boxShadow:"0 20px 60px rgba(0,0,0,0.6)", overflow:"hidden",
  maxHeight:"92vh", display:"flex", flexDirection:"column" };
const mHead = { display:"flex", justifyContent:"space-between", alignItems:"center",
  padding:"16px 20px", borderBottom:`2px solid ${C.accent}`, background:C.pageBg, flexShrink:0 };
const mTitle= { margin:0, color:C.accent2, fontFamily:"Cinzel,serif", fontSize:"15px", fontWeight:"700" };
const mFoot = { display:"flex", justifyContent:"flex-end", gap:"10px",
  padding:"14px 20px", borderTop:`1px solid rgba(37,99,235,0.15)`, background:C.pageBg, flexShrink:0 };
const mBody = { padding:"20px", overflowY:"auto", flex:1 };
const btnX  = { background:"transparent", border:"none", color:C.muted, cursor:"pointer", fontSize:"18px" };
const btnPri= { background:C.accent, border:"none", color:"#fff", padding:"9px 22px",
  borderRadius:"8px", cursor:"pointer", fontWeight:"700", fontSize:"13px",
  boxShadow:`0 2px 8px rgba(37,99,235,0.35)`, textDecoration:"none", display:"inline-block" };
const btnSec= { background:"transparent", border:`1px solid #444`, color:C.muted,
  padding:"9px 22px", borderRadius:"8px", cursor:"pointer", fontWeight:"600", fontSize:"13px" };
const btnQty= { background:`rgba(37,99,235,0.12)`, border:`1px solid ${C.accent}`, color:C.accent2,
  width:"32px", height:"32px", borderRadius:"6px", cursor:"pointer", fontWeight:"800", fontSize:"16px",
  display:"flex", alignItems:"center", justifyContent:"center" };
const lbl_  = { display:"block", color:C.muted, fontSize:"12px", marginBottom:"5px", fontWeight:"600" };
const inp_  = { width:"100%", padding:"9px 12px", background:C.pageBg,
  border:`2px solid rgba(37,99,235,0.18)`, borderRadius:"6px", color:C.text,
  fontSize:"13px", outline:"none", boxSizing:"border-box" };
const sel_  = { width:"100%", padding:"9px 12px", background:C.pageBg,
  border:`2px solid rgba(37,99,235,0.18)`, borderRadius:"6px", color:C.text,
  fontSize:"13px", outline:"none", boxSizing:"border-box" };

const PLATAFORMAS = [
  { value:"",       label:"Todas las plataformas" },
  { value:"local",  label:"🏠 Tienda Local" },
  { value:"amazon", label:"📦 Amazon" },
  { value:"ebay",   label:"🛒 eBay" },
];
const CATEGORIAS = [
  { value:"",           label:"Todas las categorías" },
  { value:"electronico",label:"📱 Electrónico" },
  { value:"ropa",       label:"👕 Ropa" },
  { value:"hogar",      label:"🏠 Hogar" },
  { value:"deportes",   label:"⚽ Deportes" },
  { value:"otros",      label:"📦 Otros" },
];

const DIMS_MAP = {
  "20x15x1":  { l:20, a:15, h:1  },
  "20x15x15": { l:20, a:15, h:15 },
  "25x15x15": { l:25, a:15, h:15 },
  "30x20x20": { l:30, a:20, h:20 },
  "35x20x20": { l:35, a:20, h:20 },
  "50x40x10": { l:50, a:40, h:10 },
  "60x60x60": { l:60, a:60, h:60 },
};

// ── Badge de plataforma ───────────────────────────────────────────────────────
function PlatBadge({ plat }) {
  const m = {
    amazon:{ bg:C.warning, col:"#000", txt:"Amazon" },
    ebay:  { bg:C.accent2, col:"#fff", txt:"eBay"   },
    local: { bg:C.success, col:"#fff", txt:"Local"  },
  };
  const p = m[plat||"local"] || m.local;
  return (
    <span style={{ background:p.bg, color:p.col, padding:"3px 8px",
      borderRadius:"10px", fontSize:"10px", fontWeight:"700" }}>{p.txt}</span>
  );
}

// ── Card de producto ──────────────────────────────────────────────────────────
function ProdCard({ prod, tc, onVer }) {
  const total = calcImport(parseFloat(prod.precio||0), prod.peso||0.5, prod.categoria||"otros", tc);
  const img   = prod.imagen_url||prod.imagen||"";
  const [hov, setHov] = useState(false);

  return (
    <div
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ background:C.cardBg, borderRadius:"12px", overflow:"hidden",
        border:`1px solid ${hov ? C.accent2 : "rgba(37,99,235,0.12)"}`,
        boxShadow:hov?"0 8px 20px rgba(37,99,235,0.15)":"0 2px 8px rgba(0,0,0,0.08)",
        transition:"all 0.25s", display:"flex", flexDirection:"column",
        transform:hov?"translateY(-4px)":"none" }}>
      <div style={{ position:"relative", height:"160px", background:"#0d1117", flexShrink:0 }}>
        <img
          src={img||`https://via.placeholder.com/280x160/0d1117/3b82f6?text=${encodeURIComponent((prod.nombre||"").slice(0,12))}`}
          alt={prod.nombre}
          style={{ width:"100%", height:"100%", objectFit:"cover" }}
          onError={e=>{ e.target.onerror=null; e.target.src=`https://via.placeholder.com/280x160/0d1117/3b82f6?text=Sin+Imagen`; }}
        />
        <div style={{ position:"absolute", top:8, left:8 }}><PlatBadge plat={prod.plataforma} /></div>
        <span style={{ position:"absolute", top:8, right:8, background:"rgba(18,20,24,0.85)",
          color:C.accent2, padding:"3px 8px", borderRadius:"10px", fontSize:"11px", fontWeight:"800",
          border:`1px solid ${C.accent}` }}>{fmt(prod.precio)}</span>
      </div>
      <div style={{ padding:"13px", flex:1, display:"flex", flexDirection:"column" }}>
        <div style={{ color:C.text, fontWeight:"700", fontSize:"13px", marginBottom:"5px", lineHeight:"1.3" }}>
          {(prod.nombre||"").slice(0,55)}{(prod.nombre||"").length>55?"...":""}
        </div>
        <div style={{ color:C.muted, fontSize:"11px", marginBottom:"auto", lineHeight:"1.4" }}>
          {(prod.descripcion||"Sin descripción").slice(0,65)}...
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", margin:"10px 0" }}>
          <span style={{ color:C.muted, fontSize:"11px" }}>Con importación:</span>
          <strong style={{ color:C.success, fontSize:"13px" }}>{fmt(total)}</strong>
        </div>
        <button onClick={()=>onVer(prod)} style={{
          width:"100%", padding:"8px",
          background:`linear-gradient(135deg,${C.accent},${C.accent2})`,
          border:"none", borderRadius:"7px", color:"#fff", cursor:"pointer",
          fontWeight:"700", fontSize:"12px", boxShadow:`0 2px 8px rgba(37,99,235,0.3)`,
        }}>Ver Detalle</button>
      </div>
    </div>
  );
}

// ── Modal detalle (igual que antes) ──────────────────────────────────────────
function ModalDetalle({ prod, tc, token, onClose, onSuccess }) {
  const [qty,  setQty]  = useState(1);
  const [load, setLoad] = useState(false);
  if (!prod) return null;

  const esExt  = prod.plataforma && prod.plataforma !== "local";
  const img    = prod.imagen_url||prod.imagen||"";
  const cat    = prod.categoria||"otros";
  const peso   = prod.peso||0.5;
  const precio = parseFloat(prod.precio||0);
  const flete  = Math.max(15, peso * 3);
  const seguro = precio * 0.02;
  const aduana = precio * (IMPUESTOS[cat]??0.18);
  const alm    = 135 / tc;
  const tot1   = precio + flete + seguro + aduana + alm;

  async function agregar() {
    setLoad(true);
    const body = esExt
      ? { tipo:"externo",
          id_producto_externo: prod.id_producto_externo || prod.id_producto_exterior || String(prod.id_producto||""),
          nombre:prod.nombre, precio:prod.precio, peso:prod.peso||0.5,
          categoria:prod.categoria||"electronico", plataforma:prod.plataforma,
          url:prod.enlace||"", cantidad:qty }
      : { tipo:"local", id_producto:prod.id_producto, cantidad:qty };

    const r = await fetch(`${API}/cliente/carrito/agregar`,{
      method:"POST", headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`},
      body:JSON.stringify(body) });
    const d = await r.json(); setLoad(false);
    d.success ? (onSuccess(d.message), onClose()) : alert(d.detail||d.message||"Error");
  }

  return (
    <div style={ov}>
      <div style={mWrap}>
        <div style={mHead}>
          <h3 style={mTitle}>🛍️ Detalle del Producto</h3>
          <button onClick={onClose} style={btnX}>✕</button>
        </div>
        <div style={mBody}>
          <div style={{ display:"flex", gap:"20px", flexWrap:"wrap", marginBottom:"18px" }}>
            <img src={img} alt={prod.nombre}
              style={{ width:160, height:160, objectFit:"cover", borderRadius:"10px",
                border:`2px solid rgba(37,99,235,0.25)`, flexShrink:0 }}
              onError={e=>{ e.target.onerror=null; e.target.src="https://via.placeholder.com/160x160/0d1117/3b82f6?text=IMG"; }} />
            <div style={{ flex:1, minWidth:200 }}>
              <div style={{ marginBottom:"8px" }}><PlatBadge plat={prod.plataforma} /></div>
              <h3 style={{ color:C.text, margin:"0 0 8px", fontSize:"16px", lineHeight:"1.35" }}>{prod.nombre}</h3>
              <div style={{ color:C.accent2, fontSize:"24px", fontWeight:"800", marginBottom:"8px" }}>{fmt(prod.precio)}</div>
              <div style={{ color:C.muted, fontSize:"12px", lineHeight:"1.5", marginBottom:"10px" }}>
                {prod.descripcion||"Sin descripción"}
              </div>
              {prod.enlace && (
                <a href={prod.enlace} target="_blank" rel="noreferrer"
                  style={{ color:C.accent, fontSize:"12px", textDecoration:"none" }}>
                  🔗 Ver en tienda original →
                </a>
              )}
            </div>
          </div>

          {/* Desglose */}
          <div style={{ background:C.pageBg, borderRadius:"10px", padding:"16px",
            border:`1px solid rgba(37,99,235,0.2)`, marginBottom:"18px" }}>
            <div style={{ color:C.accent2, fontWeight:"700", marginBottom:"12px", fontSize:"13px" }}>
              📊 Costo de Importación a Bolivia
            </div>
            {[
              ["Precio del producto",     precio],
              ["Flete internacional",     flete],
              ["Seguro (2%)",             seguro],
              ["Arancel aduanal",         aduana],
              ["Almacén Miami (Bs.135)",  alm],
            ].map(([k,v]) => (
              <div key={k} style={{ display:"flex", justifyContent:"space-between", marginBottom:"5px" }}>
                <span style={{ color:C.muted, fontSize:"12px" }}>{k}:</span>
                <span style={{ color:C.text, fontSize:"12px", fontWeight:"600" }}>{fmt(v)}</span>
              </div>
            ))}
            <div style={{ borderTop:`2px solid ${C.accent}`, paddingTop:"10px", marginTop:"10px",
              display:"flex", justifyContent:"space-between" }}>
              <span style={{ color:C.text, fontWeight:"800" }}>TOTAL × {qty}:</span>
              <span style={{ color:C.success, fontWeight:"800", fontSize:"18px" }}>{fmt(tot1*qty)}</span>
            </div>
          </div>

          {/* Cantidad */}
          <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
            <span style={{ color:C.muted, fontSize:"13px" }}>Cantidad:</span>
            <button onClick={()=>setQty(q=>Math.max(1,q-1))} style={btnQty}>−</button>
            <span style={{ color:C.text, fontWeight:"800", fontSize:"16px",
              minWidth:"24px", textAlign:"center" }}>{qty}</span>
            <button onClick={()=>setQty(q=>Math.min(10,q+1))} style={btnQty}>+</button>
          </div>
        </div>
        <div style={mFoot}>
          <button onClick={onClose} style={btnSec}>Cancelar</button>
          <button onClick={agregar} disabled={load} style={{ ...btnPri, opacity:load?0.7:1 }}>
            {load ? "Agregando..." : "🛒 Agregar al Carrito"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ✅ NUEVO: Modal "Agregar Producto por Link" ───────────────────────────────
function ModalAgregarLink({ tc, token, onClose, onSuccess }) {
  const [form, setForm] = useState({
    url:"", nombre:"", precio:"", peso:"0.5",
    categoria:"electronico", tamano:"20x15x1",
  });
  const [cotizacion, setCotizacion] = useState(null);
  const [load, setLoad] = useState(false);
  const [loadInfo, setLoadInfo] = useState(false);
  const [ok, setOk] = useState("");

  // Detectar plataforma desde URL
  const plataforma = form.url.includes("amazon") ? "amazon"
    : form.url.includes("ebay") ? "ebay" : "otros";

  // Calcular cotización localmente (igual que el PHP)
  function calcular() {
    const precio = parseFloat(form.precio);
    const peso   = parseFloat(form.peso);
    if (!precio || !peso || precio <= 0 || peso <= 0) {
      alert("Ingresa precio y peso válidos");
      return;
    }
    const dims  = DIMS_MAP[form.tamano] || { l:20, a:15, h:1 };
    const imp   = IMPUESTOS[form.categoria] ?? 0.18;
    const flete = Math.max(15, peso * 3);
    const seg   = precio * 0.02;
    const adu   = precio * imp;
    // Tabla almacén igual que calcImport pero usando dims para Bs
    const almBsMap = {
      "20x15x1":135,"20x15x15":180,"25x15x15":225,"30x20x20":270,
      "35x20x20":360,"50x40x10":450,"60x60x60":1800,
    };
    const almBs = almBsMap[form.tamano] || 135;
    const alm   = almBs / tc;
    const total = precio + flete + seg + adu + alm;
    setCotizacion({ total, flete, seg, adu, alm, almBs, precio });
  }

  async function agregar() {
    if (!cotizacion) { calcular(); return; }
    if (!form.url) { alert("Ingresa la URL del producto"); return; }
    const nombre = form.nombre || `Producto de ${plataforma}`;
    setLoad(true);
    const body = {
      tipo: "externo",
      id_producto_externo: `link_${Date.now()}`,
      nombre,
      precio: parseFloat(form.precio),
      peso: parseFloat(form.peso),
      categoria: form.categoria,
      plataforma,
      url: form.url,
      cantidad: 1,
    };
    const r = await fetch(`${API}/cliente/carrito/agregar`, {
      method:"POST", headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`},
      body: JSON.stringify(body),
    });
    const d = await r.json(); setLoad(false);
    if (d.success) {
      setOk("✅ Producto agregado al carrito");
      setTimeout(() => { onSuccess(d.message); onClose(); }, 1400);
    } else {
      alert(d.detail || d.message || "Error al agregar");
    }
  }

  return (
    <div style={ov}>
      <div style={{ ...mWrap, maxWidth:"600px" }}>
        <div style={mHead}>
          <h3 style={mTitle}>🌐 Agregar Producto por Link</h3>
          <button onClick={onClose} style={btnX}>✕</button>
        </div>
        <div style={mBody}>
          {ok && (
            <div style={{ background:C.success, color:"#fff", padding:"10px 14px",
              borderRadius:"6px", marginBottom:"14px", fontWeight:"600" }}>{ok}</div>
          )}

          {/* Info */}
          <div style={{ background:`rgba(37,99,235,0.08)`, borderRadius:"8px", padding:"12px 14px",
            border:`1px solid rgba(37,99,235,0.2)`, marginBottom:"16px", fontSize:"12px", color:C.muted }}>
            💡 Pega el link de cualquier producto de <strong style={{color:C.warning}}>Amazon</strong> o{" "}
            <strong style={{color:C.accent2}}>eBay</strong>, llena el precio y el peso, y te calculamos
            el costo total con importación a Bolivia.
          </div>

          {/* URL */}
          <div style={{ marginBottom:"14px" }}>
            <label style={lbl_}>🔗 URL del Producto *</label>
            <input style={inp_} type="url"
              placeholder="https://amazon.com/dp/... o https://ebay.com/itm/..."
              value={form.url} onChange={e=>setForm({...form, url:e.target.value})} />
            {form.url && (
              <div style={{ marginTop:"5px" }}>
                <PlatBadge plat={plataforma} />
              </div>
            )}
          </div>

          {/* Nombre (opcional) */}
          <div style={{ marginBottom:"14px" }}>
            <label style={lbl_}>📝 Nombre del Producto (opcional)</label>
            <input style={inp_} type="text"
              placeholder="Ej: Mouse Logitech G502"
              value={form.nombre} onChange={e=>setForm({...form, nombre:e.target.value})} />
          </div>

          {/* Precio y Peso */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px", marginBottom:"14px" }}>
            <div>
              <label style={lbl_}>💵 Precio (USD) *</label>
              <input style={inp_} type="number" step="0.01" placeholder="0.00"
                value={form.precio} onChange={e=>setForm({...form, precio:e.target.value})} />
            </div>
            <div>
              <label style={lbl_}>⚖️ Peso estimado (kg) *</label>
              <input style={inp_} type="number" step="0.1" placeholder="0.5"
                value={form.peso} onChange={e=>setForm({...form, peso:e.target.value})} />
            </div>
          </div>

          {/* Categoría y Tamaño */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px", marginBottom:"16px" }}>
            <div>
              <label style={lbl_}>📦 Categoría</label>
              <select style={sel_} value={form.categoria}
                onChange={e=>setForm({...form, categoria:e.target.value})}>
                <option value="electronico">📱 Electrónico (30%)</option>
                <option value="ropa">👕 Ropa (20%)</option>
                <option value="hogar">🏠 Hogar (15%)</option>
                <option value="deportes">⚽ Deportes (25%)</option>
                <option value="otros">📦 Otros (18%)</option>
              </select>
            </div>
            <div>
              <label style={lbl_}>📐 Tamaño de Caja</label>
              <select style={sel_} value={form.tamano}
                onChange={e=>setForm({...form, tamano:e.target.value})}>
                <option value="20x15x1">Pequeño 20×15×1 — Bs.135</option>
                <option value="20x15x15">Mediano 20×15×15 — Bs.180</option>
                <option value="25x15x15">Grande 25×15×15 — Bs.225</option>
                <option value="30x20x20">Extra 30×20×20 — Bs.270</option>
                <option value="35x20x20">35×20×20 — Bs.360</option>
                <option value="50x40x10">Laptop 50×40×10 — Bs.450</option>
                <option value="60x60x60">Grande 60×60×60 — Bs.1800</option>
              </select>
            </div>
          </div>

          {/* Resultado cotización */}
          {cotizacion && (
            <div style={{ background:C.pageBg, borderRadius:"10px", padding:"16px",
              border:`1px solid rgba(37,99,235,0.2)` }}>
              <div style={{ color:C.accent2, fontWeight:"700", marginBottom:"12px", fontSize:"13px" }}>
                📊 Desglose de Importación
              </div>
              {[
                ["Producto",                   cotizacion.precio],
                ["Flete",                      cotizacion.flete],
                ["Seguro (2%)",                cotizacion.seg],
                ["Arancel",                    cotizacion.adu],
                [`Almacén (Bs.${cotizacion.almBs})`, cotizacion.alm],
              ].map(([k,v]) => (
                <div key={k} style={{ display:"flex", justifyContent:"space-between", marginBottom:"5px" }}>
                  <span style={{ color:C.muted, fontSize:"12px" }}>{k}:</span>
                  <span style={{ color:C.text, fontSize:"12px", fontWeight:"600" }}>{fmt(v)}</span>
                </div>
              ))}
              <div style={{ borderTop:`2px solid ${C.accent}`, paddingTop:"10px", marginTop:"10px",
                display:"flex", justifyContent:"space-between" }}>
                <span style={{ color:C.text, fontWeight:"800" }}>TOTAL:</span>
                <span style={{ color:C.success, fontWeight:"800", fontSize:"18px" }}>{fmt(cotizacion.total)}</span>
              </div>
              <div style={{ color:"#555", fontSize:"10px", textAlign:"right", marginTop:"4px" }}>
                T/C: Bs. {tc.toFixed(2)}
              </div>
            </div>
          )}
        </div>
        <div style={mFoot}>
          <button onClick={onClose} style={btnSec}>Cancelar</button>
          <button onClick={calcular}
            style={{ ...btnSec, borderColor:C.accent, color:C.accent }}>
            🔢 Calcular
          </button>
          {cotizacion && (
            <button onClick={agregar} disabled={load}
              style={{ ...btnPri, opacity:load?0.7:1 }}>
              {load ? "Agregando..." : "🛒 Agregar al Carrito"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── PÁGINA PRINCIPAL ──────────────────────────────────────────────────────────
export default function ClienteTienda() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [user,      setUser]      = useState(null);
  const [token,     setToken]     = useState("");
  const [prods,     setProds]     = useState([]);
  const [load,      setLoad]      = useState(true);
  const [tc,        setTc]        = useState(9.17);
  const [buscar,    setBuscar]    = useState("");
  const [catFil,    setCatFil]    = useState(searchParams?.get("categoria")||"");
  const [platFil,   setPlatFil]   = useState("");
  const [mProd,     setMProd]     = useState(null);
  const [mLink,     setMLink]     = useState(false);   // ✅ nuevo modal
  const [toast,     setToast]     = useState("");

  const showToast = useCallback(msg => { setToast(msg); setTimeout(()=>setToast(""),3000); },[]);

  useEffect(()=>{
    const u = JSON.parse(sessionStorage.getItem("user")||"null");
    const t = document.cookie.split(";").find(c=>c.trim().startsWith("access_token="))?.split("=")[1];
    if(!t||!u) return router.push("/login");
    setUser(u); setToken(t);

    const params = new URLSearchParams();
    if (buscar)  params.append("busqueda",   buscar);
    if (catFil)  params.append("categoria",  catFil);
    if (platFil) params.append("plataforma", platFil);

    fetch(`${API}/cliente/tienda?${params}`, { headers:{Authorization:`Bearer ${t}`} })
      .then(r=>r.json()).then(d=>{
        const locales   = (d.productos_locales||[]).map(p=>({...p, plataforma:"local"}));
        const externos  = (d.productos_externos||[]);

        // ✅ FIX: Si no hay externos reales en BD, usar los simulados (igual que dashboard)
        const externosFinal = externos.length > 0 ? externos : PRODUCTOS_SIMULADOS;

        // Aplicar filtro de plataforma a los simulados si está activo
        const externosFiltrados = platFil && platFil !== "local"
          ? externosFinal.filter(p => p.plataforma === platFil)
          : externosFinal;

        // Si filtro es "local", no mostrar externos
        const mostrarExternos = platFil === "local" ? [] : externosFiltrados;

        setProds([...locales, ...mostrarExternos]);
        setTc(d.tipo_cambio||9.17);
        setLoad(false);
      }).catch(()=>setLoad(false));
  },[buscar, catFil, platFil, router]);

  // Filtrado adicional por búsqueda sobre los simulados (client-side)
  const prodsFiltrados = buscar
    ? prods.filter(p =>
        p.nombre?.toLowerCase().includes(buscar.toLowerCase()) ||
        p.descripcion?.toLowerCase().includes(buscar.toLowerCase())
      )
    : prods;

  if (load) return (
    <div style={{ minHeight:"100vh", background:C.pageBg, display:"flex",
      alignItems:"center", justifyContent:"center" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ width:"40px", height:"40px", border:`3px solid rgba(37,99,235,0.2)`,
          borderTop:`3px solid ${C.accent}`, borderRadius:"50%", margin:"0 auto 12px",
          animation:"spin 0.9s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ color:C.muted, fontSize:"13px" }}>Cargando tienda…</div>
      </div>
    </div>
  );

  return (
    <div style={{ height:"100vh", background:C.pageBg, display:"flex", overflow:"hidden" }}>
      <ClienteSidebar user={user} />

      <main style={{ flex:1, padding:"28px", overflowY:"auto", overflowX:"hidden", background:C.pageBg }}>
        {toast && (
          <div style={{ position:"fixed", top:20, right:20, background:C.success, color:"#fff",
            padding:"12px 22px", borderRadius:"8px", zIndex:9999, fontWeight:"700",
            boxShadow:"0 4px 16px rgba(0,0,0,0.5)" }}>{toast}</div>
        )}

        {/* Header */}
        <div style={{ borderBottom:`2px solid ${C.accent}`, paddingBottom:"18px", marginBottom:"24px",
          display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"12px" }}>
          <div>
            <h1 style={{ margin:0, fontFamily:"Cinzel,serif", color:C.accent2, fontSize:"22px" }}>🛍️ Tienda</h1>
            <p style={{ margin:"4px 0 0", color:C.muted, fontSize:"13px" }}>
              Productos locales y de importación desde USA
            </p>
          </div>
          {/* ✅ Botón Agregar por Link */}
          <button onClick={()=>setMLink(true)} style={{
            background:`linear-gradient(135deg,${C.warning},#d97706)`,
            border:"none", color:"#000", padding:"11px 20px", borderRadius:"8px",
            cursor:"pointer", fontWeight:"700", fontSize:"13px",
            boxShadow:`0 2px 10px rgba(245,158,11,0.35)`,
          }}>
            🔗 Agregar por Link (Amazon/eBay)
          </button>
        </div>

        {/* Filtros */}
        <div style={{ background:C.cardBg, borderRadius:"10px", padding:"16px",
          marginBottom:"24px", border:`1px solid rgba(37,99,235,0.1)`,
          display:"flex", gap:"12px", flexWrap:"wrap", alignItems:"center" }}>
          <div style={{ flex:"1 1 240px" }}>
            <input
              style={{ width:"100%", padding:"9px 12px", background:C.pageBg,
                border:`2px solid rgba(37,99,235,0.18)`, borderRadius:"7px", color:C.text,
                fontSize:"13px", outline:"none", boxSizing:"border-box" }}
              placeholder="🔍 Buscar producto..."
              value={buscar} onChange={e=>setBuscar(e.target.value)} />
          </div>
          <select
            style={{ flex:"1 1 180px", padding:"9px 12px", background:C.pageBg,
              border:`2px solid rgba(37,99,235,0.18)`, borderRadius:"7px", color:C.text,
              fontSize:"13px", outline:"none" }}
            value={catFil} onChange={e=>setCatFil(e.target.value)}>
            {CATEGORIAS.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select
            style={{ flex:"1 1 180px", padding:"9px 12px", background:C.pageBg,
              border:`2px solid rgba(37,99,235,0.18)`, borderRadius:"7px", color:C.text,
              fontSize:"13px", outline:"none" }}
            value={platFil} onChange={e=>setPlatFil(e.target.value)}>
            {PLATAFORMAS.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          {(buscar||catFil||platFil) && (
            <button onClick={()=>{ setBuscar(""); setCatFil(""); setPlatFil(""); }} style={btnSec}>
              ✕ Limpiar
            </button>
          )}
        </div>

        {/* Conteo */}
        <div style={{ color:C.muted, fontSize:"12px", marginBottom:"16px" }}>
          {prodsFiltrados.length} producto{prodsFiltrados.length!==1?"s":""} encontrado{prodsFiltrados.length!==1?"s":""}
        </div>

        {/* Grid o vacío */}
        {prodsFiltrados.length === 0
          ? (
            <div style={{ background:C.cardBg, borderRadius:"10px", padding:"50px 20px",
              textAlign:"center", border:`1px solid rgba(37,99,235,0.1)` }}>
              <div style={{ fontSize:"40px", marginBottom:"12px" }}>🔍</div>
              <div style={{ color:C.muted, fontSize:"14px", marginBottom:"16px" }}>
                No se encontraron productos.
              </div>
              <div style={{ display:"flex", gap:"10px", justifyContent:"center", flexWrap:"wrap" }}>
                <button onClick={()=>{ setBuscar(""); setCatFil(""); setPlatFil(""); }}
                  style={btnPri}>Ver todos</button>
                <button onClick={()=>setMLink(true)}
                  style={{ ...btnPri, background:C.warning, color:"#000" }}>
                  🔗 Agregar por Link
                </button>
              </div>
            </div>
          )
          : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:"16px" }}>
              {prodsFiltrados.map(p => (
                <ProdCard
                  key={p.id_producto||p.id_producto_exterior||p.id_producto_externo}
                  prod={p} tc={tc} onVer={setMProd}
                />
              ))}
            </div>
          )
        }
      </main>

      {/* Modal detalle */}
      {mProd && (
        <ModalDetalle prod={mProd} tc={tc} token={token}
          onClose={()=>setMProd(null)}
          onSuccess={msg=>{ showToast(msg); setMProd(null); }} />
      )}

      {/* ✅ Modal agregar por link */}
      {mLink && (
        <ModalAgregarLink tc={tc} token={token}
          onClose={()=>setMLink(false)}
          onSuccess={msg=>{ showToast(msg); setMLink(false); }} />
      )}
    </div>
  );
}