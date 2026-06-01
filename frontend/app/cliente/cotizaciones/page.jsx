"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ClienteSidebar from "@/components/ClienteSidebar";
import { useTheme } from "@/context/ThemeContext";
import "@/styles/dashboard.css";

const API = "http://localhost:8000";

export default function ClienteCotizaciones() {
  const router = useRouter();
  const { darkMode } = useTheme();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = document.cookie.split("; ").find(r => r.startsWith("access_token="))?.split("=")[1];
    if (!token) { router.push("/login"); return; }
    setLoading(false);
  }, [router]);

  if (loading) return <div>Cargando...</div>;

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <ClienteSidebar />
      <main style={{ flex: 1, padding: "24px 28px" }}>
        <h1>Cotizaciones</h1>
        <p>Sección en construcción.</p>
      </main>
    </div>
  );
}
