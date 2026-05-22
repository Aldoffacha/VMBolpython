"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// ── Animated Canvas Background ──────────────────────────────────────────────
function ParticleCanvas() {
  const canvasRef = useRef(null);
  const mouse = useRef({ x: -9999, y: -9999 });
  const animRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let W = (canvas.width = window.innerWidth);
    let H = (canvas.height = window.innerHeight);

    const COLORS = ["#9a031e", "#c1121f", "#e63946", "#ffffff", "#ff6b6b"];
    const PARTICLE_COUNT = Math.min(Math.floor((W * H) / 9000), 130);

    const rand = (a, b) => Math.random() * (b - a) + a;

    class Particle {
      constructor() { this.reset(true); }
      reset(init = false) {
        this.x = rand(0, W);
        this.y = init ? rand(0, H) : rand(-20, -5);
        this.baseX = this.x;
        this.baseY = this.y;
        this.vx = rand(-0.15, 0.15);
        this.vy = rand(0.08, 0.35);
        this.radius = rand(0.6, 2.2);
        this.alpha = rand(0.15, 0.85);
        this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
        this.twinkleSpeed = rand(0.008, 0.025);
        this.twinkleOffset = rand(0, Math.PI * 2);
        this.repelRadius = rand(90, 160);
        this.repelStrength = rand(1.8, 3.2);
      }
      update(t) {
        const dx = this.x - mouse.current.x;
        const dy = this.y - mouse.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < this.repelRadius && dist > 0) {
          const force = (this.repelRadius - dist) / this.repelRadius;
          this.x += (dx / dist) * force * this.repelStrength;
          this.y += (dy / dist) * force * this.repelStrength;
        } else {
          this.x += (this.baseX - this.x) * 0.03;
          this.y += (this.baseY - this.y) * 0.03;
        }
        this.baseX += this.vx;
        this.baseY += this.vy;
        if (this.baseY > H + 20) this.reset();
        this.currentAlpha =
          this.alpha * (0.5 + 0.5 * Math.sin(t * this.twinkleSpeed + this.twinkleOffset));
      }
      draw() {
        ctx.save();
        ctx.globalAlpha = this.currentAlpha;
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = this.radius * 3;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // Lines connecting close particles
    function drawConnections(particles) {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 90) {
            ctx.save();
            ctx.globalAlpha = (1 - d / 90) * 0.12;
            ctx.strokeStyle = "#9a031e";
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
            ctx.restore();
          }
        }
      }
    }

    const particles = Array.from({ length: PARTICLE_COUNT }, () => new Particle());
    let t = 0;

    const loop = () => {
      ctx.clearRect(0, 0, W, H);
      drawConnections(particles);
      particles.forEach((p) => { p.update(t); p.draw(); });
      t++;
      animRef.current = requestAnimationFrame(loop);
    };
    loop();

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const ev = e.touches ? e.touches[0] : e;
      mouse.current = { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
    };
    const onLeave = () => { mouse.current = { x: -9999, y: -9999 }; };
    const onResize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("mouseleave", onLeave);
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}

