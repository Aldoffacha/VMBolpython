"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ClienteSidebar from "@/components/ClienteSidebar";

const API = "http://localhost:8000";

const C = {
  pageBg:"#121418", cardBg:"#1f2429", accent:"#2563eb", accent2:"#3b82f6",
  text:"#d9d9d9", muted:"#a0a0a0", success:"#10b981", warning:"#f59e0b",
  danger:"#ef4444", indigo:"#6366f1",
};

const fmt = n => `$${parseFloat(n||0).toFixed(2)}`;

const card   = { background:C.cardBg, borderRadius:"10px", border:`1px solid rgba(37,99,235,0.12)`,
  boxShadow:"0 4px 15px rgba(0,0,0,0.1)", overflow:"hidden", marginBottom:"20px" };
const cHead  = { padding:"13px 18px", borderBottom:`2px solid ${C.accent}`, background:C.pageBg,
  display:"flex", alignItems:"center", justifyContent:"space-between" };
const cTitle = { margin:0, color:C.accent2, fontFamily:"Cinzel,serif", fontSize:"14px", fontWeight:"700" };
const cBody  = { padding:"18px" };
const ov     = { position:"fixed", inset:0, background:"rgba(0,0,0,0.78)", display:"flex",
  alignItems:"center", justifyContent:"center", zIndex:9000, padding:"20px" };
const mWrap  = { background:C.cardBg, borderRadius:"12px", width:"100%", maxWidth:"580px",
  border:`2px solid ${C.accent}`, boxShadow:"0 20px 60px rgba(0,0,0,0.6)", overflow:"hidden",
  maxHeight:"92vh", display:"flex", flexDirection:"column" };
const mHead  = { display:"flex", justifyContent:"space-between", alignItems:"center",
  padding:"15px 20px", borderBottom:`2px solid ${C.accent}`, background:C.pageBg, flexShrink:0 };
const mFoot  = { display:"flex", justifyContent:"flex-end", gap:"10px",
  padding:"13px 20px", borderTop:`1px solid rgba(37,99,235,0.15)`, background:C.pageBg, flexShrink:0 };
const mBody  = { padding:"20px", overflowY:"auto", flex:1 };
const btnX   = { background:"transparent", border:"none", color:C.muted, cursor:"pointer", fontSize:"18px" };
const btnPri = { background:C.accent, border:"none", color:"#fff", padding:"10px 24px",
  borderRadius:"8px", cursor:"pointer", fontWeight:"700", fontSize:"13px",
  boxShadow:`0 2px 8px rgba(37,99,235,0.35)` };
const btnSec = { background:"transparent", border:`1px solid #444`, color:C.muted,
  padding:"10px 24px", borderRadius:"8px", cursor:"pointer", fontWeight:"600", fontSize:"13px" };
const btnQty = { background:`rgba(37,99,235,0.1)`, border:`1px solid ${C.accent}`, color:C.accent2,
  width:"30px", height:"30px", borderRadius:"6px", cursor:"pointer", fontWeight:"800",
  fontSize:"15px", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 };
const inp_   = { width:"100%", padding:"9px 12px", background:C.pageBg,
  border:`2px solid rgba(37,99,235,0.18)`, borderRadius:"6px", color:C.text,
  fontSize:"13px", outline:"none", boxSizing:"border-box" };
const lbl_   = { display:"block", color:C.muted, fontSize:"12px", marginBottom:"5px", fontWeight:"600" };

const PLAT = {
  amazon: { bg:C.warning, col:"#000", txt:"Amazon" },
  ebay:   { bg:C.accent2, col:"#fff", txt:"eBay"   },
  local:  { bg:C.success, col:"#fff", txt:"Local"  },
};

function CantidadCtrl({ value, onChange, disabled }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
      <button onClick={()=>onChange(value-1)} disabled={disabled||value<=1}
        style={{ ...btnQty, opacity:disabled||value<=1?0.4:1 }}>−</button>
      <span style={{ color:C.text, fontWeight:"700", fontSize:"15px",
        minWidth:"20px", textAlign:"center" }}>{value}</span>
      <button onClick={()=>onChange(value+1)} disabled={disabled||value>=10}
        style={{ ...btnQty, opacity:disabled||value>=10?0.4:1 }}>+</button>
    </div>
  );
}

