"use client";

import { useRouter } from "next/navigation";

const LINKS = [
  { icon: "📊", label: "Dashboard",     href: "/admin/dashboard" },
  { icon: "📦", label: "Pedidos",       href: "/admin/pedidos" },
  { icon: "🛍️", label: "Productos",    href: "/admin/productos" },
  { icon: "👥", label: "Usuarios",      href: "/admin/usuarios" },
  { icon: "💰", label: "Pagos",         href: "/admin/pagos" },
  { icon: "📈", label: "Reportes",      href: "/admin/reportes" },
  { icon: "📋", label: "Auditoría",     href: "/admin/auditoria" },
  { icon: "⚙️", label: "Configuración", href: "/admin/configuracion" },
  { icon: "🌐", label: "Prod. Externos", href: "/admin/productos-externos" },
];

export default function AdminSidebar({ user }) {
  const router = useRouter();

  const logout = () => {
    document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    sessionStorage.removeItem("user");
    router.push("/login");
  };

  const pathname = typeof window !== "undefined" ? window.location.pathname : "";

  return (
    <aside style={s.sidebar}>
      <div style={s.logo}>
        <span style={{ fontSize: 24 }}>📦</span>
        <span style={s.logoText}>VMBol en Red</span>
      </div>
      <nav style={s.nav}>
        {LINKS.map(item => (
          <a key={item.href} href={item.href} style={{
            ...s.link,
            ...(pathname === item.href ? s.linkActive : {})
          }}>
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </a>
        ))}
      </nav>
      <div style={s.footer}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 28 }}>👤</span>
          <div>
            <p style={s.userName}>{user?.nombre || "Admin"}</p>
            <p style={s.userRole}>Administrador</p>
          </div>
        </div>
        <button onClick={logout} style={s.logoutBtn}>🚪 Cerrar Sesión</button>
      </div>
    </aside>
  );
}

const s = {
  sidebar:  { width: 240, background: "#0d0f12", borderRight: "2px solid #9a031e", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh" },
  logo:     { padding: "24px 20px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid rgba(154,3,30,0.3)" },
  logoText: { color: "#c1121f", fontWeight: 700, fontSize: 16 },
  nav:      { flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 4 },
  link:     { display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 8, color: "#d9d9d9", textDecoration: "none", fontSize: 14, borderLeft: "3px solid transparent" },
  linkActive: { background: "#9a031e", color: "white", borderLeftColor: "white" },
  footer:   { padding: 16, borderTop: "1px solid rgba(154,3,30,0.3)" },
  userName: { color: "#d9d9d9", fontSize: 13, fontWeight: 600, margin: 0 },
  userRole: { color: "#9a031e", fontSize: 11, margin: 0 },
  logoutBtn:{ width: "100%", padding: 8, background: "rgba(154,3,30,0.15)", border: "1px solid rgba(154,3,30,0.4)", borderRadius: 8, color: "#d9d9d9", cursor: "pointer", fontSize: 13 },
};