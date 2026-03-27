"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ClienteSidebar from "@/components/ClienteSidebar";

const API = "http://localhost:8000";

const C = {
  pageBg:"#121418", cardBg:"#1f2429", accent:"#2563eb", accent2:"#3b82f6",
  text:"#d9d9d9", muted:"#a0a0a0", success:"#10b981", warning:"#f59e0b",
  danger:"#ef4444", indigo:"#6366f1",
};

const fmt   = n => `$${parseFloat(n||0).toFixed(2)}`;
const fDate = iso => iso
  ? new Date(iso).toLocaleDateString("es-BO",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})
  : "—";

const BADGE_CFG = {
  sin_pago:   { bg:C.danger,  col:"#fff", txt:"Sin pago"   },
  pendiente:  { bg:C.warning, col:"#000", txt:"Pendiente"  },
  pagado:     { bg:C.accent,  col:"#fff", txt:"Pagado"     },
  confirmado: { bg:C.success, col:"#fff", txt:"Confirmado" },
  enviado:    { bg:C.indigo,  col:"#fff", txt:"Enviado"    },
  en_camino:  { bg:C.success, col:"#fff", txt:"En camino"  },
  entregado:  { bg:"#059669", col:"#fff", txt:"Entregado"  },
  cancelado:  { bg:"#6b7280", col:"#fff", txt:"Cancelado"  },
  en_destino: { bg:C.success, col:"#fff", txt:"En destino" },
};

function Badge({ estado, size="normal" }) {
  const b = BADGE_CFG[estado] || { bg:"#444", col:"#fff", txt: estado };
  return (
    <span style={{
      background:b.bg, color:b.col,
      padding: size==="sm" ? "2px 8px" : "4px 12px",
      borderRadius:"12px",
      fontSize: size==="sm" ? "10px" : "11px",
      fontWeight:"700", whiteSpace:"nowrap",
    }}>
      {b.txt || (estado||"").replace(/_/g," ").toUpperCase()}
    </span>
  );
}

const FILTROS = ["todos","sin_pago","pagado","enviado","entregado"];

