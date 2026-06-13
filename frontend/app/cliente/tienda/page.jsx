"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ClienteSidebar from "@/components/ClienteSidebar";
import { useTheme } from "@/context/ThemeContext";
import { Home, Package, ShoppingCart, ShoppingBag, X, Link, BarChart3, Globe, Hash, Search, Check } from "lucide-react";
import "@/styles/dashboard.css";
import "@/styles/tienda.css";
import { useClienteMoneda } from "@/lib/ClienteMonedaContext";

const API = "http://localhost:8000";

/* ── Impuestos & mapeo subcategoría → categoría DB ──────────────────── */
const IMPUESTOS = {
  electronico: 0.30, ropa: 0.20, hogar: 0.15, deportes: 0.25, otros: 0.18,
};

const SUBCAT_TO_CAT = {
  gaming: "electronico", audio: "electronico", celulares: "electronico",
  computadoras: "electronico", fotografia: "electronico",
  ropa_hombre: "ropa", ropa_mujer: "ropa", calzado: "ropa", accesorios: "ropa",
  cocina: "hogar", dormitorio: "hogar", decoracion: "hogar",
  fitness: "deportes", futbol: "deportes", outdoor: "deportes",
  juguetes: "otros", libros: "otros",
};

function calcImport(precio, peso = 0.5, subcatOrCat = "otros", tc = 9.17) {
  const cat    = SUBCAT_TO_CAT[subcatOrCat] ?? subcatOrCat;
  const flete  = Math.max(15, peso * 3);
  const seguro = precio * 0.02;
  const aduana = precio * (IMPUESTOS[cat] ?? 0.18);
  const alm    = 135 / tc;
  return precio + flete + seguro + aduana + alm;
}


/* ── Subcategorías & grupos ──────────────────────────────────────────── */
const SUBCATEGORIAS = [
  { value: "gaming",       label: "Gaming",       cat: "electronico" },
  { value: "audio",        label: "Audio",        cat: "electronico" },
  { value: "celulares",    label: "Celulares",    cat: "electronico" },
  { value: "computadoras", label: "Computadoras", cat: "electronico" },
  { value: "fotografia",   label: "Fotografía",   cat: "electronico" },
  { value: "ropa_hombre",  label: "Ropa Hombre",  cat: "ropa"        },
  { value: "ropa_mujer",   label: "Ropa Mujer",   cat: "ropa"        },
  { value: "calzado",      label: "Calzado",      cat: "ropa"        },
  { value: "accesorios",   label: "Accesorios",   cat: "ropa"        },
  { value: "cocina",       label: "Cocina",        cat: "hogar"       },
  { value: "dormitorio",   label: "Dormitorio",   cat: "hogar"       },
  { value: "decoracion",   label: "Decoración",   cat: "hogar"       },
  { value: "fitness",      label: "Fitness",      cat: "deportes"    },
  { value: "futbol",       label: "Fútbol",        cat: "deportes"    },
  { value: "outdoor",      label: "Outdoor",      cat: "deportes"    },
  { value: "juguetes",     label: "Juguetes",      cat: "otros"       },
  { value: "libros",       label: "Libros",        cat: "otros"       },
];

const GRUPOS_CAT = [
  { cat: "electronico", label: "Electrónico (30%)" },
  { cat: "ropa",        label: "Ropa (20%)"        },
  { cat: "hogar",       label: "Hogar (15%)"       },
  { cat: "deportes",    label: "Deportes (25%)"    },
  { cat: "otros",       label: "Otros (18%)"       },
];

const SUBCATS_LINK = SUBCATEGORIAS.map(s => ({
  ...s,
  label: `${s.label} (${Math.round((IMPUESTOS[s.cat] ?? 0.18) * 100)}%)`,
}));

const PLATAFORMAS = [
  { value: "",       label: "Todas las plataformas" },
  { value: "local",  label: "Tienda Local"       },
  { value: "amazon", label: "Amazon"             },
  { value: "ebay",   label: "eBay"               },
];

