"use client";

import { useState, useEffect, useRef } from "react";
import LandingNav from "@/components/LandingNav";

const API = "http://localhost:8000";

const DEPARTAMENTOS = [
  {
    id: "La Paz", capital: "La Paz", centro: [-16.5, -68.15],
    coords: [[
      [-18.0, -69.5], [-18.2, -68.8], [-17.8, -67.8], [-17.0, -67.2],
      [-16.0, -67.0], [-15.0, -67.0], [-14.5, -67.5], [-14.0, -68.0],
      [-14.2, -68.5], [-14.8, -69.0], [-15.5, -69.5], [-17.0, -69.8],
    ]],
  },
  {
    id: "Pando", capital: "Cobija", centro: [-11.5, -67.5],
    coords: [[
      [-12.5, -68.5], [-13.0, -67.5], [-12.5, -66.0], [-11.5, -64.5],
      [-10.5, -64.0], [-10.0, -65.5], [-10.5, -67.0], [-11.0, -68.5],
    ]],
  },
  {
    id: "Beni", capital: "Trinidad", centro: [-14.83, -64.93],
    coords: [[
      [-13.0, -67.0], [-12.5, -65.0], [-12.5, -63.0], [-13.0, -61.5],
      [-14.5, -61.5], [-15.5, -63.0], [-16.0, -65.0], [-16.5, -66.5], [-15.0, -67.0],
    ]],
  },
  {
    id: "Santa Cruz", capital: "Santa Cruz de la Sierra", centro: [-17.8, -63.18],
    coords: [[
      [-16.0, -64.5], [-15.5, -62.0], [-16.0, -60.0], [-17.0, -58.5],
      [-18.5, -58.5], [-19.5, -60.0], [-20.0, -62.5], [-18.5, -64.5], [-17.5, -65.0],
    ]],
  },
  {
    id: "Cochabamba", capital: "Cochabamba", centro: [-17.38, -66.15],
    coords: [[
      [-18.2, -67.2], [-18.0, -66.0], [-17.5, -64.8], [-16.5, -64.8],
      [-16.0, -65.5], [-16.5, -66.5], [-17.0, -67.0],
    ]],
  },
  {
    id: "Oruro", capital: "Oruro", centro: [-18.57, -67.15],
    coords: [[
      [-17.8, -69.5], [-18.5, -68.0], [-19.5, -67.0], [-19.0, -66.0],
      [-18.0, -66.5], [-17.5, -67.8],
    ]],
  },
  {
    id: "Chuquisaca", capital: "Sucre", centro: [-19.03, -65.25],
    coords: [[
      [-18.5, -65.5], [-19.0, -64.5], [-20.0, -63.5], [-20.5, -64.0],
      [-20.0, -65.0], [-19.5, -66.0],
    ]],
  },
  {
    id: "Potosí", capital: "Potosí", centro: [-20.5, -65.75],
    coords: [[
      [-19.5, -69.0], [-20.0, -67.5], [-21.5, -66.0], [-22.0, -65.5],
      [-21.5, -64.5], [-20.0, -65.0], [-19.5, -66.5],
    ]],
  },
  {
    id: "Tarija", capital: "Tarija", centro: [-21.53, -64.73],
    coords: [[
      [-20.5, -65.5], [-21.0, -64.5], [-22.0, -63.5], [-22.5, -64.0],
      [-22.0, -65.0], [-21.5, -65.5],
    ]],
  },
];

