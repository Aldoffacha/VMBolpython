"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart, X, Check } from "lucide-react";
import "@/styles/dashboard.css";

const API = "http://localhost:8000";

const SLIDES = [
  {
    bg: "linear-gradient(135deg, #0d0f12 0%, #1a0a0e 50%, #0d0f12 100%)",
    title: "Quiénes Somos",
    subtitle: "VMBol en Red — Importación directa desde Amazon y eBay",
    desc: "Somos una plataforma boliviana que te permite comprar productos internacionales con importación incluida. Precios transparentes, sin sorpresas.",
  },
  {
    bg: "linear-gradient(135deg, #0d0f12 0%, #0d1a12 50%, #0d0f12 100%)",
    title: "Contáctanos",
    subtitle: "Estamos aquí para ayudarte",
    desc: "¿Dudas sobre tu pedido? ¿Necesitas cotizar un producto? Escríbenos y te responderemos a la brevedad.",
  },
  {
    bg: "linear-gradient(135deg, #0d0f12 0%, #120d1a 50%, #0d0f12 100%)",
    title: "Explora toda la tienda",
    subtitle: "Miles de productos con importación calculada al instante",
    desc: "Busca en Amazon y eBay, agrega al carrito y recibe en la puerta de tu casa. Todo con un solo clic.",
    cta: "Ir a la tienda",
    ctaLink: "/tienda",
  },
];

