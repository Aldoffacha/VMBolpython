"use client";

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
    <div style={{ padding: "24px 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, paddingBottom: 16, borderBottom: "2px solid #9a031e" }}>
        <div>
          <h1 style={{ color: "#c1121f", fontSize: 26, fontWeight: 700, margin: 0 }}>Predicción ML</h1>
          <p style={{ color: "#a0a0a0", fontSize: 13, margin: "4px 0 0" }}>Recomendaciones basadas en productos más vendidos + reglas de asociación Apriori</p>
        </div>
        <button onClick={fetchData} disabled={loading} style={{ padding: "9px 20px", background: "#9a031e", border: "none", borderRadius: 8, color: "white", fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, opacity: loading ? 0.6 : 1 }}>
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "#1f2429", padding: "16px 18px", borderRadius: 12, borderLeft: "4px solid #9a031e" }}>
          <p style={{ color: "#a0a0a0", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, margin: 0 }}>Recomendaciones</p>
          <p style={{ color: "#9a031e", fontSize: 26, fontWeight: 700, margin: "4px 0 0" }}>{data.length}</p>
        </div>
        <div style={{ background: "#1f2429", padding: "16px 18px", borderRadius: 12, borderLeft: "4px solid #10b981" }}>
          <p style={{ color: "#a0a0a0", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, margin: 0 }}>Reglas Apriori</p>
          <p style={{ color: "#10b981", fontSize: 26, fontWeight: 700, margin: "4px 0 0" }}>{meta.total_reglas}</p>
        </div>
        <div style={{ background: "#1f2429", padding: "16px 18px", borderRadius: 12, borderLeft: "4px solid #3b82f6" }}>
          <p style={{ color: "#a0a0a0", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, margin: 0 }}>Lift Promedio</p>
          <p style={{ color: "#3b82f6", fontSize: 26, fontWeight: 700, margin: "4px 0 0" }}>{meta.promedio_lift.toFixed(2)}</p>
        </div>
        <div style={{ background: "#1f2429", padding: "16px 18px", borderRadius: 12, borderLeft: "4px solid #f59e0b" }}>
          <p style={{ color: "#a0a0a0", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, margin: 0 }}>Basado en</p>
          <p style={{ color: "#f59e0b", fontSize: 26, fontWeight: 700, margin: "4px 0 0" }}>Top ventas</p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
          <div style={{ width: 36, height: 36, border: "3px solid rgba(154,3,30,0.3)", borderTop: "3px solid #9a031e", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        </div>
      ) : data.length === 0 ? (
        <div style={{ background: "#1f2429", borderRadius: 12, border: "1px solid rgba(154,3,30,0.2)", padding: 40, textAlign: "center" }}>
          <Zap size={48} style={{ color: "#a0a0a0", marginBottom: 12, opacity: 0.5 }} />
          <p style={{ color: "#a0a0a0", fontSize: 15, margin: 0 }}>No hay predicciones disponibles</p>
          <p style={{ color: "#a0a0a0", fontSize: 12, marginTop: 4 }}>Se necesitan productos vendidos y reglas de asociación activas</p>
        </div>
      ) : (
        <div style={{ background: "#1f2429", borderRadius: 12, border: "1px solid rgba(154,3,30,0.2)", overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "2px solid #9a031e", background: "#121418", display: "flex", alignItems: "center", gap: 6 }}>
            <TrendingUp size={16} style={{ color: "#10b981" }} />
            <span style={{ color: "#c1121f", fontWeight: 700, fontSize: 14 }}>Productos recomendados</span>
          </div>
          <div style={{ overflowX: "auto", padding: 16 }}>
            {data.map((p, i) => (
              <div key={p.id_producto} style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "12px 0", borderBottom: i < data.length - 1 ? "1px solid rgba(154,3,30,0.08)" : "none"
              }}>
                <img
                  src={p.imagen ? `${API}/uploads/productos/${p.imagen}` : `https://via.placeholder.com/48/1f2429/3b82f6?text=${encodeURIComponent((p.nombre||"").slice(0,2))}`}
                  alt={p.nombre}
                  style={{ width: 48, height: 48, borderRadius: 10, objectFit: "cover", border: "1px solid rgba(154,3,30,0.2)", flexShrink: 0 }}
                  onError={e => { e.target.onerror=null; e.target.src="https://via.placeholder.com/48/1f2429/3b82f6?text=P"; }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: "#d9d9d9", fontWeight: 600 }}>{p.nombre}</div>
                  <div style={{ fontSize: 12, color: "#a0a0a0", marginTop: 2, display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <span>{p.categoria}</span>
                    <span>{formatPrice(p.precio)}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 16, alignItems: "center", flexShrink: 0 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "#a0a0a0" }}>Lift</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#3b82f6" }}>{p.lift}</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "#a0a0a0" }}>Confianza</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#10b981" }}>{(p.confidence * 100).toFixed(0)}%</div>
                  </div>
                  <div style={{ textAlign: "left", maxWidth: 120, fontSize: 10, color: "#a0a0a0" }}>
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
