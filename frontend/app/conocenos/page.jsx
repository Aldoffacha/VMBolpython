"use client";

import { useState } from "react";
import LandingNav from "@/components/LandingNav";

const CONOCENOS = [
  {
    title: "Quiénes Somos",
    steps: [
      {
        title: "Misión",
        desc: "Ser la plataforma líder en importación para Bolivia, conectando a nuestros clientes con los mejores productos globales de manera transparente y eficiente.",
      },
      {
        title: "Visión",
        desc: "Facilitar el comercio internacional para todos los bolivianos, eliminando las barreras de la importación con tecnología y servicio de calidad.",
      },
    ],
  },
  {
    title: "Qué Hacemos",
    steps: [
      {
        title: "Recibimos tu pedido",
        desc: "A través de nuestra plataforma recibimos el enlace del producto que deseas y procesamos tu solicitud al instante.",
      },
      {
        title: "Lo importamos desde EEUU",
        desc: "Gestionamos toda la logística de importación desde nuestros depósitos en Miami hasta Bolivia.",
      },
      {
        title: "Lo entregamos",
        desc: "Recibes tu producto en la puerta de tu casa o puedes pasar a recogerlo por nuestras instalaciones.",
      },
    ],
  },
  {
    title: "Cómo lo Hacemos",
    steps: [
      {
        title: "Recopilamos la información",
        desc: "Mediante el enlace de tu pedido recopilamos toda la información del producto que deseas importar.",
      },
      {
        title: "Pedido a Miami",
        desc: "Realizamos el pedido y lo enviamos hasta nuestros depósitos en Miami, Estados Unidos.",
      },
      {
        title: "Importación a Bolivia",
        desc: "Importamos tu producto a Bolivia mediante transporte aéreo o marítimo, según la disponibilidad.",
      },
      {
        title: "Entrega final",
        desc: "Recogemos el pedido y desde nuestras instalaciones en Miraflores te lo enviamos a tu hogar o lo puedes pasar a recoger personalmente.",
      },
    ],
  },
];

