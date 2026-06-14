"use client";
import { useState, useEffect } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import { AdminCurrencyProvider } from "@/lib/AdminCurrencyContext";
import { useTheme } from "@/context/ThemeContext";
import "@/styles/admin.css";

export default function AdminLayout({ children }) {
  const { theme, mounted } = useTheme();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const u = sessionStorage.getItem("user");
    if (u) setUser(JSON.parse(u));
  }, []);

  const currentTheme = mounted ? theme : "dark";

  return (
    <AdminCurrencyProvider>
      <div className={`admin-root ${currentTheme}`} suppressHydrationWarning>
        <AdminSidebar user={user} />

        <main className="admin-main">
          {children}
        </main>
      </div>
    </AdminCurrencyProvider>
  );
}