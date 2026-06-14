"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ClienteSidebar from "@/components/ClienteSidebar";
import { useTheme } from "@/context/ThemeContext";
import { useClienteMoneda } from "@/lib/ClienteMonedaContext";
import { Package, Trash2, CreditCard, X, Smartphone, FileText, Paperclip, AlertTriangle, Upload, ShoppingCart, ShoppingBag, Home, Globe, ClipboardList } from "lucide-react";
import "@/styles/dashboard.css";
import "@/styles/carrito.css";

const API = "http://localhost:8000";

const PLAT = {
  amazon: { bg: "#f59e0b", col: "#000", txt: "Amazon" },
  ebay:   { bg: "#3b82f6", col: "#fff", txt: "eBay"   },
  local:  { bg: "#10b981", col: "#fff", txt: "Local"  },
};

/* ── Control de cantidad ──────────────────────────────────────────────── */
function CantidadCtrl({ value, onChange, disabled }) {
  return (
    <div className="qty-row">
      <button
        className="qty-btn"
        onClick={() => onChange(value - 1)}
        disabled={disabled || value <= 1}
        style={{ opacity: disabled || value <= 1 ? 0.4 : 1 }}
      >−</button>
      <span className="qty-num" style={{ fontSize: 22 }}>{value}</span>
      <button
        className="qty-btn"
        onClick={() => onChange(value + 1)}
        disabled={disabled || value >= 10}
        style={{ opacity: disabled || value >= 10 ? 0.4 : 1 }}
      >+</button>
    </div>
  );
}

/* ── Fila de item ─────────────────────────────────────────────────────── */
function ItemRow({ item, tipo, onCantidad, onEliminar, updating }) {
  const { formatPrice } = useClienteMoneda();
  const plat       = PLAT[item.plataforma || "local"] || PLAT.local;
  const [confirmDel, setConfirmDel] = useState(false);
  const id         = tipo === "externo" ? item.id_carrito_externo : item.id_carrito;

  return (
    <div className={`crt-item${updating ? " crt-item--updating" : ""}`}>

      {/* Thumbnail */}
      <div className="crt-item__thumb">
        {item.imagen_url
          ? <img src={item.imagen_url} alt={item.nombre}
              onError={e => { e.target.style.display = "none"; }} />
          : <Package size={24} />}
      </div>

      {/* Info */}
      <div className="crt-item__info">
        <div className="crt-item__name">
          {(item.nombre || "").slice(0, 52)}{(item.nombre || "").length > 52 ? "…" : ""}
          <span className="crt-item__plat" style={{ background: plat.bg, color: plat.col }}>
            {plat.txt}
          </span>
        </div>
        <div className="crt-item__meta">
          {item.categoria ? `${item.categoria} · ` : ""}precio unitario: {formatPrice(item.precio)}
          {item.tipo_cambio ? ` · T/C: Bs. ${parseFloat(item.tipo_cambio).toFixed(2)}` : ""}
        </div>
      </div>

      {/* Cantidad */}
      <CantidadCtrl
        value={item.cantidad}
        disabled={updating}
        onChange={qty => onCantidad(id, qty, tipo)}
      />

      {/* Subtotal */}
      <div className="crt-item__subtotal">
        <div className="crt-item__subtotal-val">{formatPrice(parseFloat(item.precio) * item.cantidad)}</div>
        <div className="crt-item__subtotal-lbl">subtotal</div>
      </div>

      {/* Eliminar */}
      <div>
        {confirmDel ? (
          <div className="crt-del-confirm">
            <button className="crt-del-yes"
              onClick={() => { onEliminar(id, tipo); setConfirmDel(false); }}>
              Sí
            </button>
            <button className="crt-del-no" onClick={() => setConfirmDel(false)}>No</button>
          </div>
        ) : (
          <button className="crt-del" onClick={() => setConfirmDel(true)}><Trash2 size={16} /></button>
        )}
      </div>
    </div>
  );
}

