"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Bell, BellOff, Megaphone, Info, CheckCircle, AlertTriangle, XCircle, Package, CreditCard, Truck, X } from "lucide-react";

const API = "http://localhost:8000";

const C = {
  pageBg:  "#0d0f12",
  cardBg:  "#161a1d",
  accent:  "#9a031e",
  accent2: "#c1121f",
  text:    "#d9d9d9",
  muted:   "#a0a0a0",
  danger:  "#ef4444",
};

const SECTIONS = [
  {
    title: "Panel Principal",
    links: [
      { icon: "", label: "Dashboard", href: "/admin/dashboard" },
    ],
  },
  {
    title: "Inventario",
    links: [
      { icon: "", label: "Productos", href: "/admin/productos" },
      { icon: "", label: "Prod. Externos", href: "/admin/productos-externos" },
    ],
  },
  {
    title: "Ventas",
    links: [
      { icon: "", label: "Pedidos", href: "/admin/pedidos" },
      { icon: "", label: "Pagos", href: "/admin/pagos" },
    ],
  },
  {
    title: "Usuarios",
    links: [
      { icon: "", label: "Clientes", href: "/admin/usuarios" },
      { icon: "", label: "Empleados", href: "/admin/empleados" },
    ],
  },
  {
    title: "Reportes",
    links: [
      { icon: "", label: "Reportes", href: "/admin/reportes" },
      { icon: "", label: "Auditoría", href: "/admin/auditoria" },
    ],
  },
  {
    title: "Machine Learning",
    links: [
      { icon: "", label: "ML Recomendaciones", href: "/admin/recomendaciones" },
      { icon: "", label: "Predicción ML", href: "/admin/prediccion-ml" },
      { icon: "", label: "Reabastecimiento", href: "/admin/reabastecimiento" },
    ],
  },
  {
    title: "Sistema",
    links: [
      { icon: "", label: "Configuración", href: "/admin/configuracion" },
    ],
  },
];

const IconBell = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const IconLogout = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

