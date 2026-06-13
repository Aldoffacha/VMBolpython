"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import ClienteSidebar from "@/components/ClienteSidebar";
import "@/styles/dashboard.css";
import "@/styles/perfil.css";
import { X, AlertTriangle, Check, DollarSign } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { getClienteMoneda, setClienteMoneda, formatPriceCliente } from "@/lib/clienteMoneda";

const API = "http://localhost:8000";

/* ─── Avatar ───────────────────────────────────────────────────────────────── */
function Avatar({ src, nombre, size = 130 }) {
  const [err, setErr] = useState(false);
  const initials = (nombre || "?")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  if (!src || err) {
    return (
      <div
        className="prf-avatar prf-avatar--initials"
        style={{ width: size, height: size, fontSize: size * 0.36 }}
      >
        {initials}
      </div>
    );
  }
  return (
    <img
      className="prf-avatar"
      src={src}
      alt={nombre}
      style={{ width: size, height: size }}
      onError={() => setErr(true)}
    />
  );
}

/* ─── Toast ────────────────────────────────────────────────────────────────── */
function Toast({ msg, tipo }) {
  if (!msg) return null;
  return (
    <div className={`vmb-toast vmb-toast--${tipo || "success"}`}>
      {tipo === "danger" ? <X size={14} /> : tipo === "warning" ? <AlertTriangle size={14} /> : <Check size={14} />} {msg}
    </div>
  );
}

/* ─── Card ─────────────────────────────────────────────────────────────────── */
function Card({ title, icon, children }) {
  return (
    <div className="prf-card">
      <div className="prf-card__head">
        {icon && <span className="prf-card__icon">{icon}</span>}
        <h3 className="prf-card__title">{title}</h3>
      </div>
      <div className="prf-card__body">{children}</div>
    </div>
  );
}