export default function ConocenosPage() {
  const [modal, setModal] = useState(null);
  const [step, setStep] = useState(0);

  const openModal = (i) => {
    setModal(i);
    setStep(0);
  };

  return (
    <div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600;700&family=Barlow+Condensed:wght@300;400;600;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body { background: #0d0f12; }

        .cn-hero {
          padding: 140px 28px 60px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .cn-hero::before {
          content: '';
          position: absolute;
          top: -200px; left: 50%;
          transform: translateX(-50%);
          width: 600px; height: 600px;
          background: radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 60%);
          pointer-events: none;
        }

        .cn-hero__title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(48px, 8vw, 80px);
          letter-spacing: 8px;
          color: #e8e4e0;
          text-transform: uppercase;
          margin-bottom: 12px;
          position: relative;
        }
        .cn-hero__title span { color: #3b82f6; }

        .cn-hero__sub {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 14px;
          letter-spacing: 4px;
          text-transform: uppercase;
          color: #7a7570;
          position: relative;
        }

        .cn-grid {
          max-width: 1100px;
          margin: 0 auto;
          padding: 0 28px 80px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }

        .cn-card {
          background: rgba(18,21,26,0.85);
          border: 1px solid rgba(37,99,235,0.15);
          border-radius: 20px;
          padding: 48px 32px;
          text-align: center;
          cursor: pointer;
          transition: transform 0.35s, box-shadow 0.35s, border-color 0.35s;
        }
        .cn-card:hover {
          transform: translateY(-8px);
          border-color: rgba(37,99,235,0.4);
          box-shadow: 0 16px 48px rgba(37,99,235,0.12);
        }

        .cn-card__deco {
          width: 48px; height: 48px;
          border: 2px solid #3b82f6;
          border-radius: 50%;
          margin: 0 auto 24px;
          position: relative;
          display: flex; align-items: center; justify-content: center;
        }
        .cn-card__deco::after {
          content: '';
          width: 14px; height: 14px;
          background: #3b82f6;
          border-radius: 50%;
          opacity: 0.6;
        }

        .cn-card__num {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 11px;
          letter-spacing: 3px;
          color: #3b82f6;
          margin-bottom: 10px;
        }

        .cn-card__title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 26px;
          letter-spacing: 4px;
          color: #e8e4e0;
          text-transform: uppercase;
          margin-bottom: 20px;
        }

        .cn-card__hint {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 10px;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: #454e60;
          display: flex; align-items: center; justify-content: center;
          gap: 6px;
          transition: color 0.25s;
        }
        .cn-card:hover .cn-card__hint { color: #3b82f6; }

        /* ── Modal ──────────────────────────────────────────────── */
        .cn-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(0,0,0,0.82);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
          animation: cnFadeIn 0.2s ease;
        }

        .cn-modal {
          background: #111318;
          border: 1px solid rgba(37,99,235,0.22);
          border-radius: 24px;
          width: 100%; max-width: 580px;
          box-shadow: 0 32px 80px rgba(0,0,0,0.65);
          overflow: hidden;
          animation: cnScaleIn 0.32s cubic-bezier(0.34,1.56,0.64,1);
        }

        .cn-modal__head {
          display: flex; justify-content: space-between; align-items: center;
          padding: 22px 28px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          background: #161a22;
        }

        .cn-modal__title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 24px;
          letter-spacing: 4px;
          color: #e8e4e0;
          text-transform: uppercase;
        }

        .cn-modal__close {
          width: 34px; height: 34px; border-radius: 8px;
          border: none; background: rgba(255,255,255,0.05);
          color: #8b95a8; cursor: pointer;
          font-size: 18px; line-height: 1;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s;
        }
        .cn-modal__close:hover { background: rgba(37,99,235,0.14); color: #e8e4e0; }

        .cn-modal__body { padding: 40px 28px; min-height: 220px; display: flex; align-items: center; }

        .cn-step-page { width: 100%; text-align: center; animation: cnPageIn 0.3s ease; }

        .cn-step-page__counter {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 11px;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: #454e60;
          margin-bottom: 20px;
        }

        .cn-step-page__title {
          margin-bottom: 16px;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 30px;
          letter-spacing: 4px;
          color: #e8e4e0;
          text-transform: uppercase;
          line-height: 1.1;
        }

        .cn-step-page__desc {
          font-family: 'Barlow', sans-serif;
          font-size: 16px;
          color: #7a7570;
          line-height: 1.7;
          max-width: 460px;
          margin: 0 auto;
        }

        .cn-modal__foot {
          display: flex; align-items: center; justify-content: space-between;
          padding: 18px 28px;
          border-top: 1px solid rgba(255,255,255,0.05);
          background: #161a22;
        }

        .cn-step-page__dots { display: flex; gap: 6px; }

        .cn-step-page__dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: rgba(255,255,255,0.08);
          transition: background 0.3s, transform 0.3s;
        }
        .cn-step-page__dot.active {
          background: #3b82f6;
          transform: scale(1.3);
        }

        .cn-step-page__nav { display: flex; gap: 8px; }

        .cn-step-page__btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 10px 18px;
          border: none; border-radius: 10px;
          cursor: pointer;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 12px; font-weight: 600;
          letter-spacing: 2px; text-transform: uppercase;
          transition: all 0.22s;
        }
        .cn-step-page__btn:disabled { opacity: 0.25; cursor: not-allowed; }

        .cn-step-page__btn--back {
          background: transparent;
          color: #8b95a8;
          border: 1px solid rgba(255,255,255,0.08);
        }
        .cn-step-page__btn--back:hover:not(:disabled) { border-color: #3b82f6; color: #e8e4e0; }

        .cn-step-page__btn--next {
          background: linear-gradient(135deg, #2563eb, #3b82f6);
          color: #fff;
        }
        .cn-step-page__btn--next:hover { box-shadow: 0 4px 16px rgba(37,99,235,0.4); transform: translateY(-1px); }

        .cn-step-page__btn--done {
          background: #10b981;
          color: #fff;
        }
        .cn-step-page__btn--done:hover { box-shadow: 0 4px 16px rgba(16,185,129,0.4); transform: translateY(-1px); }

        @keyframes cnFadeIn { from{opacity:0} to{opacity:1} }
        @keyframes cnScaleIn { from{opacity:0;transform:scale(0.9) translateY(12px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes cnPageIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }

        @media(max-width: 768px) {
          .cn-grid { grid-template-columns: 1fr; padding: 0 20px 60px; }
          .cn-card { padding: 36px 24px; }
          .cn-modal__body { padding: 20px; }
        }
      `}</style>

      <LandingNav />

      <section className="cn-hero">
        <h1 className="cn-hero__title">Conó<span>cenos</span></h1>
        <p className="cn-hero__sub">Descubre quiénes somos y cómo trabajamos</p>
      </section>

      <div className="cn-grid">
        {CONOCENOS.map((item, i) => (
          <div key={i} className="cn-card" onClick={() => openModal(i)}>
            <div className="cn-card__deco" />
            <div className="cn-card__num">{String(i + 1).padStart(2, "0")}</div>
            <h2 className="cn-card__title">{item.title}</h2>
            <div className="cn-card__hint">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
              {item.steps.length} {item.steps.length === 1 ? "paso" : "pasos"}
            </div>
          </div>
        ))}
      </div>

      {modal !== null && (
        <div className="cn-overlay" onClick={() => setModal(null)}>
          <div className="cn-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cn-modal__head">
              <h3 className="cn-modal__title">{CONOCENOS[modal].title}</h3>
              <button className="cn-modal__close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="cn-modal__body">
              <div className="cn-step-page">
                <div className="cn-step-page__counter">
                  Paso {step + 1} de {CONOCENOS[modal].steps.length}
                </div>
                <h4 className="cn-step-page__title">{CONOCENOS[modal].steps[step].title}</h4>
                <p className="cn-step-page__desc">{CONOCENOS[modal].steps[step].desc}</p>
              </div>
            </div>
            <div className="cn-modal__foot">
              <div className="cn-step-page__dots">
                {CONOCENOS[modal].steps.map((_, i) => (
                  <span key={i} className={`cn-step-page__dot ${i === step ? "active" : ""}`} />
                ))}
              </div>
              <div className="cn-step-page__nav">
                <button
                  className="cn-step-page__btn cn-step-page__btn--back"
                  disabled={step === 0}
                  onClick={() => setStep(s => s - 1)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
                  Anterior
                </button>
                {step < CONOCENOS[modal].steps.length - 1 ? (
                  <button className="cn-step-page__btn cn-step-page__btn--next" onClick={() => setStep(s => s + 1)}>
                    Siguiente
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
                  </button>
                ) : (
                  <button className="cn-step-page__btn cn-step-page__btn--done" onClick={() => setModal(null)}>
                    Entendido
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
