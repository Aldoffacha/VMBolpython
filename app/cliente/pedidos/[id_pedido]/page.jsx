"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import ClienteSidebar from "@/components/ClienteSidebar";
import { useTheme } from "@/context/ThemeContext";
import "@/styles/dashboard.css";

const API = "http://localhost:8000";

const fmt   = n => `$${parseFloat(n||0).toFixed(2)}`;
const fDate = iso => iso
  ? new Date(iso).toLocaleDateString("es-BO",{day:"2-digit",month:"2-digit",year:"numeric"})
  : "—";

const BADGE_CFG = {
  sin_pago:    { bg:"var(--red)",    col:"#fff" },
  pendiente:   { bg:"var(--amber)",  col:"#000" },
  pagado:      { bg:"var(--blue)",   col:"#fff" },
  confirmado:  { bg:"var(--green)",  col:"#fff" },
  enviado:     { bg:"#6366f1",       col:"#fff" },
  entregado:   { bg:"#059669",       col:"#fff" },
  cancelado:   { bg:"var(--text-3)", col:"#fff" },
  en_destino:  { bg:"var(--green)",  col:"#fff" },
  en_miami:    { bg:"var(--amber)",  col:"#000" },
  en_transito: { bg:"#6366f1",       col:"#fff" },
  en_aduanas:  { bg:"var(--blue)",   col:"#fff" },
  "en progreso":{ bg:"var(--blue-bright)", col:"#fff" },
};

function Badge({ estado, size="normal" }) {
  const b = BADGE_CFG[estado] || { bg:"var(--text-3)", col:"#fff" };
  return (
    <span style={{
      background:b.bg, color:b.col,
      padding: size==="sm" ? "3px 10px" : "5px 14px",
      borderRadius:"999px",
      fontSize: size==="sm" ? "9px" : "10px",
      fontFamily:"var(--font-c)", fontWeight:"700",
      letterSpacing:"1.5px", textTransform:"uppercase", whiteSpace:"nowrap",
    }}>
      {(estado||"").replace(/_/g," ").toUpperCase()}
    </span>
  );
}

function Row({ label, value, color, mono }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start",
      marginBottom:"10px", gap:"12px" }}>
      <span style={{ fontFamily:"var(--font-c)", fontSize:"10px", letterSpacing:"1.5px",
        textTransform:"uppercase", color:"var(--text-3)", flexShrink:0 }}>
        {label}
      </span>
      <span style={{ color:color||"var(--text)", fontSize:"12px", fontWeight:"600",
        textAlign:"right", fontFamily:mono?"monospace":"var(--font-b)" }}>
        {value||"—"}
      </span>
    </div>
  );
}

const ETAPAS = [
  { key:"en_miami",    icon:"🏢", label:"En depósito Miami",    campo:"fecha_salida_miami"    },
  { key:"en_transito", icon:"✈️", label:"Vuelo a Bolivia",       campo:"fecha_llegada_bolivia" },
  { key:"en_aduanas",  icon:"🛃", label:"En aduanas bolivianas", campo:null                    },
  { key:"entregado",   icon:"✅", label:"Entregado al cliente",  campo:"fecha_entrega_cliente" },
];
const ORDEN = ETAPAS.map(e=>e.key);

