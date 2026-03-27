"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import ClienteSidebar from "@/components/ClienteSidebar";

const API = "http://localhost:8000";
const C = {
  pageBg:"#121418", cardBg:"#1f2429", accent:"#2563eb", accent2:"#3b82f6",
  text:"#d9d9d9", muted:"#a0a0a0", success:"#10b981", warning:"#f59e0b",
  danger:"#ef4444", indigo:"#6366f1",
};

const fmt   = n => `$${parseFloat(n||0).toFixed(2)}`;
const fDate = iso => iso ? new Date(iso).toLocaleDateString("es-BO",{day:"2-digit",month:"2-digit",year:"numeric"}) : "—";

// ── Estilos ───────────────────────────────────────────────────────────────────
const card    = { background:C.cardBg, borderRadius:"10px", border:`1px solid rgba(37,99,235,0.12)`,
  boxShadow:"0 4px 15px rgba(0,0,0,0.1)", overflow:"hidden" };
const cHead   = { padding:"13px 18px", borderBottom:`2px solid ${C.accent}`, background:C.pageBg,
  display:"flex", alignItems:"center", justifyContent:"space-between" };
const cTitle  = { margin:0, color:C.accent2, fontFamily:"Cinzel,serif", fontSize:"14px", fontWeight:"700" };
const cBody   = { padding:"18px" };
const ov      = { position:"fixed", inset:0, background:"rgba(0,0,0,0.78)", display:"flex",
  alignItems:"center", justifyContent:"center", zIndex:9000, padding:"20px" };
const mWrap   = { background:C.cardBg, borderRadius:"12px", width:"100%", maxWidth:"640px",
  border:`2px solid ${C.accent}`, boxShadow:"0 20px 60px rgba(0,0,0,0.6)", overflow:"hidden",
  maxHeight:"92vh", display:"flex", flexDirection:"column" };
const mHead   = { display:"flex", justifyContent:"space-between", alignItems:"center",
  padding:"15px 20px", borderBottom:`2px solid ${C.accent}`, background:C.pageBg, flexShrink:0 };
const mFoot   = { display:"flex", justifyContent:"flex-end", gap:"10px",
  padding:"13px 20px", borderTop:`1px solid rgba(37,99,235,0.15)`, background:C.pageBg, flexShrink:0 };
const mBody   = { padding:"20px", overflowY:"auto", flex:1 };
const btnX    = { background:"transparent", border:"none", color:C.muted, cursor:"pointer", fontSize:"18px" };
const btnPri  = { background:C.accent, border:"none", color:"#fff", padding:"9px 22px",
  borderRadius:"8px", cursor:"pointer", fontWeight:"700", fontSize:"13px",
  boxShadow:`0 2px 8px rgba(37,99,235,0.35)` };
const btnSec  = { background:"transparent", border:`1px solid #444`, color:C.muted,
  padding:"9px 22px", borderRadius:"8px", cursor:"pointer", fontWeight:"600", fontSize:"13px" };
const btnEdit = { background:"transparent", border:`1px solid ${C.accent}`, color:C.accent,
  padding:"4px 12px", borderRadius:"6px", cursor:"pointer", fontSize:"11px", fontWeight:"600" };
const inp_    = { width:"100%", padding:"9px 12px", background:C.pageBg,
  border:`2px solid rgba(37,99,235,0.18)`, borderRadius:"6px", color:C.text,
  fontSize:"13px", outline:"none", boxSizing:"border-box" };
const lbl_    = { display:"block", color:C.muted, fontSize:"12px", marginBottom:"5px", fontWeight:"600" };

