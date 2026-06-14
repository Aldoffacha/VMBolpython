"use client";

import "@/styles/admin.css";
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
    <div>
      <div className="admin-header">
        <div>
          <h1 className="admin-header__title">Reabastecimiento</h1>
          <p className="admin-header__sub">Productos con stock bajo que necesitan reabastecerse</p>
        </div>
        <button onClick={fetchData} disabled={loading} className="admin-btn admin-btn--pri" style={{ opacity: loading ? 0.6 : 1 }}>
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>

      <div className="admin-stats">
        <div className="admin-stat" style={{ borderLeft: "4px solid #f59e0b" }}>
          <p className="admin-stat__label">Total a reabastecer</p>
          <p className="admin-stat__value" style={{ color: "#f59e0b" }}>{stats.total}</p>
        </div>
        <div className="admin-stat" style={{ borderLeft: "4px solid #3b82f6" }}>
          <p className="admin-stat__label">Stock bajo (4-10)</p>
          <p className="admin-stat__value" style={{ color: "#3b82f6" }}>{stats.bajo}</p>
        </div>
        <div className="admin-stat" style={{ borderLeft: "4px solid #ef4444" }}>
          <p className="admin-stat__label">Stock crítico (≤3)</p>
          <p className="admin-stat__value" style={{ color: "#ef4444" }}>{stats.critico}</p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
          <div className="admin-spinner" />
        </div>
      ) : data.length === 0 ? (
        <div className="admin-card" style={{ padding: 40, textAlign: "center" }}>
          <Package size={48} style={{ color: "var(--admin-text-3)", marginBottom: 12, opacity: 0.5 }} />
          <p style={{ color: "var(--admin-text-2)", fontSize: 15, margin: 0 }}>No hay productos con stock bajo</p>
          <p style={{ color: "var(--admin-text-2)", fontSize: 12, marginTop: 4 }}>Todos los productos tienen stock suficiente</p>
        </div>
      ) : (
        <div className="admin-card">
          <div className="admin-card__head">
            <AlertTriangle size={16} style={{ color: "#f59e0b" }} />
            <span className="admin-card__title">Productos para reabastecer</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="admin-table">
              <thead>
                <tr>
                  {["#", "Producto", "Categoría", "Stock", "Vendido", "Precio", "Estado"].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((p, i) => (
                  <tr key={p.id_producto} style={{ background: i % 2 === 0 ? "rgba(154,3,30,0.04)" : "transparent" }}>
                    <td>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{p.nombre}</td>
                    <td>{p.categoria}</td>
                    <td style={{ fontWeight: 700, color: p.stock <= 3 ? "#ef4444" : "#f59e0b", fontSize: 16 }}>{p.stock}</td>
                    <td style={{ color: "#10b981", fontWeight: 700 }}>{p.total_vendido}</td>
                    <td>{formatPrice(p.precio)}</td>
                    <td>
                      <span className="admin-badge" style={{
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
