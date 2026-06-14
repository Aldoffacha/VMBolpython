"use client";

import "@/styles/admin.css";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminCurrency } from "@/lib/AdminCurrencyContext";
import { Zap, TrendingUp, Target, Activity, RefreshCw } from "lucide-react";

const API = "http://localhost:8000";

function getToken() {
  return document.cookie.split("; ").find(r => r.startsWith("access_token="))?.split("=")[1];
}

export default function PrediccionMLPage() {
  const router = useRouter();
  const { formatPrice } = useAdminCurrency();
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({ total_reglas: 0, promedio_lift: 0 });
  const [loading, setLoading] = useState(true);

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
      const ml = json.prediccion_ml || {};
      setData(ml.recomendaciones || []);
      setMeta({ total_reglas: ml.total_reglas || 0, promedio_lift: ml.promedio_lift || 0 });
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
          <h1 className="admin-header__title">Predicción ML</h1>
          <p className="admin-header__sub">Recomendaciones basadas en productos más vendidos + reglas de asociación Apriori</p>
        </div>
        <button onClick={fetchData} disabled={loading} className="admin-btn admin-btn--pri" style={{ opacity: loading ? 0.6 : 1 }}>
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>

      <div className="admin-stats">
        <div className="admin-stat" style={{ borderLeft: "4px solid #9a031e" }}>
          <p className="admin-stat__label">Recomendaciones</p>
          <p className="admin-stat__value" style={{ color: "#9a031e" }}>{data.length}</p>
        </div>
        <div className="admin-stat" style={{ borderLeft: "4px solid #10b981" }}>
          <p className="admin-stat__label">Reglas Apriori</p>
          <p className="admin-stat__value" style={{ color: "#10b981" }}>{meta.total_reglas}</p>
        </div>
        <div className="admin-stat" style={{ borderLeft: "4px solid #3b82f6" }}>
          <p className="admin-stat__label">Lift Promedio</p>
          <p className="admin-stat__value" style={{ color: "#3b82f6" }}>{meta.promedio_lift.toFixed(2)}</p>
        </div>
        <div className="admin-stat" style={{ borderLeft: "4px solid #f59e0b" }}>
          <p className="admin-stat__label">Basado en</p>
          <p className="admin-stat__value" style={{ color: "#f59e0b" }}>Top ventas</p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
          <div className="admin-spinner" />
        </div>
      ) : data.length === 0 ? (
        <div className="admin-card" style={{ padding: 40, textAlign: "center" }}>
          <Zap size={48} style={{ color: "var(--admin-text-3)", marginBottom: 12, opacity: 0.5 }} />
          <p style={{ color: "var(--admin-text-2)", fontSize: 15, margin: 0 }}>No hay predicciones disponibles</p>
          <p style={{ color: "var(--admin-text-2)", fontSize: 12, marginTop: 4 }}>Se necesitan productos vendidos y reglas de asociación activas</p>
        </div>
      ) : (
        <div className="admin-card">
          <div className="admin-card__head">
            <TrendingUp size={16} style={{ color: "#10b981" }} />
            <span className="admin-card__title">Productos recomendados</span>
          </div>
          <div style={{ overflowX: "auto", padding: 16 }}>
            {data.map((p, i) => (
              <div key={p.id_producto} style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "12px 0", borderBottom: i < data.length - 1 ? "1px solid rgba(154,3,30,0.08)" : "none"
              }}>
                <img
                  src={p.imagen ? `${API}/uploads/productos/${p.imagen}` : `https://via.placeholder.com/48/3a3f47/3b82f6?text=${encodeURIComponent((p.nombre||"").slice(0,2))}`}
                  alt={p.nombre}
                  style={{ width: 48, height: 48, borderRadius: 10, objectFit: "cover", border: "1px solid rgba(154,3,30,0.2)", flexShrink: 0 }}
                  onError={e => { e.target.onerror=null; e.target.src="https://via.placeholder.com/48/3a3f47/3b82f6?text=P"; }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: "var(--admin-text)", fontWeight: 600 }}>{p.nombre}</div>
                  <div style={{ fontSize: 12, color: "var(--admin-text-2)", marginTop: 2, display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <span>{p.categoria}</span>
                    <span>{formatPrice(p.precio)}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 16, alignItems: "center", flexShrink: 0 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "var(--admin-text-2)" }}>Lift</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#3b82f6" }}>{p.lift}</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "var(--admin-text-2)" }}>Confianza</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#10b981" }}>{(p.confidence * 100).toFixed(0)}%</div>
                  </div>
                  <div style={{ textAlign: "left", maxWidth: 120, fontSize: 10, color: "var(--admin-text-2)" }}>
                    <div style={{ fontWeight: 600, color: "#f59e0b", marginBottom: 2 }}>Basado en:</div>
                    {p.basado_en_nombres?.slice(0, 2).map((n, idx) => (
                      <div key={idx} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n}</div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