export default function MisPedidos() {
  const router = useRouter();
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState("");
  const [pedidos, setPedidos] = useState([]);
  const [load,    setLoad]    = useState(true);
  const [filtro,  setFiltro]  = useState("todos");
  const [toast,   setToast]   = useState({ msg:"", color:C.success });

  const showToast = (msg, color=C.success) => {
    setToast({msg,color});
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
      showToast("✅ Pedido confirmado como entregado");
      setPedidos(prev => prev.map(p =>
        p.id_pedido===idPedido ? {...p, estado_entrega:"entregado"} : p
      ));
    } else {
      showToast(d.detail||"Error", C.danger);
    }
  }

  const lista = filtro==="todos"
    ? pedidos
    : pedidos.filter(p => p.estado_pago===filtro || p.estado===filtro || p.estado_entrega===filtro);

  if (load) return (
    <div style={{minHeight:"100vh",background:C.pageBg,display:"flex",
      alignItems:"center",justifyContent:"center",flexDirection:"column",gap:"16px"}}>
      <div style={{width:"44px",height:"44px",border:`4px solid rgba(37,99,235,0.2)`,
        borderTop:`4px solid ${C.accent}`,borderRadius:"50%",animation:"spin 0.9s linear infinite"}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{color:C.muted,fontFamily:"Cinzel,serif",fontSize:"13px"}}>Cargando pedidos…</div>
    </div>
  );

  return (
    <div style={{height:"100vh",background:C.pageBg,display:"flex",overflow:"hidden"}}>
      <ClienteSidebar user={user}/>

      <main style={{flex:1,padding:"28px",overflowY:"auto",overflowX:"hidden"}}>

        {/* Toast */}
        {toast.msg && (
          <div style={{position:"fixed",top:20,right:20,background:toast.color,color:"#fff",
            padding:"12px 22px",borderRadius:"8px",zIndex:9999,fontWeight:"700",
            boxShadow:"0 4px 16px rgba(0,0,0,0.5)"}}>
            {toast.msg}
          </div>
        )}

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
          marginBottom:"24px",borderBottom:`2px solid ${C.accent}`,paddingBottom:"18px",
          flexWrap:"wrap",gap:"12px"}}>
          <div>
            <h1 style={{margin:0,fontFamily:"Cinzel,serif",color:C.accent2,fontSize:"22px"}}>
              📦 Mis Pedidos
            </h1>
            <p style={{margin:"4px 0 0",color:C.muted,fontSize:"13px"}}>
              {pedidos.length} pedido{pedidos.length!==1?"s":""} en total
            </p>
          </div>
          <button onClick={()=>router.push("/cliente/tienda")} style={{
            background:`linear-gradient(135deg,${C.accent},${C.accent2})`,
            border:"none",color:"#fff",padding:"10px 20px",borderRadius:"8px",
            cursor:"pointer",fontWeight:"700",fontSize:"13px",
            boxShadow:`0 2px 10px rgba(37,99,235,0.35)`,
          }}>🛍️ Ir a la Tienda</button>
        </div>

        {/* Filtros */}
        <div style={{display:"flex",gap:"8px",flexWrap:"wrap",marginBottom:"24px"}}>
          {FILTROS.map(f=>(
            <button key={f} onClick={()=>setFiltro(f)} style={{
              padding:"6px 16px",borderRadius:"20px",cursor:"pointer",
              fontWeight:"600",fontSize:"12px",transition:"all 0.2s",
              border: filtro===f ? "none" : `1px solid rgba(37,99,235,0.3)`,
              background: filtro===f
                ? `linear-gradient(135deg,${C.accent},${C.accent2})`
                : "transparent",
              color: filtro===f ? "#fff" : C.muted,
            }}>
              {f==="todos" ? "Todos" : (BADGE_CFG[f]?.txt || f)}
              {f==="todos"
                ? ` (${pedidos.length})`
                : ` (${pedidos.filter(p=>p.estado_pago===f||p.estado===f||p.estado_entrega===f).length})`
              }
            </button>
          ))}
        </div>

        {/* Sin pedidos */}
        {lista.length===0 && (
          <div style={{background:C.cardBg,borderRadius:"12px",padding:"60px 20px",
            textAlign:"center",border:`1px solid rgba(37,99,235,0.1)`}}>
            <div style={{fontSize:"48px",marginBottom:"16px"}}>📭</div>
            <h3 style={{color:C.text,marginBottom:"8px"}}>
              {filtro==="todos" ? "No tienes pedidos aún" : "No hay pedidos con este filtro"}
            </h3>
            <p style={{color:C.muted,marginBottom:"24px",fontSize:"14px"}}>
              {filtro==="todos"
                ? "¡Explora nuestra tienda y haz tu primer pedido!"
                : "Prueba con otro filtro."}
            </p>
            {filtro==="todos" && (
              <button onClick={()=>router.push("/cliente/tienda")} style={{
                background:`linear-gradient(135deg,${C.accent},${C.accent2})`,
                border:"none",color:"#fff",padding:"12px 28px",borderRadius:"8px",
                cursor:"pointer",fontWeight:"700",fontSize:"14px"}}>
                🛍️ Ver Tienda
              </button>
            )}
          </div>
        )}

        {/* Grid de tarjetas */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",gap:"18px"}}>
          {lista.map(p=>{
            const estaPagado  = p.estado==="pagado" || p.estado_pago==="pagado" || p.estado_pago==="confirmado";
            const tieneUbic   = !!p.direccion_entrega;
            const puedeConf   = p.estado_entrega==="en_destino";
            const enCamino    = p.estado_entrega==="enviado" || p.estado_entrega==="en_camino";

            return (
              <div key={p.id_pedido} style={{
                background:C.cardBg,borderRadius:"12px",
                border:`1px solid rgba(37,99,235,0.12)`,
                boxShadow:"0 4px 15px rgba(0,0,0,0.1)",
                overflow:"hidden",display:"flex",flexDirection:"column",
              }}>
                {/* Header tarjeta */}
                <div style={{padding:"14px 18px",borderBottom:`2px solid ${C.accent}`,
                  background:C.pageBg,display:"flex",justifyContent:"space-between",
                  alignItems:"center",gap:"8px",flexWrap:"wrap"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                    <span style={{color:C.accent2,fontFamily:"Cinzel,serif",
                      fontWeight:"700",fontSize:"15px"}}>
                      #VM{p.id_pedido}
                    </span>
                    {enCamino && (
                      <span style={{animation:"bounce2 0.7s infinite",fontSize:"16px"}}>🚴</span>
                    )}
                  </div>
                  <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
                    <Badge estado={p.estado_pago} size="sm"/>
                    {p.estado_entrega && p.estado_entrega!=="pendiente" &&
                      <Badge estado={p.estado_entrega} size="sm"/>}
                  </div>
                </div>

                {/* Body tarjeta */}
                <div style={{padding:"16px 18px",flex:1}}>
                  {/* Fecha + total */}
                  <div style={{display:"flex",justifyContent:"space-between",
                    alignItems:"center",marginBottom:"12px"}}>
                    <div style={{color:C.muted,fontSize:"12px"}}>
                      📅 {fDate(p.fecha)}
                    </div>
                    <strong style={{color:C.success,fontSize:"18px"}}>{fmt(p.total)}</strong>
                  </div>

                  {/* Detalles rápidos */}
                  <div style={{display:"flex",flexDirection:"column",gap:"6px",
                    background:`rgba(37,99,235,0.04)`,borderRadius:"8px",padding:"10px 12px",
                    border:`1px solid rgba(37,99,235,0.08)`}}>
                    {p.tipo_pedido && (
                      <div style={{display:"flex",justifyContent:"space-between"}}>
                        <span style={{color:C.muted,fontSize:"11px"}}>Tipo:</span>
                        <span style={{color:C.text,fontSize:"11px",fontWeight:"600"}}>
                          {p.tipo_pedido==="importacion" ? "🌐 Importación" : "🏠 Local"}
                        </span>
                      </div>
                    )}
                    {p.fecha_pago && (
                      <div style={{display:"flex",justifyContent:"space-between"}}>
                        <span style={{color:C.muted,fontSize:"11px"}}>Pago:</span>
                        <span style={{color:C.success,fontSize:"11px",fontWeight:"600"}}>
                          {fDate(p.fecha_pago)}
                        </span>
                      </div>
                    )}
                    {tieneUbic && (
                      <div style={{display:"flex",justifyContent:"space-between",gap:"8px"}}>
                        <span style={{color:C.muted,fontSize:"11px",flexShrink:0}}>📍</span>
                        <span style={{color:C.text,fontSize:"11px",textAlign:"right",
                          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                          {p.direccion_entrega}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Alertas inline */}
                  {!estaPagado && (
                    <div style={{marginTop:"10px",background:`rgba(239,68,68,0.08)`,
                      border:`1px solid rgba(239,68,68,0.25)`,borderRadius:"6px",
                      padding:"8px 10px",display:"flex",alignItems:"center",gap:"6px"}}>
                      <span style={{fontSize:"13px"}}>⚠️</span>
                      <span style={{color:"#fca5a5",fontSize:"11px"}}>Requiere pago para continuar</span>
                    </div>
                  )}
                  {estaPagado && !tieneUbic && (
                    <div style={{marginTop:"10px",background:`rgba(245,158,11,0.08)`,
                      border:`1px solid rgba(245,158,11,0.25)`,borderRadius:"6px",
                      padding:"8px 10px",display:"flex",alignItems:"center",gap:"6px"}}>
                      <span style={{fontSize:"13px"}}>📍</span>
                      <span style={{color:"#fcd34d",fontSize:"11px"}}>Falta establecer ubicación de entrega</span>
                    </div>
                  )}
                  {puedeConf && (
                    <div style={{marginTop:"10px",background:`rgba(16,185,129,0.08)`,
                      border:`1px solid rgba(16,185,129,0.25)`,borderRadius:"6px",
                      padding:"8px 10px",display:"flex",alignItems:"center",gap:"6px"}}>
                      <span style={{fontSize:"13px"}}>✅</span>
                      <span style={{color:"#6ee7b7",fontSize:"11px"}}>¡Tu pedido llegó! Confirma la recepción</span>
                    </div>
                  )}
                </div>

                {/* Footer con botones */}
                <div style={{padding:"12px 18px",borderTop:`1px solid rgba(37,99,235,0.1)`,
                  display:"flex",gap:"8px",flexWrap:"wrap"}}>

                  {/* Botón principal según estado */}
                  {!estaPagado && (
                    <button onClick={()=>router.push("/cliente/carrito")} style={{
                      flex:1,padding:"8px",background:C.danger,border:"none",
                      color:"#fff",borderRadius:"7px",cursor:"pointer",
                      fontWeight:"700",fontSize:"12px"}}>
                      💳 Pagar ahora
                    </button>
                  )}
                  {estaPagado && !tieneUbic && (
                    <button onClick={()=>router.push(`/cliente/pedidos/${p.id_pedido}`)} style={{
                      flex:1,padding:"8px",background:C.warning,border:"none",
                      color:"#000",borderRadius:"7px",cursor:"pointer",
                      fontWeight:"700",fontSize:"12px"}}>
                      📍 Establecer Ubicación
                    </button>
                  )}
                  {puedeConf && (
                    <button onClick={()=>marcarEntregado(p.id_pedido)} style={{
                      flex:1,padding:"8px",background:C.success,border:"none",
                      color:"#fff",borderRadius:"7px",cursor:"pointer",
                      fontWeight:"700",fontSize:"12px"}}>
                      ✅ Confirmar Recepción
                    </button>
                  )}

                  {/* Ver detalle — siempre visible */}
                  <button onClick={()=>router.push(`/cliente/pedidos/${p.id_pedido}`)} style={{
                    padding:"8px 16px",background:"transparent",
                    border:`1px solid ${C.accent}`,color:C.accent,
                    borderRadius:"7px",cursor:"pointer",fontWeight:"600",fontSize:"12px",
                    whiteSpace:"nowrap",
                  }}>
                    🔍 Ver Detalle
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <style>{`
          @keyframes bounce2{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
        `}</style>
      </main>
    </div>
  );
}