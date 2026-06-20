"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Bell, BellOff, Megaphone, Info, CheckCircle, AlertTriangle, XCircle,
  Package, CreditCard, Truck, X, Home, ShoppingBag, ClipboardList,
  Users, BarChart3, Shield, Settings, TrendingUp, PackageOpen, Menu, Moon, Sun, MapPin,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

const API = "http://localhost:8000";

function getC(isDark) {
  return {
    pageBg:  isDark ? "#0d0f12" : "#e8eaed",
    cardBg:  isDark ? "#161a1d" : "#ffffff",
    accent:  isDark ? "#9a031e" : "#dc2626",
    accent2: isDark ? "#c1121f" : "#b91c1c",
    text:    isDark ? "#d9d9d9" : "#111827",
    muted:   isDark ? "#a0a0a0" : "#6b7280",
    danger:  isDark ? "#ef4444" : "#dc2626",
  };
}

const SECTIONS = [
  {
    title: "Panel Principal",
    links: [
      { icon: <Home size={17} />, label: "Dashboard", href: "/admin/dashboard" },
    ],
  },
  {
    title: "Inventario",
    links: [
      { icon: <Package size={17} />, label: "Productos", href: "/admin/productos" },
      { icon: <PackageOpen size={17} />, label: "Extenos", href: "/admin/productos-externos" },
    ],
  },
  {
    title: "Ventas",
    links: [
      { icon: <ShoppingBag size={17} />, label: "Pedidos", href: "/admin/pedidos" },
      { icon: <CreditCard size={17} />, label: "Pagos", href: "/admin/pagos" },
    ],
  },
  {
    title: "Usuarios",
    links: [
      { icon: <Users size={17} />, label: "Clientes", href: "/admin/usuarios" },
      { icon: <Shield size={17} />, label: "Empleados", href: "/admin/empleados" },
    ],
  },
  {
    title: "Reportes",
    links: [
      { icon: <BarChart3 size={17} />, label: "Reportes", href: "/admin/reportes" },
      { icon: <ClipboardList size={17} />, label: "Auditoria", href: "/admin/auditoria" },
    ],
  },
  {
    title: "Machine Learning",
    links: [
      { icon: <TrendingUp size={17} />, label: "Recomendaciones", href: "/admin/recomendaciones" },
      { icon: <BarChart3 size={17} />, label: "Prediccion ML", href: "/admin/prediccion-ml" },
      { icon: <Package size={17} />, label: "Reabastecimiento", href: "/admin/reabastecimiento" },
    ],
  },
  {
    title: "Sucursales",
    links: [
      { icon: <MapPin size={17} />, label: "Sucursales", href: "/admin/sucursales" },
    ],
  },
  {
    title: "Sistema",
    links: [
      { icon: <Settings size={17} />, label: "Configuracion", href: "/admin/configuracion" },
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

function NotifDropdown({ token }) {
  const { theme } = useTheme();
  const C = getC(theme === "dark");
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
          border: `1px solid ${C.accent}60`, borderRadius: "8px",
          padding: "8px", cursor: "pointer", color: C.muted,
          display: "flex", alignItems: "center", justifyContent: "center",
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
            position: "fixed", top: pos.top, left: pos.left,
            width: "320px", background: C.cardBg, borderRadius: "12px",
            border: `2px solid ${C.accent}`, boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
            zIndex: 9999, overflow: "hidden",
          }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "12px 16px", borderBottom: `2px solid ${C.accent}`, background: C.pageBg,
          }}>
            <span style={{ color: C.accent2, fontWeight: "700", fontSize: "13px", fontFamily: "'Barlow Condensed', sans-serif" }}>
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

          <div style={{ maxHeight: "360px", overflowY: "auto", scrollbarWidth: "none", msOverflowStyle: "none" }}>
            {notifs.length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center" }}>
                <div style={{ fontSize: "32px", marginBottom: "8px" }}><BellOff size={32} /></div>
                <div style={{ color: C.muted, fontSize: "13px" }}>Sin notificaciones</div>
              </div>
            ) : notifs.map((n, i) => (
              <div key={n.id_notificacion}>
                <div
                  onClick={() => { if (!n.leido) marcarLeida(n.id_notificacion); }}
                  style={{
                    padding: "12px 16px", cursor: n.leido ? "default" : "pointer",
                    background: n.leido ? "transparent" : `${C.accent}14`,
                    borderLeft: n.leido ? "3px solid transparent" : `3px solid ${C.accent2}`,
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
                          }}>{n.titulo}</span>
                          {!n.leido && (
                            <span style={{
                              background: C.accent2, color: "#fff",
                              padding: "1px 6px", borderRadius: "8px",
                              fontFamily: "'Barlow Condensed', sans-serif",
                              fontSize: "9px", fontWeight: "700", flexShrink: 0,
                            }}>NUEVO</span>
                          )}
                        </div>
                        <p style={{
                          color: C.muted, fontSize: "11px", margin: 0,
                          lineHeight: "1.4", overflow: "hidden",
                          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                        }}>{n.mensaje}</p>
                      </div>
                    </div>
                    <span style={{ color: C.muted, fontSize: "10px", flexShrink: 0, marginTop: "2px" }}>
                      {timeAgo(n.fecha_creacion)}
                    </span>
                  </div>
                </div>
                {i < notifs.length - 1 && (
                  <div style={{ height: "1px", background: `${C.accent}20`, margin: "0 16px" }} />
                )}
              </div>
            ))}
          </div>

          <div style={{ padding: "10px 16px", borderTop: `1px solid ${C.accent}30`, background: C.pageBg }}>
            <a href="/admin/notificaciones" style={{
              display: "block", textAlign: "center", padding: "7px",
              background: `${C.accent}18`, border: `1px solid ${C.accent}`,
              borderRadius: "7px", color: C.accent2, fontSize: "12px",
              fontWeight: "600", textDecoration: "none", fontFamily: "'Barlow Condensed', sans-serif",
            }}>Ver todas las notificaciones &rarr;</a>
          </div>
        </div>
      )}
    </>
  );
}

