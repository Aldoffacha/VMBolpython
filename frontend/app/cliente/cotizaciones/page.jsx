"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import ClienteSidebar from "@/components/ClienteSidebar";
import { useTheme } from "@/context/ThemeContext";
import { useClienteMoneda } from "@/lib/ClienteMonedaContext";
import "@/styles/dashboard.css";

const API = "http://localhost:8000";

const NOM_CAT = {
  electronico: "Electrónico", ropa: "Ropa", hogar: "Hogar",
  deportes: "Deportes", otros: "Otros",
  gaming:"Gaming", audio:"Audio", celulares:"Celulares",
  computadoras:"Computadoras", fotografia:"Fotografía",
  ropa_hombre:"Ropa Hombre", ropa_mujer:"Ropa Mujer", calzado:"Calzado", accesorios:"Accesorios",
  cocina:"Cocina", dormitorio:"Dormitorio", decoracion:"Decoración",
  fitness:"Fitness", futbol:"Fútbol", outdoor:"Outdoor",
  juguetes:"Juguetes", libros:"Libros",
};

export default function ClienteCotizaciones() {
  const router = useRouter();
  const { theme, mounted } = useTheme();
  const { formatPrice, formatPriceBOB, temaCliente } = useClienteMoneda();
  const [loading, setLoading] = useState(true);
  const [cotizaciones, setCotizaciones] = useState([]);
  const [sortCol, setSortCol] = useState("fecha");
  const [sortDir, setSortDir] = useState("desc");

  useEffect(() => {
    const token = document.cookie.split("; ").find(r => r.startsWith("access_token="))?.split("=")[1];
    if (!token) { router.push("/login"); return; }

    fetch(`${API}/cliente/cotizaciones`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setCotizaciones(d.cotizaciones); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  function ord(col) {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  }

  const sorted = useMemo(() => {
    const arr = [...cotizaciones];
    arr.sort((a, b) => {
      let va, vb;
      if (sortCol === "id") { va = a.id_cotizacion; vb = b.id_cotizacion; }
      else if (sortCol === "peso") { va = a.peso; vb = b.peso; }
      else if (sortCol === "total") { va = a.costo_total; vb = b.costo_total; }
      else { va = a.fecha; vb = b.fecha; }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [cotizaciones, sortCol, sortDir]);

  const themeClase = mounted ? `${theme} tema-${temaCliente}` : "";

  if (loading) return (
    <div className={`tnd-loading ${theme}`}>
      <div className="tnd-loading__ring" />
      <span className="tnd-loading__text">CARGANDO</span>
    </div>
  );

  return (
    <div className={`vmb-root ${themeClase}`}>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <ClienteSidebar />
        <main style={{ flex: 1, padding: "28px 32px" }}>
          <style>{`
            .cot-h{font-family:var(--font-d);font-size:28px;color:var(--text);letter-spacing:.04em;margin-bottom:4px}
            .cot-st{font-size:13px;color:var(--text-2);margin-bottom:24px}
            .cot-empty{padding:48px;text-align:center;color:var(--text-3);font-family:var(--font-c);font-size:16px;letter-spacing:1px}
            .cot-tab{width:100%;border-collapse:collapse;font-family:var(--font-b);font-size:13px}
            .cot-tab th{text-align:left;padding:10px 12px;color:var(--text-3);font-family:var(--font-c);font-size:11px;letter-spacing:1.5px;text-transform:uppercase;border-bottom:1px solid var(--border);cursor:default;white-space:nowrap;user-select:none}
            .cot-tab th.s{color:var(--blue-bright);cursor:pointer}
            .cot-tab th.s:hover{color:var(--text)}
            .cot-tab td{padding:10px 12px;border-bottom:1px solid var(--border);color:var(--text-2)}
            .cot-tab tr:hover td{background:var(--card-hover)}
            .cot-tab__id{font-weight:600;color:var(--text)}
            .cot-tab__nom{font-weight:600;color:var(--text)}
            .cot-tab__total{font-weight:700;color:var(--blue-bright);white-space:nowrap}
            .cot-tab__bob{font-size:11px;color:var(--text-3);display:block}
            .cot-tab__arrow{display:inline-block;margin-left:4px;font-size:10px}
          `}</style>

          <div className="cot-h">Historial de Cotizaciones</div>
          <div className="cot-st">
            {cotizaciones.length} cotización{cotizaciones.length !== 1 ? "es" : ""} registrada{cotizaciones.length !== 1 ? "s" : ""}
          </div>

          {cotizaciones.length === 0 ? (
            <div className="cot-empty">No realizaste ninguna cotización aún</div>
          ) : (
            <table className="cot-tab">
              <thead>
                <tr>
                  <th className="s" onClick={() => ord("id")}>#{sortCol === "id" ? <span className="cot-tab__arrow">{sortDir === "asc" ? "▲" : "▼"}</span> : ""}</th>
                  <th>Producto</th>
                  <th>Precio Base</th>
                  <th>Categoría</th>
                  <th className="s" onClick={() => ord("peso")}>Peso{sortCol === "peso" ? <span className="cot-tab__arrow">{sortDir === "asc" ? "▲" : "▼"}</span> : ""}</th>
                  <th>Flete</th>
                  <th>Aduana</th>
                  <th>Seguro</th>
                  <th>Almacén</th>
                  <th className="s" onClick={() => ord("total")}>Total{sortCol === "total" ? <span className="cot-tab__arrow">{sortDir === "asc" ? "▲" : "▼"}</span> : ""}</th>
                  <th>TC</th>
                  <th className="s" onClick={() => ord("fecha")}>Fecha{sortCol === "fecha" ? <span className="cot-tab__arrow">{sortDir === "asc" ? "▲" : "▼"}</span> : ""}</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(c => (
                  <tr key={c.id_cotizacion}>
                    <td className="cot-tab__id">{c.id_cotizacion}</td>
                    <td className="cot-tab__nom">{c.nombre_producto}</td>
                    <td>{formatPrice(c.precio_base)}</td>
                    <td>{NOM_CAT[c.categoria] || c.categoria}</td>
                    <td>{c.peso} kg</td>
                    <td>{formatPrice(c.costo_flete)}</td>
                    <td>{formatPrice(c.costo_aduana)}</td>
                    <td>{formatPrice(c.costo_seguro)}</td>
                    <td>{formatPrice(c.costo_almacen)}</td>
                    <td className="cot-tab__total">{formatPrice(c.costo_total)}<span className="cot-tab__bob">
                      {c.tipo_cambio
                        ? `Bs ${(parseFloat(c.costo_total) * parseFloat(c.tipo_cambio)).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : formatPriceBOB(c.costo_total)}
                    </span></td>
                    <td style={{ fontFamily: "var(--font-c)", fontSize: "12px", color: "var(--text-3)" }}>
                      {c.tipo_cambio ? `Bs ${parseFloat(c.tipo_cambio).toFixed(2)}` : "—"}
                    </td>
                    <td style={{ whiteSpace: "nowrap", fontSize: "12px" }}>
                      {new Date(c.fecha).toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </main>
      </div>
    </div>
  );
}