/* ─── Field ────────────────────────────────────────────────────────────────── */
function Field({ label, children, hint }) {
  return (
    <div className="prf-field">
      <label className="f-lbl">{label}</label>
      {children}
      {hint && <p className="prf-field__hint">{hint}</p>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   PÁGINA PERFIL
══════════════════════════════════════════════════════════════════════════════ */
export default function ClientePerfil() {
  const router = useRouter();
  const { theme } = useTheme();

  const [user, setUser]   = useState(null);
  const [token, setToken] = useState("");
  const [perfil, setPerfil] = useState(null);
  const [load, setLoad]   = useState(true);
  const [busy, setBusy]   = useState(false);

  const [toast, setToast] = useState({ msg: "", tipo: "" });
  const showToast = (msg, tipo = "success") => {
    setToast({ msg, tipo });
    setTimeout(() => setToast({ msg: "", tipo: "" }), 4000);
  };

  const [formPerfil, setFormPerfil] = useState({
    nombre: "", telefono: "", direccion: "",
  });
  const [formPass, setFormPass] = useState({
    nueva_password: "", confirmar_password: "",
  });
  const [passMatch, setPassMatch] = useState(null);
  const [previewFoto, setPreviewFoto] = useState(null);
  const fileRef = useRef(null);

  const [moneda, setMoneda] = useState("USD");
  const [tipoCambio, setTipoCambio] = useState(9.17);

  useEffect(() => {
    setMoneda(getClienteMoneda());
    fetch(`${API}/cliente/dashboard`, {
      headers: { Authorization: `Bearer ${document.cookie.split(";").find(c => c.trim().startsWith("access_token="))?.split("=")[1] }` },
    })
      .then(r => r.json())
      .then(d => { if (d?.tipo_cambio) setTipoCambio(d.tipo_cambio); })
      .catch(() => {});
  }, []);

  const toggleMoneda = () => {
    const next = moneda === "USD" ? "BOB" : "USD";
    setMoneda(next);
    setClienteMoneda(next);
  };

  /* ── Cargar datos ──────────────────────────────────────────────────────── */
  useEffect(() => {
    const u = JSON.parse(sessionStorage.getItem("user") || "null");
    const t = document.cookie
      .split(";")
      .find((c) => c.trim().startsWith("access_token="))
      ?.split("=")[1];

    if (!t || !u) return router.push("/login");
    setUser(u);
    setToken(t);

    fetch(`${API}/cliente/perfil`, {
      headers: { Authorization: `Bearer ${t}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error(r.status);
        return r.json();
      })
      .then((d) => {
        setPerfil(d);
        setFormPerfil({
          nombre:    d.nombre    || "",
          telefono:  d.telefono  || "",
          direccion: d.direccion || "",
        });
        setLoad(false);
      })
      .catch(() => {
        setLoad(false);
        router.push("/login");
      });
  }, [router]);

  /* ── Guardar perfil ────────────────────────────────────────────────────── */
  const handleGuardarPerfil = async (e) => {
    e.preventDefault();
    if (!formPerfil.nombre.trim()) return showToast("El nombre es obligatorio", "danger");
    setBusy(true);
    try {
      const r = await fetch(`${API}/cliente/perfil`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(formPerfil),
      });
      const d = await r.json();
      if (d.success) {
        showToast(d.message);
        setPerfil((prev) => ({ ...prev, ...formPerfil }));
        const u = JSON.parse(sessionStorage.getItem("user") || "{}");
        sessionStorage.setItem("user", JSON.stringify({ ...u, nombre: formPerfil.nombre }));
      } else {
        showToast(d.detail || "Error al actualizar", "danger");
      }
    } catch {
      showToast("Error de conexión", "danger");
    } finally {
      setBusy(false);
    }
  };

  /* ── Cambiar contraseña ────────────────────────────────────────────────── */
  const handleCambiarPass = async (e) => {
    e.preventDefault();
    if (!formPass.nueva_password || !formPass.confirmar_password)
      return showToast("Debes llenar ambos campos", "warning");
    if (formPass.nueva_password !== formPass.confirmar_password)
      return showToast("Las contraseñas no coinciden", "danger");
    if (formPass.nueva_password.length < 6)
      return showToast("Mínimo 6 caracteres", "warning");

    setBusy(true);
    try {
      const r = await fetch(`${API}/cliente/perfil/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(formPass),
      });
      const d = await r.json();
      if (d.success) {
        showToast(d.message);
        setFormPass({ nueva_password: "", confirmar_password: "" });
        setPassMatch(null);
      } else {
        showToast(d.detail || "Error al cambiar contraseña", "danger");
      }
    } catch {
      showToast("Error de conexión", "danger");
    } finally {
      setBusy(false);
    }
  };

  /* ── Seleccionar foto ──────────────────────────────────────────────────── */
  const handleFotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["jpg", "jpeg", "png", "gif"].includes(ext))
      return showToast("Solo JPG, PNG y GIF permitidos", "danger");
    if (file.size > 2 * 1024 * 1024)
      return showToast("Máximo 2 MB", "danger");
    const reader = new FileReader();
    reader.onload = (ev) => setPreviewFoto(ev.target.result);
    reader.readAsDataURL(file);
  };

  /* ── Subir foto ────────────────────────────────────────────────────────── */
  const handleSubirFoto = async () => {
    const file = fileRef.current?.files[0];
    if (!file) return showToast("Selecciona una foto primero", "warning");
    setBusy(true);
    const form = new FormData();
    form.append("foto_perfil", file);
    try {
      const r = await fetch(`${API}/cliente/perfil/foto`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const d = await r.json();
      if (d.success) {
        showToast(d.message);
        setPerfil((prev) => ({
          ...prev,
          foto_perfil_url: d.foto_perfil_url + "?t=" + Date.now(),
        }));
        setPreviewFoto(null);
        if (fileRef.current) fileRef.current.value = "";
      } else {
        showToast(d.detail || "Error al subir la foto", "danger");
      }
    } catch {
      showToast("Error de conexión", "danger");
    } finally {
      setBusy(false);
    }
  };

  const handleCancelarFoto = () => {
    setPreviewFoto(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handlePassInput = (key, val) => {
    const next = { ...formPass, [key]: val };
    setFormPass(next);
    setPassMatch(
      next.confirmar_password.length > 0
        ? next.nueva_password === next.confirmar_password
        : null
    );
  };

  /* ── Loading ───────────────────────────────────────────────────────────── */
  if (load) {
    return (
      <div className={`vmb-loading ${theme}`}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div className="vmb-loading__ring" />
        <span className="vmb-loading__text">CARGANDO</span>
      </div>
    );
  }
  if (!perfil) return null;

  const fotoSrc = previewFoto || perfil.foto_perfil_url || null;
  const miembro = perfil.fecha_registro
    ? new Date(perfil.fecha_registro).toLocaleDateString("es-BO", {
        month: "short", year: "numeric",
      })
    : "—";

  return (
    <div className={`vmb-root ${theme}`}>
      <ClienteSidebar user={user} carritoCount={0} />

      <main className="vmb-main">
        <Toast msg={toast.msg} tipo={toast.tipo} />

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <header className="vmb-hero">
          <div className="vmb-hero__inner">
            <div>
              <div className="vmb-hero__eyebrow">
                <span className="vmb-hero__tag">Configuración</span>
                <span className="vmb-hero__pulse" />
                <span className="vmb-hero__live">Mi cuenta</span>
              </div>
              <h1 className="vmb-hero__name">
                Mi&nbsp;<span>Perfil</span>
              </h1>
              <p className="vmb-hero__sub">
                Gestiona tu información personal y seguridad
              </p>
            </div>
            <button className="btn btn-out" onClick={() => router.push("/cliente/dashboard")}>
              ← Volver al Dashboard
            </button>
          </div>
        </header>

        {/* ── Métricas ──────────────────────────────────────────────────── */}
        <div className="vmb-metrics">
          <div className="vmb-metric">
            <span className="vmb-metric__val">{perfil.stats?.total_pedidos ?? 0}</span>
            <span className="vmb-metric__lbl">Pedidos realizados</span>
          </div>
          <div className="vmb-metric">
            <span className="vmb-metric__val">{perfil.stats?.total_cotizaciones ?? 0}</span>
            <span className="vmb-metric__lbl">Cotizaciones</span>
          </div>
          <div className="vmb-metric">
            <span className="vmb-metric__val">{miembro}</span>
            <span className="vmb-metric__lbl">Miembro desde</span>
          </div>
          <div className="vmb-metric">
            <span className="vmb-metric__val prf-metric__correo">{perfil.correo}</span>
            <span className="vmb-metric__lbl">Correo verificado</span>
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            GRID PRINCIPAL — 2 columnas
        ══════════════════════════════════════════════ */}
        <div className="prf-layout">

          {/* ── COLUMNA IZQUIERDA (sticky) ────────────── */}
          <aside className="prf-aside">

            {/* Foto de perfil */}
            <Card title="Foto de perfil" icon="◉">
              <div className="prf-foto-wrap">
                <div className="prf-foto-ring">
                  <Avatar src={fotoSrc} nombre={perfil.nombre} size={130} />
                  {previewFoto && (
                    <span className="prf-foto-badge">Vista previa</span>
                  )}
                </div>

                <p className="prf-foto-name">{perfil.nombre}</p>
                <p className="prf-foto-since">Cliente desde {miembro}</p>

                <input
                  type="file"
                  accept="image/*"
                  ref={fileRef}
                  style={{ display: "none" }}
                  onChange={handleFotoChange}
                />

                {!previewFoto ? (
                  <button
                    className="btn btn-out prf-btn-full"
                    onClick={() => fileRef.current?.click()}
                  >
                    Cambiar foto
                  </button>
                ) : (
                  <div className="prf-foto-actions">
                    <button
                      className="btn btn-pri prf-btn-full"
                      onClick={handleSubirFoto}
                      disabled={busy}
                    >
                      {busy ? "Subiendo…" : "Subir foto"}
                    </button>
                    <button
                      className="btn btn-out prf-btn-full"
                      onClick={handleCancelarFoto}
                    >
                      Cancelar
                    </button>
                  </div>
                )}

                <p className="prf-foto-hint">JPG · PNG · GIF &nbsp;·&nbsp; Máx. 2 MB</p>
              </div>
            </Card>

            {/* Info rápida */}
            <Card title="Cuenta" icon="◈">
              <div>
                <div className="prf-info-row">
                  <span className="prf-info-row__k">Pedidos</span>
                  <span className="prf-info-row__v">{perfil.stats?.total_pedidos ?? 0}</span>
                </div>
                <div className="prf-info-row">
                  <span className="prf-info-row__k">Cotizaciones</span>
                  <span className="prf-info-row__v">{perfil.stats?.total_cotizaciones ?? 0}</span>
                </div>
                <div className="prf-info-row">
                  <span className="prf-info-row__k">Desde</span>
                  <span className="prf-info-row__v">{miembro}</span>
                </div>
              </div>
            </Card>

            {/* Moneda preferida */}
            <Card title="Moneda" icon={<DollarSign size={18} />}>
              <div>
                <div className="prf-info-row">
                  <span className="prf-info-row__k">Ver precios en</span>
                  <span className="prf-info-row__v">{moneda === "USD" ? "Dólares ($)" : "Bolivianos (Bs)"}</span>
                </div>
                <p className="prf-field__hint" style={{ margin: "8px 0 12px" }}>
                  {moneda === "BOB" && (
                    <>Tipo de cambio: {tipoCambio} Bs/$ · </>
                  )}
                  Solo afecta la vista, no los cálculos
                </p>
                <button
                  className="btn btn-out prf-btn-full"
                  onClick={toggleMoneda}
                >
                  <DollarSign size={16} style={{ marginRight: 6 }} />
                  {moneda === "USD" ? "Mostrar en Bolivianos" : "Mostrar en Dólares"}
                </button>
              </div>
            </Card>

          </aside>

          {/* ── COLUMNA DERECHA (formularios) ─────────── */}
          <div className="prf-main-col">

            {/* Información personal */}
            <Card title="Información personal" icon="◈">
              <form onSubmit={handleGuardarPerfil} className="prf-form">

                {/* Grid 2 cols */}
                <div className="prf-form__grid">
                  <Field label="Nombre completo *">
                    <input
                      className="f-inp"
                      type="text"
                      value={formPerfil.nombre}
                      onChange={(e) =>
                        setFormPerfil({ ...formPerfil, nombre: e.target.value })
                      }
                      placeholder="Tu nombre completo"
                      required
                    />
                  </Field>

                  <Field
                    label="Correo electrónico"
                    hint="El correo no puede ser modificado"
                  >
                    <input
                      className="f-inp f-inp--disabled"
                      type="email"
                      value={perfil.correo}
                      disabled
                    />
                  </Field>

                  <Field label="Teléfono">
                    <input
                      className="f-inp"
                      type="tel"
                      value={formPerfil.telefono}
                      onChange={(e) =>
                        setFormPerfil({ ...formPerfil, telefono: e.target.value })
                      }
                      placeholder="Ej: 77712345"
                    />
                  </Field>

                  <Field label="Fecha de registro">
                    <input
                      className="f-inp f-inp--disabled"
                      type="text"
                      value={
                        perfil.fecha_registro
                          ? new Date(perfil.fecha_registro).toLocaleDateString("es-BO")
                          : "—"
                      }
                      disabled
                    />
                  </Field>
                </div>

                {/* Dirección — full width */}
                <Field label="Dirección de envío">
                  <textarea
                    className="f-inp f-textarea"
                    value={formPerfil.direccion}
                    onChange={(e) =>
                      setFormPerfil({ ...formPerfil, direccion: e.target.value })
                    }
                    placeholder="Dirección para envíos"
                    rows={3}
                  />
                </Field>

                <div className="prf-form__foot">
                  <button
                    type="submit"
                    className="btn btn-pri"
                    disabled={busy}
                    style={{ opacity: busy ? 0.7 : 1 }}
                  >
                    {busy ? "Guardando…" : "Guardar cambios"}
                  </button>
                </div>
              </form>
            </Card>

            {/* Seguridad */}
            <Card title="Cambio de contraseña" icon="◈">
              <form onSubmit={handleCambiarPass} className="prf-form">
                <div className="prf-form__grid">
                  <Field label="Nueva contraseña">
                    <input
                      className="f-inp"
                      type="password"
                      value={formPass.nueva_password}
                      onChange={(e) =>
                        handlePassInput("nueva_password", e.target.value)
                      }
                      placeholder="Mínimo 6 caracteres"
                      minLength={6}
                    />
                  </Field>

                  <Field label="Confirmar contraseña">
                    <input
                      className={`f-inp ${
                        passMatch === true
                          ? "f-inp--valid"
                          : passMatch === false
                          ? "f-inp--invalid"
                          : ""
                      }`}
                      type="password"
                      value={formPass.confirmar_password}
                      onChange={(e) =>
                        handlePassInput("confirmar_password", e.target.value)
                      }
                      placeholder="Repite la contraseña"
                    />
                    {passMatch === false && (
                      <p className="prf-pass-error">Las contraseñas no coinciden</p>
                    )}
                    {passMatch === true && (
                      <p className="prf-pass-ok">Las contraseñas coinciden <Check size={14} /></p>
                    )}
                  </Field>
                </div>

                <div className="prf-form__foot">
                  <button
                    type="submit"
                    className="btn btn-pri"
                    disabled={busy || passMatch === false}
                    style={{ opacity: busy || passMatch === false ? 0.6 : 1 }}
                  >
                    {busy ? "Cambiando…" : "Cambiar contraseña"}
                  </button>
                </div>
              </form>
            </Card>

          </div>{/* /prf-main-col */}
        </div>{/* /prf-layout */}

      </main>
    </div>
  );
}