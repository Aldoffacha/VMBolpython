"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ShoppingCart } from "lucide-react";

export default function LandingNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [guestCount, setGuestCount] = useState(0);

  const isLogged = typeof window !== "undefined" && document.cookie.includes("access_token=");

  useEffect(() => {
    try {
      const cart = JSON.parse(localStorage.getItem("guest_cart") || "[]");
      setGuestCount(cart.length);
    } catch {
      setGuestCount(0);
    }
  }, []);

  const handleCartClick = () => {
    router.push(isLogged ? "/cliente/carrito" : "/login");
  };

  const isActive = (path) => pathname === path;

  return (
    <>
      <style>{`
        .lp-nav {
          position: fixed; top: 0; left: 0; right: 0;
          z-index: 100;
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 28px;
          background: rgba(13,15,18,0.9);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(37,99,235,0.3);
        }

        .lp-nav__brand {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 24px; font-weight: 400;
          color: #3b82f6;
          letter-spacing: 0.08em;
          text-decoration: none;
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
          font-family: 'Barlow', sans-serif;
        }
        .lp-nav__link:hover { color: #3b82f6; }
        .lp-nav__link.active { color: #3b82f6; font-weight: 600; }

        .lp-nav__right { display: flex; gap: 12px; align-items: center; }

        .lp-nav__cart-btn {
          position: relative;
          padding: 8px 12px;
          background: transparent;
          border: 1px solid rgba(37,99,235,0.3);
          border-radius: 8px;
          color: #e8e4e0;
          cursor: pointer;
          font-size: 16px;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: border-color 0.2s;
        }
        .lp-nav__cart-btn:hover { border-color: #3b82f6; }
        .lp-nav__cart-badge {
          position: absolute;
          top: -6px; right: -6px;
          background: #3b82f6;
          color: #fff;
          border-radius: 50%;
          width: 18px; height: 18px;
          font-size: 10px; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
        }

        .lp-nav__login {
          padding: 8px 18px;
          background: linear-gradient(135deg, #2563eb, #3b82f6);
          border: none; border-radius: 8px;
          color: #fff; font-family: 'Barlow', sans-serif;
          font-size: 13px; font-weight: 600;
          cursor: pointer; text-decoration: none;
          letter-spacing: 0.05em;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .lp-nav__login:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(37,99,235,0.45);
        }
      `}</style>

      <nav className="lp-nav">
        <Link href="/" className="lp-nav__brand">VMBol en Red</Link>

        <div className="lp-nav__links">
          <Link href="/" className={`lp-nav__link ${isActive("/") ? "active" : ""}`}>Dashboard</Link>
          <Link href="/tienda" className={`lp-nav__link ${isActive("/tienda") ? "active" : ""}`}>Tienda</Link>
          <Link href="/conocenos" className={`lp-nav__link ${isActive("/conocenos") ? "active" : ""}`}>Conócenos</Link>
          <Link href="/ubicanos" className={`lp-nav__link ${isActive("/ubicanos") ? "active" : ""}`}>Ubícanos</Link>
          <Link href="/contactanos" className={`lp-nav__link ${isActive("/contactanos") ? "active" : ""}`}>Contáctanos</Link>
        </div>

        <div className="lp-nav__right">
          <button className="lp-nav__cart-btn" onClick={handleCartClick}>
            <ShoppingCart size={18} />
            {guestCount > 0 && <span className="lp-nav__cart-badge">{guestCount}</span>}
          </button>
          <Link href="/login" className="lp-nav__login">Iniciar Sesi&oacute;n</Link>
        </div>
      </nav>
    </>
  );
}
