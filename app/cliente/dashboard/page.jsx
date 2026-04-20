"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import ClienteSidebar from "@/components/ClienteSidebar";
import "@/styles/dashboard.css";
import { useTheme } from "@/context/ThemeContext";
const API = "http://localhost:8000";

/* ─── Importación ──────────────────────────────────────────────────────── */
const IMPUESTOS = { electronico:.30, ropa:.20, hogar:.15, deportes:.25, otros:.18 };

function calcImport(precio, peso=.5, cat="otros", l=20, a=15, h=1, tc=9.17) {
  const flete  = Math.max(15, peso*3);
  const seguro = precio*.02;
  const aduana = precio*(IMPUESTOS[cat]??0.18);
  const tabla  = [
    [20,20,15,15,1,1,100,135],[20,20,15,15,15,15,100,180],[25,25,15,15,15,15,100,225],
    [30,30,20,20,20,20,100,270],[35,35,20,20,20,20,100,360],[50,50,40,40,10,10,10,450],
    [50,50,40,40,10,10,100,1350],[60,60,60,60,60,60,20,1800],
    [100,100,100,100,60,60,25,2250],[150,150,100,100,100,100,30,3150],
  ];
  let almBs=135;
  for(const [lmn,lmx,amn,amx,hmn,hmx,pmx,c2] of tabla)
    if(l>=lmn&&l<=lmx&&a>=amn&&a<=amx&&h>=hmn&&h<=hmx&&peso<=pmx){almBs=c2;break;}
  return {
    total: precio+flete+seguro+aduana+almBs/tc,
    desglose:{ producto:precio, flete, seguro, aduana, almacen:almBs/tc, almacen_bs:almBs },
  };
}

const fmt  = n => `$${parseFloat(n||0).toFixed(2)}`;

/* ─── Plataformas ──────────────────────────────────────────────────────── */
const PLAT = {
  amazon:{ bg:"#f59e0b", col:"#000", txt:"Amazon" },
  ebay:  { bg:"#3b82f6", col:"#fff", txt:"eBay"   },
};

/* ─── ProdCard ─────────────────────────────────────────────────────────── */
function ProdCard({ prod, tc, onAdd }) {
  const cot  = calcImport(parseFloat(prod.precio||0), prod.peso||.5, prod.categoria||"otros", 20, 15, 1, tc);
  const plat = PLAT[prod.plataforma] || { bg:"#10b981", col:"#fff", txt:"Local" };
  const img  = prod.imagen_url || prod.imagen || "";
  const key  = prod.id_producto || prod.id_producto_exterior || prod.id_producto_externo;

  return (
    <div className="p-card" key={key}>
      <div className="p-card__img-wrap">
        <img
          className="p-card__img"
          src={img || `https://via.placeholder.com/280x230/0d1117/3b82f6?text=${encodeURIComponent((prod.nombre||"").slice(0,12))}`}
          alt={prod.nombre}
          onError={e => { e.target.onerror=null; e.target.src="https://via.placeholder.com/280x230/0d1117/3b82f6?text=Sin+Imagen"; }}
        />
        <div className="p-card__fade" />
        <span className="p-card__plat" style={{ background:plat.bg, color:plat.col }}>{plat.txt}</span>
        <span className="p-card__price">{fmt(prod.precio)}</span>
        <button className="p-card__cta" onClick={() => onAdd(prod)}>+ Agregar al carrito</button>
      </div>

      <div className="p-card__body">
        <p className="p-card__name">{prod.nombre || "Producto"}</p>
        <div className="p-card__foot">
          <span className="p-card__imp-lbl">Con importación</span>
          <span className="p-card__imp-val">{fmt(cot.total)}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Carrusel ─────────────────────────────────────────────────────────── */
function Carrusel({ prods, tc, onAdd }) {
  const trackRef = useRef(null);
  const [page, setPage] = useState(0);
  const perPage = 6;
  const totalPages = Math.ceil(prods.length / perPage);

  const scrollBy = dir => {
    if (!trackRef.current) return;
    trackRef.current.scrollBy({ left: dir * 540, behavior:"smooth" });
    setPage(p => Math.min(Math.max(p + dir, 0), totalPages - 1));
  };

  if (!prods.length) return (
    <div className="vmb-empty">
      <span className="vmb-empty__ico"></span>
      <span className="vmb-empty__txt">Sin productos disponibles</span>
    </div>
  );

  return (
    <div className="vmb-carousel">
      <div className="vmb-carousel__track" ref={trackRef}>
        {prods.map(p => (
          <ProdCard
            key={p.id_producto || p.id_producto_exterior || p.id_producto_externo}
            prod={p} tc={tc} onAdd={onAdd}
          />
        ))}
      </div>

      <div className="vmb-carousel__nav">
        <div style={{ display:"flex", gap:"5px", alignItems:"center" }}>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              className={`vmb-carousel__dot ${i === page ? "vmb-carousel__dot--on" : "vmb-carousel__dot--off"}`}
              onClick={() => {
                setPage(i);
                if (trackRef.current) trackRef.current.scrollTo({ left: i * 540 * (perPage/prods.length) * prods.length, behavior:"smooth" });
              }}
            />
          ))}
        </div>
        <button className="vmb-carousel__btn" onClick={() => scrollBy(-1)} aria-label="Anterior">‹</button>
        <button className="vmb-carousel__btn" onClick={() => scrollBy(1)}  aria-label="Siguiente">›</button>
      </div>
    </div>
  );
}

