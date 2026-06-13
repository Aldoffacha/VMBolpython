"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import ClienteSidebar from "@/components/ClienteSidebar";
import { useTheme } from "@/context/ThemeContext";
import { useClienteMoneda } from "@/lib/ClienteMonedaContext";
import { Package, Bike, Calendar, Globe, Home, MapPin, AlertTriangle, CheckCircle, CreditCard, Building2, Plane, ShieldCheck, Zap, Check, X, Phone, User, Pencil } from "lucide-react";
import "@/styles/dashboard.css"; // mismas variables CSS del dashboard

const API = "http://localhost:8000";

const fDate = iso => iso
  ? new Date(iso).toLocaleDateString("es-BO",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})
  : "—";

const BADGE_CFG = {
  sin_pago:   { bg:"var(--red)",   col:"#fff", txt:"Sin pago"   },
  pendiente:  { bg:"var(--amber)", col:"#000", txt:"Pendiente"  },
  pagado:     { bg:"var(--blue)",  col:"#fff", txt:"Pagado"     },
  confirmado: { bg:"var(--green)", col:"#fff", txt:"Confirmado" },
  enviado:    { bg:"#6366f1",      col:"#fff", txt:"Enviado"    },
  en_camino:  { bg:"var(--green)", col:"#fff", txt:"En camino"  },
  entregado:  { bg:"#059669",      col:"#fff", txt:"Entregado"  },
  cancelado:  { bg:"var(--text-3)",col:"#fff", txt:"Cancelado"  },
  en_destino: { bg:"var(--green)", col:"#fff", txt:"En destino" },
};

function Badge({ estado, size="normal" }) {
  const b = BADGE_CFG[estado] || { bg:"var(--text-3)", col:"#fff", txt: estado };
  return (
    <span style={{
      background: b.bg, color: b.col,
      padding: size==="sm" ? "3px 10px" : "5px 14px",
      borderRadius: "999px",
      fontSize: size==="sm" ? "9px" : "10px",
      fontFamily: "var(--font-c)",
      fontWeight: "700",
      letterSpacing: "1.5px",
      textTransform: "uppercase",
      whiteSpace: "nowrap",
    }}>
      {b.txt || (estado||"").replace(/_/g," ").toUpperCase()}
    </span>
  );
}

const ETAPAS = [
  { key:"en_miami",    icon:<Building2 size={15} />, label:"En depósito Miami",    campo:"fecha_salida_miami"    },
  { key:"en_transito", icon:<Plane size={15} />,      label:"Vuelo a Bolivia",       campo:"fecha_llegada_bolivia" },
  { key:"en_aduanas",  icon:<ShieldCheck size={15} />, label:"En aduanas bolivianas", campo:null                    },
  { key:"entregado",   icon:<CheckCircle size={15} />, label:"Entregado al cliente",  campo:"fecha_entrega_cliente" },
];
const ORDEN = ETAPAS.map(e=>e.key);

const BADGE_CFG_TRACKING = {
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

function BadgeT({ estado, size="normal" }) {
  const b = BADGE_CFG_TRACKING[estado] || { bg:"var(--text-3)", col:"#fff" };
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
            }}>
              {done ? (active ? <Zap size={14} /> : <Check size={14} />) : (
                <span style={{color:"var(--text-3)",fontFamily:"var(--font-d)",fontSize:"12px"}}>{idx+1}</span>
              )}
            </div>
            <div style={{ flex:1, paddingTop:"2px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
                <span style={{ fontSize:"15px", display:"inline-flex", alignItems:"center" }}>{et.icon}</span>
                <span style={{
                  fontFamily:"var(--font-c)", fontSize:"12px", letterSpacing:"1px",
                  color: done ? "var(--text)" : "var(--text-3)",
                  fontWeight: done ? "700" : "400",
                  textTransform:"uppercase",
                }}>
                  {et.label}
                </span>
                {active && <BadgeT estado="en progreso" size="sm"/>}
              </div>
              <div style={{ marginTop:"3px", fontFamily:"var(--font-c)", fontSize:"10px",
                letterSpacing:"1px", color: done ? "var(--green)" : "var(--text-3)" }}>
                {fecha ? <><Calendar size={12} /> {fDate(fecha)}</> : (active ? "En curso…" : "Pendiente")}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MapaLeaflet({ lat, lng, tracking, readOnly=true }) {
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
          transform:rotate(-45deg);border:2px solid #fff;
          box-shadow:0 3px 8px rgba(0,0,0,0.4)">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transform:rotate(45deg)"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
        className:"", iconSize:[34,34], iconAnchor:[17,34],
      });
      if (lat && lng) {
        mkRef.current = L.marker([lat,lng],{ icon:entregaIcon, draggable:false })
          .addTo(map).bindPopup("<strong>Tu ubicación de entrega</strong>").openPopup();
      }
      if (tracking?.activo) addEmpMarker(L, map, tracking);
    }
    function addEmpMarker(L, map, t) {
      const empIcon = L.divIcon({
        html:`<div style="background:#10b981;color:#fff;border-radius:50%;
          width:38px;height:38px;display:flex;align-items:center;justify-content:center;
          border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.4)">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg></div>`,
        className:"", iconSize:[38,38], iconAnchor:[19,19],
      });
      empRef.current = L.marker([t.latitud, t.longitud],{ icon:empIcon })
        .addTo(map).bindPopup(`<strong>Empleado: ${t.nombre_empleado}</strong>`);
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
    <div ref={ref} style={{ height:"280px", width:"100%", borderRadius:"var(--r-s)",
      border:"1px solid var(--border-blue)" }}/>
  );
}