const PRODUCTOS_SIMULADOS = [
  {
    id_producto_exterior: "amz001", id_producto_externo: "amz001",
    nombre: "Razer DeathAdder Essential - Mouse Gaming",
    descripcion: "Mouse gaming Razer con sensor óptico de 6400 DPI, 5 botones programables y diseño ergonómico para diestros.",
    precio: 29.99, peso: 0.3, categoria: "electronico", stock: 15,
    plataforma: "amazon",
    imagen_url: "https://images.unsplash.com/photo-1527814050087-3793815479db?w=400&h=300&fit=crop",
    enlace: "https://amazon.com/dp/B07QSCM51V",
  },
  {
    id_producto_exterior: "amz002", id_producto_externo: "amz002",
    nombre: "Sony WH-1000XM4 - Audífonos Inalámbricos",
    descripcion: "Audífonos noise canceling con sonido de alta resolución, 30 horas de batería y asistente de voz integrado.",
    precio: 348.00, peso: 0.6, categoria: "electronico", stock: 8,
    plataforma: "amazon",
    imagen_url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop",
    enlace: "https://amazon.com/dp/B0863TXGM3",
  },
  {
    id_producto_exterior: "eby001", id_producto_externo: "eby001",
    nombre: "Logitech G Pro X - Headset Gaming",
    descripcion: "Headset gaming con sonido surround 7.1, micrófono desmontable Blue Voice y memoria integrada para perfiles.",
    precio: 89.99, peso: 0.4, categoria: "electronico", stock: 10,
    plataforma: "ebay",
    imagen_url: "https://images.unsplash.com/photo-1599669454699-248893623440?w=400&h=300&fit=crop",
    enlace: "https://ebay.com/itm/Logitech-G-PRO-X-Gaming-Headset",
  },
  {
    id_producto_exterior: "eby002", id_producto_externo: "eby002",
    nombre: "SteelSeries Apex Pro - Teclado Mecánico",
    descripcion: "Teclado gaming mecánico con switches ajustables OmniPoint, iluminación RGB y reposamuñecas magnético.",
    precio: 179.99, peso: 1.2, categoria: "electronico", stock: 6,
    plataforma: "ebay",
    imagen_url: "https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=400&h=300&fit=crop",
    enlace: "https://ebay.com/itm/SteelSeries-Apex-Pro-TKL-Gaming-Keyboard",
  },
];

/* ── Badge plataforma ─────────────────────────────────────────────────── */
function PlatBadge({ plat }) {
  const MAP = {
    amazon: { bg: "#f59e0b", col: "#000", txt: "Amazon" },
    ebay:   { bg: "#3b82f6", col: "#fff", txt: "eBay"   },
    local:  { bg: "#10b981", col: "#fff", txt: "Local"  },
  };
  const p = MAP[plat || "local"] || MAP.local;
  return (
    <span className="plat-badge" style={{ background: p.bg, color: p.col }}>
      {p.txt}
    </span>
  );
}