/* ─── Section ──────────────────────────────────────────────────────────── */
function Section({ label, accent, href, children }) {
  return (
    <section className="vmb-section">
      <div className="vmb-section__head">
        <h2 className="vmb-section__title">
          {label} {accent && <em>{accent}</em>}
        </h2>
        {href && <a href={href} className="vmb-section__link">Ver todos →</a>}
      </div>
      {children}
    </section>
  );
}

/* ─── Metric ───────────────────────────────────────────────────────────── */
function Metric({ val, lbl, hint, onClick }) {
  return (
    <div className="vmb-metric" onClick={onClick}>
      <span className="vmb-metric__val">{val}</span>
      <span className="vmb-metric__lbl">{lbl}</span>
      {hint && <span className="vmb-metric__hint">{hint} →</span>}
    </div>
  );
}

/* ─── Modal base ───────────────────────────────────────────────────────── */
function Modal({ title, onClose, foot, wide, children }) {
  return (
    <div className="m-overlay">
      <div className={`m-box${wide ? " m-box--wide" : ""}`}>
        <div className="m-head">
          <h3 className="m-head__title">{title}</h3>
          <button className="m-close" onClick={onClose}>✕</button>
        </div>
        <div className="m-body">{children}</div>
        {foot && <div className="m-foot">{foot}</div>}
      </div>
    </div>
  );
}