export default function AdminSidebar({ user }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { theme, mounted, toggleTheme } = useTheme();
  const [token, setToken] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const isDark = mounted ? theme === "dark" : true;
  const C = getC(isDark);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("admin_sidebar_collapsed") === "true" : false;
    setCollapsed(stored);

    const t = document.cookie.split(";")
      .find(c => c.trim().startsWith("access_token="))?.split("=")[1] || "";
    setToken(t);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--admin-sidebar-width", collapsed ? "0px" : "260px");
  }, [collapsed]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (!collapsed) {
        const sidebar = document.querySelector(".admin-sidebar");
        if (sidebar && !sidebar.contains(e.target)) {
          setCollapsed(true);
          localStorage.setItem("admin_sidebar_collapsed", "true");
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [collapsed]);

  function toggleSidebar() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("admin_sidebar_collapsed", String(next));
  }

  function logout() {
    document.cookie = "access_token=; Max-Age=0; path=/";
    sessionStorage.clear();
    router.push("/login");
  }

  return (
    <>
      <style>{`
        .admin-sidebar { transition: left 0.3s ease; }
        .admin-sidebar::-webkit-scrollbar { display: none; }
        .admin-toggle-btn:hover { background: ${C.accent}18 !important; }
        .admin-theme-btn:hover { background: ${C.accent}18 !important; }
        .admin-nav-link:hover { background: ${C.accent}16 !important; color: ${C.text} !important; }
      `}</style>

      <nav
        className="admin-sidebar"
        suppressHydrationWarning
        style={{
          width: "260px", height: "100vh", flexShrink: 0,
          position: "fixed", top: 0, left: collapsed ? "-260px" : "0",
          zIndex: 1000,
          overflowY: "auto", scrollbarWidth: "none", msOverflowStyle: "none",
          background: isDark
            ? `linear-gradient(180deg,#080a0c 0%,${C.pageBg} 100%)`
            : `linear-gradient(180deg,#dce0e6 0%,${C.pageBg} 100%)`,
          borderRight: `2px solid ${C.accent}`,
          display: "flex", flexDirection: "column",
        }}>

        {/* ── Logo ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: "12px",
          padding: "22px 20px", borderBottom: `1px solid ${C.accent}40`,
        }}>
          <div style={{
            width: "42px", height: "42px", flexShrink: 0,
            background: `linear-gradient(135deg,${C.accent},${C.accent2})`,
            borderRadius: "10px", display: "flex", alignItems: "center",
            justifyContent: "center", fontWeight: "700", color: "#fff", fontSize: "13px",
            boxShadow: `0 2px 8px ${C.accent}75`,
          }}>VM</div>
          <div>
            <div style={{ fontSize: "13px", fontWeight: "700", color: C.text, fontFamily: "'Barlow', sans-serif" }}>
              VMBol en Red
            </div>
            <div style={{
              fontSize: "10px", color: C.accent2, fontWeight: "600",
              letterSpacing: "1px", textTransform: "uppercase",
              fontFamily: "'Barlow Condensed', sans-serif",
            }}>
              Panel Admin
            </div>
          </div>
        </div>

        {/* ── Usuario + Notificaciones ── */}
        {user && (
          <div style={{
            padding: "14px 16px", background: `${C.accent}12`,
            borderBottom: `1px solid ${C.accent}30`,
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
                fontFamily: "'Barlow', sans-serif",
              }}>
                {user.nombre || "Admin"}
              </div>
              <div style={{ color: C.accent2, fontSize: "11px", fontFamily: "'Barlow Condensed', sans-serif" }}>
                Administrador
              </div>
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
                fontFamily: "'Barlow Condensed', sans-serif",
              }}>
                {section.title}
              </div>
              {section.links.map(link => {
                const active = pathname === link.href;
                return (
                  <a key={link.href} href={link.href} className="admin-nav-link" style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    padding: "9px 18px", margin: "1px 10px", borderRadius: "8px",
                    textDecoration: "none",
                    color: active ? "#fff" : C.text,
                    background: active ? `${C.accent}35` : "transparent",
                    borderLeft: active ? `3px solid ${C.accent2}` : "3px solid transparent",
                    boxShadow: active ? `0 2px 8px ${C.accent}40` : "none",
                    fontSize: "13px", fontWeight: active ? "700" : "500",
                    fontFamily: "'Barlow Condensed', sans-serif",
                    letterSpacing: "0.5px",
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

        {/* ── Tema ── */}
        <div style={{ padding: "8px 16px", borderTop: `1px solid ${C.accent}40` }}>
          <button
            onClick={toggleTheme}
            className="admin-theme-btn"
            style={{
              width: "100%", padding: "10px 14px", borderRadius: "8px",
              background: "transparent", border: `1px solid ${C.accent}60`,
              color: C.text, cursor: "pointer", fontSize: "12px",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              fontFamily: "'Barlow Condensed', sans-serif",
              letterSpacing: "1px", textTransform: "uppercase", fontWeight: "600",
              transition: "all 0.2s",
            }}>
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
            {isDark ? "Modo claro" : "Modo oscuro"}
          </button>
        </div>

        {/* ── Cerrar Sesión ── */}
        <div style={{ padding: "8px 16px 14px" }}>
          <button
            onClick={logout}
            className="admin-toggle-btn"
            style={{
              width: "100%", padding: "10px 14px", borderRadius: "8px",
              background: "transparent", border: `1px solid ${C.accent}60`,
              color: isDark ? "#f87171" : C.danger, cursor: "pointer", fontSize: "12px",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              fontFamily: "'Barlow Condensed', sans-serif",
              letterSpacing: "1px", textTransform: "uppercase", fontWeight: "600",
              transition: "all 0.2s",
            }}>
            <IconLogout size={15} />
            Cerrar Sesion
          </button>
        </div>
      </nav>

      {/* Toggle button when collapsed */}
      {collapsed && (
        <button
          onClick={toggleSidebar}
          style={{
            position: "fixed", top: "14px", left: "14px", zIndex: 999,
            width: "42px", height: "42px", borderRadius: "10px",
            background: `linear-gradient(135deg,${C.accent},${C.accent2})`,
            border: "none", color: "#fff", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 2px 10px ${C.accent}60`,
          }}>
          <Menu size={20} />
        </button>
      )}
    </>
  );
}