function Timeline({ envio }) {
  if (!envio) return (
    <div style={{ fontFamily:"var(--font-c)", fontSize:"11px", letterSpacing:"2px",
      textTransform:"uppercase", color:"var(--text-3)", textAlign:"center", padding:"28px 0" }}>
      Sin información de envío todavía
    </div>
  );
  const idxActual = ORDEN.indexOf(envio.estado);
  return (
    <div style={{ position:"relative", paddingLeft:"36px" }}>
      <div style={{ position:"absolute", left:"11px", top:"14px", bottom:"14px",
        width:"2px", background:"var(--border-blue)" }}/>
      {ETAPAS.map((et, idx) => {
        const done   = idx <= idxActual;
        const active = idx === idxActual;
        const fecha  = et.campo ? envio[et.campo] : null;
        return (
          <div key={et.key} style={{ display:"flex", gap:"16px", marginBottom:"24px" }}>
            <div style={{
              width:"24px", height:"24px", borderRadius:"50%", flexShrink:0,
              background: done ? (active ? "var(--blue)" : "var(--green)") : "var(--bg)",
              border: active ? `3px solid var(--blue-bright)` : `2px solid ${done ? "var(--green)" : "var(--border-blue)"}`,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:"11px", fontWeight:"800", color:"#fff",
              marginLeft:"-36px", zIndex:1, position:"relative",
              boxShadow: active ? `0 0 0 5px var(--blue-soft)` : "none",
              animation: active ? "tlPulse 1.6s ease-in-out infinite" : "none",
            }}>
              {done ? (active ? "⚡" : "✓") : (
                <span style={{color:"var(--text-3)",fontFamily:"var(--font-d)",fontSize:"12px"}}>{idx+1}</span>
              )}
            </div>
            <div style={{ flex:1, paddingTop:"2px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
                <span style={{ fontSize:"15px" }}>{et.icon}</span>
                <span style={{
                  fontFamily:"var(--font-c)", fontSize:"12px", letterSpacing:"1px",
                  color: done ? "var(--text)" : "var(--text-3)",
                  fontWeight: done ? "700" : "400",
                  textTransform:"uppercase",
                }}>
                  {et.label}
                </span>
                {active && <Badge estado="en progreso" size="sm"/>}
              </div>
              <div style={{ marginTop:"3px", fontFamily:"var(--font-c)", fontSize:"10px",
                letterSpacing:"1px", color: done ? "var(--green)" : "var(--text-3)" }}>
                {fecha ? `📅 ${fDate(fecha)}` : (active ? "En curso…" : "Pendiente")}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MapaLeaflet({ lat, lng, tracking, readOnly=true, onPosChange }) {
  const ref    = useRef(null);
  const mapRef = useRef(null);
  const mkRef  = useRef(null);
  const empRef = useRef(null);

  useEffect(()=>{
    if (!ref.current || mapRef.current) return;
    const initLat = lat || -16.5;
    const initLng = lng || -68.15;

    function initMap() {
      const L = window.L;
      const map = L.map(ref.current, { zoomControl:true }).setView([initLat, initLng], 14);
      mapRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
        attribution:"© OpenStreetMap contributors",
      }).addTo(map);
      const entregaIcon = L.divIcon({
        html:`<div style="background:#2563eb;color:#fff;border-radius:50% 50% 50% 0;
          width:34px;height:34px;display:flex;align-items:center;justify-content:center;
          font-size:16px;transform:rotate(-45deg);border:2px solid #fff;
          box-shadow:0 3px 8px rgba(0,0,0,0.4)">
          <span style="transform:rotate(45deg)">📍</span></div>`,
        className:"", iconSize:[34,34], iconAnchor:[17,34],
      });
      if (lat && lng) {
        mkRef.current = L.marker([lat,lng],{ icon:entregaIcon, draggable:!readOnly })
          .addTo(map).bindPopup("<strong>Tu ubicación de entrega</strong>").openPopup();
        if (!readOnly) {
          mkRef.current.on("dragend", e=>{
            const p = e.target.getLatLng();
            geocodificar(p.lat, p.lng);
          });
        }
      }
      if (tracking?.activo) addEmpMarker(L, map, tracking);
      if (!readOnly) {
        map.on("click", e=>{
          const {lat:la, lng:lo} = e.latlng;
          if (mkRef.current) map.removeLayer(mkRef.current);
          mkRef.current = L.marker([la,lo],{ icon:entregaIcon, draggable:true })
            .addTo(map).bindPopup("Nueva ubicación").openPopup();
          mkRef.current.on("dragend", ev=>{ const p = ev.target.getLatLng(); geocodificar(p.lat, p.lng); });
          geocodificar(la, lo);
        });
      }
    }
    function addEmpMarker(L, map, t) {
      const empIcon = L.divIcon({
        html:`<div style="background:#10b981;color:#fff;border-radius:50%;
          width:38px;height:38px;display:flex;align-items:center;justify-content:center;
          font-size:20px;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.4)">🚴</div>`,
        className:"", iconSize:[38,38], iconAnchor:[19,19],
      });
      empRef.current = L.marker([t.latitud, t.longitud],{ icon:empIcon })
        .addTo(map).bindPopup(`<strong>Empleado: ${t.nombre_empleado}</strong>`);
    }
    function geocodificar(la, lo) {
      onPosChange && onPosChange(la, lo, null);
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${la}&lon=${lo}`)
        .then(r=>r.json()).then(d=>{ onPosChange && onPosChange(la, lo, d.display_name||null); }).catch(()=>{});
    }
    if (window.L) { initMap(); return; }
    const link = document.createElement("link");
    link.rel="stylesheet"; link.href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
    const s = document.createElement("script");
    s.src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    s.onload=initMap;
    document.head.appendChild(s);
    return ()=>{ if (mapRef.current){ mapRef.current.remove(); mapRef.current=null; } };
  }, []); // eslint-disable-line

  useEffect(()=>{
    if (!mapRef.current || !window.L || !tracking?.activo) return;
    if (empRef.current) empRef.current.setLatLng([tracking.latitud, tracking.longitud]);
  }, [tracking]);

  return (
    <div ref={ref} style={{ height:"300px", width:"100%", borderRadius:"var(--r-s)",
      border:`1px solid var(--border-blue)` }}/>
  );
}

function ModalUbicacion({ pedido, token, onClose, onSaved }) {
  const ubi = pedido.ubicacion;
  const [pos,  setPos]  = useState({ lat: ubi?.latitud||null, lng: ubi?.longitud||null });
  const [form, setForm] = useState({
    direccion_entrega: ubi?.direccion_entrega||"",
    referencia:        ubi?.referencia||"",
    nombre_receptor:   ubi?.nombre_receptor||"",
    telefono_receptor: ubi?.telefono_receptor||"",
  });
  const [load, setLoad] = useState(false);
  const [ok,   setOk]   = useState("");

  function handlePos(lat, lng, dir) {
    setPos({lat,lng});
    if (dir) setForm(f=>({...f, direccion_entrega:dir}));
  }
  async function guardar() {
    if (!pos.lat||!pos.lng) return alert("Selecciona una ubicación en el mapa.");
    if (!form.direccion_entrega.trim()) return alert("Ingresa la dirección de entrega.");
    setLoad(true);
    const r = await fetch(`${API}/cliente/pedidos/${pedido.id_pedido}/ubicacion`,{
      method:"POST", headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`},
      body:JSON.stringify({ latitud:pos.lat, longitud:pos.lng, ...form }),
    });
    const d = await r.json(); setLoad(false);
    if (d.success) { setOk("✅ Guardado"); setTimeout(()=>{ onSaved(); onClose(); },1200); }
    else alert(d.detail||"Error al guardar");
  }

  return (
    <div className="m-overlay">
      <div className="m-box m-box--wide">
        <div className="m-head">
          <h3 className="m-head__title">
            📍 {ubi ? "Editar" : "Establecer"} Ubicación
          </h3>
          <button className="m-close" onClick={onClose}>✕</button>
        </div>
        <div className="m-body">
          {ok && <div className="alert-ok">{ok}</div>}
          <div style={{
            background:"var(--blue-soft)", border:"1px solid var(--border-blue)",
            borderRadius:"var(--r-s)", padding:"10px 14px", marginBottom:"14px",
            fontFamily:"var(--font-c)", fontSize:"11px", letterSpacing:"1.5px",
            color:"var(--blue-bright)", textTransform:"uppercase",
          }}>
            🗺️ Haz clic en el mapa para colocar el pin de entrega
          </div>
          <div style={{marginBottom:"16px"}}>
            <MapaLeaflet lat={pos.lat} lng={pos.lng} readOnly={false} onPosChange={handlePos}/>
            {pos.lat && (
              <div style={{color:"var(--text-3)",fontSize:"11px",marginTop:"4px",textAlign:"right",
                fontFamily:"var(--font-c)",letterSpacing:"1px"}}>
                📌 {pos.lat.toFixed(6)}, {pos.lng.toFixed(6)}
              </div>
            )}
          </div>
          <div className="f-grid">
            <div style={{gridColumn:"1/-1"}}>
              <label className="f-lbl">Dirección completa *</label>
              <textarea className="f-inp" style={{height:"68px",resize:"vertical"}}
                placeholder="Calle, número, zona, ciudad…"
                value={form.direccion_entrega}
                onChange={e=>setForm(f=>({...f,direccion_entrega:e.target.value}))}/>
            </div>
            <div style={{gridColumn:"1/-1"}}>
              <label className="f-lbl">Referencia</label>
              <input className="f-inp" placeholder="Casa azul, portón negro…"
                value={form.referencia} onChange={e=>setForm(f=>({...f,referencia:e.target.value}))}/>
            </div>
            <div>
              <label className="f-lbl">Nombre de quien recibe</label>
              <input className="f-inp" placeholder="Nombre completo"
                value={form.nombre_receptor} onChange={e=>setForm(f=>({...f,nombre_receptor:e.target.value}))}/>
            </div>
            <div>
              <label className="f-lbl">Teléfono de contacto</label>
              <input className="f-inp" placeholder="+591 7xx xxxxx"
                value={form.telefono_receptor} onChange={e=>setForm(f=>({...f,telefono_receptor:e.target.value}))}/>
            </div>
          </div>
        </div>
        <div className="m-foot">
          <button className="btn btn-out" onClick={onClose}>Cancelar</button>
          <button className="btn btn-pri" onClick={guardar} disabled={load} style={{opacity:load?.7:1}}>
            {load?"Guardando…":"💾 Guardar Ubicación"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DetallePedido() {
  const router = useRouter();
  const params = useParams();
  const idPed  = params?.id_pedido;
  const { theme } = useTheme();

  const [user,     setUser]     = useState(null);
  const [token,    setToken]    = useState("");
  const [pedido,   setPedido]   = useState(null);
  const [load,     setLoad]     = useState(true);
  const [toast,    setToast]    = useState({ msg:"", ok:true });
  const [mUbi,     setMUbi]     = useState(false);
  const [tracking, setTracking] = useState(null);

  const showToast = (msg, ok=true) => {
    setToast({msg,ok}); setTimeout(()=>setToast({msg:""}),3500);
  };

  const cargar = useCallback(async (t,id)=>{
    const r = await fetch(`${API}/cliente/pedidos/${id}`,{headers:{Authorization:`Bearer ${t}`}});
    if (!r.ok) { router.push("/cliente/pedidos"); return; }
    const d = await r.json();
    setPedido(d); setTracking(d.tracking_empleado||null); setLoad(false);
  },[router]);

  useEffect(()=>{
    const u = JSON.parse(sessionStorage.getItem("user")||"null");
    const t = document.cookie.split(";").find(c=>c.trim().startsWith("access_token="))?.split("=")[1];
    if (!t||!u||!idPed) return router.push("/login");
    setUser(u); setToken(t); cargar(t,idPed);
  },[idPed,router,cargar]);

  useEffect(()=>{
    if (!token||!idPed) return;
    const iv = setInterval(async()=>{
      try {
        const r = await fetch(`${API}/cliente/pedidos/${idPed}`,{headers:{Authorization:`Bearer ${token}`}});
        const d = await r.json();
        setTracking(d.tracking_empleado||null);
      } catch {}
    }, 5000);
    return ()=>clearInterval(iv);
  },[token,idPed]);

  async function marcarEntregado() {
    if (!confirm("¿Confirmas que ya recibiste tu pedido?")) return;
    const r = await fetch(`${API}/cliente/pedidos/${idPed}/marcar-entregado`,{
      method:"POST", headers:{ Authorization:`Bearer ${token}` }});
    const d = await r.json();
    d.success
      ? (showToast("✅ Pedido confirmado"), cargar(token,idPed))
      : showToast(d.detail||"Error", false);
  }

  if (load) return (
    <div className={`vmb-loading ${theme}`}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div className="vmb-loading__ring"/>
      <span className="vmb-loading__text">CARGANDO</span>
    </div>
  );
  if (!pedido) return null;

  const { detalles=[], envio, ubicacion, estado, estado_pago="sin_pago", estado_entrega, total, fecha } = pedido;
  const estaPagado  = estado==="pagado"||estado_pago==="pagado"||estado_pago==="confirmado";
  const tieneUbic   = !!ubicacion?.latitud;
  const puedeConf   = estado_entrega==="en_destino"||estado_entrega==="enviado";
  const enCamino    = tracking?.activo;
  const puedeEditar = estaPagado && estado_entrega!=="entregado" && estado!=="cancelado";

  return (
    <div className={`vmb-root ${theme}`}>
      <style>{`
        /* ── Detalle-specific ── */
        .det-main {
          flex:1; overflow-y:auto; overflow-x:hidden;
          background:var(--bg);
        }
        /* Hero */
        .det-hero {
          padding:40px 52px 32px;
          background:linear-gradient(150deg,var(--bg-3) 0%,var(--bg) 100%);
          border-bottom:1px solid var(--border);
          position:relative; overflow:hidden; z-index:1;
        }
        .det-hero::after {
          content:''; position:absolute; top:-80px; right:-80px;
          width:360px; height:360px;
          background:radial-gradient(circle,rgba(37,99,235,.14) 0%,transparent 70%);
          pointer-events:none;
        }
        .det-hero::before {
          content:''; position:absolute; left:52px; top:0; bottom:0; width:1px;
          background:linear-gradient(to bottom,transparent,var(--blue-glow),transparent);
          opacity:.35;
        }
        .det-hero__inner {
          display:flex; align-items:flex-end; justify-content:space-between;
          gap:24px; flex-wrap:wrap; padding-left:28px; position:relative; z-index:1;
        }
        .det-hero__id {
          font-family:var(--font-d);
          font-size:clamp(42px,5vw,72px);
          line-height:.9; letter-spacing:3px;
          color:var(--text); text-transform:uppercase;
        }
        .det-hero__id span { color:var(--blue-bright); }
        .det-hero__badges { display:flex; gap:8px; flex-wrap:wrap; margin-top:10px; }
        .det-hero__right { text-align:right; }
        .det-hero__total {
          font-family:var(--font-d); font-size:clamp(28px,3.5vw,48px);
          letter-spacing:3px; color:var(--green);
        }
        .det-hero__date {
          font-family:var(--font-c); font-size:11px; letter-spacing:2px;
          text-transform:uppercase; color:var(--text-3); margin-top:4px;
        }

        /* Alertas globales */
        .det-alert-bar {
          display:flex; align-items:center; justify-content:space-between;
          gap:12px; flex-wrap:wrap;
          margin:0 52px; padding:12px 18px; border-radius:var(--r-s);
          font-family:var(--font-c); font-size:10px; font-weight:700;
          letter-spacing:2px; text-transform:uppercase;
        }
        .det-alert-bar:first-of-type { margin-top:24px; }
        .det-alert-bar + .det-alert-bar { margin-top:10px; }
        .det-alert-bar--red   { background:rgba(239,68,68,.08);  border:1px solid rgba(239,68,68,.3);  color:#fca5a5; }
        .det-alert-bar--amber { background:rgba(245,158,11,.08); border:1px solid rgba(245,158,11,.3); color:#fcd34d; }
        .det-alert-bar--green { background:rgba(16,185,129,.08); border:1px solid rgba(16,185,129,.3); color:#6ee7b7; }

        /* Rider banner */
        .det-rider {
          display:flex; align-items:center; gap:14px;
          margin:0 52px; padding:14px 20px; border-radius:var(--r-m);
          background:rgba(16,185,129,.08); border:1px solid rgba(16,185,129,.35);
        }
        .det-rider__icon { font-size:26px; animation:bounce .75s infinite; }
        .det-rider__title {
          font-family:var(--font-d); font-size:18px; letter-spacing:2px;
          color:var(--green); text-transform:uppercase;
        }
        .det-rider__sub {
          font-family:var(--font-c); font-size:11px; letter-spacing:1px;
          color:var(--text-3); margin-top:2px;
        }

        /* Grid de cards */
        .det-grid {
          display:grid; gap:16px;
          grid-template-columns:repeat(auto-fit,minmax(340px,1fr));
          padding:24px 52px 60px;
        }

        /* Card universal */
        .det-card {
          background:var(--card); border-radius:var(--r-l);
          border:1px solid var(--border);
          box-shadow:0 4px 20px rgba(0,0,0,.12);
          overflow:hidden;
          transition: background .3s, border-color .3s;
        }
        .det-card__head {
          padding:14px 18px; background:var(--bg-3);
          border-bottom:2px solid var(--blue);
          display:flex; align-items:center; justify-content:space-between;
        }
        .det-card__title {
          font-family:var(--font-d); font-size:16px; letter-spacing:3px;
          color:var(--blue-bright); text-transform:uppercase; margin:0;
        }
        .det-card__body { padding:18px; }

        /* Product row */
        .det-prod-row {
          display:flex; gap:12px; align-items:center;
          padding:10px 0;
        }
        .det-prod-row + .det-prod-row { border-top:1px solid var(--border); }
        .det-prod-img {
          width:52px; height:52px; border-radius:var(--r-s);
          object-fit:cover; border:1px solid var(--border-blue);
          background:var(--bg-3); flex-shrink:0;
        }
        .det-prod-name {
          font-size:13px; font-weight:600; color:var(--text);
          overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
        }
        .det-prod-meta {
          font-family:var(--font-c); font-size:10px; letter-spacing:1px;
          color:var(--text-3); text-transform:uppercase; margin-top:2px;
        }
        .det-prod-price {
          font-family:var(--font-d); font-size:20px; letter-spacing:1px;
          color:var(--green); flex-shrink:0;
        }
        .det-total-row {
          display:flex; justify-content:space-between; align-items:baseline;
          padding-top:14px; margin-top:6px; border-top:2px solid var(--blue);
        }
        .det-total-lbl {
          font-family:var(--font-d); font-size:16px; letter-spacing:3px;
          color:var(--text-2); text-transform:uppercase;
        }
        .det-total-val {
          font-family:var(--font-d); font-size:30px; letter-spacing:2px;
          color:var(--green);
        }

        /* Deposito box */
        .det-deposito {
          background:var(--blue-soft); border:1px solid var(--border-blue);
          border-radius:var(--r-s); padding:14px; margin-top:16px;
        }
        .det-deposito__title {
          font-family:var(--font-d); font-size:14px; letter-spacing:2px;
          color:var(--blue-bright); text-transform:uppercase; margin-bottom:8px;
        }
        .det-deposito__name { font-size:13px; font-weight:600; color:var(--text); }
        .det-deposito__meta {
          font-family:var(--font-c); font-size:11px; letter-spacing:1px;
          color:var(--text-3); margin-top:2px; text-transform:uppercase;
        }

        /* Map empty state */
        .det-map-empty {
          height:220px; display:flex; flex-direction:column;
          align-items:center; justify-content:center; gap:14px;
          background:var(--blue-soft); border-radius:var(--r-s);
          border:1px dashed var(--border-blue);
        }
        .det-map-empty__ico { font-size:36px; opacity:.3; }

        /* Payment section */
        .det-pay-section {
          border-top:1px solid var(--border); padding-top:16px; margin-top:16px;
        }
        .det-pay-title {
          font-family:var(--font-d); font-size:12px; letter-spacing:3px;
          color:var(--blue-bright); text-transform:uppercase; margin-bottom:12px;
        }

        /* Contact */
        .det-contact { display:flex; gap:8px; margin-top:8px; }

        /* Edit btn */
        .det-edit-btn {
          background:transparent; border:1px solid var(--border-blue);
          color:var(--blue-bright); padding:5px 14px; border-radius:var(--r-s);
          cursor:pointer; font-family:var(--font-c); font-weight:700;
          font-size:10px; letter-spacing:2px; text-transform:uppercase;
          transition:all .2s;
        }
        .det-edit-btn:hover { background:var(--blue-soft); }

        /* Toast */
        .det-toast {
          position:fixed; top:24px; right:24px;
          padding:13px 22px; border-radius:var(--r-s); z-index:9999;
          font-family:var(--font-c); font-weight:700; font-size:11px;
          letter-spacing:2px; text-transform:uppercase;
          box-shadow:0 8px 32px rgba(0,0,0,.35);
          animation:slideRight .4s var(--spring);
        }

        @keyframes tlPulse{0%,100%{box-shadow:0 0 0 5px var(--blue-soft)}50%{box-shadow:0 0 0 9px rgba(37,99,235,.04)}}
        @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}

        @media(max-width:960px){
          .det-hero{padding:32px 24px 28px}
          .det-hero::before{left:24px}
          .det-hero__inner{padding-left:12px}
          .det-alert-bar,.det-rider,.det-grid{padding-left:24px;padding-right:24px}
          .det-alert-bar{margin-left:24px;margin-right:24px}
          .det-rider{margin-left:24px;margin-right:24px}
        }
        @media(max-width:600px){
          .det-hero__id{font-size:38px}
          .det-grid{grid-template-columns:1fr}
        }
      `}</style>

      <ClienteSidebar user={user}/>

      <main className="det-main">

        {/* Toast */}
        {toast.msg && (
          <div className="det-toast" style={{
            background: toast.ok ? "var(--green)" : "var(--red)", color:"#fff"
          }}>
            {toast.msg}
          </div>
        )}

        {/* Hero */}
        <header className="det-hero">
          <div className="det-hero__inner">
            <div>
              <button
                className="det-edit-btn"
                style={{marginBottom:"12px"}}
                onClick={()=>router.push("/cliente/pedidos")}
              >
                ← Volver a pedidos
              </button>
              <h1 className="det-hero__id">
                Pedido <span>#VM{pedido.id_pedido}</span>
              </h1>
              <div className="det-hero__badges">
                <Badge estado={estado}/>
                {estado_pago && estado_pago!==estado && <Badge estado={estado_pago}/>}
                {estado_entrega && <Badge estado={estado_entrega}/>}
              </div>
            </div>
            <div className="det-hero__right">
              <div className="det-hero__total">{fmt(total)}</div>
              <div className="det-hero__date">📅 {fDate(fecha)}</div>
            </div>
          </div>
        </header>

        {/* Rider banner */}
        {enCamino && (
          <div className="det-rider" style={{marginTop:"24px"}}>
            <span className="det-rider__icon">🚴</span>
            <div>
              <div className="det-rider__title">¡Tu pedido está en camino!</div>
              <div className="det-rider__sub">
                <strong style={{color:"var(--text)"}}>{tracking.nombre_empleado}</strong> está llevando tu pedido
              </div>
            </div>
          </div>
        )}

        {/* Alert bars */}
        {!estaPagado && (
          <div className="det-alert-bar det-alert-bar--red" style={{marginTop:"24px"}}>
            <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
              <span>⚠️</span> Este pedido requiere pago para continuar
            </div>
            <button className="btn btn-pri" style={{background:"var(--red)",padding:"8px 18px",fontSize:"10px"}}
              onClick={()=>router.push("/cliente/carrito")}>
              💳 Ir a pagar
            </button>
          </div>
        )}
        {puedeEditar && !tieneUbic && (
          <div className="det-alert-bar det-alert-bar--amber" style={{marginTop: !estaPagado ? "10px" : "24px"}}>
            <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
              <span>📍</span> ¡Pedido pagado! Establece tu ubicación de entrega
            </div>
            <button className="btn btn-pri" style={{padding:"8px 18px",fontSize:"10px"}}
              onClick={()=>setMUbi(true)}>
              📍 Establecer Ubicación
            </button>
          </div>
        )}
        {puedeConf && (
          <div className="det-alert-bar det-alert-bar--green" style={{marginTop: "10px"}}>
            <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
              <span>📦</span> ¿Ya recibiste tu pedido?
            </div>
            <button className="btn btn-pri" style={{background:"var(--green)",padding:"8px 18px",fontSize:"10px"}}
              onClick={marcarEntregado}>
              ✅ Confirmar Recepción
            </button>
          </div>
        )}

        {/* Grid de secciones */}
        <div className="det-grid">

          {/* Productos */}
          <div className="det-card">
            <div className="det-card__head">
              <h3 className="det-card__title">Productos</h3>
              <span style={{fontFamily:"var(--font-c)",fontSize:"10px",letterSpacing:"2px",
                color:"var(--text-3)",textTransform:"uppercase"}}>
                {detalles.length} ítem{detalles.length!==1?"s":""}
              </span>
            </div>
            <div className="det-card__body">
              {detalles.map((d,i)=>(
                <div key={i} className="det-prod-row">
                  <div style={{position:"relative"}}>
                    {d.imagen_url
                      ? <img src={d.imagen_url} alt={d.nombre} className="det-prod-img"
                          onError={e=>{e.target.style.display="none";}}/>
                      : <div className="det-prod-img" style={{display:"flex",alignItems:"center",justifyContent:"center",fontSize:"22px"}}>📦</div>
                    }
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div className="det-prod-name">{d.nombre||"Producto externo"}</div>
                    <div className="det-prod-meta">
                      {d.tipo_producto==="externo" ? "🌐 Importado" : "🏠 Local"} · ×{d.cantidad}
                    </div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div className="det-prod-price">{fmt(d.precio)}</div>
                    <div style={{fontFamily:"var(--font-c)",fontSize:"9px",letterSpacing:"1px",
                      color:"var(--text-3)",textTransform:"uppercase"}}>c/u</div>
                  </div>
                </div>
              ))}
              <div className="det-total-row">
                <span className="det-total-lbl">Total</span>
                <span className="det-total-val">{fmt(total)}</span>
              </div>
            </div>
          </div>

          {/* Envío / Timeline */}
          <div className="det-card">
            <div className="det-card__head">
              <h3 className="det-card__title">Estado del Envío</h3>
              {envio && <Badge estado={envio.estado} size="sm"/>}
            </div>
            <div className="det-card__body">
              <Timeline envio={envio}/>
              {envio && (
                <div style={{borderTop:"1px solid var(--border)",paddingTop:"14px",marginTop:"14px"}}>
                  <Row label="Guía aérea" value={envio.guia_aerea} mono color="var(--blue-bright)"/>
                  <Row label="Aerolínea"  value={envio.aerolinea}/>
                  <Row label="Peso total" value={envio.peso_total ? `${envio.peso_total} kg` : null}/>
                  {envio.observaciones && (
                    <div style={{background:"var(--blue-soft)",borderRadius:"var(--r-s)",
                      padding:"8px 12px",marginTop:"8px",
                      fontFamily:"var(--font-c)",fontSize:"11px",color:"var(--text-3)",
                      border:"1px solid var(--border-blue)",letterSpacing:"0.5px"}}>
                      📝 {envio.observaciones}
                    </div>
                  )}
                </div>
              )}
              {envio?.nombre_deposito && (
                <div className="det-deposito">
                  <div className="det-deposito__title">🏢 Depósito Miami</div>
                  <div className="det-deposito__name">{envio.nombre_deposito}</div>
                  <div className="det-deposito__meta">{envio.dir_deposito}</div>
                  {envio.tel_deposito && <div className="det-deposito__meta">📞 {envio.tel_deposito}</div>}
                  {envio.contacto_deposito && <div className="det-deposito__meta">👤 {envio.contacto_deposito}</div>}
                </div>
              )}
            </div>
          </div>

          {/* Mapa */}
          <div className="det-card">
            <div className="det-card__head">
              <h3 className="det-card__title">
                {enCamino ? "Seguimiento Live" : "Mapa de Entrega"}
              </h3>
              {puedeEditar && tieneUbic && (
                <button className="det-edit-btn" onClick={()=>setMUbi(true)}>✏️ Editar</button>
              )}
            </div>
            <div className="det-card__body">
              {tieneUbic
                ? <MapaLeaflet lat={ubicacion.latitud} lng={ubicacion.longitud}
                    tracking={tracking} readOnly={true}/>
                : (
                  <div className="det-map-empty">
                    <span className="det-map-empty__ico">📍</span>
                    <div style={{fontFamily:"var(--font-c)",fontSize:"11px",letterSpacing:"2px",
                      color:"var(--text-3)",textTransform:"uppercase",textAlign:"center"}}>
                      {estaPagado
                        ? <button className="btn btn-pri" onClick={()=>setMUbi(true)}>
                            Establecer Ubicación
                          </button>
                        : "Disponible tras el pago"}
                    </div>
                  </div>
                )
              }
            </div>
          </div>

          {/* Datos entrega + pago */}
          <div className="det-card">
            <div className="det-card__head">
              <h3 className="det-card__title">Datos de Entrega</h3>
            </div>
            <div className="det-card__body">
              {ubicacion
                ? <>
                    <Row label="Dirección" value={ubicacion.direccion_entrega} color="var(--text)"/>
                    {ubicacion.referencia        && <Row label="Referencia" value={ubicacion.referencia}/>}
                    {ubicacion.nombre_receptor   && <Row label="Receptor"   value={ubicacion.nombre_receptor}/>}
                    {ubicacion.telefono_receptor && <Row label="Teléfono"   value={ubicacion.telefono_receptor} mono/>}
                  </>
                : <div style={{fontFamily:"var(--font-c)",fontSize:"11px",letterSpacing:"1.5px",
                    textTransform:"uppercase",color:"var(--text-3)",textAlign:"center",padding:"16px 0"}}>
                    Sin ubicación de entrega registrada
                  </div>
              }

              <div className="det-pay-section">
                <div className="det-pay-title">💳 Información de Pago</div>
                <Row label="Estado" value={(estado_pago||"").replace(/_/g," ").toUpperCase()}
                  color={estaPagado ? "var(--green)" : "var(--red)"}/>
                {pedido.metodo     && <Row label="Método"     value={pedido.metodo}/>}
                {pedido.fecha_pago && <Row label="Fecha pago" value={fDate(pedido.fecha_pago)}/>}
              </div>

              <div className="det-pay-section">
                <div className="det-pay-title" style={{color:"var(--text-3)"}}>¿Necesitas ayuda?</div>
                <div className="det-contact">
                  <a href="https://wa.me/59177712345" target="_blank" rel="noreferrer"
                    className="btn btn-pri" style={{background:"#25d366",padding:"10px 18px",fontSize:"10px",textDecoration:"none"}}>
                    💬 WhatsApp
                  </a>
                  <a href="tel:+59177712345" className="btn btn-out" style={{fontSize:"10px",textDecoration:"none"}}>
                    📞 Llamar
                  </a>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      {mUbi && (
        <ModalUbicacion pedido={pedido} token={token}
          onClose={()=>setMUbi(false)}
          onSaved={()=>{ cargar(token,idPed); showToast("✅ Ubicación actualizada"); }}/>
      )}
    </div>
  );
}