// ── Login Page ───────────────────────────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    tipo_usuario: "clientes",
    correo: "",
    contrasena: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  
  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(form)
});
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Error al iniciar sesión"); return; }
      const expires = new Date(Date.now() + 8 * 60 * 60 * 1000).toUTCString();
      document.cookie = `access_token=${data.access_token}; path=/; expires=${expires}; SameSite=Strict`;
      sessionStorage.setItem("user", JSON.stringify(data.user));
      router.push(data.redirect);
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg:            #0d0f12;
          --card-bg:       rgba(18, 21, 26, 0.85);
          --border:        rgba(154, 3, 30, 0.3);
          --border-hover:  rgba(193, 18, 31, 0.7);
          --red:           #9a031e;
          --red-bright:    #c1121f;
          --red-glow:      rgba(154, 3, 30, 0.45);
          --text:          #e8e4e0;
          --text-muted:    #7a7570;
          --input-bg:      rgba(10, 11, 14, 0.7);
          --error-bg:      rgba(193, 18, 31, 0.1);
          --error-border:  rgba(193, 18, 31, 0.4);
        }

        html, body { height: 100%; }

        .lp-root {
          font-family: 'DM Sans', sans-serif;
          background: var(--bg);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: clamp(16px, 5vw, 40px);
          position: relative;
          overflow: hidden;
        }

        /* Radial atmospheric glow */
        .lp-root::before {
          content: '';
          position: fixed;
          inset: 0;
          background:
            radial-gradient(ellipse 70% 55% at 15% 55%, rgba(154,3,30,0.10) 0%, transparent 65%),
            radial-gradient(ellipse 50% 40% at 85% 20%, rgba(154,3,30,0.07) 0%, transparent 55%);
          pointer-events: none;
          z-index: 1;
        }

        /* ── Card ── */
        .lp-card {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 420px;
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: clamp(28px, 6vw, 48px) clamp(22px, 6vw, 44px);
          backdrop-filter: blur(18px) saturate(1.3);
          -webkit-backdrop-filter: blur(18px) saturate(1.3);
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.04) inset,
            0 24px 80px rgba(0,0,0,0.75),
            0 0 40px var(--red-glow);
          animation: cardIn 0.7s cubic-bezier(0.22,1,0.36,1) both;
        }

        @keyframes cardIn {
          from { opacity: 0; transform: translateY(30px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }

        /* Corner accents */
        .lp-card::before,
        .lp-card::after {
          content: '';
          position: absolute;
          width: 28px;
          height: 28px;
          border-color: var(--red);
          border-style: solid;
          border-radius: 4px;
          opacity: 0.55;
        }
        .lp-card::before {
          top: -1px; left: -1px;
          border-width: 2px 0 0 2px;
          border-radius: 20px 0 0 0;
        }
        .lp-card::after {
          bottom: -1px; right: -1px;
          border-width: 0 2px 2px 0;
          border-radius: 0 0 20px 0;
        }

        /* ── Header ── */
        .lp-header {
          text-align: center;
          margin-bottom: 32px;
          animation: fadeIn 0.6s 0.15s ease both;
        }

        .lp-monogram {
          width: 52px;
          height: 52px;
          margin: 0 auto 18px;
          position: relative;
        }
        .lp-monogram svg {
          width: 100%;
          height: 100%;
          filter: drop-shadow(0 0 10px var(--red-glow));
        }

        .lp-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(20px, 5vw, 26px);
          font-weight: 700;
          color: var(--text);
          letter-spacing: 0.06em;
          line-height: 1.1;
          margin-bottom: 6px;
        }
        .lp-subtitle {
          font-size: clamp(11px, 2.5vw, 13px);
          color: var(--text-muted);
          letter-spacing: 0.08em;
          font-weight: 300;
        }

        /* ── Divider ── */
        .lp-divider {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 28px;
          animation: fadeIn 0.6s 0.25s ease both;
        }
        .lp-divider-line {
          flex: 1;
          height: 1px;
          background: linear-gradient(to right, transparent, rgba(154,3,30,0.35), transparent);
        }
        .lp-divider-gem {
          width: 6px;
          height: 6px;
          background: var(--red);
          transform: rotate(45deg);
          box-shadow: 0 0 6px var(--red);
        }

        /* ── Form ── */
        .lp-form { animation: fadeIn 0.6s 0.3s ease both; }

        .lp-group { margin-bottom: 18px; }

        .lp-label {
          display: block;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-bottom: 7px;
        }

        .lp-control {
          width: 100%;
          background: var(--input-bg);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 11px 15px;
          color: var(--text);
          font-family: 'DM Sans', sans-serif;
          font-size: clamp(13px, 3vw, 14px);
          transition: border-color 0.25s, box-shadow 0.25s;
          outline: none;
          appearance: none;
          -webkit-appearance: none;
        }
        .lp-control:focus {
          border-color: var(--red-bright);
          box-shadow: 0 0 0 3px rgba(154,3,30,0.18), 0 0 12px rgba(154,3,30,0.1);
        }
        .lp-control::placeholder { color: rgba(122,117,112,0.5); }

        /* Password wrapper */
        .lp-pass-wrap { position: relative; }
        .lp-pass-wrap .lp-control { padding-right: 44px; }
        .lp-pass-toggle {
          position: absolute;
          right: 13px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          transition: color 0.2s;
        }
        .lp-pass-toggle:hover { color: var(--red-bright); }

        /* Select arrow */
        .lp-select {
          cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='7' viewBox='0 0 11 7'%3E%3Cpath d='M1 1l4.5 4.5L10 1' stroke='%239a031e' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 14px center;
          padding-right: 38px;
        }
        .lp-select option { background: #151820; color: var(--text); }

        /* ── Error ── */
        .lp-error {
          background: var(--error-bg);
          border: 1px solid var(--error-border);
          border-radius: 10px;
          padding: 11px 14px;
          margin-bottom: 18px;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          animation: shake 0.4s ease;
        }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%,60%  { transform: translateX(-5px); }
          40%,80%  { transform: translateX(5px); }
        }
        .lp-error-icon {
          flex-shrink: 0;
          width: 16px;
          height: 16px;
          margin-top: 1px;
          color: var(--red-bright);
        }
        .lp-error-text {
          font-size: clamp(12px, 2.8vw, 13px);
          color: #f87171;
          line-height: 1.4;
        }

        /* ── Button ── */
        .lp-btn {
          width: 100%;
          padding: 13px;
          margin-top: 8px;
          background: linear-gradient(135deg, var(--red) 0%, var(--red-bright) 100%);
          border: none;
          border-radius: 10px;
          color: #fff;
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(14px, 3.5vw, 16px);
          font-weight: 600;
          letter-spacing: 0.1em;
          cursor: pointer;
          transition: transform 0.25s, box-shadow 0.25s, opacity 0.25s;
          position: relative;
          overflow: hidden;
        }
        .lp-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 100%);
        }
        .lp-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(154,3,30,0.55);
        }
        .lp-btn:active:not(:disabled) { transform: translateY(0); }
        .lp-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .lp-spinner {
          display: inline-block;
          width: 13px;
          height: 13px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          margin-right: 8px;
          vertical-align: middle;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Footer ── */
        .lp-footer {
          text-align: center;
          margin-top: 22px;
          animation: fadeIn 0.6s 0.4s ease both;
        }
        .lp-footer a {
          font-size: clamp(12px, 2.8vw, 13px);
          color: var(--text-muted);
          text-decoration: none;
          transition: color 0.2s;
        }
        .lp-footer a:hover { color: var(--red-bright); }
        .lp-footer a strong { color: var(--red-bright); font-weight: 500; }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── Responsive breakpoints ── */
        @media (max-width: 480px) {
          .lp-card { border-radius: 16px; }
        }
        @media (max-width: 360px) {
          .lp-card { border-radius: 12px; }
        }
      `}</style>

      <div className="lp-root">
        {/* Animated particle canvas */}
        <ParticleCanvas />

        <div className="lp-card">
          {/* Header */}
          <div className="lp-header">
            <div className="lp-monogram">
              <svg viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="1" y="1" width="50" height="50" rx="13" stroke="#9a031e" strokeWidth="1.5" strokeOpacity="0.6"/>
                <path d="M14 14 L26 38 L38 14" stroke="#c1121f" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M19 26 L33 26" stroke="#9a031e" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="26" cy="26" r="3" fill="#c1121f" opacity="0.8"/>
              </svg>
            </div>
            <h1 className="lp-title">VMBol en Red</h1>
            <p className="lp-subtitle"></p>
          </div>

          {/* Decorative divider */}
          <div className="lp-divider">
            <div className="lp-divider-line" />
            <div className="lp-divider-gem" />
            <div className="lp-divider-line" />
          </div>

          {/* Error */}
          {error && (
            <div className="lp-error">
              <svg className="lp-error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span className="lp-error-text">{error}</span>
            </div>
          )}

          {/* Form */}
          <form className="lp-form" onSubmit={handleSubmit}>
            <div className="lp-group">
              <label className="lp-label">Tipo de Usuario</label>
              <select
                name="tipo_usuario"
                className="lp-control lp-select"
                value={form.tipo_usuario}
                onChange={handleChange}
                required
              >
                <option value="clientes">Cliente</option>
                <option value="empleados">Empleado</option>
                <option value="administradores">Administrador</option>
              </select>
            </div>

            <div className="lp-group">
              <label className="lp-label">Correo Electrónico</label>
              <input
                type="email"
                name="correo"
                className="lp-control"
                placeholder="tucorreo@ejemplo.com"
                value={form.correo}
                onChange={handleChange}
                required
              />
            </div>

            <div className="lp-group">
              <label className="lp-label">Contraseña</label>
              <div className="lp-pass-wrap">
                <input
                  type={showPass ? "text" : "password"}
                  name="contrasena"
                  className="lp-control"
                  placeholder="••••••••"
                  value={form.contrasena}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="lp-pass-toggle"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPass ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button type="submit" className="lp-btn" disabled={loading}>
              {loading ? (
                <><span className="lp-spinner" />Verificando...</>
              ) : (
                "Iniciar Sesión"
              )}
            </button>
          </form>

          <div className="lp-footer">
            <span style={{ color: "var(--text-muted)", fontSize: "clamp(12px, 2.8vw, 13px)" }}>
              Sistema de Importación VMBol en Red
            </span>
          </div>
        </div>
      </div>
    </>
  );
}