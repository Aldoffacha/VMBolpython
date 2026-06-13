"use client";

import LandingNav from "@/components/LandingNav";

const CONTACTOS = [
  {
    label: "WhatsApp",
    value: "+591 700 000 00",
    href: "https://wa.me/59170000000",
    desc: "Respuesta rápida en minutos",
  },
  {
    label: "Correo Electrónico",
    value: "info@vmbolenred.com",
    href: "mailto:info@vmbolenred.com",
    desc: "Te respondemos en 24 horas",
  },
  {
    label: "Facebook",
    value: "/VMBolEnRed",
    href: "https://facebook.com/VMBolEnRed",
    desc: "Síguenos para novedades",
  },
  {
    label: "Instagram",
    value: "@vmbolenred",
    href: "https://instagram.com/vmbolenred",
    desc: "Contenido visual exclusivo",
  },
  {
    label: "Teléfonos",
    value: "+591 2 000 0000",
    href: "tel:+59120000000",
    desc: "Llámanos en horario laboral",
  },
];

const ICON_MAP = {
  WhatsApp: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21"/><path d="M9 10a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1H9z"/><path d="M9 13a.5.5 0 0 0 0 1h4a.5.5 0 0 0 0-1H9z"/>
    </svg>
  ),
  Correo: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 7L2 7"/>
    </svg>
  ),
  Facebook: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
    </svg>
  ),
  Instagram: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
    </svg>
  ),
  Teléfono: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  ),
};

export default function ContactanosPage() {
  return (
    <div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600;700&family=Barlow+Condensed:wght@300;400;600;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body { background: #0d0f12; }

        .ct-hero {
          padding: 140px 28px 50px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .ct-hero::before {
          content: '';
          position: absolute;
          top: -200px; left: 50%;
          transform: translateX(-50%);
          width: 600px; height: 600px;
          background: radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 60%);
          pointer-events: none;
        }

        .ct-hero__title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(48px, 8vw, 80px);
          letter-spacing: 8px;
          color: #e8e4e0;
          text-transform: uppercase;
          margin-bottom: 12px;
        }

        .ct-hero__title span { color: #3b82f6; }

        .ct-hero__sub {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 14px;
          letter-spacing: 4px;
          text-transform: uppercase;
          color: #7a7570;
        }

        .ct-list {
          max-width: 640px;
          margin: 0 auto;
          padding: 0 28px 80px;
        }

        .ct-item {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 20px 24px;
          text-decoration: none;
          border-bottom: 1px solid rgba(37,99,235,0.1);
          transition: background 0.25s, border-color 0.25s;
          border-radius: 4px;
          margin-bottom: 2px;
          cursor: pointer;
        }
        .ct-item:hover {
          background: rgba(37,99,235,0.06);
          border-bottom-color: rgba(37,99,235,0.25);
        }

        .ct-item__icon {
          width: 48px; height: 48px;
          border-radius: 12px;
          background: rgba(37,99,235,0.1);
          border: 1px solid rgba(37,99,235,0.18);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          color: #3b82f6;
          transition: background 0.25s, border-color 0.25s;
        }
        .ct-item:hover .ct-item__icon {
          background: rgba(37,99,235,0.18);
          border-color: rgba(37,99,235,0.35);
        }

        .ct-item__body { flex: 1; min-width: 0; }

        .ct-item__label {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 12px;
          letter-spacing: 2.5px;
          text-transform: uppercase;
          color: #7a7570;
          display: block;
          margin-bottom: 3px;
        }

        .ct-item__value {
          font-family: 'Barlow', sans-serif;
          font-size: 15px;
          font-weight: 500;
          color: #e8e4e0;
          display: block;
          transition: color 0.2s;
        }
        .ct-item:hover .ct-item__value { color: #3b82f6; }

        .ct-item__desc {
          font-family: 'Barlow', sans-serif;
          font-size: 12px;
          color: #454e60;
          display: block;
          margin-top: 2px;
        }

        .ct-item__arrow {
          color: #454e60;
          flex-shrink: 0;
          transition: transform 0.25s, color 0.25s;
        }
        .ct-item:hover .ct-item__arrow {
          color: #3b82f6;
          transform: translateX(4px);
        }

        @media(max-width: 600px) {
          .ct-list { padding: 0 16px 60px; }
          .ct-item { padding: 16px 16px; gap: 14px; }
          .ct-item__icon { width: 40px; height: 40px; }
        }
      `}</style>

      <LandingNav />

      <section className="ct-hero">
        <h1 className="ct-hero__title">Contá<span>ctanos</span></h1>
        <p className="ct-hero__sub">Estamos aquí para ayudarte</p>
      </section>

      <div className="ct-list">
        {CONTACTOS.map((item, i) => {
          const iconKey = item.label === "Teléfonos" ? "Teléfono" : item.label === "Correo Electrónico" ? "Correo" : item.label;
          return (
            <a key={i} href={item.href} target="_blank" rel="noopener noreferrer" className="ct-item">
              <div className="ct-item__icon">
                {ICON_MAP[iconKey]}
              </div>
              <div className="ct-item__body">
                <span className="ct-item__label">{item.label}</span>
                <span className="ct-item__value">{item.value}</span>
                <span className="ct-item__desc">{item.desc}</span>
              </div>
              <div className="ct-item__arrow">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