function ModalSeguimiento({ idPedido, token, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState(null);
  const { formatPrice } = useClienteMoneda();

  const cargar = useCallback(async (t,id)=>{
    setLoading(true);
    try {
      const r = await fetch(`${API}/cliente/pedidos/${id}`,{headers:{Authorization:`Bearer ${t}`}});
      if (!r.ok) return;
      const d = await r.json();
      setData(d);
      setTracking(d.tracking_empleado||null);
    } catch {}
    setLoading(false);
  },[]);

  useEffect(()=>{ if (token&&idPedido) cargar(token,idPedido); },[token,idPedido,cargar]);

  useEffect(()=>{
    if (!token||!idPedido) return;
    const iv = setInterval(async()=>{
      try {
        const r = await fetch(`${API}/cliente/pedidos/${idPedido}`,{headers:{Authorization:`Bearer ${token}`}});
        const d = await r.json();
        setTracking(d.tracking_empleado||null);
      } catch {}
    }, 5000);
    return ()=>clearInterval(iv);
  },[token,idPedido]);

  const { envio, ubicacion, estado, estado_pago, estado_entrega, detalles=[], total, fecha } = data||{};
  const enCamino = tracking?.activo;
  const tieneUbic = !!ubicacion?.latitud;

  return (
    <div className="m-overlay" onClick={onClose}>
      <div className="m-box m-box--wide" style={{
        maxWidth:"900px", width:"95%", maxHeight:"90vh", display:"flex", flexDirection:"column",
        background:"var(--card)", border:"1px solid var(--border)",
        boxShadow:"0 16px 64px rgba(0,0,0,.5)", borderRadius:"var(--r-l)"
      }} onClick={e=>e.stopPropagation()}>
        {/* ── Titlebar (system window look) ── */}
        <div style={{
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"14px 20px", background:"var(--bg-3)",
          borderBottom:"2px solid var(--blue)",
          cursor:"default", userSelect:"none", flexShrink:0,
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
            {enCamino
              ? <div style={{background:"var(--green)",borderRadius:"50%",width:"10px",height:"10px"}}/>
              : <div style={{background:"var(--blue)",borderRadius:"50%",width:"10px",height:"10px"}}/>
            }
            <span style={{fontFamily:"var(--font-d)",fontSize:"15px",letterSpacing:"2px",color:"var(--blue-bright)",textTransform:"uppercase"}}>
              {data ? `Seguimiento #VM${data.id_pedido}` : "Seguimiento"}
            </span>
          </div>
          <button onClick={onClose} style={{
            background:"transparent", border:"none", color:"var(--text-3)", cursor:"pointer",
            padding:"4px", borderRadius:"var(--r-s)", display:"flex",
            transition:"all .2s",
          }}
            onMouseEnter={e=>e.currentTarget.style.color="var(--text)"}
            onMouseLeave={e=>e.currentTarget.style.color="var(--text-3)"}
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ flex:1, overflowY:"auto", padding:"20px" }}>
          {loading ? (
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"60px 0",gap:"12px"}}>
              <div className="vmb-loading__ring" style={{width:28,height:28}}/>
              <span style={{fontFamily:"var(--font-c)",fontSize:"11px",letterSpacing:"2px",color:"var(--text-3)"}}>CARGANDO</span>
            </div>
          ) : !data ? (
            <div style={{textAlign:"center",padding:"40px 0",fontFamily:"var(--font-c)",fontSize:"11px",letterSpacing:"2px",color:"var(--text-3)"}}>
              No se pudo cargar la información del pedido
            </div>
          ) : (
            <>
              {/* Rider banner */}
              {enCamino && (
                <div style={{
                  display:"flex",alignItems:"center",gap:"14px",
                  padding:"14px 20px", borderRadius:"var(--r-m)",
                  background:"rgba(16,185,129,.08)", border:"1px solid rgba(16,185,129,.35)",
                  marginBottom:"20px",
                }}>
                  <span style={{fontSize:"26px",animation:"bounce2 .75s infinite",display:"inline-flex"}}><Bike size={26} /></span>
                  <div>
                    <div style={{fontFamily:"var(--font-d)",fontSize:"18px",letterSpacing:"2px",color:"var(--green)",textTransform:"uppercase"}}>
                      ¡Tu pedido está en camino!
                    </div>
                    <div style={{fontFamily:"var(--font-c)",fontSize:"11px",letterSpacing:"1px",color:"var(--text-3)",marginTop:"2px"}}>
                      <strong style={{color:"var(--text)"}}>{tracking.nombre_empleado}</strong> está llevando tu pedido
                    </div>
                  </div>
                </div>
              )}

              <div style={{display:"grid",gap:"20px",gridTemplateColumns:"1fr 1fr"}}>
                {/* Timeline */}
                <div style={{
                  background:"var(--bg)", borderRadius:"var(--r-s)",
                  border:"1px solid var(--border)", padding:"18px",
                  gridColumn: envio ? "1" : "1/-1",
                }}>
                  <div style={{
                    fontFamily:"var(--font-d)",fontSize:"13px",letterSpacing:"2px",
                    color:"var(--blue-bright)",textTransform:"uppercase",marginBottom:"14px",
                    display:"flex",alignItems:"center",justifyContent:"space-between",
                  }}>
                    <span>Estado del Envío</span>
                    {envio && <BadgeT estado={envio.estado} size="sm"/>}
                  </div>
                  <Timeline envio={envio}/>
                </div>

                {/* Tracking details */}
                {envio && (
                  <div style={{
                    background:"var(--bg)", borderRadius:"var(--r-s)",
                    border:"1px solid var(--border)", padding:"18px",
                  }}>
                    <div style={{
                      fontFamily:"var(--font-d)",fontSize:"13px",letterSpacing:"2px",
                      color:"var(--blue-bright)",textTransform:"uppercase",marginBottom:"14px",
                    }}>
                      Datos de Envío
                    </div>
                    <Row label="Guía aérea" value={envio.guia_aerea} mono color="var(--blue-bright)"/>
                    <Row label="Aerolínea"  value={envio.aerolinea}/>
                    <Row label="Peso total" value={envio.peso_total ? `${envio.peso_total} kg` : null}/>
                    {envio.observaciones && (
                      <div style={{background:"var(--blue-soft)",borderRadius:"var(--r-s)",
                        padding:"8px 12px",marginTop:"8px",
                        fontFamily:"var(--font-c)",fontSize:"11px",color:"var(--text-3)",
                        border:"1px solid var(--border-blue)",letterSpacing:"0.5px"}}>
                        {envio.observaciones}
                      </div>
                    )}
                    {envio.nombre_deposito && (
                      <div style={{
                        background:"var(--blue-soft)", border:"1px solid var(--border-blue)",
                        borderRadius:"var(--r-s)", padding:"14px", marginTop:"16px",
                      }}>
                        <div style={{fontFamily:"var(--font-d)",fontSize:"13px",letterSpacing:"2px",
                          color:"var(--blue-bright)",textTransform:"uppercase",marginBottom:"8px",
                          display:"flex",alignItems:"center",gap:"6px"}}>
                          <Building2 size={16} /> Depósito Miami
                        </div>
                        <div style={{fontSize:"13px",fontWeight:"600",color:"var(--text)"}}>{envio.nombre_deposito}</div>
                        <div style={{fontFamily:"var(--font-c)",fontSize:"11px",letterSpacing:"1px",
                          color:"var(--text-3)",marginTop:"2px",textTransform:"uppercase"}}>{envio.dir_deposito}</div>
                        {envio.tel_deposito && <div style={{fontFamily:"var(--font-c)",fontSize:"11px",letterSpacing:"1px",
                          color:"var(--text-3)",marginTop:"2px",textTransform:"uppercase"}}>
                          <Phone size={12} /> {envio.tel_deposito}
                        </div>}
                        {envio.contacto_deposito && <div style={{fontFamily:"var(--font-c)",fontSize:"11px",letterSpacing:"1px",
                          color:"var(--text-3)",marginTop:"2px",textTransform:"uppercase"}}>
                          <User size={12} /> {envio.contacto_deposito}
                        </div>}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Products summary */}
              {detalles.length > 0 && (
                <div style={{
                  background:"var(--bg)", borderRadius:"var(--r-s)",
                  border:"1px solid var(--border)", padding:"18px", marginTop:"20px",
                }}>
                  <div style={{
                    fontFamily:"var(--font-d)",fontSize:"13px",letterSpacing:"2px",
                    color:"var(--blue-bright)",textTransform:"uppercase",marginBottom:"12px",
                    display:"flex",alignItems:"center",justifyContent:"space-between",
                  }}>
                    <span>Productos</span>
                    <span style={{fontFamily:"var(--font-c)",fontSize:"10px",letterSpacing:"2px",color:"var(--text-3)"}}>
                      {detalles.length} ítem{detalles.length!==1?"s":""}
                    </span>
                  </div>
                  {detalles.slice(0,3).map((d,i)=>(
                    <div key={i} style={{
                      display:"flex",gap:"10px",alignItems:"center",
                      padding:"8px 0",borderTop: i>0 ? "1px solid var(--border)" : "none"
                    }}>
                      {d.imagen_url
                        ? <img src={d.imagen_url} alt={d.nombre} style={{width:40,height:40,borderRadius:"var(--r-s)",objectFit:"cover",border:"1px solid var(--border-blue)",background:"var(--bg-3)",flexShrink:0}}
                            onError={e=>{e.target.style.display="none";}}/>
                        : <div style={{width:40,height:40,borderRadius:"var(--r-s)",border:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Package size={18} /></div>
                      }
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:"13px",fontWeight:"600",color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                          {d.nombre||"Producto"}
                        </div>
                        <div style={{fontFamily:"var(--font-c)",fontSize:"10px",letterSpacing:"1px",color:"var(--text-3)",textTransform:"uppercase"}}>
                          ×{d.cantidad} · {formatPrice(d.precio)} c/u
                        </div>
                      </div>
                    </div>
                  ))}
                  {detalles.length > 3 && (
                    <div style={{textAlign:"center",marginTop:"10px",fontFamily:"var(--font-c)",fontSize:"10px",letterSpacing:"2px",color:"var(--text-3)"}}>
                      +{detalles.length - 3} producto{detalles.length-3!==1?"s":""} más
                    </div>
                  )}
                </div>
              )}

              {/* Map */}
              <div style={{
                background:"var(--bg)", borderRadius:"var(--r-s)",
                border:"1px solid var(--border)", padding:"18px", marginTop:"20px",
              }}>
                <div style={{
                  fontFamily:"var(--font-d)",fontSize:"13px",letterSpacing:"2px",
                  color:"var(--blue-bright)",textTransform:"uppercase",marginBottom:"12px",
                }}>
                  {enCamino ? "Seguimiento Live" : "Mapa de Entrega"}
                </div>
                {tieneUbic
                  ? <MapaLeaflet lat={ubicacion.latitud} lng={ubicacion.longitud}
                      tracking={tracking} readOnly={true}/>
                  : (
                    <div style={{
                      height:"220px", display:"flex", flexDirection:"column",
                      alignItems:"center", justifyContent:"center", gap:"14px",
                      background:"var(--blue-soft)", borderRadius:"var(--r-s)",
                      border:"1px dashed var(--border-blue)",
                    }}>
                      <span style={{fontSize:"36px",opacity:.3}}><MapPin size={36} /></span>
                      <span style={{fontFamily:"var(--font-c)",fontSize:"11px",letterSpacing:"2px",color:"var(--text-3)",textTransform:"uppercase",textAlign:"center"}}>
                        Sin ubicación de entrega registrada
                      </span>
                    </div>
                  )
                }
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const FILTROS = ["todos","sin_pago","pagado","enviado","en_camino","entregado"];

export default function MisPedidos() {
  const { theme } = useTheme();
  const router = useRouter();
  const { formatPrice, formatPriceUSD, formatPriceBOB, tipoCambio } = useClienteMoneda();
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState("");
  const [pedidos, setPedidos] = useState([]);
  const [load,    setLoad]    = useState(true);
  const [filtro,  setFiltro]  = useState("todos");
  const [toast,   setToast]   = useState({ msg:"", ok:true });
  const [segId,   setSegId]   = useState(null);

  const showToast = (msg, ok=true) => {
    setToast({msg,ok});
    setTimeout(()=>setToast({msg:""}),3500);
  };

  useEffect(()=>{
    const u = JSON.parse(sessionStorage.getItem("user")||"null");
    const t = document.cookie.split(";").find(c=>c.trim().startsWith("access_token="))?.split("=")[1];
    if(!t||!u) return router.push("/login");
    setUser(u); setToken(t);
    fetch(`${API}/cliente/pedidos`,{ headers:{ Authorization:`Bearer ${t}` }})
      .then(r=>{ if(!r.ok) throw new Error(); return r.json(); })
      .then(d=>{ setPedidos(d.pedidos||[]); setLoad(false); })
      .catch(()=>{ setLoad(false); router.push("/login"); });
  },[router]);

  async function marcarEntregado(idPedido) {
    if (!confirm("¿Confirmas que recibiste el pedido?")) return;
    const r = await fetch(`${API}/cliente/pedidos/${idPedido}/marcar-entregado`,{
      method:"POST", headers:{ Authorization:`Bearer ${token}` }});
    const d = await r.json();
    if (d.success) {
      showToast("Pedido confirmado como entregado", true);
      setPedidos(prev => prev.map(p =>
        p.id_pedido===idPedido ? {...p, estado_entrega:"entregado"} : p
      ));
    } else {
      showToast(d.detail||"Error", false);
    }
  }

  const lista = filtro==="todos"
    ? pedidos
    : pedidos.filter(p => p.estado_pago===filtro || p.estado===filtro || p.estado_entrega===filtro);

  if (load) return (
    <div className={`vmb-loading ${theme}`}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div className="vmb-loading__ring"/>
      <span className="vmb-loading__text">CARGANDO</span>
    </div>
  );

  return (
    <div className={`vmb-root ${theme}`}>
      <style>{`
        /* ── Pedidos-specific styles ── */
        .ped-main {
          flex:1; overflow-y:auto; overflow-x:hidden;
          background:var(--bg);
        }

        /* Hero banner */
        .ped-hero {
          padding:48px 52px 40px;
          background:linear-gradient(150deg,var(--bg-3) 0%,var(--bg) 100%);
          border-bottom:1px solid var(--border);
          position:relative; overflow:hidden; z-index:1;
        }
        .ped-hero::after {
          content:''; position:absolute; top:-80px; right:-80px;
          width:360px; height:360px;
          background:radial-gradient(circle,rgba(37,99,235,.14) 0%,transparent 70%);
          pointer-events:none;
        }
        .ped-hero::before {
          content:''; position:absolute; left:52px; top:0; bottom:0; width:1px;
          background:linear-gradient(to bottom,transparent,var(--blue-glow),transparent);
          opacity:.35;
        }
        .ped-hero__inner {
          display:flex; align-items:flex-end; justify-content:space-between;
          gap:24px; flex-wrap:wrap; padding-left:28px; position:relative; z-index:1;
        }
        .ped-hero__eyebrow {
          display:flex; align-items:center; gap:10px; margin-bottom:12px;
        }
        .ped-hero__tag {
          font-family:var(--font-c); font-size:10px; font-weight:600;
          letter-spacing:3px; text-transform:uppercase;
          color:var(--blue-bright); background:var(--blue-soft);
          border:1px solid var(--border-blue);
          padding:4px 12px; border-radius:999px;
        }
        .ped-hero__title {
          font-family:var(--font-d);
          font-size:clamp(48px,5.5vw,82px);
          line-height:.9; letter-spacing:3px;
          color:var(--text); text-transform:uppercase;
        }
        .ped-hero__title span { color:var(--blue-bright); }
        .ped-hero__sub {
          font-family:var(--font-c); font-size:12px; font-weight:400;
          letter-spacing:3px; color:var(--text-3); margin-top:10px;
          text-transform:uppercase;
        }

        /* Filtros */
        .ped-filters {
          display:flex; gap:8px; flex-wrap:wrap;
          padding:28px 52px 0;
        }
        .ped-filter-btn {
          padding:8px 20px; border-radius:999px; cursor:pointer;
          font-family:var(--font-c); font-weight:700; font-size:10px;
          letter-spacing:2px; text-transform:uppercase;
          transition:all .22s var(--ease);
        }
        .ped-filter-btn--on {
          background:var(--blue); color:#fff; border:1px solid var(--blue);
          box-shadow:0 0 0 3px var(--blue-soft);
        }
        .ped-filter-btn--off {
          background:transparent; color:var(--text-3);
          border:1px solid var(--border-blue);
        }
        .ped-filter-btn--off:hover { border-color:var(--blue); color:var(--blue-bright); }

        /* Grid */
        .ped-grid {
          display:grid;
          grid-template-columns:repeat(auto-fill,minmax(340px,1fr));
          gap:16px;
          padding:24px 52px 60px;
        }

        /* Card */
        .ped-card {
          background:var(--card); border-radius:var(--r-l);
          border:1px solid var(--border);
          display:flex; flex-direction:column;
          transition:all .32s var(--ease);
          overflow:hidden;
        }
        .ped-card:hover {
          border-color:var(--border-blue);
          transform:translateY(-6px);
          box-shadow:0 24px 52px rgba(0,0,0,.5),0 0 0 1px var(--border-blue);
          background:var(--card-hover);
        }
        .vmb-root.light .ped-card:hover {
          box-shadow:0 10px 28px rgba(37,99,235,.1),0 0 0 1px var(--border-blue);
        }

        /* Card header */
        .ped-card__head {
          padding:14px 18px;
          background:var(--bg-3);
          border-bottom:2px solid var(--blue);
          display:flex; justify-content:space-between; align-items:center;
          gap:8px; flex-wrap:wrap;
        }
        .ped-card__id {
          font-family:var(--font-d); font-size:22px; letter-spacing:2px;
          color:var(--blue-bright);
        }
        .ped-card__badges { display:flex; gap:6px; flex-wrap:wrap; }

        /* Card body */
        .ped-card__body { padding:16px 18px; flex:1; }
        .ped-card__meta {
          display:flex; justify-content:space-between; align-items:center;
          margin-bottom:14px;
        }
        .ped-card__date {
          font-family:var(--font-c); font-size:11px; letter-spacing:1px;
          color:var(--text-3); text-transform:uppercase;
        }
        .ped-card__total {
          font-family:var(--font-d); font-size:26px; letter-spacing:2px;
          color:var(--green);
        }
        .ped-card__details {
          background:var(--blue-soft); border-radius:var(--r-s);
          border:1px solid var(--border-blue);
          padding:10px 14px;
          display:flex; flex-direction:column; gap:6px;
        }
        .ped-detail-row {
          display:flex; justify-content:space-between; align-items:center;
        }
        .ped-detail-k {
          font-family:var(--font-c); font-size:10px; letter-spacing:1.5px;
          text-transform:uppercase; color:var(--text-3);
        }
        .ped-detail-v {
          font-family:var(--font-c); font-size:11px; letter-spacing:1px;
          color:var(--text); font-weight:700;
        }

        /* Alertas inline */
        .ped-alert {
          display:flex; align-items:center; gap:8px;
          border-radius:var(--r-s); padding:9px 12px; margin-top:12px;
          font-family:var(--font-c); font-size:10px; font-weight:600;
          letter-spacing:1.5px; text-transform:uppercase;
        }
        .ped-alert--red   { background:rgba(239,68,68,.08);   border:1px solid rgba(239,68,68,.25);  color:#fca5a5; }
        .ped-alert--amber { background:rgba(245,158,11,.08);  border:1px solid rgba(245,158,11,.25); color:#fcd34d; }
        .ped-alert--green { background:rgba(16,185,129,.08);  border:1px solid rgba(16,185,129,.25); color:#6ee7b7; }

        /* Card footer */
        .ped-card__foot {
          padding:12px 18px;
          border-top:1px solid var(--border);
          display:flex; gap:8px; flex-wrap:wrap;
        }
        .ped-foot-btn {
          flex:1; padding:10px 8px; border:none; border-radius:var(--r-s);
          cursor:pointer; font-family:var(--font-c); font-weight:700;
          font-size:10px; letter-spacing:2px; text-transform:uppercase;
          transition:all .22s var(--ease);
        }
        .ped-foot-btn--red    { background:var(--red);   color:#fff; }
        .ped-foot-btn--amber  { background:var(--amber); color:#000; }
        .ped-foot-btn--green  { background:var(--green); color:#fff; }
        .ped-foot-btn--ghost  {
          flex:unset; padding:10px 16px;
          background:transparent; border:1px solid var(--border-blue);
          color:var(--blue-bright);
        }
        .ped-foot-btn:hover { filter:brightness(1.12); transform:translateY(-1px); }

        /* Empty state */
        .ped-empty {
          grid-column:1/-1;
          display:flex; flex-direction:column; align-items:center;
          gap:14px; padding:80px 20px;
        }
        .ped-empty__ico { font-size:52px; opacity:.2; }
        .ped-empty__title {
          font-family:var(--font-d); font-size:28px; letter-spacing:4px;
          color:var(--text); text-transform:uppercase;
        }
        .ped-empty__sub {
          font-family:var(--font-c); font-size:11px; letter-spacing:2px;
          color:var(--text-3); text-transform:uppercase;
        }

        /* Toast */
        .ped-toast {
          position:fixed; top:24px; right:24px;
          padding:13px 22px; border-radius:var(--r-s); z-index:9999;
          font-family:var(--font-c); font-weight:700; font-size:11px;
          letter-spacing:2px; text-transform:uppercase;
          box-shadow:0 8px 32px rgba(0,0,0,.35);
          animation:slideRight .4s var(--spring);
        }

        /* Bounce rider */
        @keyframes bounce2{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}

        @media(max-width:960px){
          .ped-hero{padding:36px 24px 32px}
          .ped-hero::before{left:24px}
          .ped-hero__inner{padding-left:12px}
          .ped-filters,.ped-grid{padding-left:24px;padding-right:24px}
        }
        @media(max-width:600px){
          .ped-hero__title{font-size:44px}
          .ped-grid{grid-template-columns:1fr}
        }
      `}</style>

      <ClienteSidebar user={user}/>

      <main className="ped-main">

        {/* Toast */}
        {toast.msg && (
          <div className="ped-toast" style={{
            background: toast.ok ? "var(--green)" : "var(--red)", color:"#fff"
          }}>
            {toast.msg}
          </div>
        )}

        {/* Hero */}
        <header className="ped-hero">
          <div className="ped-hero__inner">
            <div>
              <div className="ped-hero__eyebrow">
                <span className="ped-hero__tag">Área de cliente</span>
              </div>
              <h1 className="ped-hero__title">
                Mis <span>Pedidos</span>
              </h1>
              <p className="ped-hero__sub">
                {pedidos.length} pedido{pedidos.length!==1?"s":""} en total
              </p>
            </div>
            <button className="btn btn-pri" onClick={()=>router.push("/cliente/tienda")}>
              Ir a la Tienda →
            </button>
          </div>
        </header>

        {/* Filtros */}
        <div className="ped-filters">
          {FILTROS.map(f=>(
            <button
              key={f}
              className={`ped-filter-btn ${filtro===f?"ped-filter-btn--on":"ped-filter-btn--off"}`}
              onClick={()=>setFiltro(f)}
            >
              {f==="todos" ? "Todos" : (BADGE_CFG[f]?.txt || f)}
              {" "}
              ({f==="todos"
                ? pedidos.length
                : pedidos.filter(p=>p.estado_pago===f||p.estado===f||p.estado_entrega===f).length
              })
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="ped-grid">

          {lista.length===0 && (
            <div className="ped-empty">
              <span className="ped-empty__ico"><Package size={52} /></span>
              <h3 className="ped-empty__title">
                {filtro==="todos" ? "Sin pedidos aún" : "Sin resultados"}
              </h3>
              <p className="ped-empty__sub">
                {filtro==="todos"
                  ? "Explora la tienda y haz tu primer pedido"
                  : "Prueba con otro filtro"}
              </p>
              {filtro==="todos" && (
                <button className="btn btn-pri" style={{marginTop:8}} onClick={()=>router.push("/cliente/tienda")}>
                  Ver Tienda
                </button>
              )}
            </div>
          )}

          {lista.map(p=>{
            const estaPagado = p.estado==="pagado"||p.estado_pago==="pagado"||p.estado_pago==="confirmado";
            const tieneUbic  = !!p.direccion_entrega;
            const puedeConf  = p.estado_entrega==="en_destino";
            const enCamino   = p.estado_entrega==="enviado"||p.estado_entrega==="en_camino";

            return (
              <div key={p.id_pedido} className="ped-card">

                {/* Header */}
                <div className="ped-card__head">
                  <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                    <span className="ped-card__id">#VM{p.id_pedido}</span>
                    {enCamino && (
                      <span style={{animation:"bounce2 .7s infinite",display:"inline-flex",alignItems:"center"}}><Bike size={18} /></span>
                    )}
                  </div>
                  <div className="ped-card__badges">
                    <Badge estado={p.estado_pago} size="sm"/>
                    {p.estado_entrega && p.estado_entrega!=="pendiente" &&
                      <Badge estado={p.estado_entrega} size="sm"/>}
                  </div>
                </div>

                {/* Body */}
                <div className="ped-card__body">
                  <div className="ped-card__meta">
                    <span className="ped-card__date"><Calendar size={14} /> {fDate(p.fecha)}</span>
                    <span className="ped-card__total">{formatPriceUSD(p.total)}
                      <span style={{fontSize:"11px",fontWeight:"400",fontFamily:"var(--font-c)",letterSpacing:"1px",color:"var(--text-3)",display:"block",marginTop:"2px"}}>{formatPriceBOB(p.total)} · TC {tipoCambio}</span></span>
                  </div>

                  <div className="ped-card__details">
                    {p.tipo_pedido && (
                      <div className="ped-detail-row">
                        <span className="ped-detail-k">Tipo</span>
                        <span className="ped-detail-v">
                          {p.tipo_pedido==="importacion" ? <><Globe size={14} /> Importación</> : <><Home size={14} /> Local</>}
                        </span>
                      </div>
                    )}
                    {p.fecha_pago && (
                      <div className="ped-detail-row">
                        <span className="ped-detail-k">Pago</span>
                        <span className="ped-detail-v" style={{color:"var(--green)"}}>
                          {fDate(p.fecha_pago)}
                        </span>
                      </div>
                    )}
                    {tieneUbic && (
                      <div className="ped-detail-row">
                        <span className="ped-detail-k"><MapPin size={14} /></span>
                        <span className="ped-detail-v" style={{
                          overflow:"hidden",textOverflow:"ellipsis",
                          whiteSpace:"nowrap",maxWidth:"200px",textAlign:"right"
                        }}>
                          {p.direccion_entrega}
                        </span>
                      </div>
                    )}
                  </div>

                  {!estaPagado && (
                    <div className="ped-alert ped-alert--red">
                      <span><AlertTriangle size={14} /></span> Requiere pago para continuar
                    </div>
                  )}
                  {estaPagado && !tieneUbic && (
                    <div className="ped-alert ped-alert--amber">
                      <span><MapPin size={14} /></span> Falta establecer ubicación de entrega
                    </div>
                  )}
                  {puedeConf && (
                    <div className="ped-alert ped-alert--green">
                      <span><CheckCircle size={14} /></span> ¡Tu pedido llegó! Confirma la recepción
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="ped-card__foot">
                  {!estaPagado && (
                    <button className="ped-foot-btn ped-foot-btn--red"
                      onClick={()=>router.push("/cliente/carrito")}>
                      <CreditCard size={14} /> Pagar ahora
                    </button>
                  )}
                  {estaPagado && !tieneUbic && (
                    <button className="ped-foot-btn ped-foot-btn--amber"
                      onClick={()=>router.push(`/cliente/pedidos/${p.id_pedido}`)}>
                      <MapPin size={14} /> Establecer Ubicación
                    </button>
                  )}
                  {puedeConf && (
                    <button className="ped-foot-btn ped-foot-btn--green"
                      onClick={()=>marcarEntregado(p.id_pedido)}>
                      <CheckCircle size={14} /> Confirmar Recepción
                    </button>
                  )}
                  {p.estado_entrega && p.estado_entrega!=="pendiente" && p.estado_entrega!=="cancelado" && (
                    <button className="ped-foot-btn ped-foot-btn--ghost"
                      onClick={()=>setSegId(p.id_pedido)}>
                      <Plane size={14} /> Ver Seguimiento
                    </button>
                  )}
                  <button className="ped-foot-btn ped-foot-btn--ghost"
                    onClick={()=>router.push(`/cliente/pedidos/${p.id_pedido}`)}>
                    Ver Detalle →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {segId && (
        <ModalSeguimiento idPedido={segId} token={token}
          onClose={()=>setSegId(null)}/>
      )}
    </div>
  );
}