function ItemRow({ item, tipo, onCantidad, onEliminar, updating }) {
  const plat = PLAT[item.plataforma||"local"] || PLAT.local;
  const [confirmDel, setConfirmDel] = useState(false);
  const id = tipo==="externo" ? item.id_carrito_externo : item.id_carrito;

  return (
    <div style={{ display:"flex", gap:"14px", padding:"14px 0",
      borderBottom:`1px solid rgba(37,99,235,0.08)`, alignItems:"center",
      flexWrap:"wrap", opacity:updating?0.6:1, transition:"opacity 0.2s" }}>

      <div style={{ width:"60px", height:"60px", borderRadius:"8px", background:"#0d1117",
        overflow:"hidden", flexShrink:0, border:`1px solid rgba(37,99,235,0.15)`,
        display:"flex", alignItems:"center", justifyContent:"center" }}>
        {item.imagen_url
          ? <img src={item.imagen_url} alt={item.nombre}
              style={{ width:"100%", height:"100%", objectFit:"cover" }}
              onError={e=>{e.target.style.display="none";}}/>
          : <span style={{ fontSize:"24px" }}>📦</span>
        }
      </div>

      <div style={{ flex:1, minWidth:"160px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"7px", marginBottom:"4px", flexWrap:"wrap" }}>
          <span style={{ color:C.text, fontSize:"13px", fontWeight:"700" }}>
            {(item.nombre||"").slice(0,48)}{(item.nombre||"").length>48?"...":""}
          </span>
          <span style={{ background:plat.bg, color:plat.col, padding:"2px 7px",
            borderRadius:"8px", fontSize:"10px", fontWeight:"700" }}>{plat.txt}</span>
        </div>
        <div style={{ color:C.muted, fontSize:"11px" }}>
          {item.categoria && `${item.categoria} · `}Precio unitario: {fmt(item.precio)}
        </div>
      </div>

      <CantidadCtrl value={item.cantidad} disabled={updating}
        onChange={qty => onCantidad(id, qty, tipo)} />

      <div style={{ minWidth:"70px", textAlign:"right" }}>
        <div style={{ color:C.success, fontWeight:"800", fontSize:"15px" }}>
          {fmt(parseFloat(item.precio) * item.cantidad)}
        </div>
        <div style={{ color:C.muted, fontSize:"10px" }}>subtotal</div>
      </div>

      <div>
        {confirmDel
          ? <div style={{ display:"flex", gap:"5px" }}>
              <button onClick={()=>{ onEliminar(id,tipo); setConfirmDel(false); }}
                style={{ background:C.danger, border:"none", color:"#fff", padding:"5px 10px",
                  borderRadius:"6px", cursor:"pointer", fontSize:"11px", fontWeight:"700" }}>Sí</button>
              <button onClick={()=>setConfirmDel(false)}
                style={{ background:"transparent", border:`1px solid #444`, color:C.muted,
                  padding:"5px 10px", borderRadius:"6px", cursor:"pointer", fontSize:"11px" }}>No</button>
            </div>
          : <button onClick={()=>setConfirmDel(true)}
              style={{ background:"transparent", border:`1px solid rgba(239,68,68,0.35)`,
                color:"#f87171", padding:"5px 10px", borderRadius:"6px",
                cursor:"pointer", fontSize:"12px" }}>🗑️</button>
        }
      </div>
    </div>
  );
}

// ── Modal Pago ────────────────────────────────────────────────────────────────
function ModalPago({ idPedido, total, token, onClose, onSuccess }) {
  const [infoQR,  setInfoQR]  = useState(null);
  const [archivo, setArchivo] = useState(null);
  const [preview, setPreview] = useState(null);
  const [load,    setLoad]    = useState(false);
  const [error,   setError]   = useState("");

  // Método fijo QR, monto fijo del pedido — no editables
  const metodo = "QR";
  const monto  = total;

  useEffect(()=>{
    fetch(`${API}/cliente/pago/info`,{ headers:{ Authorization:`Bearer ${token}` }})
      .then(r=>r.json()).then(d=>setInfoQR(d))
      .catch(()=>{});
  },[token]);

  function handleFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setArchivo(f);
    if (f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = ev => setPreview(ev.target.result);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  }

  async function enviar() {
    if (!archivo) return setError("Adjunta el comprobante de pago.");
    setLoad(true); setError("");
    const fd = new FormData();
    fd.append("id_pedido", String(idPedido));
    fd.append("metodo", metodo);
    fd.append("monto", String(monto));
    fd.append("comprobante", archivo);
    const r = await fetch(`${API}/cliente/pago/subir`,{
      method:"POST", headers:{ Authorization:`Bearer ${token}` }, body:fd });
    const d = await r.json(); setLoad(false);
    d.success ? onSuccess(d.message) : setError(d.detail||"Error al enviar");
  }

  return (
    <div style={ov}>
      <div style={{...mWrap, maxWidth:"560px"}}>
        <div style={mHead}>
          <h3 style={{margin:0,color:C.accent2,fontFamily:"Cinzel,serif",fontSize:"15px",fontWeight:"700"}}>
            💳 Pagar Pedido #VM{idPedido}
          </h3>
          <button onClick={onClose} style={btnX}>✕</button>
        </div>

        <div style={mBody}>
          {/* Total */}
          <div style={{ background:`rgba(37,99,235,0.07)`, borderRadius:"10px",
            padding:"14px 18px", marginBottom:"20px", textAlign:"center",
            border:`1px solid rgba(37,99,235,0.2)` }}>
            <div style={{ color:C.muted, fontSize:"12px", marginBottom:"4px" }}>Total a pagar</div>
            <div style={{ color:C.success, fontWeight:"800", fontSize:"32px" }}>{fmt(total)}</div>
          </div>

          {/* QR */}
          {infoQR?.qr_url && (
            <div style={{ textAlign:"center", marginBottom:"18px" }}>
              <div style={{ color:C.accent2, fontWeight:"700", fontSize:"13px", marginBottom:"10px" }}>
                📱 Escanea el QR para pagar
              </div>
              <img src={infoQR.qr_url} alt="QR de pago"
                style={{ maxWidth:"200px", borderRadius:"10px",
                  border:`2px solid ${C.accent}`, padding:"8px", background:"#fff" }}
                onError={e=>{e.target.style.display="none";}}/>
              <div style={{ color:C.muted, fontSize:"11px", marginTop:"8px" }}>
                {infoQR.nombre_empresa}
              </div>
            </div>
          )}

          {/* Método — fijo, solo visual */}
          <div style={{ marginBottom:"14px" }}>
            <label style={lbl_}>Método de pago</label>
            <div style={{ ...inp_, display:"flex", alignItems:"center", gap:"8px",
              background:`rgba(16,185,129,0.08)`, border:`2px solid rgba(16,185,129,0.3)`,
              color:C.success, fontWeight:"700", cursor:"default" }}>
              <span style={{ fontSize:"16px" }}>📱</span> Pago QR
            </div>
          </div>

          {/* Monto — fijo, solo visual */}
          <div style={{ marginBottom:"14px" }}>
            <label style={lbl_}>Monto a pagar (USD)</label>
            <div style={{ ...inp_, display:"flex", alignItems:"center", justifyContent:"space-between",
              background:`rgba(16,185,129,0.08)`, border:`2px solid rgba(16,185,129,0.3)`,
              color:C.success, fontWeight:"800", fontSize:"16px", cursor:"default" }}>
              <span>{fmt(total)}</span>
              <span style={{ fontSize:"11px", color:C.muted, fontWeight:"400" }}>monto fijo</span>
            </div>
          </div>

          {/* Comprobante */}
          <div style={{ marginBottom:"14px" }}>
            <label style={lbl_}>Comprobante de pago *</label>
            <label style={{ display:"block", cursor:"pointer" }}>
              <input type="file" accept="image/*,.pdf" style={{ display:"none" }}
                onChange={handleFile}/>
              <div style={{ border:`2px dashed ${archivo?C.accent:"rgba(37,99,235,0.25)"}`,
                borderRadius:"8px", padding:"20px", textAlign:"center",
                background: archivo?`rgba(37,99,235,0.07)`:"transparent",
                transition:"all 0.2s" }}>
                {preview
                  ? <img src={preview} alt="preview"
                      style={{ maxHeight:"140px", maxWidth:"100%", borderRadius:"6px" }}/>
                  : archivo
                  ? <div style={{ color:C.success, fontSize:"13px", fontWeight:"700" }}>
                      📄 {archivo.name}
                    </div>
                  : <div>
                      <div style={{ fontSize:"28px", marginBottom:"6px" }}>📎</div>
                      <div style={{ color:C.muted, fontSize:"12px" }}>
                        Click para adjuntar imagen o PDF del comprobante
                      </div>
                    </div>
                }
              </div>
            </label>
          </div>

          {error && (
            <div style={{ background:`rgba(239,68,68,0.1)`, border:`1px solid rgba(239,68,68,0.3)`,
              borderRadius:"6px", padding:"10px 14px", color:"#fca5a5", fontSize:"12px" }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ background:`rgba(245,158,11,0.07)`, border:`1px solid rgba(245,158,11,0.2)`,
            borderRadius:"6px", padding:"10px 14px", marginTop:"12px",
            color:"#fcd34d", fontSize:"11px", lineHeight:"1.5" }}>
            ℹ️ Tu comprobante será revisado por el equipo de VMBol en Red.
            Recibirás una notificación cuando sea confirmado.
          </div>
        </div>

        <div style={mFoot}>
          <button onClick={onClose} style={btnSec}>Cancelar</button>
          <button onClick={enviar} disabled={load} style={{...btnPri,opacity:load?0.7:1}}>
            {load ? "Enviando…" : "📤 Enviar Comprobante"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── PÁGINA PRINCIPAL ──────────────────────────────────────────────────────────
export default function CarritoPage() {
  const router = useRouter();
  const [user,     setUser]     = useState(null);
  const [token,    setToken]    = useState("");
  const [carrito,  setCarrito]  = useState(null);
  const [load,     setLoad]     = useState(true);
  const [updating, setUpdating] = useState(null);
  const [toast,    setToast]    = useState({ msg:"", color:C.success });
  const [mPago,    setMPago]    = useState(null);
  const [creando,  setCreando]  = useState(false);

  const showToast = (msg, color=C.success) => {
    setToast({msg,color}); setTimeout(()=>setToast({msg:""}),3500);
  };

  const cargar = useCallback(async t => {
    const r = await fetch(`${API}/cliente/carrito`,{headers:{Authorization:`Bearer ${t}`}});
    if (!r.ok) return;
    const d = await r.json();
    setCarrito(d);
    setLoad(false);
  },[]);

  useEffect(()=>{
    const u = JSON.parse(sessionStorage.getItem("user")||"null");
    const t = document.cookie.split(";").find(c=>c.trim().startsWith("access_token="))?.split("=")[1];
    if (!t||!u) return router.push("/login");
    setUser(u); setToken(t);
    cargar(t);
  },[router,cargar]);

  async function cambiarCantidad(id, qty, tipo) {
    if (qty < 1 || qty > 10) return;
    setUpdating(id);
    await fetch(`${API}/cliente/carrito/${id}/cantidad`,{
      method:"PUT",
      headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`},
      body:JSON.stringify({ cantidad:qty, tipo }),
    });
    await cargar(token);
    setUpdating(null);
  }

  async function eliminarItem(id, tipo) {
    setUpdating(id);
    await fetch(`${API}/cliente/carrito/${id}?tipo=${tipo}`,{
      method:"DELETE", headers:{ Authorization:`Bearer ${token}` }});
    await cargar(token);
    setUpdating(null);
    showToast("🗑️ Item eliminado");
  }

  async function vaciarCarrito() {
    if (!confirm("¿Vaciar todo el carrito?")) return;
    await fetch(`${API}/cliente/carrito`,{
      method:"DELETE", headers:{ Authorization:`Bearer ${token}` }});
    await cargar(token);
    showToast("🗑️ Carrito vaciado");
  }

  async function crearPedido() {
    setCreando(true);
    const r = await fetch(`${API}/cliente/pedido/crear`,{
      method:"POST", headers:{ Authorization:`Bearer ${token}` }});
    const d = await r.json();
    setCreando(false);
    if (d.success) {
      setMPago({ id_pedido: d.id_pedido, total: d.total });
    } else {
      showToast(d.detail||"Error al crear pedido", C.danger);
    }
  }

  if (load) return (
    <div style={{height:"100vh",background:C.pageBg,display:"flex",
      alignItems:"center",justifyContent:"center",flexDirection:"column",gap:"16px"}}>
      <div style={{width:"44px",height:"44px",border:`4px solid rgba(37,99,235,0.2)`,
        borderTop:`4px solid ${C.accent}`,borderRadius:"50%",animation:"spin 0.9s linear infinite"}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{color:C.muted,fontFamily:"Cinzel,serif",fontSize:"13px"}}>Cargando carrito…</div>
    </div>
  );

  const items  = [...(carrito?.items_locales||[]), ...(carrito?.items_externos||[])];
  const total  = carrito?.total_monto || 0;
  const nItems = carrito?.total_items || 0;

  return (
    <div style={{height:"100vh",background:C.pageBg,display:"flex",overflow:"hidden"}}>
      <ClienteSidebar user={user} carritoCount={nItems}/>

      <main style={{flex:1,padding:"28px",overflowY:"auto",overflowX:"hidden"}}>

        {toast.msg && (
          <div style={{position:"fixed",top:20,right:20,background:toast.color,color:"#fff",
            padding:"12px 22px",borderRadius:"8px",zIndex:9999,fontWeight:"700",
            boxShadow:"0 4px 16px rgba(0,0,0,0.5)"}}>
            {toast.msg}
          </div>
        )}

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
          marginBottom:"24px",borderBottom:`2px solid ${C.accent}`,paddingBottom:"18px",
          flexWrap:"wrap",gap:"12px"}}>
          <div>
            <h1 style={{margin:0,fontFamily:"Cinzel,serif",color:C.accent2,fontSize:"22px"}}>
              🛒 Mi Carrito
            </h1>
            <p style={{margin:"4px 0 0",color:C.muted,fontSize:"13px"}}>
              {nItems} producto{nItems!==1?"s":""} · Total: <strong style={{color:C.success}}>{fmt(total)}</strong>
            </p>
          </div>
          {nItems > 0 && (
            <button onClick={vaciarCarrito} style={{
              background:"transparent", border:`1px solid rgba(239,68,68,0.35)`,
              color:"#f87171", padding:"8px 16px", borderRadius:"7px",
              cursor:"pointer", fontSize:"12px", fontWeight:"600"}}>
              🗑️ Vaciar carrito
            </button>
          )}
        </div>

        {nItems === 0 ? (
          <div style={{...card, textAlign:"center", padding:"60px 20px"}}>
            <div style={{fontSize:"52px",marginBottom:"16px"}}>🛒</div>
            <h3 style={{color:C.text,marginBottom:"8px"}}>Tu carrito está vacío</h3>
            <p style={{color:C.muted,marginBottom:"24px",fontSize:"14px"}}>
              Explora la tienda y agrega productos para importar.
            </p>
            <button onClick={()=>router.push("/cliente/tienda")} style={btnPri}>
              🛍️ Ir a la Tienda
            </button>
          </div>
        ) : (
          <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:"24px",alignItems:"start"}}>

            <div>
              {(carrito?.items_locales||[]).length > 0 && (
                <div style={card}>
                  <div style={cHead}>
                    <h3 style={cTitle}>🏠 Productos Locales</h3>
                    <span style={{color:C.muted,fontSize:"12px"}}>
                      {carrito.items_locales.length} ítem{carrito.items_locales.length!==1?"s":""}
                    </span>
                  </div>
                  <div style={cBody}>
                    {carrito.items_locales.map(item=>(
                      <ItemRow key={item.id_carrito} item={item} tipo="local"
                        updating={updating===item.id_carrito}
                        onCantidad={cambiarCantidad} onEliminar={eliminarItem}/>
                    ))}
                  </div>
                </div>
              )}

              {(carrito?.items_externos||[]).length > 0 && (
                <div style={card}>
                  <div style={cHead}>
                    <h3 style={cTitle}>🌐 Productos de Importación</h3>
                    <span style={{color:C.muted,fontSize:"12px"}}>
                      {carrito.items_externos.length} ítem{carrito.items_externos.length!==1?"s":""}
                    </span>
                  </div>
                  <div style={cBody}>
                    {carrito.items_externos.map(item=>(
                      <ItemRow key={item.id_carrito_externo} item={item} tipo="externo"
                        updating={updating===item.id_carrito_externo}
                        onCantidad={cambiarCantidad} onEliminar={eliminarItem}/>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{position:"sticky",top:"0"}}>
              <div style={card}>
                <div style={cHead}>
                  <h3 style={cTitle}>📋 Resumen del Pedido</h3>
                </div>
                <div style={cBody}>
                  <div style={{marginBottom:"16px"}}>
                    {items.map((item)=>{
                      const id = item.id_carrito || item.id_carrito_externo;
                      return(
                        <div key={id} style={{display:"flex",justifyContent:"space-between",
                          marginBottom:"7px",gap:"8px"}}>
                          <span style={{color:C.muted,fontSize:"12px",flex:1,
                            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                            {(item.nombre||"").slice(0,30)} ×{item.cantidad}
                          </span>
                          <span style={{color:C.text,fontSize:"12px",fontWeight:"600",flexShrink:0}}>
                            {fmt(parseFloat(item.precio)*item.cantidad)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{borderTop:`2px solid ${C.accent}`,paddingTop:"14px",marginBottom:"20px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",
                      alignItems:"center",marginBottom:"6px"}}>
                      <span style={{color:C.muted,fontSize:"12px"}}>Subtotal productos:</span>
                      <span style={{color:C.text,fontSize:"13px",fontWeight:"600"}}>{fmt(total)}</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{color:C.text,fontWeight:"800",fontSize:"15px"}}>Total:</span>
                      <strong style={{color:C.success,fontSize:"22px"}}>{fmt(total)}</strong>
                    </div>
                    <div style={{color:C.muted,fontSize:"10px",textAlign:"right",marginTop:"4px"}}>
                      * Los costos de importación se estiman por ítem
                    </div>
                  </div>

                  <button onClick={crearPedido} disabled={creando}
                    style={{width:"100%",padding:"13px",
                      background:`linear-gradient(135deg,${C.accent},${C.accent2})`,
                      border:"none",borderRadius:"9px",color:"#fff",
                      cursor:creando?"not-allowed":"pointer",fontWeight:"800",fontSize:"14px",
                      boxShadow:`0 4px 15px rgba(37,99,235,0.4)`,
                      opacity:creando?0.7:1,transition:"all 0.2s",
                      display:"flex",alignItems:"center",justifyContent:"center",gap:"8px"}}>
                    {creando
                      ? <><div style={{width:"16px",height:"16px",
                          border:"2px solid rgba(255,255,255,0.3)",
                          borderTop:"2px solid #fff",borderRadius:"50%",
                          animation:"spin 0.7s linear infinite"}}/>
                          Creando pedido…</>
                      : "🛒 Realizar Pedido"}
                  </button>

                  <div style={{color:C.muted,fontSize:"11px",textAlign:"center",
                    marginTop:"10px",lineHeight:"1.5"}}>
                    Al hacer el pedido se generará una orden y podrás subir el comprobante de pago.
                  </div>
                </div>
              </div>

              <button onClick={()=>router.push("/cliente/tienda")}
                style={{width:"100%",padding:"10px",background:"transparent",
                  border:`1px solid rgba(37,99,235,0.3)`,color:C.muted,
                  borderRadius:"8px",cursor:"pointer",fontSize:"12px",fontWeight:"600"}}>
                ← Seguir comprando
              </button>
            </div>
          </div>
        )}

        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </main>

      {mPago && (
        <ModalPago
          idPedido={mPago.id_pedido}
          total={mPago.total}
          token={token}
          onClose={()=>setMPago(null)}
          onSuccess={msg=>{
            const pedidoId = mPago.id_pedido;
            setMPago(null);
            showToast(msg);
            setTimeout(()=>router.push(`/cliente/pedidos/${pedidoId}`), 1500);
          }}
        />
      )}
    </div>
  );
}