export default function HomePage() {
  const router = useRouter();
  const [slide, setSlide] = useState(0);
  const intervalRef = useRef(null);
  const trackRef = useRef(null);
  const [guestCount, setGuestCount] = useState(0);

  const isLogged = typeof window !== "undefined" && document.cookie.includes("access_token=");
  const isRojo = true;

  const c = {
    prim: isRojo ? "#9a031e" : "#2563eb",
    bright: isRojo ? "#c1121f" : "#3b82f6",
    glow: isRojo ? "rgba(154,3,30,0.45)" : "rgba(37,99,235,0.45)",
    border: isRojo ? "rgba(154,3,30,0.3)" : "rgba(37,99,235,0.3)",
    card: "rgba(18,21,26,0.85)",
  };

  const handleCartClick = () => {
    if (isLogged) {
      router.push("/cliente/carrito");
    } else {
      router.push("/login");
    }
  };

  useEffect(() => {
    const cart = JSON.parse(localStorage.getItem("guest_cart") || "[]");
    setGuestCount(cart.length);

    intervalRef.current = setInterval(() => {
      setSlide(s => (s + 1) % SLIDES.length);
    }, 6000);
    return () => clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    if (trackRef.current) {
      trackRef.current.style.transform = `translateX(-${slide * 100}%)`;
    }
  }, [slide]);

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

        .lp-nav {
          position: fixed; top: 0; left: 0; right: 0;
          z-index: 100;
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 28px;
          background: rgba(13,15,18,0.9);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid ${c.border};
          transition: border-color 0.4s;
        }

        .lp-nav__brand {
          font-family: 'Cormorant Garamond', serif;
          font-size: 20px; font-weight: 700;
          color: ${c.bright};
          letter-spacing: 0.06em;
          text-decoration: none;
          transition: color 0.4s;
        }

        .lp-nav__links { display: flex; gap: 24px; align-items: center; }

        .lp-nav__link {
          font-size: 13px; font-weight: 500;
          color: #7a7570;
          text-decoration: none;
          letter-spacing: 0.04em;
          transition: color 0.2s;
          cursor: pointer;
          background: none; border: none;
          font-family: 'DM Sans', sans-serif;
        }
        .lp-nav__link:hover { color: ${c.bright}; }
        .lp-nav__link.active { color: ${c.bright}; font-weight: 600; }

        .lp-nav__right { display: flex; gap: 12px; align-items: center; }

        .lp-nav__cart-btn {
          position: relative;
          padding: 8px 12px;
          background: transparent;
          border: 1px solid ${c.border};
          border-radius: 8px;
          color: #e8e4e0;
          cursor: pointer;
          font-size: 16px;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: border-color 0.2s, color 0.4s;
        }
        .lp-nav__cart-btn:hover { border-color: ${c.bright}; }
        .lp-nav__cart-badge {
          position: absolute;
          top: -6px; right: -6px;
          background: ${c.bright};
          color: #fff;
          border-radius: 50%;
          width: 18px; height: 18px;
          font-size: 10px; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
        }

        .lp-nav__login {
          padding: 8px 18px;
          background: linear-gradient(135deg, ${c.prim}, ${c.bright});
          border: none; border-radius: 8px;
          color: #fff; font-family: 'DM Sans', sans-serif;
          font-size: 13px; font-weight: 600;
          cursor: pointer; text-decoration: none;
          letter-spacing: 0.05em;
          transition: transform 0.2s, box-shadow 0.2s, background 0.4s;
        }
        .lp-nav__login:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 16px ${c.glow};
        }

        .lp-hero {
          height: 100vh;
          overflow: hidden;
          position: relative;
        }

        .lp-hero__track {
          display: flex;
          height: 100%;
          transition: transform 0.8s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .lp-hero__slide {
          min-width: 100%;
          height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 100px 28px 60px;
          text-align: center;
          position: relative;
        }

        .lp-hero__slide::before {
          content: '';
          position: absolute; inset: 0;
          background: radial-gradient(ellipse 60% 50% at 50% 40%, ${c.glow} 0%, transparent 70%);
          pointer-events: none;
          transition: background 0.4s;
        }

        .lp-hero__tag {
          display: inline-block;
          padding: 5px 14px;
          border-radius: 20px;
          font-size: 11px; font-weight: 600;
          letter-spacing: 0.12em; text-transform: uppercase;
          background: ${c.border};
          color: ${c.bright};
          margin-bottom: 20px;
          transition: background 0.4s, color 0.4s;
        }

        .lp-hero__title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(36px, 8vw, 64px);
          font-weight: 700;
          color: #e8e4e0;
          line-height: 1.05;
          margin-bottom: 16px;
          max-width: 700px;
        }

        .lp-hero__sub {
          font-size: clamp(14px, 2.5vw, 18px);
          color: #7a7570;
          font-weight: 300;
          margin-bottom: 14px;
        }

        .lp-hero__desc {
          font-size: clamp(13px, 2vw, 15px);
          color: #7a7570;
          max-width: 520px;
          line-height: 1.6;
          margin-bottom: 28px;
          opacity: 0.8;
        }

        .lp-hero__cta {
          display: inline-block;
          padding: 13px 32px;
          background: linear-gradient(135deg, ${c.prim}, ${c.bright});
          border: none; border-radius: 10px;
          color: #fff;
          font-family: 'Cormorant Garamond', serif;
          font-size: 16px; font-weight: 600;
          letter-spacing: 0.08em;
          cursor: pointer; text-decoration: none;
          transition: transform 0.25s, box-shadow 0.25s, background 0.4s;
        }
        .lp-hero__cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 28px ${c.glow};
        }

        .lp-hero__dots {
          position: absolute;
          bottom: 32px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 10px;
          z-index: 10;
        }

        .lp-hero__dot {
          width: 10px; height: 10px;
          border-radius: 50%;
          border: 1.5px solid ${c.border};
          background: transparent;
          cursor: pointer;
          transition: background 0.3s, transform 0.3s, border-color 0.4s;
        }
        .lp-hero__dot.active {
          background: ${c.bright};
          border-color: ${c.bright};
          transform: scale(1.3);
          box-shadow: 0 0 8px ${c.glow};
        }

        .lp-hero__arrows {
          position: absolute;
          top: 50%;
          left: 0; right: 0;
          transform: translateY(-50%);
          display: flex;
          justify-content: space-between;
          padding: 0 20px;
          z-index: 10;
          pointer-events: none;
        }

        .lp-hero__arrow {
          width: 44px; height: 44px;
          border-radius: 50%;
          border: 1px solid ${c.border};
          background: ${c.card};
          backdrop-filter: blur(8px);
          cursor: pointer;
          font-size: 20px;
          color: #e8e4e0;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.2s, border-color 0.4s;
          pointer-events: auto;
        }
        .lp-hero__arrow:hover {
          border-color: ${c.bright};
          background: rgba(154,3,30,0.15);
        }

        .lp-hero__scroll {
          position: absolute;
          bottom: 70px;
          right: 28px;
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          color: #7a7570;
          font-size: 10px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          opacity: 0.5;
        }
        .lp-hero__scroll-line {
          width: 1px; height: 40px;
          background: #7a7570;
        }
      `}</style>

      <nav className="lp-nav">
        <Link href="/" className="lp-nav__brand">VMBol en Red</Link>
        <div className="lp-nav__links">
          <Link href="/" className="lp-nav__link active">Dashboard</Link>
          <Link href="/tienda" className="lp-nav__link">Tienda</Link>
        </div>
        <div className="lp-nav__right">
          <button className="lp-nav__cart-btn" onClick={handleCartClick}>
            <ShoppingCart size={18} />
            {guestCount > 0 && <span className="lp-nav__cart-badge">{guestCount}</span>}
          </button>
          <Link href="/login" className="lp-nav__login">Iniciar Sesi&oacute;n</Link>
        </div>
      </nav>

      <section className="lp-hero">
        <div className="lp-hero__track" ref={trackRef}>
          {SLIDES.map((s, i) => (
            <div key={i} className="lp-hero__slide" style={{ background: s.bg }}>
              <span className="lp-hero__tag">
                {i === 0 ? "Nosotros" : i === 1 ? "Contacto" : "Tienda"}
              </span>
              <h1 className="lp-hero__title">{s.title}</h1>
              <p className="lp-hero__sub">{s.subtitle}</p>
              <p className="lp-hero__desc">{s.desc}</p>
              {s.cta && (
                <Link href={s.ctaLink} className="lp-hero__cta">{s.cta}</Link>
              )}
            </div>
          ))}
        </div>

        <div className="lp-hero__arrows">
          <button className="lp-hero__arrow" onClick={() => setSlide(s => (s - 1 + SLIDES.length) % SLIDES.length)}>‹</button>
          <button className="lp-hero__arrow" onClick={() => setSlide(s => (s + 1) % SLIDES.length)}>›</button>
        </div>

        <div className="lp-hero__dots">
          {SLIDES.map((_, i) => (
            <button key={i} className={`lp-hero__dot ${i === slide ? "active" : ""}`} onClick={() => setSlide(i)} />
          ))}
        </div>

        <div className="lp-hero__scroll">
          <span>Desliza</span>
          <div className="lp-hero__scroll-line" />
        </div>
      </section>
    </div>
  );
}
