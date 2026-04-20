"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "@/context/ThemeContext"; // 👈 NUEVO

const API = "http://localhost:8000";

// 👇 REEMPLAZA el objeto C fijo por esta función
function getColors(isDark) {
  return {
    pageBg:  isDark ? "#121418" : "#f0f2f5",
    cardBg:  isDark ? "#1f2429" : "#ffffff",
    accent:  "#2563eb",
    accent2: isDark ? "#3b82f6" : "#1d4ed8",
    text:    isDark ? "#d9d9d9" : "#111827",
    muted:   isDark ? "#a0a0a0" : "#6b7280",
    success: isDark ? "#10b981" : "#059669",
    warning: "#f59e0b",
    danger:  "#ef4444",
  };
}

const LINKS = [
  { href: "/cliente/dashboard",    icon: "🏠", label: "Dashboard" },
  { href: "/cliente/tienda",       icon: "🛍️", label: "Tienda" },
  { href: "/cliente/carrito",      icon: "🛒", label: "Mi Carrito" },
  { href: "/cliente/pedidos",      icon: "📦", label: "Mis Pedidos" },
  { href: "/cliente/cotizaciones", icon: "💰", label: "Cotizaciones" },
  { href: "/cliente/perfil",       icon: "👤", label: "Mi Perfil" },
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
function NotifDropdown({ token}) { 
  const { theme } = useTheme();   
  const C = getColors(theme === "dark"); // 👈 recibe C como prop
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
        btnRef.current && !btnRef.current.contains(e.target) &&
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

  const TIPO_ICON = { info: "ℹ️", success: "✅", warning: "⚠️", error: "❌", pedido: "📦", pago: "💳", envio: "🚚" };

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleToggle}
        title="Notificaciones"
        style={{
          position: "relative", background: "transparent",
          border: `1px solid rgba(37,99,235,0.35)`, borderRadius: "8px",
          padding: "8px", cursor: "pointer", color: C.muted,
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.2s",
        }}>
        <IconBell size={17} />
        {noLeidas > 0 && (
          <span style={{
            position: "absolute", top: "-5px", right: "-5px",
            background: C.danger, color: "#fff", borderRadius: "50%",
            width: "18px", height: "18px", fontSize: "10px", fontWeight: "800",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: `2px solid ${C.pageBg}`,
          }}>{noLeidas > 9 ? "9+" : noLeidas}</span>
        )}
      </button>
      {open && (
        <div ref={panelRef} style={{
          position: "fixed", top: pos.top, left: pos.left,
          width: "320px", background: C.cardBg, borderRadius: "12px",
          border: `2px solid ${C.accent}`, boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
          zIndex: 9999, overflow: "hidden",
        }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "12px 16px", borderBottom: `2px solid ${C.accent}`, background: C.pageBg,
          }}>
            <span style={{ color: C.accent2, fontWeight: "700", fontSize: "13px", fontFamily: "Cinzel,serif" }}>
              🔔 Notificaciones
            </span>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              {noLeidas > 0 && (
                <button onClick={marcarTodas} disabled={loading} style={{
                  background: "transparent", border: `1px solid ${C.accent}`,
                  color: C.accent, borderRadius: "6px", padding: "3px 9px",
                  cursor: "pointer", fontSize: "11px", fontWeight: "600",
                }}>
                  {loading ? "..." : "Leer todas"}
                </button>
              )}
              <button onClick={() => setOpen(false)} style={{
                background: "transparent", border: "none",
                color: C.muted, cursor: "pointer", fontSize: "16px", lineHeight: 1,
              }}>✕</button>
            </div>
          </div>

          <div style={{ maxHeight: "360px", overflowY: "auto" }}>
            {notifs.length === 0
              ? (
                <div style={{ padding: "32px 16px", textAlign: "center" }}>
                  <div style={{ fontSize: "32px", marginBottom: "8px" }}>🔕</div>
                  <div style={{ color: C.muted, fontSize: "13px" }}>Sin notificaciones</div>
                </div>
              )
              : notifs.map((n, i) => (
                <div key={n.id_notificacion}>
                  <div onClick={() => { if (!n.leido) marcarLeida(n.id_notificacion); }} style={{
                    padding: "12px 16px", cursor: n.leido ? "default" : "pointer",
                    background: n.leido ? "transparent" : `rgba(37,99,235,0.07)`,
                    borderLeft: n.leido ? "3px solid transparent" : `3px solid ${C.accent}`,
                    transition: "background 0.2s",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                      <div style={{ display: "flex", gap: "8px", flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: "16px", flexShrink: 0 }}>{TIPO_ICON[n.tipo] || "📣"}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                            <span style={{
                              color: C.text, fontSize: "12px", fontWeight: "700",
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>{n.titulo}</span>
                            {!n.leido && (
                              <span style={{
                                background: C.accent, color: "#fff",
                                padding: "1px 6px", borderRadius: "8px",
                                fontSize: "10px", fontWeight: "700", flexShrink: 0,
                              }}>NUEVO</span>
                            )}
                          </div>
                          <p style={{
                            color: C.muted, fontSize: "11px", margin: 0, lineHeight: "1.4",
                            overflow: "hidden", display: "-webkit-box",
                            WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                          }}>{n.mensaje}</p>
                        </div>
                      </div>
                      <span style={{ color: C.muted, fontSize: "10px", flexShrink: 0, marginTop: "2px" }}>
                        {timeAgo(n.fecha_creacion)}
                      </span>
                    </div>
                  </div>
                  {i < notifs.length - 1 && (
                    <div style={{ height: "1px", background: `rgba(37,99,235,0.1)`, margin: "0 16px" }} />
                  )}
                </div>
              ))
            }
          </div>

          <div style={{ padding: "10px 16px", borderTop: `1px solid rgba(37,99,235,0.15)`, background: C.pageBg }}>
            <a href="/cliente/notificaciones" style={{
              display: "block", textAlign: "center", padding: "7px",
              background: `rgba(37,99,235,0.1)`, border: `1px solid ${C.accent}`,
              borderRadius: "7px", color: C.accent, fontSize: "12px",
              fontWeight: "600", textDecoration: "none",
            }}>Ver todas las notificaciones →</a>
          </div>
        </div>
      )}
    </>
  );
}

// ── Sidebar principal ─────────────────────────────────────────────────────────
export default function ClienteSidebar({ user, carritoCount = 0 }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme(); // 👈 NUEVO
  const C = getColors(theme === "dark");     // 👈 NUEVO — C ahora reacciona al tema

  const [token,     setToken]     = useState("");
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("sidebar_collapsed") === "true";
  });

  useEffect(() => {
    const t = document.cookie.split(";")
      .find(c => c.trim().startsWith("access_token="))?.split("=")[1] || "";
    setToken(t);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (!collapsed) {
        const sidebar = document.querySelector(".sidebar-nav");
        if (sidebar && !sidebar.contains(e.target)) {
          setCollapsed(true);
          localStorage.setItem("sidebar_collapsed", "true");
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [collapsed]);

  function toggleSidebar() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebar_collapsed", String(next));
  }

  function logout() {
    document.cookie = "access_token=; Max-Age=0; path=/";
    sessionStorage.clear();
    router.push("/login");
  }

  return (
    <>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(-100%); opacity: 0; }
          to   { transform: translateX(0);     opacity: 1; }
        }
        .sidebar-nav {
          transition: width 0.3s cubic-bezier(0.4,0,0.2,1),
                      min-width 0.3s cubic-bezier(0.4,0,0.2,1);
        }
        .sidebar-label {
          transition: opacity 0.2s ease, width 0.3s ease;
          white-space: nowrap;
          overflow: hidden;
        }
        .sidebar-toggle-btn:hover {
          background: rgba(37,99,235,0.15) !important;
        }
        .theme-btn:hover {
          background: rgba(37,99,235,0.12) !important;
        }
      `}</style>

      <nav
        className="sidebar-nav"
        style={{
          width: "260px",
          height: "100vh",
          position: "fixed",
          top: 0,
          left: collapsed ? "-260px" : "0",
          transition: "left 0.3s ease",
          zIndex: 1000,
          background: theme === "dark"
            ? `linear-gradient(180deg,#0d1117 0%,${C.pageBg} 100%)`
            : `linear-gradient(180deg,#e8edf4 0%,${C.pageBg} 100%)`,
          borderRight: `2px solid ${C.accent}`,
          display: "flex",
          flexDirection: "column",
        }}>

        {collapsed && (
          <button
            onClick={toggleSidebar}
            style={{
              position: "fixed",
              top: "20px", left: "20px", zIndex: 1100,
              background: C.accent, color: "#fff",
              border: "none", borderRadius: "8px",
              padding: "10px 12px", cursor: "pointer",
              fontSize: "18px",
              boxShadow: "0 4px 10px rgba(0,0,0,0.4)",
            }}>
            ☰
          </button>
        )}

        {/* ── Logo + toggle ── */}
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          gap: "12px", padding: collapsed ? "22px 10px" : "22px 20px",
          borderBottom: `1px solid rgba(37,99,235,0.2)`,
          transition: "padding 0.3s",
        }}>
          <div style={{
            width: "42px", height: "42px", flexShrink: 0,
            background: `linear-gradient(135deg,${C.accent},${C.accent2})`,
            borderRadius: "10px", display: "flex", alignItems: "center",
            justifyContent: "center", fontFamily: "Cinzel,serif",
            fontWeight: "700", color: "#fff", fontSize: "14px",
            boxShadow: `0 2px 8px rgba(37,99,235,0.4)`,
          }}>VM</div>

          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "Cinzel,serif", fontSize: "13px", fontWeight: "700", color: C.text }}>
                VMBol en Red
              </div>
              <div style={{ fontSize: "10px", color: C.accent2, fontWeight: "600", letterSpacing: "1px", textTransform: "uppercase" }}>
                Panel Cliente
              </div>
            </div>
          )}

          <button
            className="sidebar-toggle-btn"
            onClick={toggleSidebar}
            title={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
            style={{
              background: "transparent",
              border: `1px solid rgba(37,99,235,0.3)`,
              borderRadius: "7px", padding: "5px 7px",
              cursor: "pointer", color: C.accent2,
              fontSize: "14px", lineHeight: 1, flexShrink: 0,
              transition: "background 0.2s",
            }}>
            {collapsed ? "›" : "‹"}
          </button>
        </div>

        {/* ── Usuario + notificaciones ── */}
        {user && (
          <div style={{
            padding: collapsed ? "14px 10px" : "14px 16px",
            background: `rgba(37,99,235,0.07)`,
            borderBottom: `1px solid rgba(37,99,235,0.15)`,
            display: "flex", alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            gap: "10px", transition: "padding 0.3s",
          }}>
            <div style={{
              width: "38px", height: "38px", borderRadius: "50%", flexShrink: 0,
              background: `linear-gradient(135deg,${C.accent},${C.accent2})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: "800", fontSize: "15px",
            }}>
              {(user.nombre || "C")[0].toUpperCase()}
            </div>

            {!collapsed && (
              <>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    color: C.text, fontSize: "13px", fontWeight: "700",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{user.nombre}</div>
                  <div style={{ color: C.accent2, fontSize: "11px" }}>Cliente</div>
                </div>
                <NotifDropdown token={token} C={C} /> {/* 👈 pasamos C */}
              </>
            )}
          </div>
        )}

        {/* ── Navegación ── */}
        <ul style={{ listStyle: "none", padding: "12px 0", margin: 0, flex: 1 }}>
          {LINKS.map(link => {
            const active = pathname === link.href;
            return (
              <li
  key={link.href}
  style={{ margin: collapsed ? "2px 6px" : "2px 10px", transition: "margin 0.3s" }}
>
  <a
    href={link.href}
    title={collapsed ? link.label : undefined}
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: collapsed ? "center" : "flex-start",
      gap: "12px",
      padding: collapsed ? "10px 8px" : "10px 13px",
      borderRadius: "8px",
      textDecoration: "none",
      color: active ? "#fff" : C.muted,
      background: active ? `rgba(37,99,235,0.2)` : "transparent",
      borderLeft: active ? `3px solid ${C.accent2}` : "3px solid transparent",
      boxShadow: active ? `0 2px 8px rgba(37,99,235,0.2)` : "none",
      fontSize: "13px",
      fontWeight: active ? "700" : "500",
      transition: "all 0.2s",
    }}
  >
    <span style={{ fontSize: "18px", flexShrink: 0 }}>
      {link.icon}
    </span>

    {!collapsed && (
      <span className="sidebar-label" style={{ flex: 1 }}>
        {link.label}
      </span>
    )}

    {!collapsed && link.href === "/cliente/carrito" && carritoCount > 0 && (
      <span
        style={{
          background: C.accent,
          color: "#fff",
          borderRadius: "10px",
          padding: "2px 7px",
          fontSize: "11px",
          fontWeight: "700",
        }}
      >
        {carritoCount}
      </span>
    )}
  </a>
</li>
            );
          })}
        </ul>

        {/* ── Botón tema + Cerrar sesión ── */}
        <div style={{
          padding: collapsed ? "14px 10px" : "14px 16px",
          borderTop: `1px solid rgba(37,99,235,0.2)`,
          display: "flex", flexDirection: "column", gap: "8px",
          transition: "padding 0.3s",
        }}>

          {/* 👇 BOTÓN TOGGLE DE TEMA — NUEVO */}
          <button
            className="theme-btn"
            onClick={toggleTheme}
            title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            style={{
              width: "100%",
              padding: collapsed ? "10px 8px" : "10px 14px",
              borderRadius: "8px",
              background: "transparent",
              border: `1px solid rgba(37,99,235,0.3)`,
              color: C.muted, cursor: "pointer", fontSize: "13px", fontWeight: "600",
              display: "flex", alignItems: "center",
              justifyContent: "center",
              gap: collapsed ? "0" : "8px",
              transition: "all 0.2s",
            }}>
            <span style={{ fontSize: "16px" }}>{theme === "dark" ? "☀️" : "🌙"}</span>
            {!collapsed && (
              <span>{theme === "dark" ? "Modo claro" : "Modo oscuro"}</span>
            )}
          </button>

          {/* Cerrar sesión — igual que antes */}
          <button
            onClick={logout}
            title={collapsed ? "Cerrar Sesión" : undefined}
            onMouseEnter={e => {
              e.currentTarget.style.background = "rgba(239,68,68,0.1)";
              e.currentTarget.style.borderColor = C.danger;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "rgba(239,68,68,0.4)";
            }}
            style={{
              width: "100%",
              padding: collapsed ? "10px 8px" : "10px 14px",
              borderRadius: "8px", background: "transparent",
              border: `1px solid rgba(239,68,68,0.4)`,
              color: "#f87171", cursor: "pointer", fontSize: "13px", fontWeight: "600",
              display: "flex", alignItems: "center",
              justifyContent: "center",
              gap: collapsed ? "0" : "8px",
              transition: "all 0.2s",
            }}>
            <IconLogout size={15} />
            {!collapsed && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </nav>
    </>
);
}  