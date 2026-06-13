"use client";
import { useState, useEffect } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import { AdminCurrencyProvider } from "@/lib/AdminCurrencyContext";

export default function AdminLayout({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const u = sessionStorage.getItem("user");
    if (u) setUser(JSON.parse(u));
  }, []);

  return (
    <AdminCurrencyProvider>
      <div style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
      }}>
        <AdminSidebar user={user} />

        <main style={{
          flex: 1,
          overflowY: "auto",
          background: "#0d0f12",
        }}>
          {children}
        </main>
      </div>
    </AdminCurrencyProvider>
  );
}