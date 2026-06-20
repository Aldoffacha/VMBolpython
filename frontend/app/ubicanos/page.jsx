"use client";

import { useState, useEffect, useRef } from "react";
import LandingNav from "@/components/LandingNav";

const API = "http://localhost:8000";

const C_ = {
  prim: "#2563eb",
  bright: "#3b82f6",
  glow: "rgba(37,99,235,0.5)",
  red: "#2563eb",
  redBorder: "rgba(37,99,235,0.3)",
  redBg: "rgba(37,99,235,0.1)",
};

function cargarLeaflet() {
  return new Promise((resolve) => {
    if (window.L) return resolve(window.L);
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => {
      const iv = setInterval(() => {
        if (window.L) { clearInterval(iv); resolve(window.L); }
      }, 50);
    };
    script.onerror = () => { console.error("Error cargando Leaflet"); resolve(null); };
    document.head.appendChild(script);
  });
}

export default function UbicanosPage() {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const pulsoRef = useRef(null);
  const deptosLayer = useRef(null);
  const [sucursales, setSucursales] = useState([]);
  const [sucursalSel, setSucursalSel] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [mapaListo, setMapaListo] = useState(false);
  const [deptosGeo, setDeptosGeo] = useState(null);
  const [deptosCargando, setDeptosCargando] = useState(true);

  useEffect(() => {
    cargarLeaflet().then((L) => {
      if (L) setMapaListo(true);
    });
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch(`${API}/api/sucursales`);
        const json = await res.json();
        if (json.success) setSucursales(json.sucursales);
      } catch {}
      setCargando(false);
    }
    init();
  }, []);

  useEffect(() => {
    fetch("/geojson/bol_departamentos.json")
      .then(r => r.json())
      .then(g => { setDeptosGeo(g); setDeptosCargando(false); })
      .catch(() => setDeptosCargando(false));
  }, []);

  useEffect(() => {
    const L = window.L;
    if (!mapaListo || !L || mapInstance.current) return;

    const boliviaBounds = L.latLngBounds(
      [-22.9, -69.7],
      [-9.7, -57.5]
    );

    const map = L.map(mapRef.current, {
      center: [-16.7, -65.5],
      zoom: 6,
      zoomControl: true,
      attributionControl: false,
      maxBounds: boliviaBounds,
      maxBoundsViscosity: 1,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
    }).addTo(map);

    mapInstance.current = map;

    return () => {
      if (pulsoRef.current) clearInterval(pulsoRef.current);
      map.remove();
      mapInstance.current = null;
    };
  }, [mapaListo]);

  useEffect(() => {
    const L = window.L;
    if (!deptosGeo || !mapInstance.current || !L) return;

    if (deptosLayer.current) {
      mapInstance.current.removeLayer(deptosLayer.current);
    }

    const colores = [
      "#7ba87a", "#c4a87a", "#9b8fb3", "#7a9bb3", "#9a9a9a",
      "#7aab9a", "#b37a7a", "#abab7a", "#b37a9b"
    ];

    deptosLayer.current = L.geoJSON(deptosGeo, {
      style: (feature) => {
        const idx = deptosGeo.features.indexOf(feature);
        return {
          fillColor: colores[idx % colores.length],
          fillOpacity: 0.75,
          color: "#3a3a3a",
          weight: 1,
        };
      },
      onEachFeature: (feature, layer) => {
        layer.bindTooltip(feature.properties.NOM_DEP, {
          permanent: false, direction: "center",
          className: "ub-depto-tooltip",
        });
      },
    }).addTo(mapInstance.current);
  }, [deptosGeo, mapaListo]);

  useEffect(() => {
    const L = window.L;
    if (!mapaListo || !L) return;
    const map = mapInstance.current;
    if (!map) return;

    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];

    if (sucursales.length === 0) return;

    const bounds = L.latLngBounds([]);

    sucursales.forEach((s, i) => {
      const icon = L.divIcon({
        className: "",
        html: `
          <div class="ub-marker" data-id="${s.id_sucursal}" style="position:relative;width:32px;height:32px;">
            <div class="ub-marker__shape" style="
              position:absolute;inset:0;
              background:${C_.prim};
              clip-path:polygon(50% 0%,0% 25%,0% 75%,50% 100%,100% 75%,100% 25%);
              box-shadow:0 2px 8px rgba(0,0,0,0.3);
            "></div>
            <div class="ub-marker__label" style="
              position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
              font-size:11px;color:#fff;font-weight:800;
              font-family:'Barlow Condensed',sans-serif;
              text-shadow:0 1px 2px rgba(0,0,0,0.3);
              pointer-events:none;
            ">${i + 1}</div>
            <div class="ub-marker__pulse" style="display:none"></div>
          </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      const marker = L.marker([s.latitud, s.longitud], { icon, zIndexOffset: 1000 }).addTo(map);
      marker._id = s.id_sucursal;

      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        setSucursalSel(s.id_sucursal);
        map.setView([s.latitud, s.longitud], 15, { animate: true });
      });

      marker.bindTooltip(`${i + 1}. ${s.ciudad}`, {
        permanent: false, direction: "top", offset: [0, -38],
        className: "ub-tooltip",
      });

      markersRef.current.push(marker);
      bounds.extend([s.latitud, s.longitud]);
    });

    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });

    if (pulsoRef.current) clearInterval(pulsoRef.current);
  }, [sucursales, mapaListo]);

  function actualizarMarcadorActivo(id) {
    markersRef.current.forEach((m) => {
      const el = m._icon;
      if (!el) return;
      const shape = el.querySelector(".ub-marker__shape");
      const pulse = el.querySelector(".ub-marker__pulse");
      const label = el.querySelector(".ub-marker__label");
      const container = el.querySelector(".ub-marker");
      const active = m._id === id;
      if (shape) {
        shape.style.transform = active ? "scale(1.2)" : "scale(1)";
        shape.style.boxShadow = active ? "0 0 20px rgba(37,99,235,0.7)" : "0 2px 8px rgba(0,0,0,0.3)";
      }
      if (pulse) pulse.style.display = active ? "block" : "none";
      if (label) label.style.fontSize = active ? "14px" : "11px";
      if (container) {
        container.style.width = active ? "40px" : "32px";
        container.style.height = active ? "40px" : "32px";
      }
      if (m._icon) {
        const size = active ? 40 : 32;
        m._icon.style.width = size + "px";
        m._icon.style.height = size + "px";
        m._icon.style.marginLeft = -(size / 2) + "px";
      }
    });

    if (pulsoRef.current) clearInterval(pulsoRef.current);
    if (id) {
      const m = markersRef.current.find(m => m._id === id);
      if (m) {
        let grow = true;
        pulsoRef.current = setInterval(() => {
          if (m._icon) {
            const pulseEl = m._icon.querySelector(".ub-marker__pulse");
            if (pulseEl) {
              const s = parseFloat(pulseEl.style.transform?.match(/scale\(([\d.]+)\)/)?.[1] || 1);
              pulseEl.style.transform = `scale(${grow ? s + 0.02 : s - 0.02})`;
              if (s >= 1.5) grow = false;
              if (s <= 1) grow = true;
            }
          }
        }, 60);
      }
    }
  }

  useEffect(() => {
    actualizarMarcadorActivo(sucursalSel);
  }, [sucursalSel]);

  const sucActual = sucursalSel ? sucursales.find(s => s.id_sucursal === sucursalSel) : null;

  function volverMapaMundi() {
    setSucursalSel(null);
    const map = mapInstance.current;
    if (map) {
      const L = window.L;
      if (L) {
        const boliviaBounds = L.latLngBounds([-22.9, -69.7], [-9.7, -57.5]);
        map.fitBounds(boliviaBounds, { padding: [30, 30], maxZoom: 7 });
      }
    }
  }

  return (
    <div style={{
      background: "#0d0f12", color: "#e8e4e0", minHeight: "100vh",
      fontFamily: "'Barlow', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600;700&family=Barlow+Condensed:wght@300;400;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        .ub-c{display:flex;height:calc(100vh - 60px);padding-top:60px}
        .ub-s{width:340px;flex-shrink:0;overflow-y:auto;padding:20px;background:rgba(13,15,18,0.95);border-right:1px solid rgba(37,99,235,0.2)}
        .ub-m{flex:1;position:relative}
        .ub-mi{width:100%;height:100%}
        .ub-mi .leaflet-container{background:#0d0f12!important}
        .ub-nm{font-family:'Bebas Neue',sans-serif;font-size:22px;color:#3b82f6;margin-bottom:2px;letter-spacing:.06em}
        .ub-st{font-size:12px;color:#7a7570;margin-bottom:16px}
        .ub-sc{
          padding:12px 14px;margin-bottom:6px;
          background:rgba(18,21,26,0.9);border:1px solid rgba(37,99,235,0.12);
          border-radius:10px;cursor:pointer;transition:all 0.2s;
          display:flex;align-items:center;gap:10px;
        }
        .ub-sc:hover{border-color:rgba(37,99,235,0.35);background:rgba(18,21,26,1)}
        .ub-sc.active{border-color:#3b82f6;background:rgba(37,99,235,0.1)}
        .ub-sc__n{font-family:'Barlow Condensed',sans-serif;font-size:16px;font-weight:600;color:#e8e4e0}
        .ub-sc__d{font-size:11px;color:#7a7570}
        .ub-sc__num{
          width:26px;height:26px;border-radius:50%;
          background:rgba(37,99,235,0.2);border:1px solid rgba(37,99,235,0.3);
          display:flex;align-items:center;justify-content:center;
          font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:700;
          color:#3b82f6;flex-shrink:0;
        }
        .ub-sc.active .ub-sc__num{background:#3b82f6;color:#fff}
        .ub-st__btn{
          display:block;width:100%;padding:8px;margin-bottom:14px;border-radius:8px;
          background:rgba(37,99,235,0.08);border:1px solid rgba(37,99,235,0.15);
          color:#64748b;cursor:pointer;font-family:'Barlow Condensed',sans-serif;
          font-size:13px;font-weight:600;letter-spacing:.5px;text-align:center;
          transition:all 0.2s;
        }
        .ub-st__btn:hover{background:rgba(37,99,235,0.15);border-color:rgba(37,99,235,0.3);color:#94a3b8}
        .ub-ip{
          position:fixed;top:80px;right:20px;width:340px;max-height:calc(100vh - 100px);
          background:#161a1d;border:2px solid #3b82f6;
          border-radius:12px;overflow:hidden;z-index:9999;
          box-shadow:0 8px 32px rgba(0,0,0,0.6);animation:ub-slide 0.3s ease;
        }
        .ub-ip__i{width:100%;height:160px;object-fit:cover;background:#1a1e24;display:block}
        .ub-ip__b{padding:14px}
        .ub-ip__t{font-family:'Barlow Condensed',sans-serif;font-size:18px;font-weight:700;color:#e8e4e0;margin-bottom:4px}
        .ub-ip__d{font-size:12px;color:#7a7570;margin-bottom:6px}
        .ub-ip__desc{font-size:13px;color:#94a3b8;line-height:1.5}
        .ub-ip__x{
          position:absolute;top:8px;right:8px;width:28px;height:28px;border-radius:50%;
          background:rgba(0,0,0,0.5);border:none;color:#fff;cursor:pointer;
          display:flex;align-items:center;justify-content:center;font-size:16px;transition:background 0.2s;z-index:2;
        }
        .ub-ip__x:hover{background:rgba(37,99,235,0.7)}
        .ub-ip__foot{padding:10px 14px;border-top:1px solid rgba(37,99,235,0.15);display:flex;gap:8px}
        .ub-ip__btn{
          flex:1;padding:8px;border-radius:6px;font-family:'Barlow Condensed',sans-serif;
          font-size:12px;font-weight:600;letter-spacing:.5px;cursor:pointer;transition:all 0.2s;
          text-align:center;border:none;
        }
        .ub-ip__btn--sec{background:rgba(37,99,235,0.1);border:1px solid rgba(37,99,235,0.2);color:#94a3b8}
        .ub-ip__btn--sec:hover{background:rgba(37,99,235,0.2);color:#e8e4e0}
        .ub-ip__btn--pri{background:#3b82f6;color:#fff}
        .ub-ip__btn--pri:hover{background:#2563eb}
        .ub-overlay-btn{
          position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:9998;
          padding:10px 24px;border-radius:10px;
          background:#161a1d;border:1px solid rgba(37,99,235,0.3);
          color:#94a3b8;cursor:pointer;font-family:'Barlow Condensed',sans-serif;
          font-size:13px;font-weight:600;letter-spacing:.5px;
          transition:all 0.2s;box-shadow:0 4px 16px rgba(0,0,0,0.4);
        }
        .ub-overlay-btn:hover{border-color:#3b82f6;color:#3b82f6;background:#1a1e24}
        .ub-marker__pulse{
          position:absolute;inset:-6px;border-radius:50%;
          border:2px solid rgba(37,99,235,0.4);
          animation:ub-pulse 1.5s ease-in-out infinite;
        }
        .ub-tooltip{background:rgba(13,15,18,0.9)!important;border:1px solid rgba(37,99,235,0.3)!important;color:#e8e4e0!important;font-family:'Barlow Condensed',sans-serif!important;font-size:12px!important;font-weight:600!important;padding:4px 10px!important;border-radius:6px!important}
        .ub-ss{font-size:12px;color:#5a5550;text-align:center;padding:20px 0}
        .ub-depto-tooltip{background:rgba(13,15,18,0.85)!important;border:1px solid rgba(37,99,235,0.2)!important;color:#e8e4e0!important;font-family:'Barlow Condensed',sans-serif!important;font-size:14px!important;font-weight:600!important;padding:6px 14px!important;border-radius:6px!important}
        @keyframes ub-slide{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
        @keyframes ub-pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.3);opacity:0.5}}
      `}</style>

      <LandingNav />

      <div className="ub-c">
        <div className="ub-s">
          <div className="ub-nm">VMBol en Red</div>
          <div className="ub-st">Sucursales en Bolivia</div>

          <button className="ub-st__btn" onClick={volverMapaMundi}>
            ← Mapa general de Bolivia
          </button>

          {cargando ? (
            <div className="ub-ss">Cargando sucursales...</div>
          ) : sucursales.length === 0 ? (
            <div className="ub-ss">No hay sucursales registradas</div>
          ) : (
            sucursales.map((s, i) => (
              <div key={s.id_sucursal}
                className={`ub-sc ${sucursalSel === s.id_sucursal ? "active" : ""}`}
                onClick={() => {
                  setSucursalSel(s.id_sucursal);
                  const map = mapInstance.current;
                  if (map) map.setView([s.latitud, s.longitud], 15, { animate: true });
                }}
              >
                <div className="ub-sc__num">{i + 1}</div>
                <div>
                  <div className="ub-sc__n">{s.ciudad}</div>
                  <div className="ub-sc__d">{s.direccion}</div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="ub-m">
          {(!mapaListo || deptosCargando) && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              height: "100%", color: "#5a5550", flexDirection: "column", gap: "8px",
            }}>
              <span>{!mapaListo ? "Cargando mapa..." : "Cargando departamentos..."}</span>
            </div>
          )}
          <div ref={mapRef} className="ub-mi" style={{ display: mapaListo && !deptosCargando ? "block" : "none" }} />

          {sucursalSel && (
              <button className="ub-overlay-btn" onClick={volverMapaMundi}>
                ← Volver al mapa general
              </button>
            )}

          {sucActual && (
            <div className="ub-ip">
              <button className="ub-ip__x" onClick={volverMapaMundi}>×</button>
              {sucActual.foto_url ? (
                <img className="ub-ip__i" src={`${API}/${sucActual.foto_url}`} alt={sucActual.ciudad} />
              ) : (
                <div className="ub-ip__i" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "#5a5550", fontSize: "13px" }}>
                  Sin imagen
                </div>
              )}
              <div className="ub-ip__b">
                <div className="ub-ip__t">{sucActual.ciudad}</div>
                <div className="ub-ip__d">{sucActual.direccion}</div>
                {sucActual.descripcion && <p className="ub-ip__desc">{sucActual.descripcion}</p>}
              </div>
              <div className="ub-ip__foot">
                <button className="ub-ip__btn ub-ip__btn--sec" onClick={volverMapaMundi}>
                  ← Ver todas
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