/* ── Selects con optgroup ─────────────────────────────────────────────── */
function SelectCategorias({ value, onChange, className, incluirTodas = true }) {
  return (
    <select className={className} value={value} onChange={onChange}>
      {incluirTodas && <option value="">Todas las categorías</option>}
      {GRUPOS_CAT.map(g => (
        <optgroup key={g.cat} label={g.label}>
          {SUBCATEGORIAS.filter(s => s.cat === g.cat).map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

function SelectCategoriasLink({ value, onChange, className }) {
  return (
    <select className={className} value={value} onChange={onChange}>
      {GRUPOS_CAT.map(g => (
        <optgroup key={g.cat} label={g.label}>
          {SUBCATS_LINK.filter(s => s.cat === g.cat).map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

/* ── Card de producto ─────────────────────────────────────────────────── */
function ProdCard({ prod, tc, onVer }) {
  const { formatPrice } = useClienteMoneda();
  const total = calcImport(parseFloat(prod.precio || 0), prod.peso || 0.5, prod.categoria || "otros", tc);
  const img   = prod.imagen_url || prod.imagen || "";
  const PLAT  = {
    amazon: { bg: "#f59e0b", col: "#000", txt: "Amazon" },
    ebay:   { bg: "#3b82f6", col: "#fff", txt: "eBay"   },
    local:  { bg: "#10b981", col: "#fff", txt: "Local"  },
  };
  const plat = PLAT[prod.plataforma || "local"] || PLAT.local;

  return (
    <div className="p-card">
      <div className="p-card__img-wrap">
        <img
          className="p-card__img"
          src={img || `https://via.placeholder.com/280x230/0d1117/3b82f6?text=${encodeURIComponent((prod.nombre || "").slice(0, 12))}`}
          alt={prod.nombre}
          onError={e => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/280x230/0d1117/3b82f6?text=Sin+Imagen"; }}
        />
        <div className="p-card__fade" />
        <span className="p-card__plat" style={{ background: plat.bg, color: plat.col }}>{plat.txt}</span>
        <span className="p-card__price">{formatPrice(prod.precio)}</span>
        <button className="p-card__cta" onClick={() => onVer(prod)}>Ver detalle</button>
      </div>
      <div className="p-card__body">
        <p className="p-card__name">{prod.nombre || "Producto"}</p>
        <div className="p-card__foot">
          <span className="p-card__imp-lbl">Con importación</span>
          <span className="p-card__imp-val">{formatPrice(total)}</span>
        </div>
      </div>
    </div>
  );
}

/* ── Modal Detalle ────────────────────────────────────────────────────── */
function ModalDetalle({ prod, tc, token, onClose, onSuccess }) {
  const { formatPrice, formatPriceUSD, formatPriceBOB, tipoCambio } = useClienteMoneda();
  const [qty,  setQty]  = useState(1);
  const [load, setLoad] = useState(false);
  if (!prod) return null;

  const esExt  = prod.plataforma && prod.plataforma !== "local";
  const img    = prod.imagen_url || prod.imagen || "";
  const cat    = prod.categoria || "otros";
  const catDB  = SUBCAT_TO_CAT[cat] ?? cat;
  const peso   = prod.peso || 0.5;
  const precio = parseFloat(prod.precio || 0);
  const flete  = Math.max(15, peso * 3);
  const seguro = precio * 0.02;
  const aduana = precio * (IMPUESTOS[catDB] ?? 0.18);
  const alm    = 135 / tc;
  const tot1   = precio + flete + seguro + aduana + alm;

  async function agregar() {
    setLoad(true);
    const body = esExt
      ? { tipo: "externo",
          id_producto_externo: prod.id_producto_externo || prod.id_producto_exterior || String(prod.id_producto || ""),
          nombre: prod.nombre, precio: prod.precio, peso: prod.peso || 0.5,
          categoria: catDB, plataforma: prod.plataforma,
          url: prod.enlace || "", cantidad: qty }
      : { tipo: "local", id_producto: prod.id_producto, cantidad: qty };

    const r = await fetch(`${API}/cliente/carrito/agregar`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const d = await r.json(); setLoad(false);
    d.success ? (onSuccess(d.message), onClose()) : alert(d.detail || d.message || "Error");
  }

  return (
    <div className="m-overlay">
      <div className="m-box m-box--wide">
        <div className="m-head">
          <h3 className="m-head__title"><ShoppingBag size={16} /> Detalle del Producto</h3>
          <button className="m-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="m-body">
          <div className="det-layout">
            <img
              className="det-img"
              src={img} alt={prod.nombre}
              onError={e => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/165x165/0d1117/3b82f6?text=IMG"; }}
            />
            <div className="det-info">
              <PlatBadge plat={prod.plataforma} />
              <h3 className="det-name">{prod.nombre}</h3>
              <div className="det-price">{formatPrice(prod.precio)}</div>
              <p className="det-desc">{prod.descripcion || "Sin descripción"}</p>
              {prod.enlace && (
                <a href={prod.enlace} target="_blank" rel="noreferrer" className="det-link">
                  <><Link size={14} /> Ver en tienda original →</>
                </a>
              )}
            </div>
          </div>

          <div className="det-breakdown">
            <div className="det-breakdown__title"><BarChart3 size={16} /> Costo de Importación</div>
            {[
              ["Precio del producto",    precio],
              ["Flete internacional",    flete],
              ["Seguro (2%)",            seguro],
              ["Arancel aduanal",        aduana],
              ["Almacén Miami (Bs.135)", alm],
            ].map(([k, v]) => (
              <div className="cot-row" key={k}>
                <span className="cot-row__k">{k}</span>
                <span className="cot-row__v cot-row__v--dual">
                  <span>{formatPriceUSD(v)}</span>
                  <span style={{ marginLeft: 16 }}>{formatPriceBOB(v)}</span>
                </span>
              </div>
            ))}
            <div className="cot-total">
              <span className="cot-total__k">Total × {qty}</span>
              <span className="cot-total__v cot-total__v--dual">
                <span>{formatPriceUSD(tot1 * qty)}</span>
                <span style={{ marginLeft: 16 }}>{formatPriceBOB(tot1 * qty)}</span>
              </span>
            </div>
            <div style={{ textAlign: "right", fontSize: 10, color: "var(--text-3)", marginTop: 6 }}>
              T/C: Bs. {tipoCambio.toFixed(2)}
            </div>
          </div>

          <div className="qty-row">
            <span style={{ fontFamily: "var(--font-c)", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "var(--text-3)" }}>Cantidad</span>
            <button className="qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
            <span className="qty-num">{qty}</span>
            <button className="qty-btn" onClick={() => setQty(q => Math.min(10, q + 1))}>+</button>
          </div>
        </div>

        <div className="m-foot">
          <button className="btn btn-out" onClick={onClose}>Cancelar</button>
          <button className="btn btn-pri" onClick={agregar} disabled={load} style={{ opacity: load ? 0.7 : 1 }}>
              {load ? "Agregando…" : <><ShoppingCart size={16} /> Agregar al Carrito</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Modal Agregar por Link ───────────────────────────────────────────── */
const ALM_BS_MAP = {
  "20x15x1": 135, "20x15x15": 180, "25x15x15": 225,
  "30x20x20": 270, "35x20x20": 360, "50x40x10": 450, "60x60x60": 1800,
};

function ModalAgregarLink({ tc, token, onClose, onSuccess }) {
  const { formatPriceUSD, formatPriceBOB, tipoCambio } = useClienteMoneda();
  const [form, setForm] = useState({
    url: "", nombre: "", precio: "", peso: "0.5",
    categoria: "gaming", tamano: "20x15x1",
  });
  const [cotizacion, setCotizacion] = useState(null);
  const [load, setLoad] = useState(false);
  const [ok,   setOk]   = useState("");

  const plataforma = form.url.includes("amazon") ? "amazon"
    : form.url.includes("ebay") ? "ebay" : "otros";

  function calcular() {
    const precio = parseFloat(form.precio);
    const peso   = parseFloat(form.peso);
    if (!precio || !peso || precio <= 0 || peso <= 0) { alert("Ingresa precio y peso válidos"); return; }
    const catDB = SUBCAT_TO_CAT[form.categoria] ?? form.categoria;
    const imp   = IMPUESTOS[catDB] ?? 0.18;
    const flete = Math.max(15, peso * 3);
    const seg   = precio * 0.02;
    const adu   = precio * imp;
    const almBs = ALM_BS_MAP[form.tamano] || 135;
    const alm   = almBs / tc;
    setCotizacion({ total: precio + flete + seg + adu + alm, flete, seg, adu, alm, almBs, precio });
  }

  async function agregar() {
    if (!cotizacion) { calcular(); return; }
    if (!form.url) { alert("Ingresa la URL del producto"); return; }
    const catDB = SUBCAT_TO_CAT[form.categoria] ?? form.categoria;
    setLoad(true);
    const body = {
      tipo: "externo",
      id_producto_externo: `link_${Date.now()}`,
      nombre: form.nombre || `Producto de ${plataforma}`,
      precio: parseFloat(form.precio), peso: parseFloat(form.peso),
      categoria: catDB, plataforma,
      url: form.url, cantidad: 1,
    };
    const r = await fetch(`${API}/cliente/carrito/agregar`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const d = await r.json(); setLoad(false);
    if (d.success) {
      setOk("Producto agregado al carrito");
      setTimeout(() => { onSuccess(d.message); onClose(); }, 1400);
    } else {
      alert(d.detail || d.message || "Error al agregar");
    }
  }

  return (
    <div className="m-overlay">
      <div className="m-box m-box--wide">
        <div className="m-head">
          <h3 className="m-head__title"><Globe size={16} /> Agregar por Link</h3>
          <button className="m-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="m-body">
          {ok && <div className="alert-ok">{ok}</div>}

          <div className="link-tip">
            Pega el link de cualquier producto de <strong>Amazon</strong> o{" "}
            <em>eBay</em>, llena el precio y el peso, y calculamos el costo total con
            importación a Bolivia.
          </div>

          <div style={{ marginBottom: 16 }}>
            <label className="f-lbl">URL del Producto *</label>
            <input className="f-inp" type="url"
              placeholder="https://amazon.com/dp/... o https://ebay.com/itm/..."
              value={form.url} onChange={e => { setForm({ ...form, url: e.target.value }); setCotizacion(null); }} />
            {form.url && (
              <div style={{ marginTop: 6 }}><PlatBadge plat={plataforma} /></div>
            )}
          </div>

          <div style={{ marginBottom: 16 }}>
            <label className="f-lbl">Nombre del Producto (opcional)</label>
            <input className="f-inp" type="text"
              placeholder="Ej: Mouse Logitech G502"
              value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
          </div>

          <div className="f-grid" style={{ marginBottom: 16 }}>
            <div>
              <label className="f-lbl">Precio (USD) *</label>
              <input className="f-inp" type="number" step="0.01" placeholder="0.00"
                value={form.precio}
                onChange={e => { setForm({ ...form, precio: e.target.value }); setCotizacion(null); }} />
            </div>
            <div>
              <label className="f-lbl">Peso estimado (kg) *</label>
              <input className="f-inp" type="number" step="0.1" placeholder="0.5"
                value={form.peso}
                onChange={e => { setForm({ ...form, peso: e.target.value }); setCotizacion(null); }} />
            </div>
            <div>
              <label className="f-lbl">Subcategoría</label>
              <SelectCategoriasLink
                value={form.categoria}
                onChange={e => { setForm({ ...form, categoria: e.target.value }); setCotizacion(null); }}
                className="f-sel"
              />
            </div>
            <div>
              <label className="f-lbl">Tamaño de Caja</label>
              <select className="f-sel" value={form.tamano}
                onChange={e => { setForm({ ...form, tamano: e.target.value }); setCotizacion(null); }}>
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

          {cotizacion && (
            <div className="cot-box">
              <div className="cot-box__title">Desglose de Importación</div>
              {[
                ["Producto",                         cotizacion.precio],
                ["Flete",                            cotizacion.flete],
                ["Seguro (2%)",                      cotizacion.seg],
                ["Arancel",                          cotizacion.adu],
                [`Almacén (Bs.${cotizacion.almBs})`, cotizacion.alm],
              ].map(([k, v]) => (
                <div className="cot-row" key={k}>
                  <span className="cot-row__k">{k}</span>
                  <span className="cot-row__v cot-row__v--dual">
                    <span>{formatPriceUSD(v)}</span>
                    <span style={{ marginLeft: 16 }}>{formatPriceBOB(v)}</span>
                  </span>
                </div>
              ))}
              <div className="cot-total">
                <span className="cot-total__k">Total</span>
                <span className="cot-total__v cot-total__v--dual">
                  <span>{formatPriceUSD(cotizacion.total)}</span>
                  <span style={{ marginLeft: 16 }}>{formatPriceBOB(cotizacion.total)}</span>
                </span>
              </div>
              <div style={{ textAlign: "right", fontSize: 10, color: "var(--text-3)", marginTop: 6 }}>
                T/C: Bs. {tipoCambio.toFixed(2)}
              </div>
            </div>
          )}
        </div>

        <div className="m-foot">
          <button className="btn btn-out"      onClick={onClose}>Cancelar</button>
          <button className="btn btn-blue-out" onClick={calcular}><Hash size={14} /> Calcular</button>
          {cotizacion && (
            <button className="btn btn-pri" onClick={agregar} disabled={load} style={{ opacity: load ? 0.7 : 1 }}>
            {load ? "Agregando…" : <><ShoppingCart size={16} /> Agregar al Carrito</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PÁGINA PRINCIPAL
══════════════════════════════════════════════════════════════════════════ */
function ClienteTiendaContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { theme }    = useTheme();

  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState("");
  const [prods,   setProds]   = useState([]);
  const [load,    setLoad]    = useState(true);
  const [tc,      setTc]      = useState(9.17);
  const [buscar,  setBuscar]  = useState("");
  const [catFil,  setCatFil]  = useState(searchParams?.get("categoria") || "");
  const [platFil, setPlatFil] = useState("");
  const [mProd,   setMProd]   = useState(null);
  const [mLink,   setMLink]   = useState(false);
  const [toast,   setToast]   = useState("");

  const showToast = useCallback(msg => {
    setToast(msg); setTimeout(() => setToast(""), 3000);
  }, []);

  useEffect(() => {
    const u = JSON.parse(sessionStorage.getItem("user") || "null");
    const t = document.cookie.split(";").find(c => c.trim().startsWith("access_token="))?.split("=")[1];
    if (!t || !u) return router.push("/login");
    setUser(u); setToken(t);

    const params = new URLSearchParams();
    if (buscar)  params.append("busqueda",   buscar);
    if (catFil)  params.append("categoria",  catFil);
    if (platFil) params.append("plataforma", platFil);

    fetch(`${API}/cliente/tienda?${params}`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json()).then(d => {
        const locales         = (d.productos_locales  || []).map(p => ({ ...p, plataforma: "local" }));
        const externos        = (d.productos_externos || []);
        const externosFinal   = externos.length > 0 ? externos : PRODUCTOS_SIMULADOS;
        const externosFiltrados = platFil && platFil !== "local"
          ? externosFinal.filter(p => p.plataforma === platFil) : externosFinal;
        const mostrarExternos = platFil === "local" ? [] : externosFiltrados;
        setProds([...locales, ...mostrarExternos]);
        setTc(d.tipo_cambio || 9.17);
        setLoad(false);
      }).catch(() => setLoad(false));
  }, [buscar, catFil, platFil, router]);

  const prodsFiltrados = buscar
    ? prods.filter(p =>
        p.nombre?.toLowerCase().includes(buscar.toLowerCase()) ||
        p.descripcion?.toLowerCase().includes(buscar.toLowerCase()))
    : prods;

  /* Loading */
  if (load) return (
    <div className={`tnd-loading ${theme}`}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div className="tnd-loading__ring" />
      <span className="tnd-loading__text">CARGANDO</span>
    </div>
  );

  return (
    <div className={`tnd-root ${theme}`}>
      <ClienteSidebar user={user} />

      <main className="tnd-main">

        {/* Toast */}
        {toast && <div className="vmb-toast"><Check size={14} /> {toast}</div>}

        {/* ── Hero ──────────────────────────────────────────────── */}
        <header className="tnd-hero">
          <div className="tnd-hero__inner">
            <div>
              <div className="tnd-hero__eyebrow">
                <span className="tnd-hero__tag">Tienda</span>
                <span className="vmb-hero__pulse" />
                <span className="vmb-hero__live">VMBol en Red</span>
              </div>
              <h1 className="tnd-hero__title">
                Tu <span>Tienda</span>
              </h1>
              <p className="tnd-hero__sub">Productos locales y de importación desde USA</p>
            </div>

            <button className="btn-amber" onClick={() => setMLink(true)}>
              <Link size={14} /> Agregar por Link
            </button>
          </div>
        </header>

        {/* ── Filtros ───────────────────────────────────────────── */}
        <div className="tnd-filters">
          <div className="tnd-filters__search">
            <span className="tnd-filters__search-ico"><Search size={16} /></span>
            <input
              className="tnd-filters__inp"
              placeholder="Buscar producto..."
              value={buscar}
              onChange={e => setBuscar(e.target.value)}
            />
          </div>

          <SelectCategorias
            value={catFil}
            onChange={e => setCatFil(e.target.value)}
            className="tnd-filters__sel"
            incluirTodas
          />

          <select className="tnd-filters__sel" value={platFil} onChange={e => setPlatFil(e.target.value)}>
            {PLATAFORMAS.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>

          {(buscar || catFil || platFil) && (
            <button
              className="btn btn-out"
              onClick={() => { setBuscar(""); setCatFil(""); setPlatFil(""); }}
            >
              <X size={14} /> Limpiar
            </button>
          )}
        </div>

        {/* ── Meta row ─────────────────────────────────────────── */}
        <div className="tnd-filters__meta">
          <span className="tnd-count">
            {prodsFiltrados.length} producto{prodsFiltrados.length !== 1 ? "s" : ""} encontrado{prodsFiltrados.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* ── Grid o vacío ──────────────────────────────────────── */}
        {prodsFiltrados.length === 0 ? (
          <div className="tnd-empty">
            <div className="tnd-empty__box">
              <span className="tnd-empty__ico"><Search size={52} /></span>
              <p className="tnd-empty__txt">No se encontraron productos</p>
              <div className="tnd-empty__btns">
                <button className="btn btn-pri"
                  onClick={() => { setBuscar(""); setCatFil(""); setPlatFil(""); }}>
                  Ver todos
                </button>
                <button className="btn-amber" onClick={() => setMLink(true)}>
                  <Link size={14} /> Agregar por Link
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="tnd-grid">
            {prodsFiltrados.map(p => (
              <ProdCard
                key={p.id_producto || p.id_producto_exterior || p.id_producto_externo}
                prod={p} tc={tc} onVer={setMProd}
              />
            ))}
          </div>
        )}

      </main>

      {/* ── Modales ────────────────────────────────────────────── */}
      {mProd && (
        <ModalDetalle
          prod={mProd} tc={tc} token={token}
          onClose={() => setMProd(null)}
          onSuccess={msg => { showToast(msg); setMProd(null); }}
        />
      )}
      {mLink && (
        <ModalAgregarLink
          tc={tc} token={token}
          onClose={() => setMLink(false)}
          onSuccess={msg => { showToast(msg); setMLink(false); }}
        />
      )}
    </div>
  );
}

export default function ClienteTienda() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#0d0f12", color: "#a0a0a0" }}>
        Cargando tienda...
      </div>
    }>
      <ClienteTiendaContent />
    </Suspense>
  );
}