const C_ = {
  prim: "#2563eb",
  bright: "#3b82f6",
  glow: "rgba(37,99,235,0.5)",
  muted: "rgba(100,116,139,0.3)",
  mutedBorder: "rgba(100,116,139,0.2)",
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
  const layersRef = useRef({ deptos: null, markers: null, branchMarkers: null });
  const pulsoRef = useRef(null);
  const [sucursales, setSucursales] = useState([]);
  const [departamentoSel, setDepartamentoSel] = useState(null);
  const [sucursalSel, setSucursalSel] = useState(null);
  const [cargandoSuc, setCargandoSuc] = useState(true);
  const [mapaListo, setMapaListo] = useState(false);

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
      setCargandoSuc(false);
    }
    init();
  }, []);

  useEffect(() => {
    const L = window.L;
    if (!mapaListo || !L || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      center: [-16.7, -65.5],
      zoom: 6,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
    }).addTo(map);

    const deptosLayer = L.layerGroup().addTo(map);

    DEPARTAMENTOS.forEach((d) => {
      const isLP = d.id === "La Paz";
      const polygon = L.polygon(d.coords, {
        color: isLP ? C_.bright : C_.mutedBorder,
        weight: isLP ? 3 : 1.5,
        fillColor: isLP ? C_.prim : C_.muted,
        fillOpacity: isLP ? 0.35 : 0.15,
      }).addTo(deptosLayer);

      polygon.on("click", () => {
        setDepartamentoSel(d.id);
        setSucursalSel(null);
        map.fitBounds(polygon.getBounds(), { padding: [40, 40], maxZoom: 9 });
      });

      const marker = L.circleMarker(d.centro, {
        radius: isLP ? 10 : 5,
        color: isLP ? C_.bright : "#94a3b8",
        fillColor: isLP ? C_.prim : "#94a3b8",
        fillOpacity: isLP ? 0.9 : 0.5,
        weight: isLP ? 3 : 1,
      }).addTo(deptosLayer);

      marker.bindTooltip(d.id, { permanent: false, direction: "top", offset: [0, -8], className: "ub-tooltip" });

      marker.on("click", () => {
        setDepartamentoSel(d.id);
        setSucursalSel(null);
        map.fitBounds(polygon.getBounds(), { padding: [40, 40], maxZoom: 9 });
      });

      if (isLP) {
        const pulse = L.circleMarker(d.centro, {
          radius: 18, color: C_.glow, fillColor: C_.prim, fillOpacity: 0.12, weight: 2,
        }).addTo(deptosLayer);
        let grow = true;
        pulsoRef.current = setInterval(() => {
          if (pulse._map) {
            const r = parseFloat(pulse.getRadius());
            pulse.setRadius(grow ? r + 0.4 : r - 0.4);
            if (r >= 26) grow = false;
            if (r <= 18) grow = true;
          }
        }, 60);
      }
    });

    mapInstance.current = map;

    return () => {
      if (pulsoRef.current) clearInterval(pulsoRef.current);
      map.remove();
      mapInstance.current = null;
    };
  }, [mapaListo]);

  useEffect(() => {
    const L = window.L;
    if (!mapaListo || !L) return;
    const map = mapInstance.current;
    if (!map) return;

    if (layersRef.current.branchMarkers) layersRef.current.branchMarkers.clearLayers();

    const sucs = sucursalSel
      ? sucursales.filter(s => s.id_sucursal === sucursalSel)
      : departamentoSel
        ? sucursales.filter(s => s.departamento === departamentoSel)
        : [];

    const group = L.layerGroup().addTo(map);
    layersRef.current.branchMarkers = group;

    sucs.forEach((s) => {
      const active = sucursalSel === s.id_sucursal;
      const icon = L.divIcon({
        className: "",
        html: `<div style="
          width:${active?20:14}px;height:${active?20:14}px;
          background:${active?C_.bright:C_.prim};
          border:3px solid #fff;border-radius:50%;
          box-shadow:${active?`0 0 16px ${C_.glow}`:"0 2px 6px rgba(0,0,0,0.3)"};
        "></div>`,
        iconSize: [active ? 20 : 14, active ? 20 : 14],
        iconAnchor: [active ? 10 : 7, active ? 10 : 7],
      });
      const marker = L.marker([s.latitud, s.longitud], { icon }).addTo(group);
      marker.on("click", () => setSucursalSel(s.id_sucursal));
    });

    if (sucursalSel && sucs.length > 0) {
      map.setView([sucs[0].latitud, sucs[0].longitud], 15, { animate: true });
    } else if (departamentoSel && sucs.length > 0) {
      map.fitBounds(L.latLngBounds(sucs.map(s => [s.latitud, s.longitud])), { padding: [60, 60], maxZoom: 12 });
    }
  }, [departamentoSel, sucursalSel, sucursales, mapaListo]);

  const sucsFiltradas = sucursalSel
    ? sucursales.filter(s => s.id_sucursal === sucursalSel)
    : departamentoSel
      ? sucursales.filter(s => s.departamento === departamentoSel)
      : [];

  const sucActual = sucursalSel ? sucursales.find(s => s.id_sucursal === sucursalSel) : null;

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
        .ub-st{font-size:12px;color:#7a7570;margin-bottom:16px}
        .ub-nm{font-family:'Bebas Neue',sans-serif;font-size:22px;color:#3b82f6;margin-bottom:2px;letter-spacing:.06em}
        .ub-db{display:block;width:100%;text-align:left;padding:10px 14px;margin-bottom:4px;background:rgba(59,130,246,0.06);border:1px solid rgba(59,130,246,0.15);border-radius:8px;color:#94a3b8;cursor:pointer;font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:600;letter-spacing:.5px;transition:all .2s}
        .ub-db:hover{background:rgba(59,130,246,0.12);border-color:rgba(59,130,246,0.3);color:#e8e4e0}
        .ub-db.active{background:rgba(37,99,235,0.2);border-color:#3b82f6;color:#3b82f6}
        .ub-sc{padding:12px 14px;margin-bottom:6px;background:rgba(18,21,26,0.9);border:1px solid rgba(37,99,235,0.12);border-radius:10px;cursor:pointer;transition:all .2s}
        .ub-sc:hover{border-color:rgba(37,99,235,0.35);background:rgba(18,21,26,1)}
        .ub-sc.active{border-color:#3b82f6;background:rgba(37,99,235,0.1)}
        .ub-sc__n{font-family:'Barlow Condensed',sans-serif;font-size:16px;font-weight:600;color:#e8e4e0;margin-bottom:2px}
        .ub-sc__d{font-size:11px;color:#7a7570}
        .ub-ip{position:absolute;top:16px;right:16px;width:320px;background:rgba(13,15,18,0.95);border:1px solid rgba(37,99,235,0.2);border-radius:12px;overflow:hidden;z-index:10;backdrop-filter:blur(12px)}
        .ub-ip__i{width:100%;height:160px;object-fit:cover;background:#1a1e24;display:block}
        .ub-ip__b{padding:14px}
        .ub-ip__t{font-family:'Barlow Condensed',sans-serif;font-size:18px;font-weight:700;color:#e8e4e0;margin-bottom:4px}
        .ub-ip__d{font-size:12px;color:#7a7570;margin-bottom:6px}
        .ub-ip__desc{font-size:13px;color:#94a3b8;line-height:1.5}
        .ub-ip__x{position:absolute;top:8px;right:8px;width:28px;height:28px;border-radius:50%;background:rgba(0,0,0,0.5);border:none;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:16px;transition:background .2s}
        .ub-ip__x:hover{background:rgba(239,68,68,0.7)}
        .ub-tooltip{background:rgba(13,15,18,0.9)!important;border:1px solid rgba(37,99,235,0.3)!important;color:#e8e4e0!important;font-family:'Barlow Condensed',sans-serif!important;font-size:12px!important;font-weight:600!important;padding:4px 10px!important;border-radius:6px!important}
        .ub-v{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;margin-bottom:10px;background:transparent;border:1px solid rgba(37,99,235,0.2);border-radius:6px;color:#7a7570;cursor:pointer;font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:600;transition:all .2s}
        .ub-v:hover{border-color:#3b82f6;color:#3b82f6}
        .ub-ss{font-size:12px;color:#5a5550;text-align:center;padding:20px 0}
      `}</style>

      <LandingNav />

      <div className="ub-c">
        <div className="ub-s">
          <div className="ub-nm">VMBol en Red</div>
          <div className="ub-st">Selecciona un departamento</div>

          {departamentoSel && (
            <button className="ub-v" onClick={() => { setDepartamentoSel(null); setSucursalSel(null); }}>
              ← Todos los departamentos
            </button>
          )}

          {!departamentoSel && DEPARTAMENTOS.map((d) => (
            <button key={d.id} className={`ub-db ${departamentoSel === d.id ? "active" : ""}`}
              onClick={() => { setDepartamentoSel(d.id); setSucursalSel(null); }}>
              {d.id}
            </button>
          ))}

          {departamentoSel && (
            <>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "18px", color: "#3b82f6", fontWeight: 700, margin: "12px 0 8px", letterSpacing: "1px" }}>
                {departamentoSel}
              </div>
              {!cargandoSuc && sucsFiltradas.length === 0 ? (
                <div className="ub-ss">No hay sucursales en este departamento</div>
              ) : sucsFiltradas.map((s) => (
                <div key={s.id_sucursal} className={`ub-sc ${sucursalSel === s.id_sucursal ? "active" : ""}`}
                  onClick={() => setSucursalSel(s.id_sucursal)}>
                  <div className="ub-sc__n">{s.ciudad}</div>
                  <div className="ub-sc__d">{s.direccion}</div>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="ub-m">
          {!mapaListo && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#5a5550" }}>
              Cargando mapa...
            </div>
          )}
          <div ref={mapRef} className="ub-mi" style={{ display: mapaListo ? "block" : "none" }} />

          {sucActual && (
            <div className="ub-ip">
              <button className="ub-ip__x" onClick={() => setSucursalSel(null)}>×</button>
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