/* ── Modal de Pago ────────────────────────────────────────────────────── */
function ModalPago({ idPedido, total, token, onClose, onSuccess }) {
  const { formatPrice } = useClienteMoneda();
  const [infoQR,  setInfoQR]  = useState(null);
  const [archivo, setArchivo] = useState(null);
  const [preview, setPreview] = useState(null);
  const [load,    setLoad]    = useState(false);
  const [error,   setError]   = useState("");

  useEffect(() => {
    fetch(`${API}/cliente/pago/info`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setInfoQR(d)).catch(() => {});
  }, [token]);

  function handleFile(e) {
    const f = e.target.files?.[0]; if (!f) return;
    setArchivo(f);
    if (f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = ev => setPreview(ev.target.result);
      reader.readAsDataURL(f);
    } else setPreview(null);
  }

  async function enviar() {
    if (!archivo) return setError("Adjunta el comprobante de pago.");
    setLoad(true); setError("");
    const fd = new FormData();
    fd.append("id_pedido", String(idPedido));
    fd.append("metodo", "QR");
    fd.append("monto", String(total));
    fd.append("comprobante", archivo);
    const r = await fetch(`${API}/cliente/pago/subir`, {
      method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd,
    });
    const d = await r.json(); setLoad(false);
    d.success ? onSuccess(d.message) : setError(d.detail || "Error al enviar");
  }

  return (
    <div className="m-overlay">
      <div className="m-box">
        <div className="m-head">
          <h3 className="m-head__title"><CreditCard size={16} /> Pagar Pedido #VM{idPedido}</h3>
          <button className="m-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="m-body">
          {/* Total */}
          <div className="pago-total-box">
            <div className="pago-total-lbl">Total a pagar</div>
            <div className="pago-total-val">{formatPrice(total)}</div>
          </div>

          {/* QR */}
          {infoQR?.qr_url && (
            <div className="pago-qr-wrap">
              <div className="pago-qr-label">Escanea el QR para pagar</div>
              <img
                src={infoQR.qr_url}
                alt="QR de pago"
                className="pago-qr-img"
                onError={e => { e.target.style.display = "none"; }}
              />
              <div className="pago-qr-company">{infoQR.nombre_empresa}</div>
            </div>
          )}

          {/* Método */}
          <div style={{ marginBottom: 16 }}>
            <label className="f-lbl">Método de pago</label>
            <div className="pago-field-readonly">
              <span style={{ fontSize: 16, display: "inline-flex", alignItems: "center" }}><Smartphone size={16} /></span> Pago QR
            </div>
          </div>

          {/* Monto */}
          <div style={{ marginBottom: 16 }}>
            <label className="f-lbl">Monto a pagar (USD)</label>
            <div className="pago-field-readonly" style={{ justifyContent: "space-between" }}>
              <span style={{ fontSize: 16, fontWeight: 800 }}>{formatPrice(total)}</span>
              <span style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 400 }}>monto fijo</span>
            </div>
          </div>

          {/* Comprobante */}
          <div style={{ marginBottom: 8 }}>
            <label className="f-lbl">Comprobante de pago *</label>
            <label style={{ display: "block", cursor: "pointer" }}>
              <input type="file" accept="image/*,.pdf" style={{ display: "none" }} onChange={handleFile} />
              <div className={`pago-upload-zone${archivo ? " pago-upload-zone--active" : ""}`}>
                {preview
                  ? <img src={preview} alt="preview"
                      style={{ maxHeight: 140, maxWidth: "100%", borderRadius: "var(--r-s)" }} />
                  : archivo
                    ? <div style={{ color: "var(--green)", fontSize: 13, fontWeight: 700 }}><FileText size={14} /> {archivo.name}</div>
                    : <>
                        <div className="pago-upload-ico"><Paperclip size={24} /></div>
                        <div className="pago-upload-txt">Click para adjuntar imagen o PDF del comprobante</div>
                      </>
                }
              </div>
            </label>
          </div>

          {error && <div className="pago-alert-error"><AlertTriangle size={14} /> {error}</div>}

          <div className="pago-alert-info">
            Tu comprobante será revisado por el equipo de VMBol en Red antes de confirmar tu pedido.
          </div>
        </div>

        <div className="m-foot">
          <button className="btn btn-out" onClick={onClose}>Cancelar</button>
          <button className="btn btn-pri" onClick={enviar} disabled={load}
            style={{ opacity: load ? 0.7 : 1 }}>
            {load ? "Enviando…" : <><Upload size={14} /> Enviar Comprobante</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PÁGINA PRINCIPAL
══════════════════════════════════════════════════════════════════════════ */
export default function CarritoPage() {
  const router    = useRouter();
  const { theme } = useTheme();
  const { formatPrice, formatPriceUSD, formatPriceBOB } = useClienteMoneda();

  const [user,     setUser]     = useState(null);
  const [token,    setToken]    = useState("");
  const [carrito,  setCarrito]  = useState(null);
  const [load,     setLoad]     = useState(true);
  const [updating, setUpdating] = useState(null);
  const [toast,    setToast]    = useState({ msg: "", ok: true });
  const [mPago,    setMPago]    = useState(null);
  const [creando,  setCreando]  = useState(false);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok }); setTimeout(() => setToast({ msg: "" }), 3500);
  };

  const cargar = useCallback(async t => {
    const r = await fetch(`${API}/cliente/carrito`, { headers: { Authorization: `Bearer ${t}` } });
    if (!r.ok) return;
    const d = await r.json(); setCarrito(d); setLoad(false);
  }, []);

  useEffect(() => {
    const u = JSON.parse(sessionStorage.getItem("user") || "null");
    const t = document.cookie.split(";").find(c => c.trim().startsWith("access_token="))?.split("=")[1];
    if (!t || !u) return router.push("/login");
    setUser(u); setToken(t); cargar(t);
  }, [router, cargar]);

  async function cambiarCantidad(id, qty, tipo) {
    if (qty < 1 || qty > 10) return;
    setUpdating(id);
    await fetch(`${API}/cliente/carrito/${id}/cantidad`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ cantidad: qty, tipo }),
    });
    await cargar(token); setUpdating(null);
  }

  async function eliminarItem(id, tipo) {
    setUpdating(id);
    await fetch(`${API}/cliente/carrito/${id}?tipo=${tipo}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` },
    });
    await cargar(token); setUpdating(null); showToast("Item eliminado");
  }

  async function vaciarCarrito() {
    if (!confirm("¿Vaciar todo el carrito?")) return;
    await fetch(`${API}/cliente/carrito`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` },
    });
    await cargar(token); showToast("Carrito vaciado");
  }

  async function crearPedido() {
    setCreando(true);
    const r = await fetch(`${API}/cliente/pedido/crear`, {
      method: "POST", headers: { Authorization: `Bearer ${token}` },
    });
    const d = await r.json(); setCreando(false);
    d.success
      ? setMPago({ id_pedido: d.id_pedido, total: d.total })
      : showToast(d.detail || "Error al crear pedido", false);
  }

  /* ── Loading ────────────────────────────────────────────────────────── */
  if (load) return (
    <div className={`crt-loading ${theme}`}>
      <div className="crt-loading__ring" />
      <span className="crt-loading__text">CARGANDO</span>
    </div>
  );

  const items  = [...(carrito?.items_locales || []), ...(carrito?.items_externos || [])];
  const total  = carrito?.total_monto || 0;
  const nItems = carrito?.total_items  || 0;

  return (
    <div className={`crt-root ${theme}`}>
      <ClienteSidebar user={user} carritoCount={nItems} />

      <main className="crt-main">

        {/* Toast */}
        {toast.msg && (
          <div className="vmb-toast" style={{ background: toast.ok ? "var(--green)" : "var(--red)" }}>
            {toast.msg}
          </div>
        )}

        {/* ── Hero ────────────────────────────────────────────────── */}
        <header className="crt-hero">
          <div className="crt-hero__inner">
            <div>
              <div className="crt-hero__eyebrow">
                <span className="crt-hero__tag">Carrito</span>
                <span className="vmb-hero__pulse" />
                <span className="vmb-hero__live">VMBol en Red</span>
              </div>
              <h1 className="crt-hero__title">
                Mi <span>Carrito</span>
              </h1>
              <p className="crt-hero__sub">
                {nItems} producto{nItems !== 1 ? "s" : ""} · Total:{" "}
                <span style={{ color: "var(--green)", fontWeight: 700 }}>{formatPrice(total)}</span>
              </p>
            </div>

            {nItems > 0 && (
              <button className="crt-vaciar-btn" onClick={vaciarCarrito}>
                <Trash2 size={14} /> Vaciar carrito
              </button>
            )}
          </div>
        </header>

        {/* ── Contenido ───────────────────────────────────────────── */}
        <div className="crt-content">

          {/* Estado vacío */}
          {nItems === 0 ? (
            <div className="crt-empty">
              <span className="crt-empty__ico"><ShoppingCart size={52} /></span>
              <h2 className="crt-empty__title">Carrito Vacío</h2>
              <p className="crt-empty__sub">Explora la tienda y agrega productos para importar.</p>
              <button className="btn btn-pri" onClick={() => router.push("/cliente/tienda")}>
                <ShoppingBag size={16} /> Ir a la Tienda
              </button>
            </div>
          ) : (
            <div className="crt-grid">

              {/* ── Columna izquierda: items ─────────────────────── */}
              <div>
                {/* Productos locales */}
                {(carrito?.items_locales || []).length > 0 && (
                  <div className="crt-card">
                    <div className="crt-card__head">
                      <span className="crt-card__title"><Home size={16} /> Productos Locales</span>
                      <span className="crt-card__badge">
                        {carrito.items_locales.length} ítem{carrito.items_locales.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="crt-card__body">
                      {carrito.items_locales.map(item => (
                        <ItemRow
                          key={item.id_carrito}
                          item={item} tipo="local"
                          updating={updating === item.id_carrito}
                          onCantidad={cambiarCantidad}
                          onEliminar={eliminarItem}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Productos de importación */}
                {(carrito?.items_externos || []).length > 0 && (
                  <div className="crt-card">
                    <div className="crt-card__head">
                      <span className="crt-card__title"><Globe size={16} /> Importación</span>
                      <span className="crt-card__badge">
                        {carrito.items_externos.length} ítem{carrito.items_externos.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="crt-card__body">
                      {carrito.items_externos.map(item => (
                        <ItemRow
                          key={item.id_carrito_externo}
                          item={item} tipo="externo"
                          updating={updating === item.id_carrito_externo}
                          onCantidad={cambiarCantidad}
                          onEliminar={eliminarItem}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Columna derecha: resumen ─────────────────────── */}
              <div className="crt-summary">
                <div className="crt-card">
                  <div className="crt-card__head">
                    <span className="crt-card__title"><ClipboardList size={16} /> Resumen</span>
                  </div>
                  <div className="crt-card__body" style={{ padding: "18px 22px" }}>

                    {/* Lista de items */}
                    <div className="crt-summary__items">
                      {items.map(item => {
                        const id = item.id_carrito || item.id_carrito_externo;
                        return (
                          <div key={id} className="crt-summary__row">
                            <span className="crt-summary__lbl">
                              {(item.nombre || "").slice(0, 28)}… ×{item.cantidad}
                            </span>
                            <span className="crt-summary__val">
                              {formatPrice(parseFloat(item.precio) * item.cantidad)}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Total */}
                    <div className="crt-summary__total">
                      <div className="crt-summary__total-row">
                        <span className="crt-summary__total-lbl">Total (USD)</span>
                        <span className="crt-summary__total-val">{formatPriceUSD(total)}</span>
                      </div>
                      <div className="crt-summary__total-row">
                        <span className="crt-summary__total-lbl">Total (BOB)</span>
                        <span className="crt-summary__total-val">{formatPriceBOB(total)}</span>
                      </div>
                      <div className="crt-summary__hint">* Costos de importación estimados por ítem</div>
                    </div>

                    {/* Botón pedido */}
                    <button
                      className="crt-checkout-btn"
                      onClick={crearPedido}
                      disabled={creando}
                    >
                      {creando
                        ? <><div className="crt-spinner" /> Creando…</>
                        : <><ShoppingCart size={16} /> Realizar Pedido</>
                      }
                    </button>

                    <p className="crt-checkout-note">
                      Al confirmar se genera una orden y podrás subir el comprobante de pago.
                    </p>
                  </div>
                </div>

                <button className="crt-back-btn" onClick={() => router.push("/cliente/tienda")}>
                  ← Seguir comprando
                </button>
              </div>

            </div>
          )}
        </div>
      </main>

      {/* ── Modal de pago ─────────────────────────────────────────── */}
      {mPago && (
        <ModalPago
          idPedido={mPago.id_pedido}
          total={mPago.total}
          token={token}
          onClose={() => setMPago(null)}
          onSuccess={msg => {
            const pedidoId = mPago.id_pedido;
            setMPago(null);
            showToast(msg);
            setTimeout(() => router.push(`/cliente/pedidos/${pedidoId}`), 1500);
          }}
        />
      )}
    </div>
  );
}