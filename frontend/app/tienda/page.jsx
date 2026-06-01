"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart, X, Check, Search, ChevronLeft, ChevronRight } from "lucide-react";
import "@/styles/dashboard.css";

const API = "http://localhost:8000";

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

const PLAT = {
  amazon:{ bg:"#f59e0b", col:"#000", txt:"Amazon" },
  ebay:  { bg:"#3b82f6", col:"#fff", txt:"eBay"   },
};

function ProdCard({ prod, tc, onAdd }) {
  const cot  = calcImport(parseFloat(prod.precio||0), prod.peso||.5, prod.categoria||"otros", 20, 15, 1, tc);
  const plat = PLAT[prod.plataforma] || { bg:"#10b981", col:"#fff", txt:"Local" };
  const img  = prod.imagen_url || prod.imagen || "";
  const key  = prod.id_producto || prod.id_producto_externo || prod.id_producto_exterior;

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
            key={p.id_producto || p.id_producto_externo || p.id_producto_exterior}
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

function Section({ label, accent, children }) {
  return (
    <section className="vmb-section">
      <div className="vmb-section__head">
        <h2 className="vmb-section__title">
          {label} {accent && <em>{accent}</em>}
        </h2>
      </div>
      {children}
    </section>
  );
}

function Modal({ title, onClose, foot, wide, children }) {
  return (
    <div className="m-overlay">
      <div className={`m-box${wide ? " m-box--wide" : ""}`}>
        <div className="m-head">
          <h3 className="m-head__title">{title}</h3>
          <button className="m-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="m-body">{children}</div>
        {foot && <div className="m-foot">{foot}</div>}
      </div>
    </div>
  );
}

function GuestModalAddCart({ prod, tc, onClose, onOk }) {
  const [qty, setQty] = useState(1);
  if (!prod) return null;

  const esExt = prod.plataforma && prod.plataforma !== "local";
  const cot   = calcImport(parseFloat(prod.precio||0), prod.peso||.5, prod.categoria||"otros", 20, 15, 1, tc);
  const img   = prod.imagen_url || prod.imagen || "";

  const confirmar = () => {
    const cart = JSON.parse(localStorage.getItem("guest_cart") || "[]");
    const id = prod.id_producto || prod.id_producto_externo || prod.id_producto_exterior;
    const idx = cart.findIndex(i => {
      const iid = i.id_producto || i.id_producto_externo || i.id;
      return iid === id;
    });
    if (idx >= 0) {
      cart[idx].qty = (cart[idx].qty || 1) + qty;
    } else {
      if (esExt) {
        cart.push({
          id, nombre: prod.nombre, precio: prod.precio,
          peso: prod.peso || 0.5, categoria: prod.categoria || "electronico",
          plataforma: prod.plataforma, enlace: prod.enlace || "",
          qty, imagen_url: prod.imagen_url || "",
        });
      } else {
        cart.push({
          id, nombre: prod.nombre, precio: prod.precio,
          imagen_url: prod.imagen_url || "", categoria: prod.categoria || "otros", qty,
        });
      }
    }
    localStorage.setItem("guest_cart", JSON.stringify(cart));
    onOk("Producto agregado al carrito");
    onClose();
  };

  return (
    <Modal title="Agregar al carrito" onClose={onClose}
      foot={<>
        <button className="btn btn-out" onClick={onClose}>Cancelar</button>
        <button className="btn btn-pri" onClick={confirmar}>Confirmar</button>
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

export default function TiendaPage() {
  const router = useRouter();

  const [data,   setData]   = useState(null);
  const [load,   setLoad]   = useState(true);
  const [tc,     setTc]     = useState(9.17);
  const [mAdd,   setMAdd]   = useState(null);
  const [toast,  setToast]  = useState("");
  const [guestCount, setGuestCount] = useState(0);

  const isLogged = typeof window !== "undefined" && document.cookie.includes("access_token=");

  const showToast = msg => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const updateGuestCount = () => {
    const cart = JSON.parse(localStorage.getItem("guest_cart") || "[]");
    setGuestCount(cart.length);
  };

  const handleCartClick = () => {
    if (isLogged) {
      router.push("/cliente/carrito");
    } else {
      router.push("/login");
    }
  };

  useEffect(() => {
    updateGuestCount();
    fetch(`${API}/publico/productos`)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(d => { setData(d); setLoad(false); })
      .catch(() => { setLoad(false); });
  }, []);

  const CAT = {
    electronico:{ icon:"", label:"Electrónico" },
    ropa:       { icon:"", label:"Ropa"        },
    hogar:      { icon:"", label:"Hogar"       },
    deportes:   { icon:"", label:"Deportes"    },
    otros:      { icon:"", label:"Otros"       },
  };

  const productos_locales = data?.productos_locales || [];
  const amazon = data?.amazon || [];
  const ebay = data?.ebay || [];
  const externos = [...amazon, ...ebay];
  const productos_por_categoria = {};
  for (const p of productos_locales) {
    const cat = p.categoria || "otros";
    if (!productos_por_categoria[cat]) productos_por_categoria[cat] = [];
    if (productos_por_categoria[cat].length < 8) productos_por_categoria[cat].push(p);
  }

  return (
    <div style={{
      background: "#0d0f12",
      color: "#e8e4e0",
      minHeight: "100vh",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .tnd-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 28px;
          background: rgba(13,15,18,0.9);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(154,3,30,0.3);
        }
        .tnd-nav__brand {
          font-family: 'Cormorant Garamond', serif;
          font-size: 20px; font-weight: 700;
          color: #c1121f;
          letter-spacing: 0.06em;
          text-decoration: none;
        }
        .tnd-nav__links { display: flex; gap: 24px; align-items: center; }
        .tnd-nav__link {
          font-size: 13px; font-weight: 500;
          color: #7a7570;
          text-decoration: none;
          letter-spacing: 0.04em;
          transition: color 0.2s;
          cursor: pointer;
          background: none; border: none;
          font-family: 'DM Sans', sans-serif;
        }
        .tnd-nav__link:hover, .tnd-nav__link.active { color: #c1121f; font-weight: 600; }

        .tnd-nav__right { display: flex; gap: 12px; align-items: center; }

        .tnd-cart-btn {
          position: relative;
          padding: 8px 12px;
          background: transparent;
          border: 1px solid rgba(154,3,30,0.3);
          border-radius: 8px;
          color: #e8e4e0;
          cursor: pointer;
          font-size: 16px;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: border-color 0.2s;
        }
        .tnd-cart-btn:hover { border-color: #c1121f; }
        .tnd-cart-badge {
          position: absolute;
          top: -6px; right: -6px;
          background: #c1121f; color: #fff;
          border-radius: 50%;
          width: 18px; height: 18px;
          font-size: 10px; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
        }
        .tnd-login-btn {
          padding: 8px 18px;
          background: linear-gradient(135deg, #9a031e, #c1121f);
          border: none; border-radius: 8px;
          color: #fff; font-family: 'DM Sans', sans-serif;
          font-size: 13px; font-weight: 600;
          cursor: pointer; text-decoration: none;
          letter-spacing: 0.05em;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .tnd-login-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(154,3,30,0.45);
        }

        .tnd-hero {
          padding: 100px 28px 50px;
          text-align: center;
          background:
            radial-gradient(ellipse 60% 50% at 50% 35%, rgba(154,3,30,0.35) 0%, transparent 70%),
            radial-gradient(ellipse 40% 30% at 80% 80%, rgba(37,99,235,0.08) 0%, transparent 60%);
        }
        .tnd-hero__tag {
          display: inline-block;
          padding: 5px 14px; border-radius: 20px;
          font-size: 11px; font-weight: 600;
          letter-spacing: 0.12em; text-transform: uppercase;
          background: rgba(154,3,30,0.3); color: #c1121f;
          margin-bottom: 16px;
        }
        .tnd-hero__title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(36px, 6vw, 52px);
          font-weight: 700;
          color: #e8e4e0;
          line-height: 1.05;
          margin-bottom: 10px;
        }
        .tnd-hero__title span { color: #c1121f; }
        .tnd-hero__sub {
          font-size: clamp(14px, 2vw, 17px);
          color: #7a7570;
          font-weight: 300;
          max-width: 500px;
          margin: 0 auto 24px;
        }
        .tnd-hero__stats {
          display: flex;
          justify-content: center;
          gap: 40px;
          flex-wrap: wrap;
        }
        .tnd-hero__stat {
          text-align: center;
        }
        .tnd-hero__stat-num {
          font-family: 'Cormorant Garamond', serif;
          font-size: 28px;
          font-weight: 700;
          color: #c1121f;
        }
        .tnd-hero__stat-lbl {
          font-size: 11px;
          color: #7a7570;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .tnd-body {
          max-width: 1400px;
          margin: 0 auto;
          padding: 10px 28px 60px;
        }

        .tnd-toast {
          position: fixed;
          bottom: 30px; left: 50%;
          transform: translateX(-50%);
          z-index: 9999;
          background: #10b981;
          color: #fff;
          padding: 12px 24px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.5);
          animation: tin 0.3s ease;
        }
        @keyframes tin {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        .tnd-footer {
          text-align: center;
          padding: 24px 16px;
          margin-top: 20px;
          border-top: 1px solid rgba(154,3,30,0.15);
          color: #7a7570;
          font-size: 13px;
        }
        .tnd-footer a {
          color: #c1121f;
          font-weight: 600;
          text-decoration: none;
        }

        .tnd-loading {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          min-height: 60vh; gap: 16px;
        }
        .tnd-loading__ring {
          width: 36px; height: 36px;
          border: 3px solid rgba(154,3,30,0.2);
          border-top-color: #c1121f;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        .tnd-loading__text {
          font-family: 'Cormorant Garamond', serif;
          font-size: 14px;
          letter-spacing: 4px;
          color: #7a7570;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <nav className="tnd-nav">
        <Link href="/" className="tnd-nav__brand">VMBol en Red</Link>
        <div className="tnd-nav__links">
          <Link href="/" className="tnd-nav__link">Inicio</Link>
          <Link href="/tienda" className="tnd-nav__link active">Tienda</Link>
        </div>
        <div className="tnd-nav__right">
          <button className="tnd-cart-btn" onClick={handleCartClick}>
            <ShoppingCart size={18} />
            {guestCount > 0 && <span className="tnd-cart-badge">{guestCount}</span>}
          </button>
          {!isLogged ? (
            <Link href="/login" className="tnd-login-btn">Iniciar Sesi&oacute;n</Link>
          ) : (
            <Link href="/cliente/dashboard" className="tnd-login-btn">Mi Panel</Link>
          )}
        </div>
      </nav>

      <section className="tnd-hero">
        <span className="tnd-hero__tag">Tienda Pública</span>
        <h1 className="tnd-hero__title">
          Tu <span>Tienda</span> de Importación
        </h1>
        <p className="tnd-hero__sub">
          Productos locales y de importación desde USA — Agrega al carrito y paga cuando quieras
        </p>
        {!load && (
          <div className="tnd-hero__stats">
            <div className="tnd-hero__stat">
              <div className="tnd-hero__stat-num">{productos_locales.length + externos.length}</div>
              <div className="tnd-hero__stat-lbl">Productos</div>
            </div>
            <div className="tnd-hero__stat">
              <div className="tnd-hero__stat-num">{externos.length}</div>
              <div className="tnd-hero__stat-lbl">Importaci&oacute;n</div>
            </div>
            <div className="tnd-hero__stat">
              <div className="tnd-hero__stat-num">{Object.keys(productos_por_categoria).length}</div>
              <div className="tnd-hero__stat-lbl">Categor&iacute;as</div>
            </div>
          </div>
        )}
      </section>

      {toast && <div className="tnd-toast"><Check size={14} /> {toast}</div>}

      <div className="tnd-body">
        {load ? (
          <div className="tnd-loading">
            <div className="tnd-loading__ring" />
            <span className="tnd-loading__text">CARGANDO PRODUCTOS</span>
          </div>
        ) : (
          <>
            {externos.length > 0 && (
              <Section label="Amazon" accent="& eBay">
                <Carrusel prods={externos} tc={tc} onAdd={setMAdd} />
              </Section>
            )}

            {Object.entries(productos_por_categoria).map(([cat, prods]) => {
              const info = CAT[cat] || { icon:"", label: cat };
              return (
                <Section key={cat} label={info.icon} accent={info.label}>
                  <Carrusel prods={prods} tc={tc} onAdd={setMAdd} />
                </Section>
              );
            })}

            {productos_locales.length > 0 && (
              <Section label="" accent="Todos los productos">
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(260px, 1fr))", gap:"20px" }}>
                  {productos_locales.map(p => (
                    <ProdCard key={p.id_producto} prod={p} tc={tc} onAdd={setMAdd} />
                  ))}
                </div>
              </Section>
            )}
          </>
        )}

        <div className="tnd-footer">
          {guestCount > 0 ? (
            <>Tienes <strong>{guestCount}</strong> producto{guestCount !== 1 ? "s" : ""} en tu carrito. <a href="/login">Inicia sesi&oacute;n</a> para pagar.</>
          ) : (
            <><a href="/login">Inicia sesi&oacute;n</a> o <a href="/register">reg&iacute;strate</a> para gestionar tus pedidos.</>
          )}
        </div>
      </div>

      {mAdd && (
        <GuestModalAddCart
          prod={mAdd} tc={tc}
          onClose={() => { setMAdd(null); updateGuestCount(); }}
          onOk={msg => { showToast(msg); updateGuestCount(); }}
        />
      )}
    </div>
  );
}
