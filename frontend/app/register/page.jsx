"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

const API = "http://localhost:8000";

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

function MapaModal({ abierto, onCerrar, onSeleccionar }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const LRef = useRef(null);

  useEffect(() => {
    if (!abierto) return;
    if (typeof window !== "undefined" && window.L) {
      LRef.current = window.L;
      setScriptLoaded(true);
      return;
    }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => {
      LRef.current = window.L;
      setScriptLoaded(true);
    };
    document.body.appendChild(script);
    return () => {
      if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }
    };
  }, [abierto]);

  useEffect(() => {
    if (!abierto || !scriptLoaded || !LRef.current) return;
    if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }
    const L = LRef.current;
    const map = L.map(mapRef.current, { zoomControl: true }).setView([-17.7833, -63.1821], 13);
    mapInstance.current = map;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap",
    }).addTo(map);

    map.on("click", async (e) => {
      const { lat, lng } = e.latlng;
      if (markerRef.current) map.removeLayer(markerRef.current);
      markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map)
        .bindPopup("Arrastra para ajustar").openPopup();
      markerRef.current.on("dragend", async () => {
        const pos = markerRef.current.getLatLng();
        await reverseGeocode(pos.lat, pos.lng, L, map);
      });
      await reverseGeocode(lat, lng, L, map);
    });

    return () => {
      if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }
    };
  }, [abierto, scriptLoaded]);

  const reverseGeocode = async (lat, lng, L, map) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`, {
        headers: { "Accept-Language": "es" },
      });
      const data = await res.json();
      const dir = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      const circle = L.circle([lat, lng], {
        radius: 20, color: "#9a031e", fillColor: "#c1121f", fillOpacity: 0.3,
      }).addTo(map);
      setTimeout(() => map.removeLayer(circle), 1500);
      onSeleccionar({ direccion: dir, latitud: lat, longitud: lng });
    } catch {
      onSeleccionar({ direccion: `${lat.toFixed(6)}, ${lng.toFixed(6)}`, latitud: lat, longitud: lng });
    }
  };

  if (!abierto) return null;
  return (
    <div className="rp-overlay" onClick={onCerrar}>
      <div className="rp-map-modal" onClick={e => e.stopPropagation()}>
        <div className="rp-map-header">
          <span>Selecciona tu ubicaci&oacute;n en el mapa</span>
          <button className="rp-map-close" onClick={onCerrar}>✕</button>
        </div>
        <div ref={mapRef} className="rp-map-container" />
        <p className="rp-map-hint">Haz clic en el mapa para colocar un marcador. Arrastra para ajustar.</p>
      </div>
    </div>
  );
}

const PASS_RULES = [
  { re: /.{8,}/, label: "Mínimo 8 caracteres" },
  { re: /[A-Z]/, label: "Una mayúscula" },
  { re: /[a-z]/, label: "Una minúscula" },
  { re: /\d/,    label: "Un número" },
];

function getStrength(score) {
  if (score <= 1) return { label: "Débil", color: "#ef4444", pct: 25 };
  if (score === 2) return { label: "Media", color: "#f59e0b", pct: 50 };
  if (score === 3) return { label: "Buena", color: "#3b82f6", pct: 75 };
  return { label: "Fuerte", color: "#10b981", pct: 100 };
}

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ nombre: "", telefono: "", direccion: "", correo: "", contrasena: "", repetir: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mapaAbierto, setMapaAbierto] = useState(false);
  const [success, setSuccess] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const nombreValido = /^[a-záéíóúñA-ZÁÉÍÓÚÑ\s]+$/.test(form.nombre) && form.nombre.trim().length >= 2;
  const telLimpio = form.telefono.replace(/\D/g, "");
  const telValido = telLimpio.length === 8;
  const dirValido = form.direccion.trim().length >= 5;
  const emailValido = /^[^\s@]+@[^\s@]+\.(com|net|org|edu|bo|es|mx|ar|co|cl|pe)$/i.test(form.correo);
  const passScore = PASS_RULES.filter(r => r.re.test(form.contrasena)).length;
  const passOk = passScore >= 4;
  const coinciden = form.contrasena.length > 0 && form.repetir.length > 0;
  const sonIguales = form.contrasena === form.repetir;
  const puedeSiguiente1 = nombreValido;
  const puedeSiguiente2 = telValido && dirValido;
  const puedeRegistrar = emailValido && passOk && sonIguales;

  const handlePhone = (e) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 8);
    setForm({ ...form, telefono: val });
  };

  const handleMapSelect = useCallback(({ direccion, latitud, longitud }) => {
    setForm(prev => ({ ...prev, direccion }));
    setMapaAbierto(false);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!puedeRegistrar) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          correo: form.correo,
          contrasena: form.contrasena,
          telefono: `591${form.telefono}`,
          direccion: form.direccion,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Error al registrarse"); return; }
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="rp-step">
            <p className="rp-step-num">Paso 1 de 3</p>
            <h2 className="rp-step-title">Datos personales</h2>
            <div className="rp-group">
              <label className="rp-label">Nombre completo</label>
              <input type="text" className={`rp-control${form.nombre && !nombreValido ? " rp-invalid" : ""}`}
                placeholder="Ej: Juan Pérez" value={form.nombre} onChange={set("nombre")} />
              {form.nombre && !nombreValido && (
                <p className="rp-err-msg">Solo letras, mínimo 2 caracteres</p>
              )}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="rp-step">
            <p className="rp-step-num">Paso 2 de 3</p>
            <h2 className="rp-step-title">Teléfono y dirección</h2>
            <div className="rp-group">
              <label className="rp-label">Teléfono</label>
              <div className="rp-phone-wrap">
                <span className="rp-phone-prefix">+591</span>
                <input type="tel" className={`rp-control rp-phone-input${form.telefono && !telValido ? " rp-invalid" : ""}`}
                  placeholder="71234567" value={form.telefono} onChange={handlePhone} maxLength={8} />
              </div>
              {form.telefono && !telValido && (
                <p className="rp-err-msg">Debe tener exactamente 8 dígitos</p>
              )}
            </div>
            <div className="rp-group">
              <label className="rp-label">Dirección</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input type="text" className={`rp-control${form.direccion && !dirValido ? " rp-invalid" : ""}`}
                  placeholder="Calle, número, zona..." value={form.direccion} onChange={set("direccion")}
                  style={{ flex: 1 }} />
                <button type="button" className="rp-btn-map" onClick={() => setMapaAbierto(true)}
                  title="Seleccionar en mapa">🗺️</button>
              </div>
              {form.direccion && !dirValido && (
                <p className="rp-err-msg">Mínimo 5 caracteres</p>
              )}
            </div>
            <MapaModal abierto={mapaAbierto} onCerrar={() => setMapaAbierto(false)}
              onSeleccionar={handleMapSelect} />
          </div>
        );
      case 3:
        return (
          <div className="rp-step">
            <p className="rp-step-num">Paso 3 de 3</p>
            <h2 className="rp-step-title">Correo y contraseña</h2>
            <div className="rp-group">
              <label className="rp-label">Correo electrónico</label>
              <input type="email" className={`rp-control${form.correo && !emailValido ? " rp-invalid" : ""}`}
                placeholder="tucorreo@ejemplo.com" value={form.correo} onChange={set("correo")} />
              {form.correo && !emailValido && (
                <p className="rp-err-msg">Ingresa un correo válido (@, .com, .net, etc.)</p>
              )}
            </div>
            <div className="rp-group">
              <label className="rp-label">Contraseña</label>
              <input type="password" className="rp-control"
                placeholder="Mínimo 8 caracteres" value={form.contrasena} onChange={set("contrasena")} />
              {form.contrasena.length > 0 && (
                <>
                  <div className="rp-pass-bar-wrap">
                    <div className="rp-pass-bar" style={{ width: `${getStrength(passScore).pct}%`, background: getStrength(passScore).color }} />
                  </div>
                  <p className="rp-pass-strength" style={{ color: getStrength(passScore).color }}>
                    {getStrength(passScore).label}
                  </p>
                  <ul className="rp-pass-rules">
                    {PASS_RULES.map(r => {
                      const ok = r.re.test(form.contrasena);
                      return (
                        <li key={r.label} style={{ color: ok ? "#10b981" : "#a0a0a0" }}>
                          {ok ? "✓" : "○"} {r.label}
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>
            <div className="rp-group">
              <label className="rp-label">Repetir contraseña</label>
              <input type="password" className={`rp-control${coinciden && !sonIguales ? " rp-invalid" : ""}${coinciden && sonIguales ? " rp-valid" : ""}`}
                placeholder="Escribe la misma contraseña" value={form.repetir} onChange={set("repetir")} />
              {coinciden && (
                <p className="rp-err-msg" style={{ color: sonIguales ? "#10b981" : "#ef4444" }}>
                  {sonIguales ? "✓ Las contraseñas coinciden" : "✗ Las contraseñas no coinciden"}
                </p>
              )}
            </div>
          </div>
        );
    }
  };

  if (success) {
    return (
      <div className="rp-root">
        <ParticleCanvas />
        <div className="rp-card rp-card-success">
          <div className="rp-success-icon">✓</div>
          <h2 className="rp-success-title">¡Registro exitoso!</h2>
          <p className="rp-success-text">Serás redirigido al inicio de sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #0d0f12;
          --card-bg: rgba(18, 21, 26, 0.85);
          --border: rgba(154, 3, 30, 0.3);
          --border-hover: rgba(193, 18, 31, 0.7);
          --red: #9a031e;
          --red-bright: #c1121f;
          --red-glow: rgba(154, 3, 30, 0.45);
          --text: #e8e4e0;
          --text-muted: #7a7570;
          --input-bg: rgba(10, 11, 14, 0.7);
          --error-bg: rgba(193, 18, 31, 0.1);
          --error-border: rgba(193, 18, 31, 0.4);
        }

        html, body { height: 100%; }

        .rp-root {
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

        .rp-root::before {
          content: '';
          position: fixed;
          inset: 0;
          background:
            radial-gradient(ellipse 70% 55% at 15% 55%, rgba(154,3,30,0.10) 0%, transparent 65%),
            radial-gradient(ellipse 50% 40% at 85% 20%, rgba(154,3,30,0.07) 0%, transparent 55%);
          pointer-events: none;
          z-index: 1;
        }

        .rp-card {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 440px;
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: clamp(24px, 5vw, 40px) clamp(20px, 5vw, 40px);
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
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        .rp-card::before, .rp-card::after {
          content: '';
          position: absolute;
          width: 28px; height: 28px;
          border-color: var(--red);
          border-style: solid;
          border-radius: 4px;
          opacity: 0.55;
        }
        .rp-card::before { top: -1px; left: -1px; border-width: 2px 0 0 2px; border-radius: 20px 0 0 0; }
        .rp-card::after { bottom: -1px; right: -1px; border-width: 0 2px 2px 0; border-radius: 0 0 20px 0; }

        .rp-header {
          text-align: center;
          margin-bottom: 24px;
          animation: fadeIn 0.6s 0.15s ease both;
        }

        .rp-monogram {
          width: 48px; height: 48px;
          margin: 0 auto 14px;
        }
        .rp-monogram svg { width: 100%; height: 100%; filter: drop-shadow(0 0 10px var(--red-glow)); }

        .rp-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(18px, 4.5vw, 24px);
          font-weight: 700;
          color: var(--text);
          letter-spacing: 0.06em;
          margin-bottom: 4px;
        }

        .rp-divider {
          display: flex; align-items: center; gap: 10px;
          margin-bottom: 22px;
          animation: fadeIn 0.6s 0.2s ease both;
        }
        .rp-divider-line {
          flex: 1; height: 1px;
          background: linear-gradient(to right, transparent, rgba(154,3,30,0.35), transparent);
        }
        .rp-divider-gem {
          width: 6px; height: 6px;
          background: var(--red);
          transform: rotate(45deg);
          box-shadow: 0 0 6px var(--red);
        }

        .rp-form { animation: fadeIn 0.6s 0.25s ease both; }

        .rp-step { animation: fadeIn 0.35s ease both; }

        .rp-step-num {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-bottom: 4px;
        }
        .rp-step-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(16px, 4vw, 20px);
          color: var(--text);
          font-weight: 600;
          margin-bottom: 20px;
        }

        .rp-group { margin-bottom: 16px; }

        .rp-label {
          display: block;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-bottom: 7px;
        }

        .rp-control {
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
        }
        .rp-control:focus {
          border-color: var(--red-bright);
          box-shadow: 0 0 0 3px rgba(154,3,30,0.18), 0 0 12px rgba(154,3,30,0.1);
        }
        .rp-control::placeholder { color: rgba(122,117,112,0.5); }
        .rp-invalid { border-color: #ef4444 !important; }
        .rp-valid { border-color: #10b981 !important; }

        .rp-err-msg {
          font-size: 11px;
          margin-top: 4px;
          color: #ef4444;
        }

        .rp-phone-wrap {
          display: flex;
          align-items: stretch;
        }
        .rp-phone-prefix {
          display: flex;
          align-items: center;
          padding: 0 12px;
          background: rgba(154,3,30,0.15);
          border: 1px solid var(--border);
          border-right: none;
          border-radius: 10px 0 0 10px;
          color: var(--text);
          font-size: 14px;
          font-weight: 600;
          white-space: nowrap;
        }
        .rp-phone-input {
          border-radius: 0 10px 10px 0;
        }

        .rp-btn-map {
          padding: 9px 14px;
          background: rgba(154,3,30,0.15);
          border: 1px solid var(--border);
          border-radius: 10px;
          cursor: pointer;
          font-size: 18px;
          transition: background 0.2s;
        }
        .rp-btn-map:hover { background: rgba(154,3,30,0.3); }

        .rp-pass-bar-wrap {
          height: 4px;
          background: rgba(122,117,112,0.2);
          border-radius: 2px;
          margin-top: 8px;
          overflow: hidden;
        }
        .rp-pass-bar {
          height: 100%;
          border-radius: 2px;
          transition: width 0.3s, background 0.3s;
        }
        .rp-pass-strength {
          font-size: 11px;
          font-weight: 600;
          margin-top: 4px;
        }
        .rp-pass-rules {
          list-style: none;
          margin-top: 6px;
          display: flex;
          flex-wrap: wrap;
          gap: 4px 12px;
        }
        .rp-pass-rules li {
          font-size: 11px;
          transition: color 0.2s;
        }

        .rp-nav {
          display: flex;
          gap: 10px;
          margin-top: 20px;
        }
        .rp-nav > * { flex: 1; }

        .rp-btn {
          padding: 11px;
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
        .rp-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 100%);
        }
        .rp-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(154,3,30,0.55);
        }
        .rp-btn:active:not(:disabled) { transform: translateY(0); }
        .rp-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .rp-btn-outline {
          padding: 11px;
          background: transparent;
          border: 1px solid var(--border);
          border-radius: 10px;
          color: var(--text);
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(14px, 3.5vw, 16px);
          font-weight: 600;
          letter-spacing: 0.1em;
          cursor: pointer;
          transition: border-color 0.25s, background 0.25s;
        }
        .rp-btn-outline:hover { border-color: var(--red-bright); background: rgba(154,3,30,0.1); }

        .rp-spinner {
          display: inline-block;
          width: 13px; height: 13px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          margin-right: 8px;
          vertical-align: middle;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .rp-error {
          background: var(--error-bg);
          border: 1px solid var(--error-border);
          border-radius: 10px;
          padding: 11px 14px;
          margin-bottom: 16px;
          color: #f87171;
          font-size: clamp(12px, 2.8vw, 13px);
          animation: shake 0.4s ease;
        }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%,60% { transform: translateX(-5px); }
          40%,80% { transform: translateX(5px); }
        }

        .rp-footer {
          text-align: center;
          margin-top: 20px;
          animation: fadeIn 0.6s 0.35s ease both;
        }
        .rp-footer a {
          font-size: clamp(12px, 2.8vw, 13px);
          color: var(--text-muted);
          text-decoration: none;
          transition: color 0.2s;
        }
        .rp-footer a:hover { color: var(--red-bright); }

        .rp-dots {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-bottom: 20px;
        }
        .rp-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: rgba(122,117,112,0.3);
          transition: background 0.3s, transform 0.3s;
        }
        .rp-dot.active {
          background: var(--red-bright);
          transform: scale(1.3);
          box-shadow: 0 0 6px var(--red-glow);
        }
        .rp-dot.done {
          background: #10b981;
        }

        /* Map Modal */
        .rp-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.8);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          animation: fadeIn 0.2s ease;
        }
        .rp-map-modal {
          background: #1f2429;
          border: 2px solid #9a031e;
          border-radius: 16px;
          width: 100%;
          max-width: 700px;
          overflow: hidden;
        }
        .rp-map-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 18px;
          border-bottom: 1px solid rgba(154,3,30,0.3);
          color: var(--text);
          font-size: 14px;
          font-weight: 600;
        }
        .rp-map-close {
          background: none;
          border: none;
          color: #a0a0a0;
          font-size: 18px;
          cursor: pointer;
          padding: 4px;
        }
        .rp-map-container {
          height: 350px;
          width: 100%;
        }
        .rp-map-hint {
          padding: 10px 18px;
          color: #a0a0a0;
          font-size: 12px;
          text-align: center;
        }

        /* Success card */
        .rp-card-success { text-align: center; max-width: 380px; }
        .rp-success-icon {
          width: 60px; height: 60px;
          border-radius: 50%;
          background: rgba(16,185,129,0.15);
          border: 2px solid rgba(16,185,129,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          color: #10b981;
          margin: 0 auto 16px;
        }
        .rp-success-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px;
          color: var(--text);
          margin-bottom: 8px;
        }
        .rp-success-text {
          color: var(--text-muted);
          font-size: 14px;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 480px) {
          .rp-card { border-radius: 16px; }
        }
      `}</style>

      <div className="rp-root">
        <ParticleCanvas />
        <div className="rp-card">
          <div className="rp-header">
            <div className="rp-monogram">
              <svg viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="1" y="1" width="50" height="50" rx="13" stroke="#9a031e" strokeWidth="1.5" strokeOpacity="0.6"/>
                <path d="M14 14 L26 38 L38 14" stroke="#c1121f" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M19 26 L33 26" stroke="#9a031e" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="26" cy="26" r="3" fill="#c1121f" opacity="0.8"/>
              </svg>
            </div>
            <h1 className="rp-title">Crear cuenta</h1>
          </div>

          <div className="rp-divider">
            <div className="rp-divider-line" />
            <div className="rp-divider-gem" />
            <div className="rp-divider-line" />
          </div>

          {/* Steps indicator */}
          <div className="rp-dots">
            {[1, 2, 3].map(s => (
              <div key={s} className={`rp-dot${step === s ? " active" : ""}${step > s ? " done" : ""}`} />
            ))}
          </div>

          {error && <div className="rp-error">{error}</div>}

          <form className="rp-form" onSubmit={handleSubmit}>
            {renderStep()}

            <div className="rp-nav">
              {step > 1 && (
                <button type="button" className="rp-btn-outline" onClick={() => setStep(s => s - 1)}>
                  Anterior
                </button>
              )}
              {step < 3 ? (
                <button type="button" className="rp-btn"
                  disabled={step === 1 ? !puedeSiguiente1 : !puedeSiguiente2}
                  onClick={() => setStep(s => s + 1)}>
                  Siguiente
                </button>
              ) : (
                <button type="submit" className="rp-btn" disabled={!puedeRegistrar || loading}>
                  {loading ? <><span className="rp-spinner" />Registrando...</> : "Crear cuenta"}
                </button>
              )}
            </div>
          </form>

          <div className="rp-footer">
            <a href="/login">¿Ya tienes cuenta? <strong style={{ color: "var(--red-bright)", fontWeight: 500 }}>Inicia sesión</strong></a>
          </div>
        </div>
      </div>
    </>
  );
}
