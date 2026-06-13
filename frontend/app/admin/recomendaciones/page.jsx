"use client";

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
    <div style={s.page}>
      <main style={s.main}>
        {/* HEADER */}
        <div style={s.header}>
          <div>
            <h1 style={s.pageTitle}> Recomendaciones ML</h1>
            <p style={s.pageSubtitle}>Reglas de asociación (Apriori) — Market Basket Analysis</p>
          </div>
          <button onClick={handleRefresh} disabled={refreshing} style={{ ...s.btnPrimary, opacity: refreshing ? 0.6 : 1 }}>
            <RefreshCw size={14} style={{ animation: refreshing ? "spin 0.8s linear infinite" : "none" }} /> {refreshing ? "Entrenando..." : "Re-entrenar modelo"}
          </button>
        </div>

        {/* STATS */}
        {!loading && reglas.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
            {[
              { icon: <TrendingUp size={22} />, label: "Reglas Generadas", value: total, color: "#9a031e", sub: "Asociaciones encontradas" },
              { icon: <Activity size={22} />, label: "Lift Promedio", value: stats.avgLift.toFixed(2), color: "#10b981", sub: "> 1 = relevante" },
              { icon: <Target size={22} />, label: "Confianza Promedio", value: (stats.avgConfidence * 100).toFixed(1) + "%", color: "#3b82f6", sub: "Probabilidad de acierto" },
              { icon: <Activity size={22} />, label: "Soporte Promedio", value: (stats.avgSupport * 100).toFixed(2) + "%", color: "#f59e0b", sub: "Frecuencia en pedidos" },
            ].map(st => (
              <div key={st.label} style={{ ...s.statCard, borderLeftColor: st.color }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <p style={s.statLabel}>{st.label}</p>
                    <p style={{ ...s.statValue, color: st.color }}>{st.value}</p>
                    <p style={{ color: "#a0a0a0", fontSize: 11, margin: 0 }}>{st.sub}</p>
                  </div>
                  <span style={{ color: st.color, opacity: 0.5 }}>{st.icon}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* MODEL STATS PER CATEGORY */}
        {!loading && modelStats.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12, marginBottom: 20 }}>
            {modelStats.map(ms => (
              <div key={`${ms.categoria}-${ms.origen}`} style={{ ...s.statCard, borderLeftColor: ms.origen === "local" ? "#10b981" : "#3b82f6", padding: "12px 14px" }}>
                <p style={{ margin: "0 0 2px", fontSize: 11, color: "#a0a0a0", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {ms.categoria} <span style={{ color: ms.origen === "local" ? "#10b981" : "#3b82f6" }}>({ms.origen})</span>
                </p>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{ms.total_reglas} reglas</p>
                <p style={{ margin: 0, fontSize: 10, color: "#a0a0a0" }}>
                  Lift {ms.avg_lift} · Conf {ms.avg_confidence}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* CARD TABLA */}
        <div style={s.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <p style={s.cardTitle}>Reglas de Asociación</p>
            {!loading && <span style={{ color: "#a0a0a0", fontSize: 12 }}>{total} regla{total !== 1 ? "s" : ""}</span>}
          </div>

          {loading ? (
            <div style={s.loadingRow}><div style={s.spinner} /></div>
          ) : reglas.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "#a0a0a0" }}>
              <p style={{ fontSize: 15, marginBottom: 4 }}>No hay reglas de asociación disponibles</p>
              <p style={{ fontSize: 12 }}>Debe haber al menos 2 productos diferentes en pedidos pagados para generar reglas.</p>
            </div>
          ) : (
            <>
              <div style={s.tableWrapper}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      {["#", "Antecedentes (Si compran...)", "Consecuentes (Recomendar...)", "Categoría", "Origen", "Soporte", "Confianza", "Lift", "Interpretación"].map(h => (
                        <th key={h} style={s.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                      {reglas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA).map((r, i) => {
                      const idx = (pagina - 1) * POR_PAGINA + i + 1;
                      return (
                        <tr key={idx} style={{ background: i % 2 === 0 ? "rgba(154,3,30,0.04)" : "transparent" }}>
                          <td style={s.td}>{idx}</td>
                          <td style={s.td}>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                              {r.antecedentes.map(a => (
                                <span key={a.id} style={s.badge}>{a.nombre}</span>
                              ))}
                            </div>
                          </td>
                          <td style={s.td}>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                              {r.consecuentes.map(c => (
                                <span key={c.id} style={{ ...s.badge, background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}>{c.nombre}</span>
                              ))}
                            </div>
                          </td>
                          <td style={{ ...s.td, fontSize: 12 }}>
                            <span style={{ ...s.badge, background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}>{r.categoria}</span>
                          </td>
                          <td style={{ ...s.td, fontSize: 12 }}>
                            <span style={{
                              ...s.badge,
                              background: r.origen === "local" ? "rgba(16,185,129,0.15)" : "rgba(59,130,246,0.15)",
                              color: r.origen === "local" ? "#10b981" : "#3b82f6",
                              border: `1px solid ${r.origen === "local" ? "rgba(16,185,129,0.3)" : "rgba(59,130,246,0.3)"}`,
                            }}>{r.origen}</span>
                          </td>
                          <td style={s.td}>{(r.support * 100).toFixed(2)}%</td>
                          <td style={s.td}>{(r.confidence * 100).toFixed(1)}%</td>
                          <td style={{ ...s.td, fontWeight: 700, color: r.lift > 2 ? "#10b981" : r.lift > 1.5 ? "#f59e0b" : "#d9d9d9" }}>{r.lift.toFixed(2)}x</td>
                          <td style={{ ...s.td, fontSize: 12, color: "#a0a0a0" }}>
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
                <div style={s.pagination}>
                  <button onClick={() => setPagina(1)} disabled={pagina === 1} style={{ ...s.pageBtn, opacity: pagina === 1 ? 0.4 : 1 }}>«</button>
                  <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1} style={{ ...s.pageBtn, opacity: pagina === 1 ? 0.4 : 1 }}>‹ Anterior</button>
                  <span style={{ color: "#a0a0a0", fontSize: 13, padding: "0 8px" }}>
                    Página {pagina} de {Math.ceil(total / POR_PAGINA)}
                  </span>
                  <button onClick={() => setPagina(p => Math.min(Math.ceil(total / POR_PAGINA), p + 1))} disabled={pagina === Math.ceil(total / POR_PAGINA)} style={{ ...s.pageBtn, opacity: pagina === Math.ceil(total / POR_PAGINA) ? 0.4 : 1 }}>Siguiente ›</button>
                  <button onClick={() => setPagina(Math.ceil(total / POR_PAGINA))} disabled={pagina === Math.ceil(total / POR_PAGINA)} style={{ ...s.pageBtn, opacity: pagina === Math.ceil(total / POR_PAGINA) ? 0.4 : 1 }}>»</button>
                </div>
              )}
            </>
          )}
        </div>

        {/* INFO CARD */}
        {!loading && reglas.length > 0 && (
          <div style={{ ...s.card, background: "#121418" }}>
            <p style={s.cardTitle}>¿Cómo interpretar?</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, color: "#a0a0a0", fontSize: 12, lineHeight: 1.6 }}>
              <div>
                <strong style={{ color: "#d9d9d9" }}>Soporte</strong><br />
                Frecuencia con la que aparece la combinación en todos los pedidos. Ej: 5% = aparece en el 5% de pedidos.
              </div>
              <div>
                <strong style={{ color: "#d9d9d9" }}>Confianza</strong><br />
                Probabilidad de que se compre el consecuente dado el antecedente. Ej: 80% = 8 de 10 veces.
              </div>
              <div>
                <strong style={{ color: "#d9d9d9" }}>Lift</strong><br />
                Qué tanto más probable es comprar el consecuente con el antecedente vs sin él. &gt;1 = correlación positiva.
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const s = {
  page: { display: "flex", minHeight: "100vh", background: "#121418", fontFamily: "'Lato', sans-serif", color: "#d9d9d9" },
  main: { flex: 1, padding: "24px 28px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, paddingBottom: 16, borderBottom: "2px solid #9a031e" },
  pageTitle: { color: "#c1121f", fontSize: 26, fontWeight: 700, margin: 0 },
  pageSubtitle: { color: "#a0a0a0", fontSize: 13, margin: "4px 0 0" },
  card: { background: "#1f2429", borderRadius: 12, border: "1px solid rgba(154,3,30,0.2)", padding: 20, marginBottom: 16 },
  cardTitle: { color: "#c1121f", fontWeight: 700, fontSize: 14, marginBottom: 12, margin: 0 },
  statCard: { background: "#1f2429", padding: "16px 18px", borderRadius: 12, borderLeft: "4px solid #9a031e" },
  statLabel: { color: "#a0a0a0", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, margin: 0 },
  statValue: { fontSize: 22, fontWeight: 700, margin: "4px 0 2px" },
  tableWrapper: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { padding: "10px 14px", textAlign: "left", color: "#a0a0a0", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.8, background: "#121418", borderBottom: "2px solid rgba(154,3,30,0.3)" },
  td: { padding: "10px 14px", color: "#d9d9d9", borderBottom: "1px solid rgba(154,3,30,0.08)" },
  badge: { padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: "rgba(154,3,30,0.15)", color: "#c1121f", border: "1px solid rgba(154,3,30,0.3)" },
  loadingRow: { display: "flex", justifyContent: "center", padding: 60 },
  spinner: { width: 36, height: 36, border: "3px solid rgba(154,3,30,0.3)", borderTop: "3px solid #9a031e", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  btnPrimary: { padding: "9px 20px", background: "#9a031e", border: "none", borderRadius: 8, color: "white", fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 },
  pagination: { display: "flex", justifyContent: "center", gap: 6, marginTop: 16, flexWrap: "wrap", alignItems: "center" },
  pageBtn: { padding: "7px 12px", background: "#1f2429", border: "1px solid rgba(154,3,30,0.3)", borderRadius: 6, color: "#d9d9d9", cursor: "pointer", fontSize: 13 },
};
