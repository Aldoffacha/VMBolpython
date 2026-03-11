"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    tipo_usuario: "clientes",
    correo: "",
    contrasena: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Error al iniciar sesión");
        return;
      }

      // Guardar token en cookie (expira en 8 horas)
      const expires = new Date(Date.now() + 8 * 60 * 60 * 1000).toUTCString();
      document.cookie = `access_token=${data.access_token}; path=/; expires=${expires}; SameSite=Strict`;

      // Guardar datos del usuario en sessionStorage
      sessionStorage.setItem("user", JSON.stringify(data.user));

      // Redirigir según tipo de usuario
      router.push(data.redirect);
    } catch (err) {
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Lato:wght@300;400;700&display=swap');

        :root {
          --page-bg: #121418;
          --card-bg: #1f2429;
          --accent-red-wine: #9a031e;
          --accent-red-wine-bright: #c1121f;
          --text-light: #d9d9d9;
          --text-muted: #a0a0a0;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .login-page {
          font-family: 'Lato', sans-serif;
          background-color: var(--page-bg);
          background-image:
            radial-gradient(ellipse at 20% 50%, rgba(154, 3, 30, 0.12) 0%, transparent 60%),
            radial-gradient(ellipse at 80% 20%, rgba(154, 3, 30, 0.08) 0%, transparent 50%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .login-wrapper {
          width: 100%;
          max-width: 420px;
          animation: fadeUp 0.6s ease both;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .login-card {
          background: rgba(31, 36, 41, 0.96);
          border: 1px solid var(--accent-red-wine);
          border-radius: 16px;
          padding: 44px 40px;
          box-shadow:
            0 20px 60px rgba(0, 0, 0, 0.8),
            0 0 30px rgba(154, 3, 30, 0.25),
            inset 0 1px 0 rgba(255, 255, 255, 0.07);
        }

        .login-header {
          text-align: center;
          margin-bottom: 36px;
        }

        .login-logo {
          width: 56px;
          height: 56px;
          background: linear-gradient(135deg, var(--accent-red-wine), var(--accent-red-wine-bright));
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 26px;
          margin: 0 auto 16px;
          box-shadow: 0 4px 20px rgba(154, 3, 30, 0.5);
        }

        .login-title {
          font-family: 'Cinzel', serif;
          font-size: 22px;
          font-weight: 700;
          color: var(--text-light);
          letter-spacing: 1px;
          margin-bottom: 6px;
        }

        .login-subtitle {
          font-size: 13px;
          color: var(--text-muted);
          font-weight: 300;
          letter-spacing: 0.5px;
        }

        .divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 28px;
        }
        .divider-line {
          flex: 1;
          height: 1px;
          background: linear-gradient(to right, transparent, rgba(154,3,30,0.4), transparent);
        }
        .divider-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--accent-red-wine);
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-label {
          display: block;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-bottom: 8px;
        }

        .form-control {
          width: 100%;
          background: rgba(18, 20, 24, 0.8);
          border: 1px solid rgba(154, 3, 30, 0.25);
          border-radius: 8px;
          padding: 12px 16px;
          color: var(--text-light);
          font-family: 'Lato', sans-serif;
          font-size: 14px;
          transition: border-color 0.25s, box-shadow 0.25s, background 0.25s;
          outline: none;
          appearance: none;
          -webkit-appearance: none;
        }

        .form-control:focus {
          border-color: var(--accent-red-wine);
          box-shadow: 0 0 0 3px rgba(154, 3, 30, 0.18);
          background: rgba(18, 20, 24, 0.95);
        }

        .form-control::placeholder {
          color: rgba(160, 160, 160, 0.4);
        }

        select.form-control {
          cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%239a031e' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 14px center;
          padding-right: 40px;
        }

        select.form-control option {
          background: #1f2429;
          color: var(--text-light);
        }

        .error-box {
          background: rgba(193, 18, 31, 0.12);
          border: 1px solid rgba(193, 18, 31, 0.35);
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
          animation: shake 0.4s ease;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-5px); }
          40%, 80% { transform: translateX(5px); }
        }

        .error-text {
          font-size: 13px;
          color: #f87171;
        }

        .btn-login {
          width: 100%;
          padding: 13px;
          background: linear-gradient(135deg, var(--accent-red-wine) 0%, var(--accent-red-wine-bright) 100%);
          border: none;
          border-radius: 8px;
          color: white;
          font-family: 'Cinzel', serif;
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 1.5px;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-top: 8px;
          position: relative;
          overflow: hidden;
        }

        .btn-login:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(154, 3, 30, 0.5);
        }

        .btn-login:active:not(:disabled) {
          transform: translateY(0);
        }

        .btn-login:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .spinner {
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          margin-right: 8px;
          vertical-align: middle;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .login-footer {
          text-align: center;
          margin-top: 24px;
        }

        .login-footer a {
          font-size: 13px;
          color: var(--text-muted);
          text-decoration: none;
          transition: color 0.2s;
        }

        .login-footer a:hover {
          color: var(--accent-red-wine-bright);
        }

        .login-footer a span {
          color: var(--accent-red-wine-bright);
        }
      `}</style>

      <div className="login-page">
        <div className="login-wrapper">
          <div className="login-card">

            <div className="login-header">
              <div className="login-logo">🔐</div>
              <h1 className="login-title">VMBol en Red</h1>
              <p className="login-subtitle">Sistema de Importación a Bolivia</p>
            </div>

            <div className="divider">
              <div className="divider-line" />
              <div className="divider-dot" />
              <div className="divider-line" />
            </div>

            {error && (
              <div className="error-box">
                <span>⚠️</span>
                <span className="error-text">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Tipo de Usuario</label>
                <select
                  name="tipo_usuario"
                  className="form-control"
                  value={form.tipo_usuario}
                  onChange={handleChange}
                  required
                >
                  <option value="clientes">Cliente</option>
                  <option value="empleados">Empleado</option>
                  <option value="administradores">Administrador</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Correo Electrónico</label>
                <input
                  type="email"
                  name="correo"
                  className="form-control"
                  placeholder="tucorreo@ejemplo.com"
                  value={form.correo}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Contraseña</label>
                <input
                  type="password"
                  name="contrasena"
                  className="form-control"
                  placeholder="••••••••"
                  value={form.contrasena}
                  onChange={handleChange}
                  required
                />
              </div>

              <button type="submit" className="btn-login" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner" />
                    Verificando...
                  </>
                ) : (
                  "Iniciar Sesión"
                )}
              </button>
            </form>

            <div className="login-footer">
              <a href="/registro">
                ¿No tienes cuenta? <span>Regístrate aquí</span>
              </a>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}