/* ─── Modal Agregar Carrito ────────────────────────────────────────────── */
function ModalAddCart({ prod, tc, token, onClose, onOk }) {
  const [qty,  setQty]  = useState(1);
  const [busy, setBusy] = useState(false);
  if (!prod) return null;

  const esExt = prod.plataforma && prod.plataforma !== "local";
  const cot   = calcImport(parseFloat(prod.precio||0), prod.peso||.5, prod.categoria||"otros", 20, 15, 1, tc);
  const img   = prod.imagen_url || prod.imagen || "";

  const confirmar = async () => {
    setBusy(true);
    const body = esExt
      ? { tipo:"externo", id_producto_externo:prod.id_producto_externo||prod.id_producto_exterior||String(prod.id_producto||""),
          nombre:prod.nombre, precio:prod.precio, peso:prod.peso||.5,
          categoria:prod.categoria||"electronico", plataforma:prod.plataforma, url:prod.enlace||"", cantidad:qty }
      : { tipo:"local", id_producto:prod.id_producto, cantidad:qty };
    const r = await fetch(`${API}/cliente/carrito/agregar`, {
      method:"POST", headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`},
      body: JSON.stringify(body),
    });
    const d = await r.json(); setBusy(false);
    d.success ? (onOk(d.message), onClose()) : alert(d.detail || d.message || "Error al agregar");
  };

  return (
    <Modal title="Agregar al carrito" onClose={onClose}
      foot={<>
        <button className="btn btn-out" onClick={onClose}>Cancelar</button>
        <button className="btn btn-pri" onClick={confirmar} disabled={busy} style={{ opacity:busy?.7:1 }}>
          {busy ? "Agregando…" : "Confirmar"}
        </button>
      </>}>
      <div className="m-prod">
        <img className="m-prod__img" src={img} alt={prod.nombre}
          onError={e => { e.target.onerror=null; e.target.src="https://via.placeholder.com/120x120/0d1117/3b82f6?text=IMG"; }} />
        <div style={{ flex:1, minWidth:180 }}>
          <p className="m-prod__name">{prod.nombre}</p>
          <p className="m-prod__price">{fmt(prod.precio)}</p>
          <div className="qty-row">
            <button className="qty-btn" onClick={() => setQty(q => Math.max(1, q-1))}>−</button>
            <span className="qty-num">{qty}</span>
            <button className="qty-btn" onClick={() => setQty(q => Math.min(10, q+1))}>+</button>
          </div>
        </div>
      </div>
      <div className="summary">
        <div className="sum-row">
          <span className="sum-k">Importación</span>
          <span className="sum-v">{fmt((cot.total - parseFloat(prod.precio||0)) * qty)}</span>
        </div>
        <div className="sum-total">
          <span className="sum-total__k">Total ×{qty}</span>
          <span className="sum-total__v">{fmt(cot.total * qty)}</span>
        </div>
        <div style={{ textAlign:"right", fontSize:"10px", color:"var(--text-3)", marginTop:6 }}>
          T/C: Bs. {tc.toFixed(2)}
        </div>
      </div>
    </Modal>
  );
}

/* ─── Modal Cotización ─────────────────────────────────────────────────── */
const DIMS = {
  "20x15x1":{l:20,a:15,h:1},"20x15x15":{l:20,a:15,h:15},"25x15x15":{l:25,a:15,h:15},
  "30x20x20":{l:30,a:20,h:20},"35x20x20":{l:35,a:20,h:20},"50x40x10":{l:50,a:40,h:10},
  "60x60x60":{l:60,a:60,h:60},
};

function ModalCot({ tc, token, onClose }) {
  const [form, setForm] = useState({ precio:"", peso:"", categoria:"electronico", tamano:"20x15x1" });
  const [res,  setRes]  = useState(null);
  const [busy, setBusy] = useState(false);
  const [ok,   setOk]   = useState("");

  const calcular = () => {
    if (!form.precio || !form.peso) return;
    const d = DIMS[form.tamano];
    setRes(calcImport(parseFloat(form.precio), parseFloat(form.peso), form.categoria, d.l, d.a, d.h, tc));
  };

  const guardar = async () => {
    if (!res) return calcular();
    setBusy(true);
    const d = DIMS[form.tamano];
    const r = await fetch(`${API}/cliente/cotizacion/guardar`, {
      method:"POST", headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`},
      body: JSON.stringify({ nombre_producto:"Cotización rápida", precio:parseFloat(form.precio),
        peso:parseFloat(form.peso), categoria:form.categoria, tamano:form.tamano,
        largo:d.l, ancho:d.a, alto:d.h }),
    });
    const data = await r.json(); setBusy(false);
    if (data.success) { setOk("Cotización guardada ✓"); setTimeout(onClose, 1500); }
    else alert(data.detail || "Error al guardar");
  };

  return (
    <Modal wide title="Calculadora de importación" onClose={onClose}
      foot={<>
        <button className="btn btn-out" onClick={onClose}>Cerrar</button>
        <button className="btn btn-blue-out" onClick={calcular}>Calcular</button>
        {res && (
          <button className="btn btn-pri" onClick={guardar} disabled={busy} style={{ opacity:busy?.7:1 }}>
            {busy ? "Guardando…" : "Guardar"}
          </button>
        )}
      </>}>
      {ok && <div className="alert-ok">{ok}</div>}
      <div className="f-grid">
        {[["Precio (USD)","precio","number","0.00"],["Peso (kg)","peso","number","0.5"]].map(([lbl,key,t,ph]) => (
          <div key={key}>
            <label className="f-lbl">{lbl}</label>
            <input className="f-inp" type={t} placeholder={ph} value={form[key]}
              onChange={e => setForm({ ...form, [key]:e.target.value })} />
          </div>
        ))}
        <div>
          <label className="f-lbl">Categoría</label>
          <select className="f-sel" value={form.categoria} onChange={e => setForm({ ...form, categoria:e.target.value })}>
            <option value="electronico"> Electrónico (30%)</option>
            <option value="ropa"> Ropa (20%)</option>
            <option value="hogar"> Hogar (15%)</option>
            <option value="deportes"> Deportes (25%)</option>
            <option value="otros"> Otros (18%)</option>
          </select>
        </div>
        <div>
          <label className="f-lbl">Tamaño de caja</label>
          <select className="f-sel" value={form.tamano} onChange={e => setForm({ ...form, tamano:e.target.value })}>
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
      {res && (
        <div className="cot-box">
          <div className="cot-box__title">Desglose</div>
          {[
            ["Producto",         res.desglose.producto],
            ["Flete",            res.desglose.flete],
            ["Seguro (2%)",      res.desglose.seguro],
            ["Arancel",          res.desglose.aduana],
            [`Almacén (Bs.${res.desglose.almacen_bs})`, res.desglose.almacen],
          ].map(([k,v]) => (
            <div className="cot-row" key={k}>
              <span className="cot-row__k">{k}</span>
              <span className="cot-row__v">{fmt(v)}</span>
            </div>
          ))}
          <div className="cot-total">
            <span className="cot-total__k">Total</span>
            <span className="cot-total__v">{fmt(res.total)}</span>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ─── Modal Envíos ─────────────────────────────────────────────────────── */
function ModalEnvios({ items, onClose }) {
  return (
    <Modal title="Envíos en camino" onClose={onClose}
      foot={<>
        <button className="btn btn-out" onClick={onClose}>Cerrar</button>
        <a href="/cliente/pedidos" className="btn btn-pri">Ver pedidos</a>
      </>}>
      {!items.length
        ? <div className="vmb-empty"><span className="vmb-empty__ico">🚚</span><span className="vmb-empty__txt">Sin envíos en camino</span></div>
        : items.map(e => (
          <div key={e.id_pedido} className="m-item">
            <div className="m-item__row">
              <div>
                <div className="m-item__id">#VM{e.id_pedido}</div>
                <div className="m-item__meta">Total: {fmt(e.total)}</div>
                <div className="m-item__meta">Guía: <span className="m-item__hl">{e.guia_aerea || "Pendiente"}</span></div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div className="m-item__datelbl">Llegada estimada</div>
                <div className="m-item__date">{e.fecha_llegada_bolivia || "Por confirmar"}</div>
                <span className="m-item__badge" style={{ background:"var(--blue)", color:"#fff" }}>En tránsito</span>
              </div>
            </div>
          </div>
        ))
      }
    </Modal>
  );
}

/* ─── Modal Cotizaciones ───────────────────────────────────────────────── */
function ModalCots({ items, onClose, onNueva }) {
  return (
    <Modal title="Cotizaciones" onClose={onClose}
      foot={<>
        <button className="btn btn-out" onClick={onClose}>Cerrar</button>
        <button className="btn btn-pri" onClick={onNueva}>Nueva cotización</button>
      </>}>
      {!items.length
        ? <div className="vmb-empty"><span className="vmb-empty__ico">💵</span><span className="vmb-empty__txt">Sin cotizaciones pendientes</span></div>
        : items.map(c => (
          <div key={c.id_cotizacion} className="m-item">
            <div className="m-item__row">
              <div>
                <div className="m-item__id" style={{ fontSize:18 }}>#{c.id_cotizacion}</div>
                <div className="m-item__meta">{c.nombre_producto}</div>
                <div className="m-item__meta">Base: {fmt(c.precio_base)} · {c.peso}kg</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontFamily:"var(--font-d)", fontSize:24, color:"var(--green)", letterSpacing:2 }}>{fmt(c.costo_total)}</div>
                <span className="m-item__badge" style={{ background:"var(--amber)", color:"#000" }}>Pendiente</span>
              </div>
            </div>
          </div>
        ))
      }
    </Modal>
  );
}

/* ─── Modal Carrito ────────────────────────────────────────────────────── */
function ModalCarrito({ items, total, onClose }) {
  return (
    <Modal title="Tu carrito" onClose={onClose}
      foot={<>
        <button className="btn btn-out" onClick={onClose}>Seguir comprando</button>
        {items.length > 0 && <a href="/cliente/carrito" className="btn btn-pri">Ir al carrito →</a>}
      </>}>
      {!items.length
        ? <div className="vmb-empty"><span className="vmb-empty__ico">🛒</span><span className="vmb-empty__txt">Carrito vacío</span></div>
        : <>
          {items.map(item => (
            <div key={item.id_carrito} className="cart-item">
              <img className="cart-item__img" src={item.imagen_url || ""}
                alt={item.nombre}
                onError={e => { e.target.onerror=null; e.target.src="https://via.placeholder.com/56x56/0d1117/3b82f6?text=IMG"; }} />
              <div style={{ flex:1 }}>
                <div className="cart-item__name">{item.nombre}</div>
                <div className="cart-item__qty">{fmt(item.precio)} × {item.cantidad}</div>
              </div>
              <span className="cart-item__price">{fmt(item.precio * item.cantidad)}</span>
            </div>
          ))}
          <div className="cart-total">
            <span className="cart-total__lbl">Total</span>
            <span className="cart-total__val">{fmt(total)}</span>
          </div>
        </>
      }
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PÁGINA PRINCIPAL
══════════════════════════════════════════════════════════════════════════ */
export default function ClienteDashboard() {
  const router = useRouter();
  // ✅ useTheme integrado — aplica clase "light" o "dark" al root
  const { theme } = useTheme();

  const [user,  setUser]  = useState(null);
  const [token, setToken] = useState("");
  const [data,  setData]  = useState(null);
  const [load,  setLoad]  = useState(true);

  /* Modales */
  const [mAdd,   setMAdd]   = useState(null);
  const [mEnv,   setMEnv]   = useState(false);
  const [mCots,  setMCots]  = useState(false);
  const [mCart,  setMCart]  = useState(false);
  const [mCot,   setMCot]   = useState(false);
  const [toast,  setToast]  = useState("");

  const showToast = useCallback(msg => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }, []);

  useEffect(() => {
    const u = JSON.parse(sessionStorage.getItem("user") || "null");
    const t = document.cookie.split(";").find(c => c.trim().startsWith("access_token="))?.split("=")[1];
    if (!t || !u) return router.push("/login");
    setUser(u); setToken(t);
    fetch(`${API}/cliente/dashboard`, { headers:{ Authorization:`Bearer ${t}` } })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(d  => { setData(d); setLoad(false); })
      .catch(() => { setLoad(false); router.push("/login"); });
  }, [router]);

  /* Loading */
  if (load) return (
    // ✅ clase de tema en el loading también
    <div className={`vmb-loading ${theme}`}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div className="vmb-loading__ring" />
      <span className="vmb-loading__text">CARGANDO</span>
    </div>
  );
  if (!data) return null;

  const {
    stats                   = {},
    envios_camino           = [],
    carrito_items           = [],
    total_carrito_monto     = 0,
    cotizaciones_pendientes = [],
    productos_por_categoria = {},
    productos_externos      = [],
    productos_destacados    = [],
    tipo_cambio             = 9.17,
  } = data;

  const CAT = {
    electronico:{ icon:"", label:"Electrónico" },
    ropa:       { icon:"", label:"Ropa"        },
    hogar:      { icon:"", label:"Hogar"       },
    deportes:   { icon:"", label:"Deportes"    },
    otros:      { icon:"", label:"Otros"       },
  };

  return (
    // ✅ Clase "dark" o "light" en el root — dashboard.css debe usar estas clases para sus variables
    <div className={`vmb-root ${theme}`}>
      <ClienteSidebar user={user} carritoCount={stats?.total_carrito || 0} />

      <main className="vmb-main">

        {/* Toast */}
        {toast && <div className="vmb-toast">✓ {toast}</div>}

        {/* ── Hero ─────────────────────────────────────────────────── */}
        <header className="vmb-hero">
          <div className="vmb-hero__inner">
            <div>
              <div className="vmb-hero__eyebrow">
                <span className="vmb-hero__tag">Panel de cliente</span>
                <span className="vmb-hero__pulse" />
                <span className="vmb-hero__live">VMBol en Red</span>
              </div>
              <h1 className="vmb-hero__name">
                Hola,&nbsp;<span>{user?.nombre?.split(" ")[0] || "bienvenido"}</span>
              </h1>
              <p className="vmb-hero__sub">Tu tienda de importación personal — todo en un lugar</p>
            </div>

            <button className="btn btn-pri" onClick={() => setMCot(true)}>
              Cotización rápida
            </button>
          </div>
        </header>

        {/* ── Métricas ─────────────────────────────────────────────── */}
        <div className="vmb-metrics">
          <Metric val={stats?.total_pedidos || 0}           lbl="Pedidos activos"  hint="Ver pedidos"    onClick={() => router.push("/cliente/pedidos")} />
          <Metric val={stats?.envios_camino || 0}           lbl="En camino"        hint="Seguimiento"    onClick={() => setMEnv(true)} />
          <Metric val={stats?.cotizaciones_pendientes || 0} lbl="Cotizaciones"     hint="Ver detalle"    onClick={() => setMCots(true)} />
          <Metric val={stats?.total_carrito || 0}           lbl="En carrito"       hint="Ir al carrito"  onClick={() => setMCart(true)} />
        </div>

        {/* ── Amazon & eBay ────────────────────────────────────────── */}
        {productos_externos.length > 0 && (
          <Section label="Amazon" accent="& eBay" href="/cliente/tienda">
            <Carrusel prods={productos_externos} tc={tipo_cambio} onAdd={setMAdd} />
          </Section>
        )}

        {/* ── Por categoría ────────────────────────────────────────── */}
        {Object.entries(productos_por_categoria).map(([cat, prods]) => {
          const info = CAT[cat] || { icon:"", label: cat };
          return (
            <Section key={cat} label={info.icon} accent={info.label} href={`/cliente/tienda?categoria=${cat}`}>
              <Carrusel prods={prods} tc={tipo_cambio} onAdd={setMAdd} />
            </Section>
          );
        })}

        {/* ── Destacados ───────────────────────────────────────────── */}
        {productos_destacados.length > 0 && (
          <Section label="" accent="Destacados" href="/cliente/tienda">
            <Carrusel prods={productos_destacados} tc={tipo_cambio} onAdd={setMAdd} />
          </Section>
        )}

      </main>

      {/* ── Modales ────────────────────────────────────────────────── */}
      {mAdd  && <ModalAddCart prod={mAdd} tc={tipo_cambio} token={token} onClose={() => setMAdd(null)} onOk={msg => { showToast(msg); window.location.reload(); }} />}
      {mEnv  && <ModalEnvios  items={envios_camino}        onClose={() => setMEnv(false)} />}
      {mCots && <ModalCots    items={cotizaciones_pendientes} onClose={() => setMCots(false)} onNueva={() => { setMCots(false); setMCot(true); }} />}
      {mCart && <ModalCarrito items={carrito_items} total={total_carrito_monto} onClose={() => setMCart(false)} />}
      {mCot  && <ModalCot     tc={tipo_cambio} token={token} onClose={() => setMCot(false)} />}
    </div>
  );
}