"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminCurrency } from "@/lib/AdminCurrencyContext";
import { Package, TrendingUp, AlertTriangle, RefreshCw } from "lucide-react";

const API = "http://localhost:8000";

function getToken() {
  return document.cookie.split("; ").find(r => r.startsWith("access_token="))?.split("=")[1];
}

export default function ReabastecimientoPage() {
  const router = useRouter();
  const { formatPrice } = useAdminCurrency();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, bajo: 0, critico: 0 });

  useEffect(() => {
    const stored = sessionStorage.getItem("user");
    if (!stored) { router.push("/login"); return; }
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${API}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) { router.push("/login"); return; }
      const json = await res.json();
      const items = json.recomendaciones_reabastecimiento || [];
      setData(items);
      setStats({
        total: items.length,
        bajo: items.filter(p => p.stock > 3 && p.stock <= 10).length,
        critico: items.filter(p => p.stock <= 3).length,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "24px 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, paddingBottom: 16, borderBottom: "2px solid #9a031e" }}>
        <div>
          <h1 style={{ color: "#c1121f", fontSize: 26, fontWeight: 700, margin: 0 }}>Reabastecimiento</h1>
          <p style={{ color: "#a0a0a0", fontSize: 13, margin: "4px 0 0" }}>Productos con stock bajo que necesitan reabastecerse</p>
        </div>
        <button onClick={fetchData} disabled={loading} style={{ padding: "9px 20px", background: "#9a031e", border: "none", borderRadius: 8, color: "white", fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, opacity: loading ? 0.6 : 1 }}>
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "#1f2429", padding: "16px 18px", borderRadius: 12, borderLeft: "4px solid #f59e0b" }}>
          <p style={{ color: "#a0a0a0", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, margin: 0 }}>Total a reabastecer</p>
          <p style={{ color: "#f59e0b", fontSize: 26, fontWeight: 700, margin: "4px 0 0" }}>{stats.total}</p>
        </div>
        <div style={{ background: "#1f2429", padding: "16px 18px", borderRadius: 12, borderLeft: "4px solid #3b82f6" }}>
          <p style={{ color: "#a0a0a0", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, margin: 0 }}>Stock bajo (4-10)</p>
          <p style={{ color: "#3b82f6", fontSize: 26, fontWeight: 700, margin: "4px 0 0" }}>{stats.bajo}</p>
        </div>
        <div style={{ background: "#1f2429", padding: "16px 18px", borderRadius: 12, borderLeft: "4px solid #ef4444" }}>
          <p style={{ color: "#a0a0a0", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, margin: 0 }}>Stock crítico (≤3)</p>
          <p style={{ color: "#ef4444", fontSize: 26, fontWeight: 700, margin: "4px 0 0" }}>{stats.critico}</p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
          <div style={{ width: 36, height: 36, border: "3px solid rgba(154,3,30,0.3)", borderTop: "3px solid #9a031e", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        </div>
      ) : data.length === 0 ? (
        <div style={{ background: "#1f2429", borderRadius: 12, border: "1px solid rgba(154,3,30,0.2)", padding: 40, textAlign: "center" }}>
          <Package size={48} style={{ color: "#a0a0a0", marginBottom: 12, opacity: 0.5 }} />
          <p style={{ color: "#a0a0a0", fontSize: 15, margin: 0 }}>No hay productos con stock bajo</p>
          <p style={{ color: "#a0a0a0", fontSize: 12, marginTop: 4 }}>Todos los productos tienen stock suficiente</p>
        </div>
      ) : (
        <div style={{ background: "#1f2429", borderRadius: 12, border: "1px solid rgba(154,3,30,0.2)", overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "2px solid #9a031e", background: "#121418", display: "flex", alignItems: "center", gap: 6 }}>
            <AlertTriangle size={16} style={{ color: "#f59e0b" }} />
            <span style={{ color: "#c1121f", fontWeight: 700, fontSize: 14 }}>Productos para reabastecer</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["#", "Producto", "Categoría", "Stock", "Vendido", "Precio", "Estado"].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: "#a0a0a0", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.8, background: "#121418", borderBottom: "2px solid rgba(154,3,30,0.3)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((p, i) => (
                  <tr key={p.id_producto} style={{ background: i % 2 === 0 ? "rgba(154,3,30,0.04)" : "transparent" }}>
                    <td style={{ padding: "10px 16px", color: "#d9d9d9", borderBottom: "1px solid rgba(154,3,30,0.08)" }}>{i + 1}</td>
                    <td style={{ padding: "10px 16px", color: "#d9d9d9", borderBottom: "1px solid rgba(154,3,30,0.08)", fontWeight: 600 }}>{p.nombre}</td>
                    <td style={{ padding: "10px 16px", color: "#d9d9d9", borderBottom: "1px solid rgba(154,3,30,0.08)" }}>{p.categoria}</td>
                    <td style={{ padding: "10px 16px", borderBottom: "1px solid rgba(154,3,30,0.08)", fontWeight: 700, color: p.stock <= 3 ? "#ef4444" : "#f59e0b", fontSize: 16 }}>{p.stock}</td>
                    <td style={{ padding: "10px 16px", borderBottom: "1px solid rgba(154,3,30,0.08)", color: "#10b981", fontWeight: 700 }}>{p.total_vendido}</td>
                    <td style={{ padding: "10px 16px", color: "#d9d9d9", borderBottom: "1px solid rgba(154,3,30,0.08)" }}>{formatPrice(p.precio)}</td>
                    <td style={{ padding: "10px 16px", borderBottom: "1px solid rgba(154,3,30,0.08)" }}>
                      <span style={{
                        padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                        background: p.stock <= 3 ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)",
                        color: p.stock <= 3 ? "#ef4444" : "#f59e0b",
                        border: `1px solid ${p.stock <= 3 ? "rgba(239,68,68,0.3)" : "rgba(245,158,11,0.3)"}`,
                      }}>
                        {p.stock <= 3 ? "Crítico" : "Bajo"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