// ── Dropdown de notificaciones ────────────────────────────────────────────────
function NotifDropdown({ token }) {
  const [open,     setOpen]     = useState(false);
  const [notifs,   setNotifs]   = useState([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [loading,  setLoading]  = useState(false);
  const [pos,      setPos]      = useState({ top: 0, left: 0 });
  const btnRef   = useRef(null);
  const panelRef = useRef(null);

  const cargar = useCallback(async () => {
    if (!token) return;
    try {
      const r = await fetch(`${API}/notificaciones`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (d.success) { setNotifs(d.notificaciones); setNoLeidas(d.no_leidas); }
    } catch {}
  }, [token]);

  useEffect(() => {
    cargar();
    const iv = setInterval(cargar, 30000);
    return () => clearInterval(iv);
  }, [cargar]);

  useEffect(() => {
    function handler(e) {
      if (
        btnRef.current   && !btnRef.current.contains(e.target) &&
        panelRef.current && !panelRef.current.contains(e.target)
      ) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleToggle() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.top, left: rect.right + 12 });
    }
    setOpen(o => !o);
  }

  async function marcarLeida(id) {
    await fetch(`${API}/notificaciones/${id}/leer`, {
      method: "POST", headers: { Authorization: `Bearer ${token}` },
    });
    setNotifs(prev => prev.map(n => n.id_notificacion === id ? { ...n, leido: true } : n));
    setNoLeidas(n => Math.max(0, n - 1));
  }

  async function marcarTodas() {
    setLoading(true);
    await fetch(`${API}/notificaciones/leer-todas`, {
      method: "POST", headers: { Authorization: `Bearer ${token}` },
    });
    setNotifs(prev => prev.map(n => ({ ...n, leido: true })));
    setNoLeidas(0);
    setLoading(false);
  }

  function timeAgo(iso) {
    if (!iso) return "";
    const diff = (Date.now() - new Date(iso)) / 1000;
    if (diff < 60)    return "Ahora";
    if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  }

  const TIPO_ICON = { info: <Info size={16} />, success: <CheckCircle size={16} />, warning: <AlertTriangle size={16} />, error: <XCircle size={16} />, pedido: <Package size={16} />, pago: <CreditCard size={16} />, envio: <Truck size={16} /> };

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleToggle}
        title="Notificaciones"
        style={{
          position: "relative", background: "transparent",
          border: `1px solid rgba(154,3,30,0.4)`, borderRadius: "8px",
          padding: "8px", cursor: "pointer", color: C.muted,
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.2s",
        }}>
        <IconBell size={17} />
        {noLeidas > 0 && (
          <span style={{
            position: "absolute", top: "-5px", right: "-5px",
            background: C.accent2, color: "#fff", borderRadius: "50%",
            width: "18px", height: "18px", fontSize: "10px", fontWeight: "800",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: `2px solid ${C.pageBg}`,
          }}>{noLeidas > 9 ? "9+" : noLeidas}</span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            width: "320px",
            background: C.cardBg,
            borderRadius: "12px",
            border: `2px solid ${C.accent}`,
            boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
            zIndex: 9999,
            overflow: "hidden",
          }}>
          {/* Header */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "12px 16px", borderBottom: `2px solid ${C.accent}`, background: C.pageBg,
          }}>
            <span style={{ color: C.accent2, fontWeight: "700", fontSize: "13px" }}>
              <Bell size={14} /> Notificaciones
            </span>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              {noLeidas > 0 && (
                <button onClick={marcarTodas} disabled={loading} style={{
                  background: "transparent", border: `1px solid ${C.accent}`,
                  color: C.accent2, borderRadius: "6px", padding: "3px 9px",
                  cursor: "pointer", fontSize: "11px", fontWeight: "600",
                }}>
                  {loading ? "..." : "Leer todas"}
                </button>
              )}
              <button onClick={() => setOpen(false)} style={{
                background: "transparent", border: "none",
                color: C.muted, cursor: "pointer", fontSize: "16px", lineHeight: 1,
              }}><X size={16} /></button>
            </div>
          </div>

          {/* Lista */}
          <div style={{
            maxHeight: "360px",
            overflowY: "auto",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}>
            {notifs.length === 0
              ? (
                <div style={{ padding: "32px 16px", textAlign: "center" }}>
                  <div style={{ fontSize: "32px", marginBottom: "8px" }}><BellOff size={32} /></div>
                  <div style={{ color: C.muted, fontSize: "13px" }}>Sin notificaciones</div>
                </div>
              )
              : notifs.map((n, i) => (
                <div key={n.id_notificacion}>
                  <div
                    onClick={() => { if (!n.leido) marcarLeida(n.id_notificacion); }}
                    style={{
                      padding: "12px 16px", cursor: n.leido ? "default" : "pointer",
                      background: n.leido ? "transparent" : `rgba(154,3,30,0.08)`,
                      borderLeft: n.leido ? "3px solid transparent" : `3px solid ${C.accent2}`,
                      transition: "background 0.2s",
                    }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                      <div style={{ display: "flex", gap: "8px", flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: "16px", flexShrink: 0 }}>
                          {TIPO_ICON[n.tipo] || <Megaphone size={16} />}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                            <span style={{
                              color: C.text, fontSize: "12px", fontWeight: "700",
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>
                              {n.titulo}
                            </span>
                            {!n.leido && (
                              <span style={{
                                background: C.accent2, color: "#fff",
                                padding: "1px 6px", borderRadius: "8px",
                                fontSize: "10px", fontWeight: "700", flexShrink: 0,
                              }}>NUEVO</span>
                            )}
                          </div>
                          <p style={{
                            color: C.muted, fontSize: "11px", margin: 0,
                            lineHeight: "1.4", overflow: "hidden",
                            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                          }}>
                            {n.mensaje}
                          </p>
                        </div>
                      </div>
                      <span style={{ color: C.muted, fontSize: "10px", flexShrink: 0, marginTop: "2px" }}>
                        {timeAgo(n.fecha_creacion)}
                      </span>
                    </div>
                  </div>
                  {i < notifs.length - 1 && (
                    <div style={{ height: "1px", background: `rgba(154,3,30,0.12)`, margin: "0 16px" }} />
                  )}
                </div>
              ))
            }
          </div>

          {/* Footer */}
          <div style={{ padding: "10px 16px", borderTop: `1px solid rgba(154,3,30,0.2)`, background: C.pageBg }}>
            <a href="/admin/notificaciones" style={{
              display: "block", textAlign: "center", padding: "7px",
              background: `rgba(154,3,30,0.1)`, border: `1px solid ${C.accent}`,
              borderRadius: "7px", color: C.accent2, fontSize: "12px",
              fontWeight: "600", textDecoration: "none",
            }}>Ver todas las notificaciones →</a>
          </div>
        </div>
      )}
    </>
  );
}

// ── Sidebar principal ─────────────────────────────────────────────────────────
export default function AdminSidebar({ user }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [token, setToken] = useState("");

  useEffect(() => {
    const t = document.cookie.split(";")
      .find(c => c.trim().startsWith("access_token="))?.split("=")[1] || "";
    setToken(t);
  }, []);

  function logout() {
    document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    sessionStorage.removeItem("user");
    router.push("/login");
  }

  return (
    <>
      {/* ← Este style tag esconde el scrollbar en Chrome/Safari */}
      <style>{`
        .admin-sidebar::-webkit-scrollbar { display: none; }
      `}</style>

      <nav
        className="admin-sidebar"
        style={{
          width: "260px",
          height: "100vh",
          flexShrink: 0,
          overflowY: "auto",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          background: `linear-gradient(180deg,#080a0c 0%,${C.pageBg} 100%)`,
          borderRight: `2px solid ${C.accent}`,
          display: "flex",
          flexDirection: "column",
        }}>

        {/* ── Logo ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: "12px",
          padding: "22px 20px", borderBottom: `1px solid rgba(154,3,30,0.25)`,
        }}>
          <div style={{
            width: "42px", height: "42px", flexShrink: 0,
            background: `linear-gradient(135deg,${C.accent},${C.accent2})`,
            borderRadius: "10px", display: "flex", alignItems: "center",
            justifyContent: "center", fontWeight: "700", color: "#fff", fontSize: "13px",
            boxShadow: `0 2px 8px rgba(154,3,30,0.45)`,
          }}>VM</div>
          <div>
            <div style={{ fontSize: "13px", fontWeight: "700", color: C.text }}>
              VMBol en Red
            </div>
            <div style={{ fontSize: "10px", color: C.accent2, fontWeight: "600", letterSpacing: "1px", textTransform: "uppercase" }}>
              Panel Admin
            </div>
          </div>
        </div>

        {/* ── Usuario + Notificaciones ── */}
        {user && (
          <div style={{
            padding: "14px 16px",
            background: `rgba(154,3,30,0.07)`,
            borderBottom: `1px solid rgba(154,3,30,0.18)`,
            display: "flex", alignItems: "center", gap: "10px",
          }}>
            <div style={{
              width: "38px", height: "38px", borderRadius: "50%", flexShrink: 0,
              background: `linear-gradient(135deg,${C.accent},${C.accent2})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: "800", fontSize: "15px",
            }}>
              {(user.nombre || "A")[0].toUpperCase()}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                color: C.text, fontSize: "13px", fontWeight: "700",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {user.nombre || "Admin"}
              </div>
              <div style={{ color: C.accent2, fontSize: "11px" }}>Administrador</div>
            </div>

            <NotifDropdown token={token} />
          </div>
        )}

        {/* ── Navegación ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0", scrollbarWidth: "none", msOverflowStyle: "none" }}>
          {SECTIONS.map(section => (
            <div key={section.title}>
              <div style={{
                padding: "16px 18px 6px", fontSize: "10px", fontWeight: "800",
                color: C.accent2, textTransform: "uppercase", letterSpacing: "1.5px",
              }}>
                {section.title}
              </div>
              {section.links.map(link => {
                const active = pathname === link.href;
                return (
                  <a key={link.href} href={link.href} style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    padding: "9px 18px", margin: "1px 10px", borderRadius: "8px",
                    textDecoration: "none",
                    color: active ? "#fff" : C.muted,
                    background: active ? `rgba(154,3,30,0.25)` : "transparent",
                    borderLeft: active ? `3px solid ${C.accent2}` : "3px solid transparent",
                    boxShadow: active ? `0 2px 8px rgba(154,3,30,0.25)` : "none",
                    fontSize: "13px", fontWeight: active ? "700" : "500",
                    transition: "all 0.2s",
                  }}>
                    <span style={{ fontSize: "15px", width: "20px", textAlign: "center", flexShrink: 0 }}>
                      {link.icon}
                    </span>
                    <span style={{ flex: 1 }}>{link.label}</span>
                  </a>
                );
              })}
            </div>
          ))}
        </div>

        {/* ── Cerrar Sesión ── */}
        <div style={{ padding: "14px 16px", borderTop: `1px solid rgba(154,3,30,0.25)` }}>
          <button
            onClick={logout}
            onMouseEnter={e => {
              e.currentTarget.style.background = "rgba(154,3,30,0.18)";
              e.currentTarget.style.borderColor = C.accent2;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "rgba(154,3,30,0.4)";
            }}
            style={{
              width: "100%", padding: "10px 14px", borderRadius: "8px",
              background: "transparent", border: `1px solid rgba(154,3,30,0.4)`,
              color: "#f87171", cursor: "pointer", fontSize: "13px", fontWeight: "600",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              transition: "all 0.2s",
            }}>
            <IconLogout size={15} />
            Cerrar Sesión
          </button>
        </div>
      </nav>
    </>
  );
}
