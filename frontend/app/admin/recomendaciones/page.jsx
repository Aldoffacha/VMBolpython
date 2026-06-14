"use client";

import "@/styles/admin.css";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, TrendingUp, Target, Activity } from "lucide-react";

const API = "http://localhost:8000";

function getToken() {
  return document.cookie.split("; ").find(r => r.startsWith("access_token="))?.split("=")[1];
}

const POR_PAGINA = 15;

export default function AdminRecomendaciones() {
  const router = useRouter();
  const [reglas, setReglas] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [stats, setStats] = useState({ avgLift: 0, avgConfidence: 0, avgSupport: 0 });
const [modelStats, setModelStats] = useState([]);

  useEffect(() => {
    const stored = sessionStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const fetchReglas = useCallback(async (force = false) => {
    setLoading(true);
    try {
      const token = getToken();
      const url = force ? `${API}/api/recomendaciones/reglas?force=true` : `${API}/api/recomendaciones/reglas`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) { router.push("/login"); return; }
      const data = await res.json();
      setReglas(data.reglas || []);
      setTotal(data.total || 0);
      setPagina(1);

      if (data.reglas?.length > 0) {
        const avgLift = data.reglas.reduce((s, r) => s + r.lift, 0) / data.reglas.length;
        const avgConfidence = data.reglas.reduce((s, r) => s + r.confidence, 0) / data.reglas.length;
        const avgSupport = data.reglas.reduce((s, r) => s + r.support, 0) / data.reglas.length;
        setStats({ avgLift, avgConfidence, avgSupport });
      }

      const statsRes = await fetch(`${API}/api/recomendaciones/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setModelStats(statsData.stats || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { fetchReglas(); }, [fetchReglas]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const token = getToken();
      await fetch(`${API}/api/recomendaciones/entrenar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchReglas(false);
    } catch (e) {
      console.error(e);
    }
    setTimeout(() => setRefreshing(false), 500);
  };

  const logout = () => {
    document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    sessionStorage.removeItem("user");
    router.push("/login");
  };

  return (
    <div>
      <main>
        {/* HEADER */}
        <div className="admin-header">
          <div>
            <h1 className="admin-header__title"> Recomendaciones ML</h1>
            <p className="admin-header__sub">Reglas de asociación (Apriori) — Market Basket Analysis</p>
          </div>
          <button onClick={handleRefresh} disabled={refreshing} className="admin-btn admin-btn--pri" style={{ opacity: refreshing ? 0.6 : 1 }}>
            <RefreshCw size={14} style={{ animation: refreshing ? "spin 0.8s linear infinite" : "none" }} /> {refreshing ? "Entrenando..." : "Re-entrenar modelo"}
          </button>
        </div>

        {/* STATS */}
        {!loading && reglas.length > 0 && (
          <div className="admin-stats" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
            {[
              { icon: <TrendingUp size={22} />, label: "Reglas Generadas", value: total, color: "#9a031e", sub: "Asociaciones encontradas" },
              { icon: <Activity size={22} />, label: "Lift Promedio", value: stats.avgLift.toFixed(2), color: "#10b981", sub: "> 1 = relevante" },
              { icon: <Target size={22} />, label: "Confianza Promedio", value: (stats.avgConfidence * 100).toFixed(1) + "%", color: "#3b82f6", sub: "Probabilidad de acierto" },
              { icon: <Activity size={22} />, label: "Soporte Promedio", value: (stats.avgSupport * 100).toFixed(2) + "%", color: "#f59e0b", sub: "Frecuencia en pedidos" },
            ].map(st => (
              <div key={st.label} className="admin-stat" style={{ borderLeftColor: st.color }}>
                <div className="admin-stat__top">
                  <div>
                    <p className="admin-stat__label">{st.label}</p>
                    <p className="admin-stat__value" style={{ color: st.color, fontSize: 22 }}>{st.value}</p>
                    <p className="admin-stat__sub">{st.sub}</p>
                  </div>
                  <span style={{ color: st.color, opacity: 0.5 }}>{st.icon}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* MODEL STATS PER CATEGORY */}
        {!loading && modelStats.length > 0 && (
          <div className="admin-stats">
            {modelStats.map(ms => (
              <div key={`${ms.categoria}-${ms.origen}`} className="admin-stat" style={{ borderLeftColor: ms.origen === "local" ? "#10b981" : "#3b82f6", padding: "12px 14px" }}>
                <p style={{ margin: "0 0 2px", fontSize: 11, color: "var(--admin-text-2)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {ms.categoria} <span style={{ color: ms.origen === "local" ? "#10b981" : "#3b82f6" }}>({ms.origen})</span>
                </p>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{ms.total_reglas} reglas</p>
                <p style={{ margin: 0, fontSize: 10, color: "var(--admin-text-2)" }}>
                  Lift {ms.avg_lift} · Conf {ms.avg_confidence}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* CARD TABLA */}
        <div className="admin-card">
          <div className="admin-card__head">
            <span className="admin-card__title">Reglas de Asociación</span>
            {!loading && <span style={{ color: "var(--admin-text-2)", fontSize: 12 }}>{total} regla{total !== 1 ? "s" : ""}</span>}
          </div>

          {loading ? (
            <div className="admin-loading"><div className="admin-spinner" /></div>
          ) : reglas.length === 0 ? (
            <div className="admin-empty">
              <p style={{ fontSize: 15, marginBottom: 4 }}>No hay reglas de asociación disponibles</p>
              <p className="admin-empty__txt">Debe haber al menos 2 productos diferentes en pedidos pagados para generar reglas.</p>
            </div>
          ) : (
            <>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      {["#", "Antecedentes (Si compran...)", "Consecuentes (Recomendar...)", "Categoría", "Origen", "Soporte", "Confianza", "Lift", "Interpretación"].map(h => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                      {reglas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA).map((r, i) => {
                      const idx = (pagina - 1) * POR_PAGINA + i + 1;
                      return (
                        <tr key={idx} style={{ background: i % 2 === 0 ? "rgba(154,3,30,0.04)" : "transparent" }}>
                          <td>{idx}</td>
                          <td>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                              {r.antecedentes.map(a => (
                                <span key={a.id} className="admin-badge">{a.nombre}</span>
                              ))}
                            </div>
                          </td>
                          <td>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                              {r.consecuentes.map(c => (
                                <span key={c.id} className="admin-badge" style={{ background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}>{c.nombre}</span>
                              ))}
                            </div>
                          </td>
                          <td style={{ fontSize: 12 }}>
                            <span className="admin-badge" style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}>{r.categoria}</span>
                          </td>
                          <td style={{ fontSize: 12 }}>
                            <span className="admin-badge" style={{
                              background: r.origen === "local" ? "rgba(16,185,129,0.15)" : "rgba(59,130,246,0.15)",
                              color: r.origen === "local" ? "#10b981" : "#3b82f6",
                              border: `1px solid ${r.origen === "local" ? "rgba(16,185,129,0.3)" : "rgba(59,130,246,0.3)"}`,
                            }}>{r.origen}</span>
                          </td>
                          <td>{(r.support * 100).toFixed(2)}%</td>
                          <td>{(r.confidence * 100).toFixed(1)}%</td>
                          <td style={{ fontWeight: 700, color: r.lift > 2 ? "#10b981" : r.lift > 1.5 ? "#f59e0b" : "var(--admin-text)" }}>{r.lift.toFixed(2)}x</td>
                          <td style={{ fontSize: 12, color: "var(--admin-text-2)" }}>
                            {r.lift > 2 ? "Fuerte" : r.lift > 1.5 ? "Moderada" : r.lift > 1 ? "Débil" : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* PAGINACION */}
              {total > POR_PAGINA && (
                <div className="admin-pagination" style={{ padding: "0 20px 20px" }}>
                  <button onClick={() => setPagina(1)} disabled={pagina === 1} className="admin-page-btn" style={{ opacity: pagina === 1 ? 0.4 : 1 }}>«</button>
                  <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1} className="admin-page-btn" style={{ opacity: pagina === 1 ? 0.4 : 1 }}>‹ Anterior</button>
                  <span style={{ color: "var(--admin-text-2)", fontSize: 13, padding: "0 8px" }}>
                    Página {pagina} de {Math.ceil(total / POR_PAGINA)}
                  </span>
                  <button onClick={() => setPagina(p => Math.min(Math.ceil(total / POR_PAGINA), p + 1))} disabled={pagina === Math.ceil(total / POR_PAGINA)} className="admin-page-btn" style={{ opacity: pagina === Math.ceil(total / POR_PAGINA) ? 0.4 : 1 }}>Siguiente ›</button>
                  <button onClick={() => setPagina(Math.ceil(total / POR_PAGINA))} disabled={pagina === Math.ceil(total / POR_PAGINA)} className="admin-page-btn" style={{ opacity: pagina === Math.ceil(total / POR_PAGINA) ? 0.4 : 1 }}>»</button>
                </div>
              )}
            </>
          )}
        </div>

        {/* INFO CARD */}
        {!loading && reglas.length > 0 && (
          <div className="admin-card admin-card--soft">
            <div className="admin-card__body">
              <span className="admin-card__title">¿Cómo interpretar?</span>
              <div className="admin-grid3" style={{ color: "var(--admin-text-2)", fontSize: 12, lineHeight: 1.6 }}>
                <div>
                  <strong style={{ color: "var(--admin-text)" }}>Soporte</strong><br />
                  Frecuencia con la que aparece la combinación en todos los pedidos. Ej: 5% = aparece en el 5% de pedidos.
                </div>
                <div>
                  <strong style={{ color: "var(--admin-text)" }}>Confianza</strong><br />
                  Probabilidad de que se compre el consecuente dado el antecedente. Ej: 80% = 8 de 10 veces.
                </div>
                <div>
                  <strong style={{ color: "var(--admin-text)" }}>Lift</strong><br />
                  Qué tanto más probable es comprar el consecuente con el antecedente vs sin él. &gt;1 = correlación positiva.
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const s = {
};