const BADGE_CFG = {
  sin_pago:    { bg:C.danger,  col:"#fff" },
  pendiente:   { bg:C.warning, col:"#000" },
  pagado:      { bg:C.accent,  col:"#fff" },
  confirmado:  { bg:C.success, col:"#fff" },
  enviado:     { bg:C.indigo,  col:"#fff" },
  entregado:   { bg:"#059669", col:"#fff" },
  cancelado:   { bg:"#6b7280", col:"#fff" },
  en_destino:  { bg:C.success, col:"#fff" },
  en_miami:    { bg:C.warning, col:"#000" },
  en_transito: { bg:C.indigo,  col:"#fff" },
  en_aduanas:  { bg:C.accent,  col:"#fff" },
  "en progreso": { bg:C.accent2, col:"#fff" },
};
function Badge({ estado, size="normal" }) {
  const b = BADGE_CFG[estado] || { bg:"#555", col:"#fff" };
  return <span style={{ background:b.bg, color:b.col,
    padding: size==="sm" ? "2px 8px" : "4px 12px", borderRadius:"12px",
    fontSize: size==="sm" ? "10px" : "11px", fontWeight:"700", whiteSpace:"nowrap" }}>
    {(estado||"").replace(/_/g," ").toUpperCase()}
  </span>;
}

function Row({ label, value, color, mono }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start",
      marginBottom:"8px", gap:"12px" }}>
      <span style={{ color:C.muted, fontSize:"12px", flexShrink:0 }}>{label}</span>
      <span style={{ color:color||C.text, fontSize:"12px", fontWeight:"600",
        textAlign:"right", fontFamily:mono?"monospace":"inherit" }}>
        {value||"—"}
      </span>
    </div>
  );
}

// ── Timeline de envío ─────────────────────────────────────────────────────────
const ETAPAS = [
  { key:"en_miami",    icon:"🏢", label:"En depósito Miami",     campo:"fecha_salida_miami"     },
  { key:"en_transito", icon:"✈️", label:"Vuelo a Bolivia",        campo:"fecha_llegada_bolivia"  },
  { key:"en_aduanas",  icon:"🛃", label:"En aduanas bolivianas",  campo:null                     },
  { key:"entregado",   icon:"✅", label:"Entregado al cliente",  campo:"fecha_entrega_cliente"  },
];
const ORDEN = ETAPAS.map(e=>e.key);

function Timeline({ envio }) {
  if (!envio) return (
    <div style={{ color:C.muted, textAlign:"center", padding:"24px 0", fontSize:"13px" }}>
      Sin información de envío todavía.
    </div>
  );

  const idxActual = ORDEN.indexOf(envio.estado);

  return (
    <div style={{ position:"relative", paddingLeft:"36px" }}>
      {/* Línea de fondo */}
      <div style={{ position:"absolute", left:"11px", top:"14px", bottom:"14px",
        width:"2px", background:`rgba(37,99,235,0.15)` }}/>

      {ETAPAS.map((et, idx) => {
        const done   = idx <= idxActual;
        const active = idx === idxActual;
        const fecha  = et.campo ? envio[et.campo] : null;

        return (
          <div key={et.key} style={{ display:"flex", gap:"14px", marginBottom:"22px" }}>
            {/* Dot */}
            <div style={{
              width:"24px", height:"24px", borderRadius:"50%", flexShrink:0,
              background: done ? (active ? C.accent : C.success) : "rgba(37,99,235,0.1)",
              border: active ? `3px solid ${C.accent2}` : `2px solid ${done ? C.success : "rgba(37,99,235,0.2)"}`,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:"11px", fontWeight:"800", color:"#fff",
              marginLeft:"-36px", zIndex:1, position:"relative",
              boxShadow: active ? `0 0 0 5px rgba(37,99,235,0.2)` : "none",
              animation: active ? "pulse 1.6s ease-in-out infinite" : "none",
            }}>
              {done ? (active ? "⚡" : "✓") : <span style={{color:C.muted}}>{idx+1}</span>}
            </div>

            {/* Contenido */}
            <div style={{ flex:1, paddingTop:"2px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
                <span style={{ fontSize:"15px" }}>{et.icon}</span>
                <span style={{ color: done ? C.text : C.muted, fontWeight: done ? "700" : "400",
                  fontSize:"13px" }}>
                  {et.label}
                </span>
                {active && <Badge estado="en progreso" size="sm"/>}
              </div>
              <div style={{ marginTop:"3px", fontSize:"11px",
                color: done ? C.success : "#444" }}>
                {fecha ? `📅 ${fDate(fecha)}` : (active ? "En curso…" : "Pendiente")}
              </div>
            </div>
          </div>
        );
      })}

      <style>{`
        @keyframes pulse {
          0%,100% { box-shadow:0 0 0 5px rgba(37,99,235,0.2); }
          50%      { box-shadow:0 0 0 9px rgba(37,99,235,0.04); }
        }
      `}</style>
    </div>
  );
}

// ── Mapa Leaflet ──────────────────────────────────────────────────────────────
function MapaLeaflet({ lat, lng, tracking, readOnly=true, onPosChange }) {
  const ref    = useRef(null);
  const mapRef = useRef(null);
  const mkRef  = useRef(null);   // marker de entrega
  const empRef = useRef(null);   // marker empleado

  // Inicializar mapa una sola vez
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
        html:`<div style="background:${C.accent};color:#fff;border-radius:50% 50% 50% 0;
          width:34px;height:34px;display:flex;align-items:center;justify-content:center;
          font-size:16px;transform:rotate(-45deg);border:2px solid #fff;
          box-shadow:0 3px 8px rgba(0,0,0,0.4)">
          <span style="transform:rotate(45deg)">📍</span></div>`,
        className:"", iconSize:[34,34], iconAnchor:[17,34],
      });

      if (lat && lng) {
        mkRef.current = L.marker([lat,lng],{ icon:entregaIcon, draggable:!readOnly })
          .addTo(map)
          .bindPopup("<strong>Tu ubicación de entrega</strong>").openPopup();

        if (!readOnly) {
          mkRef.current.on("dragend", e=>{
            const p = e.target.getLatLng();
            geocodificar(p.lat, p.lng);
          });
        }
      }

      // Marker empleado
      if (tracking?.activo) {
        addEmpMarker(L, map, tracking);
      }

      // Click para mover (solo edición)
      if (!readOnly) {
        map.on("click", e=>{
          const {lat:la, lng:lo} = e.latlng;
          if (mkRef.current) map.removeLayer(mkRef.current);
          mkRef.current = L.marker([la,lo],{ icon:entregaIcon, draggable:true })
            .addTo(map).bindPopup("Nueva ubicación").openPopup();
          mkRef.current.on("dragend", ev=>{
            const p = ev.target.getLatLng();
            geocodificar(p.lat, p.lng);
          });
          geocodificar(la, lo);
        });
      }
    }

    function addEmpMarker(L, map, t) {
      const empIcon = L.divIcon({
        html:`<div style="background:${C.success};color:#fff;border-radius:50%;
          width:38px;height:38px;display:flex;align-items:center;justify-content:center;
          font-size:20px;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.4)">🚴</div>`,
        className:"", iconSize:[38,38], iconAnchor:[19,19],
      });
      empRef.current = L.marker([t.latitud, t.longitud],{ icon:empIcon })
        .addTo(map)
        .bindPopup(`<strong>Empleado: ${t.nombre_empleado}</strong>`);
    }

    function geocodificar(la, lo) {
      onPosChange && onPosChange(la, lo, null);
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${la}&lon=${lo}`)
        .then(r=>r.json())
        .then(d=>{ onPosChange && onPosChange(la, lo, d.display_name||null); })
        .catch(()=>{});
    }

    // Cargar Leaflet si no está
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

  // Actualizar marker empleado cuando cambia tracking
  useEffect(()=>{
    if (!mapRef.current || !window.L || !tracking?.activo) return;
    if (empRef.current) {
      empRef.current.setLatLng([tracking.latitud, tracking.longitud]);
    }
  }, [tracking]);

  return (
    <div ref={ref} style={{ height:"320px", width:"100%", borderRadius:"8px",
      border:`1px solid rgba(37,99,235,0.2)` }}/>
  );
}

// ── Modal: establecer / editar ubicación ─────────────────────────────────────
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
      method:"POST",
      headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`},
      body:JSON.stringify({ latitud:pos.lat, longitud:pos.lng, ...form }),
    });
    const d = await r.json(); setLoad(false);
    if (d.success) { setOk("✅ Guardado"); setTimeout(()=>{ onSaved(); onClose(); },1200); }
    else alert(d.detail||"Error al guardar");
  }

  return (
    <div style={ov}>
      <div style={{...mWrap, maxWidth:"680px"}}>
        <div style={mHead}>
          <h3 style={{margin:0,color:C.accent2,fontFamily:"Cinzel,serif",fontSize:"15px",fontWeight:"700"}}>
            📍 {ubi ? "Editar" : "Establecer"} Ubicación de Entrega
          </h3>
          <button onClick={onClose} style={btnX}>✕</button>
        </div>
        <div style={mBody}>
          {ok && <div style={{background:C.success,color:"#fff",padding:"10px 14px",
            borderRadius:"6px",marginBottom:"14px",fontWeight:"600"}}>{ok}</div>}

          <div style={{background:`rgba(37,99,235,0.07)`,border:`1px solid rgba(37,99,235,0.2)`,
            borderRadius:"8px",padding:"10px 14px",marginBottom:"14px",
            color:C.accent2,fontSize:"12px",lineHeight:"1.5"}}>
            🗺️ <strong>Haz clic en el mapa</strong> para colocar el pin de entrega.
            También puedes arrastrarlo para ajustar la posición exacta.
          </div>

          {/* Mapa editable */}
          <div style={{marginBottom:"16px"}}>
            <MapaLeaflet lat={pos.lat} lng={pos.lng} readOnly={false} onPosChange={handlePos}/>
            {pos.lat && (
              <div style={{color:C.muted,fontSize:"11px",marginTop:"4px",textAlign:"right"}}>
                📌 {pos.lat.toFixed(6)}, {pos.lng.toFixed(6)}
              </div>
            )}
          </div>

          {/* Formulario */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px"}}>
            <div style={{gridColumn:"1/-1"}}>
              <label style={lbl_}>Dirección completa *</label>
              <textarea style={{...inp_,height:"68px",resize:"vertical"}}
                placeholder="Calle, número, zona, ciudad…"
                value={form.direccion_entrega}
                onChange={e=>setForm(f=>({...f,direccion_entrega:e.target.value}))}/>
            </div>
            <div style={{gridColumn:"1/-1"}}>
              <label style={lbl_}>Referencia</label>
              <input style={inp_} placeholder="Casa azul, portón negro…"
                value={form.referencia}
                onChange={e=>setForm(f=>({...f,referencia:e.target.value}))}/>
            </div>
            <div>
              <label style={lbl_}>Nombre de quien recibe</label>
              <input style={inp_} placeholder="Nombre completo"
                value={form.nombre_receptor}
                onChange={e=>setForm(f=>({...f,nombre_receptor:e.target.value}))}/>
            </div>
            <div>
              <label style={lbl_}>Teléfono de contacto</label>
              <input style={inp_} placeholder="+591 7xx xxxxx"
                value={form.telefono_receptor}
                onChange={e=>setForm(f=>({...f,telefono_receptor:e.target.value}))}/>
            </div>
          </div>
        </div>
        <div style={mFoot}>
          <button onClick={onClose} style={btnSec}>Cancelar</button>
          <button onClick={guardar} disabled={load} style={{...btnPri,opacity:load?0.7:1}}>
            {load?"Guardando…":"💾 Guardar Ubicación"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── PÁGINA DETALLE ────────────────────────────────────────────────────────────
export default function DetallePedido() {
  const router = useRouter();
  const params = useParams();
  const idPed  = params?.id_pedido;

  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState("");
  const [pedido,  setPedido]  = useState(null);
  const [load,    setLoad]    = useState(true);
  const [toast,   setToast]   = useState({ msg:"", color:C.success });
  const [mUbi,    setMUbi]    = useState(false);
  const [tracking,setTracking]= useState(null);

  const showToast = (msg,color=C.success)=>{
    setToast({msg,color}); setTimeout(()=>setToast({msg:""}),3500);
  };

  const cargar = useCallback(async (t,id)=>{
    const r = await fetch(`${API}/cliente/pedidos/${id}`,{headers:{Authorization:`Bearer ${t}`}});
    if (!r.ok) { router.push("/cliente/pedidos"); return; }
    const d = await r.json();
    setPedido(d);
    setTracking(d.tracking_empleado||null);
    setLoad(false);
  },[router]);

  useEffect(()=>{
    const u = JSON.parse(sessionStorage.getItem("user")||"null");
    const t = document.cookie.split(";").find(c=>c.trim().startsWith("access_token="))?.split("=")[1];
    if (!t||!u||!idPed) return router.push("/login");
    setUser(u); setToken(t);
    cargar(t,idPed);
  },[idPed,router,cargar]);

  // Polling tracking cada 5 s (igual que el PHP original)
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
      : showToast(d.detail||"Error", C.danger);
  }

  if (load) return (
    <div style={{minHeight:"100vh",background:C.pageBg,display:"flex",
      alignItems:"center",justifyContent:"center",flexDirection:"column",gap:"16px"}}>
      <div style={{width:"44px",height:"44px",border:`4px solid rgba(37,99,235,0.2)`,
        borderTop:`4px solid ${C.accent}`,borderRadius:"50%",animation:"spin 0.9s linear infinite"}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{color:C.muted,fontFamily:"Cinzel,serif",fontSize:"13px"}}>Cargando pedido…</div>
    </div>
  );
  if (!pedido) return null;

  const { detalles=[], envio, ubicacion, estado, estado_pago="sin_pago",
    estado_entrega, total, fecha } = pedido;

  const estaPagado  = estado==="pagado"||estado_pago==="pagado"||estado_pago==="confirmado";
  const tieneUbic   = !!ubicacion?.latitud;
  const puedeConf   = estado_entrega==="en_destino"||estado_entrega==="enviado";
  const enCamino    = tracking?.activo;
  // Bloquear edición si ya fue entregado o cancelado
  const puedeEditar = estaPagado && estado_entrega!=="entregado" && estado!=="cancelado";

  return (
    <div style={{height:"100vh",background:C.pageBg,display:"flex",overflow:"hidden"}}>
      <ClienteSidebar user={user}/>

      <main style={{flex:1,padding:"28px",overflowY:"auto",overflowX:"hidden"}}>

        {/* Toast */}
        {toast.msg && (
          <div style={{position:"fixed",top:20,right:20,background:toast.color,color:"#fff",
            padding:"12px 22px",borderRadius:"8px",zIndex:9999,fontWeight:"700",
            boxShadow:"0 4px 16px rgba(0,0,0,0.5)"}}>{toast.msg}</div>
        )}

        {/* Banner tracking activo */}
        {enCamino && (
          <div style={{background:`rgba(16,185,129,0.09)`,border:`1px solid rgba(16,185,129,0.4)`,
            borderRadius:"10px",padding:"12px 18px",marginBottom:"20px",
            display:"flex",alignItems:"center",gap:"12px"}}>
            <span style={{fontSize:"22px",animation:"bounce 0.75s infinite"}}>🚴</span>
            <div>
              <div style={{color:C.success,fontWeight:"700",fontSize:"14px"}}>
                ¡Tu pedido está en camino!
              </div>
              <div style={{color:C.muted,fontSize:"12px"}}>
                <strong style={{color:C.text}}>{tracking.nombre_empleado}</strong> está llevando
                tu pedido — mapa actualizado cada 5 s
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",
          marginBottom:"24px",borderBottom:`2px solid ${C.accent}`,paddingBottom:"18px",
          flexWrap:"wrap",gap:"12px"}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"8px",flexWrap:"wrap"}}>
              <button onClick={()=>router.push("/cliente/pedidos")} style={btnEdit}>
                ← Volver
              </button>
              <h1 style={{margin:0,fontFamily:"Cinzel,serif",color:C.accent2,fontSize:"21px"}}>
                Pedido #VM{pedido.id_pedido}
              </h1>
            </div>
            <div style={{display:"flex",gap:"7px",flexWrap:"wrap"}}>
              <Badge estado={estado}/>
              {estado_pago&&estado_pago!==estado&&<Badge estado={estado_pago}/>}
              {estado_entrega&&<Badge estado={estado_entrega}/>}
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{color:C.success,fontWeight:"800",fontSize:"26px"}}>{fmt(total)}</div>
            <div style={{color:C.muted,fontSize:"12px"}}>📅 {fDate(fecha)}</div>
          </div>
        </div>

        {/* Alertas de acción */}
        {!estaPagado && (
          <div style={{background:`rgba(239,68,68,0.07)`,border:`1px solid rgba(239,68,68,0.3)`,
            borderRadius:"8px",padding:"11px 16px",marginBottom:"16px",
            display:"flex",alignItems:"center",justifyContent:"space-between",gap:"10px",flexWrap:"wrap"}}>
            <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
              <span>⚠️</span>
              <span style={{color:"#fca5a5",fontSize:"13px"}}>Este pedido requiere pago.</span>
            </div>
            <button onClick={()=>router.push("/cliente/carrito")}
              style={{...btnPri,background:C.danger,padding:"7px 16px",fontSize:"12px"}}>
              💳 Ir a pagar
            </button>
          </div>
        )}
        {puedeEditar && !tieneUbic && (
          <div style={{background:`rgba(245,158,11,0.07)`,border:`1px solid rgba(245,158,11,0.3)`,
            borderRadius:"8px",padding:"11px 16px",marginBottom:"16px",
            display:"flex",alignItems:"center",justifyContent:"space-between",gap:"10px",flexWrap:"wrap"}}>
            <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
              <span>📍</span>
              <span style={{color:"#fcd34d",fontSize:"13px"}}>
                ¡Pedido pagado! Establece tu <strong>ubicación de entrega</strong>.
              </span>
            </div>
            {puedeEditar && (
              <button onClick={()=>setMUbi(true)} style={{...btnPri,padding:"7px 16px",fontSize:"12px"}}>
                📍 Establecer Ubicación
              </button>
            )}
          </div>
        )}
        {puedeConf && (
          <div style={{background:`rgba(16,185,129,0.07)`,border:`1px solid rgba(16,185,129,0.3)`,
            borderRadius:"8px",padding:"11px 16px",marginBottom:"16px",
            display:"flex",alignItems:"center",justifyContent:"space-between",gap:"10px",flexWrap:"wrap"}}>
            <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
              <span>📦</span>
              <span style={{color:"#6ee7b7",fontSize:"13px"}}>¿Ya recibiste tu pedido?</span>
            </div>
            <button onClick={marcarEntregado}
              style={{...btnPri,background:C.success,padding:"7px 16px",fontSize:"12px"}}>
              ✅ Confirmar Recepción
            </button>
          </div>
        )}

        {/* ── Grid principal ─────────────────────────────────────────────── */}
        <div style={{display:"grid",gap:"18px",
          gridTemplateColumns:"repeat(auto-fit,minmax(340px,1fr))"}}>

          {/* Productos */}
          <div style={card}>
            <div style={cHead}>
              <h3 style={cTitle}>🛍️ Productos del pedido</h3>
              <span style={{color:C.muted,fontSize:"12px"}}>{detalles.length} ítem{detalles.length!==1?"s":""}</span>
            </div>
            <div style={cBody}>
              {detalles.map((d,i)=>(
                <div key={i} style={{display:"flex",gap:"12px",alignItems:"center",
                  padding:"10px 0",
                  borderBottom:i<detalles.length-1?`1px solid rgba(37,99,235,0.08)`:"none"}}>
                  {/* Imagen */}
                  <div style={{width:"52px",height:"52px",borderRadius:"8px",background:"#0d1117",
                    overflow:"hidden",flexShrink:0,border:`1px solid rgba(37,99,235,0.15)`,
                    display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {d.imagen_url
                      ? <img src={d.imagen_url} alt={d.nombre}
                          style={{width:"100%",height:"100%",objectFit:"cover"}}
                          onError={e=>{e.target.style.display="none";}}/>
                      : <span style={{fontSize:"22px"}}>📦</span>
                    }
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{color:C.text,fontSize:"13px",fontWeight:"600",
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {d.nombre||"Producto externo"}
                    </div>
                    <div style={{color:C.muted,fontSize:"11px",marginTop:"2px"}}>
                      {d.tipo_producto==="externo" ? "🌐 Importado" : "🏠 Local"} · ×{d.cantidad}
                    </div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{color:C.success,fontWeight:"700",fontSize:"13px"}}>{fmt(d.precio)}</div>
                    <div style={{color:C.muted,fontSize:"10px"}}>c/u</div>
                  </div>
                </div>
              ))}
              {/* Total */}
              <div style={{borderTop:`2px solid ${C.accent}`,paddingTop:"12px",marginTop:"8px",
                display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{color:C.muted,fontSize:"13px"}}>Total del pedido:</span>
                <strong style={{color:C.success,fontSize:"18px"}}>{fmt(total)}</strong>
              </div>
            </div>
          </div>

          {/* Envío + Timeline */}
          <div style={card}>
            <div style={cHead}>
              <h3 style={cTitle}>✈️ Estado del Envío</h3>
              {envio && <Badge estado={envio.estado} size="sm"/>}
            </div>
            <div style={cBody}>
              <Timeline envio={envio}/>

              {envio && (
                <div style={{borderTop:`1px solid rgba(37,99,235,0.1)`,
                  paddingTop:"14px",marginTop:"14px"}}>
                  <Row label="Guía aérea"  value={envio.guia_aerea} mono color={C.accent2}/>
                  <Row label="Aerolínea"   value={envio.aerolinea}/>
                  <Row label="Peso total"  value={envio.peso_total ? `${envio.peso_total} kg` : null}/>
                  {envio.observaciones && (
                    <div style={{background:`rgba(37,99,235,0.05)`,borderRadius:"6px",
                      padding:"8px 12px",marginTop:"8px",fontSize:"12px",color:C.muted,
                      border:`1px solid rgba(37,99,235,0.1)`}}>
                      📝 {envio.observaciones}
                    </div>
                  )}
                </div>
              )}

              {/* Depósito Miami */}
              {envio?.nombre_deposito && (
                <div style={{background:`rgba(37,99,235,0.05)`,borderRadius:"8px",
                  padding:"12px",marginTop:"12px",border:`1px solid rgba(37,99,235,0.12)`}}>
                  <div style={{color:C.accent2,fontWeight:"700",fontSize:"12px",marginBottom:"6px"}}>
                    🏢 Depósito Miami
                  </div>
                  <div style={{color:C.text,fontSize:"12px",fontWeight:"600"}}>{envio.nombre_deposito}</div>
                  <div style={{color:C.muted,fontSize:"11px",marginTop:"3px"}}>{envio.dir_deposito}</div>
                  {envio.tel_deposito && (
                    <div style={{color:C.muted,fontSize:"11px"}}>📞 {envio.tel_deposito}</div>
                  )}
                  {envio.contacto_deposito && (
                    <div style={{color:C.muted,fontSize:"11px"}}>👤 {envio.contacto_deposito}</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Mapa */}
          <div style={card}>
            <div style={cHead}>
              <h3 style={cTitle}>
                {enCamino ? "🚴 Seguimiento en Tiempo Real" : "📍 Mapa de Entrega"}
              </h3>
              {puedeEditar && tieneUbic && (
                <button onClick={()=>setMUbi(true)} style={btnEdit}>✏️ Editar</button>
              )}
            </div>
            <div style={cBody}>
              {tieneUbic
                ? <MapaLeaflet
                    lat={ubicacion.latitud} lng={ubicacion.longitud}
                    tracking={tracking}
                    readOnly={true}
                  />
                : (
                  <div style={{height:"220px",display:"flex",alignItems:"center",
                    justifyContent:"center",flexDirection:"column",gap:"14px",
                    background:`rgba(37,99,235,0.03)`,borderRadius:"8px",
                    border:`1px dashed rgba(37,99,235,0.18)`}}>
                    <span style={{fontSize:"36px"}}>📍</span>
                    <div style={{color:C.muted,fontSize:"13px",textAlign:"center"}}>
                      {estaPagado
                        ? <button onClick={()=>setMUbi(true)} style={btnPri}>
                            Establecer Ubicación de Entrega
                          </button>
                        /* puedeEditar ya cubre esto */
                        : "Establece la ubicación después de realizar el pago."}
                    </div>
                  </div>
                )
              }
            </div>
          </div>

          {/* Datos de entrega + pago + soporte */}
          <div style={card}>
            <div style={cHead}>
              <h3 style={cTitle}>🏠 Datos de Entrega</h3>
            </div>
            <div style={cBody}>

              {ubicacion
                ? <>
                    <Row label="Dirección"  value={ubicacion.direccion_entrega} color={C.text}/>
                    {ubicacion.referencia && <Row label="Referencia" value={ubicacion.referencia}/>}
                    {ubicacion.nombre_receptor && <Row label="Receptor" value={ubicacion.nombre_receptor}/>}
                    {ubicacion.telefono_receptor && (
                      <Row label="Teléfono" value={ubicacion.telefono_receptor} mono/>
                    )}
                  </>
                : <div style={{color:C.muted,fontSize:"13px",textAlign:"center",
                    padding:"16px 0"}}>Sin ubicación de entrega registrada.</div>
              }

              {/* Pago */}
              <div style={{borderTop:`1px solid rgba(37,99,235,0.1)`,paddingTop:"14px",marginTop:"14px"}}>
                <div style={{color:C.accent2,fontWeight:"700",fontSize:"11px",
                  textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:"10px"}}>
                  💳 Información de Pago
                </div>
                <Row label="Estado" value={(estado_pago||"").replace(/_/g," ").toUpperCase()}
                  color={estaPagado ? C.success : C.danger}/>
                {pedido.metodo    && <Row label="Método"    value={pedido.metodo}/>}
                {pedido.fecha_pago&& <Row label="Fecha pago" value={fDate(pedido.fecha_pago)}/>}
              </div>

              {/* Soporte */}
              <div style={{borderTop:`1px solid rgba(37,99,235,0.1)`,paddingTop:"14px",marginTop:"14px"}}>
                <div style={{color:C.muted,fontSize:"12px",marginBottom:"10px"}}>
                  ¿Necesitas ayuda con tu pedido?
                </div>
                <div style={{display:"flex",gap:"8px"}}>
                  <a href="https://wa.me/59177712345" target="_blank" rel="noreferrer"
                    style={{...btnPri,background:"#25d366",padding:"8px 16px",fontSize:"12px",
                      textDecoration:"none"}}>
                    💬 WhatsApp
                  </a>
                  <a href="tel:+59177712345"
                    style={{...btnSec,padding:"8px 16px",fontSize:"12px",textDecoration:"none"}}>
                    📞 Llamar
                  </a>
                </div>
              </div>
            </div>
          </div>

        </div>{/* fin grid */}

        <style>{`
          @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        `}</style>
      </main>

      {mUbi && (
        <ModalUbicacion pedido={pedido} token={token}
          onClose={()=>setMUbi(false)}
          onSaved={()=>{ cargar(token,idPed); showToast("✅ Ubicación actualizada"); }}/>
      )}
    </div>
  );
}