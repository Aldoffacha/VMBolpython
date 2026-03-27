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

// ── Importación ───────────────────────────────────────────────────────────────
const IMPUESTOS = { electronico:0.30, ropa:0.20, hogar:0.15, deportes:0.25, otros:0.18 };
function calcImport(precio, peso=0.5, cat="otros", l=20, a=15, h=1, tc=9.17) {
  const flete  = Math.max(15, peso*3);
  const seguro = precio*0.02;
  const aduana = precio*(IMPUESTOS[cat]??0.18);
  const tabla  = [
    [20,20,15,15,1,1,100,135],[20,20,15,15,15,15,100,180],[25,25,15,15,15,15,100,225],
    [30,30,20,20,20,20,100,270],[35,35,20,20,20,20,100,360],[50,50,40,40,10,10,10,450],
    [50,50,40,40,10,10,100,1350],[60,60,60,60,60,60,20,1800],
    [100,100,100,100,60,60,25,2250],[150,150,100,100,100,100,30,3150],
  ];
  let almBs=135;
  for(const [lmn,lmx,amn,amx,hmn,hmx,pmx,c2] of tabla)
    if(l>=lmn&&l<=lmx&&a>=amn&&a<=amx&&h>=hmn&&h<=hmx&&peso<=pmx){almBs=c2;break;}
  return {
    total: precio+flete+seguro+aduana+almBs/tc,
    desglose:{ producto:precio, flete, seguro, aduana, almacen:almBs/tc, almacen_bs:almBs }
  };
}

const fmt   = n=>`$${parseFloat(n||0).toFixed(2)}`;
const fDate = iso=>iso?new Date(iso).toLocaleDateString("es-BO",{day:"2-digit",month:"2-digit",year:"numeric"}):"—";

// ── Estilos globales ──────────────────────────────────────────────────────────
const ov    = {position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",
  alignItems:"center",justifyContent:"center",zIndex:9000,padding:"20px"};
const mWrap = {background:C.cardBg,borderRadius:"12px",width:"100%",maxWidth:"560px",
  border:`2px solid ${C.accent}`,boxShadow:"0 20px 60px rgba(0,0,0,0.6)",overflow:"hidden"};
const mHead = {display:"flex",justifyContent:"space-between",alignItems:"center",
  padding:"16px 20px",borderBottom:`2px solid ${C.accent}`,background:C.pageBg};
const mTitle= {margin:0,color:C.accent2,fontFamily:"Cinzel,serif",fontSize:"15px",fontWeight:"700"};
const mFoot = {display:"flex",justifyContent:"flex-end",gap:"10px",
  padding:"14px 20px",borderTop:`1px solid rgba(37,99,235,0.15)`,background:C.pageBg};
const mBody = {padding:"20px",maxHeight:"440px",overflowY:"auto"};
const btnX  = {background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:"18px"};
const btnPri= {background:C.accent,border:"none",color:"#fff",padding:"9px 22px",
  borderRadius:"8px",cursor:"pointer",fontWeight:"700",fontSize:"13px",
  boxShadow:`0 2px 8px rgba(37,99,235,0.35)`,textDecoration:"none",display:"inline-block"};
const btnSec= {background:"transparent",border:`1px solid #444`,color:C.muted,
  padding:"9px 22px",borderRadius:"8px",cursor:"pointer",fontWeight:"600",fontSize:"13px"};
const btnQty= {background:`rgba(37,99,235,0.12)`,border:`1px solid ${C.accent}`,color:C.accent2,
  width:"32px",height:"32px",borderRadius:"6px",cursor:"pointer",fontWeight:"800",fontSize:"16px",
  display:"flex",alignItems:"center",justifyContent:"center"};
const lbl_  = {display:"block",color:C.muted,fontSize:"12px",marginBottom:"5px",fontWeight:"600"};
const inp_  = {width:"100%",padding:"9px 12px",background:C.pageBg,
  border:`2px solid rgba(37,99,235,0.18)`,borderRadius:"6px",color:C.text,
  fontSize:"13px",outline:"none",boxSizing:"border-box"};
const sel_  = {width:"100%",padding:"9px 12px",background:C.pageBg,
  border:`2px solid rgba(37,99,235,0.18)`,borderRadius:"6px",color:C.text,
  fontSize:"13px",outline:"none",boxSizing:"border-box"};

const BADGE_ESTADO = {
  pendiente:{bg:C.warning,col:"#000"}, pagado:{bg:C.accent,col:"#fff"},
  enviado:{bg:C.success,col:"#fff"},   cancelado:{bg:C.danger,col:"#fff"},
  sin_pago:{bg:C.danger,col:"#fff"},
};

// ── StatCard ──────────────────────────────────────────────────────────────────
function StatCard({icon,label,value,color,sub,onClick}){
  const [hov,setHov]=useState(false);
  return(
    <div onClick={onClick}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{
        background:C.cardBg,borderRadius:"10px",padding:"20px",
        display:"flex",justifyContent:"space-between",alignItems:"center",
        borderLeft:`4px solid ${color}`,border:`1px solid rgba(37,99,235,0.1)`,
        boxShadow:"0 4px 15px rgba(0,0,0,0.1)",cursor:onClick?"pointer":"default",
        transform:hov&&onClick?"translateY(-3px)":"none",
        boxShadow:hov&&onClick?`0 8px 25px rgba(37,99,235,0.2)`:"0 4px 15px rgba(0,0,0,0.1)",
        transition:"all 0.2s",
      }}>
      <div>
        <div style={{color,fontSize:"11px",fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.5px"}}>{label}</div>
        <div style={{fontSize:"28px",fontWeight:"800",color:C.text,margin:"4px 0"}}>{value}</div>
        {sub&&<div style={{fontSize:"11px",color:C.muted}}>{sub}</div>}
      </div>
      <div style={{fontSize:"30px"}}>{icon}</div>
    </div>
  );
}

// ── Section con header azul ───────────────────────────────────────────────────
function Section({title,href,children}){
  return(
    <div style={{background:C.cardBg,borderRadius:"10px",marginBottom:"24px",
      border:`1px solid rgba(37,99,235,0.1)`,overflow:"hidden",
      boxShadow:"0 4px 15px rgba(0,0,0,0.1)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
        padding:"13px 20px",borderBottom:`2px solid ${C.accent}`,background:C.pageBg}}>
        <span style={{color:C.accent2,fontFamily:"Cinzel,serif",fontWeight:"700",fontSize:"14px"}}>{title}</span>
        {href&&<a href={href} style={{color:C.accent,fontSize:"12px",textDecoration:"none",fontWeight:"600"}}>Ver todos →</a>}
      </div>
      <div style={{padding:"16px"}}>{children}</div>
    </div>
  );
}

// ── Carrusel de productos (4 por página, flechas funcionales) ─────────────────
const PLAT_MAP={amazon:{bg:C.warning,col:"#000",txt:"Amazon"},ebay:{bg:C.accent2,col:"#fff",txt:"eBay"}};

function ProdCard({prod,tc,onAgregar}){
  const cot  = calcImport(parseFloat(prod.precio||0),prod.peso||0.5,prod.categoria||"otros",20,15,1,tc);
  const plat = PLAT_MAP[prod.plataforma]||{bg:C.success,col:"#fff",txt:"Local"};
  const img  = prod.imagen_url||prod.imagen||"";
  const [hov,setHov]=useState(false);

  return(
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{background:C.cardBg,borderRadius:"12px",overflow:"hidden",
        border:`1px solid ${hov?C.accent2:"rgba(37,99,235,0.12)"}`,
        boxShadow:hov?"0 8px 20px rgba(37,99,235,0.15)":"0 2px 8px rgba(0,0,0,0.08)",
        transition:"all 0.25s",display:"flex",flexDirection:"column",
        transform:hov?"translateY(-4px)":"none"}}>
      {/* Imagen */}
      <div style={{position:"relative",height:"160px",background:"#0d1117",flexShrink:0}}>
        <img
          src={img||`https://via.placeholder.com/280x160/0d1117/3b82f6?text=${encodeURIComponent((prod.nombre||"").slice(0,12))}`}
          alt={prod.nombre}
          style={{width:"100%",height:"100%",objectFit:"cover"}}
          onError={e=>{e.target.onerror=null;e.target.src=`https://via.placeholder.com/280x160/0d1117/3b82f6?text=Sin+Imagen`;}}
        />
        <span style={{position:"absolute",top:8,left:8,background:plat.bg,color:plat.col,
          padding:"3px 8px",borderRadius:"10px",fontSize:"10px",fontWeight:"700"}}>{plat.txt}</span>
        <span style={{position:"absolute",top:8,right:8,background:"rgba(18,20,24,0.9)",
          color:C.accent2,padding:"3px 8px",borderRadius:"10px",fontSize:"11px",fontWeight:"800",
          border:`1px solid ${C.accent}`}}>{fmt(prod.precio)}</span>
      </div>
      {/* Info */}
      <div style={{padding:"12px",flex:1,display:"flex",flexDirection:"column"}}>
        <div style={{color:C.text,fontWeight:"700",fontSize:"13px",marginBottom:"4px",lineHeight:"1.35"}}>
          {(prod.nombre||"").slice(0,52)}{(prod.nombre||"").length>52?"...":""}
        </div>
        <div style={{color:C.muted,fontSize:"11px",marginBottom:"auto",lineHeight:"1.4"}}>
          {(prod.descripcion||"Sin descripción").slice(0,60)}...
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",margin:"10px 0 8px"}}>
          <span style={{color:C.muted,fontSize:"11px"}}>Con importación:</span>
          <strong style={{color:C.success,fontSize:"13px"}}>{fmt(cot.total)}</strong>
        </div>
        <button onClick={()=>onAgregar(prod)} style={{
          width:"100%",padding:"8px",
          background:`linear-gradient(135deg,${C.accent},${C.accent2})`,
          border:"none",borderRadius:"7px",color:"#fff",cursor:"pointer",
          fontWeight:"700",fontSize:"12px",boxShadow:`0 2px 8px rgba(37,99,235,0.3)`,
        }}>🛒 Agregar al Carrito</button>
      </div>
    </div>
  );
}

// ── Carrusel con paginación ───────────────────────────────────────────────────
function Carrusel({prods,tc,onAgregar,porPagina=4}){
  const [pag,setPag]=useState(0);
  const total=Math.ceil(prods.length/porPagina);
  const slice=prods.slice(pag*porPagina,(pag+1)*porPagina);

  if(prods.length===0) return(
    <div style={{color:C.muted,textAlign:"center",padding:"24px"}}>Sin productos disponibles.</div>
  );

  return(
    <div>
      {/* Grid de productos */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:"14px"}}>
        {slice.map(p=>(
          <ProdCard key={p.id_producto||p.id_producto_exterior||p.id_producto_externo} prod={p} tc={tc} onAgregar={onAgregar}/>
        ))}
      </div>

      {/* Controles carrusel */}
      {total>1&&(
        <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:"12px",marginTop:"18px"}}>
          {/* Flecha anterior */}
          <button
            onClick={()=>setPag(p=>Math.max(0,p-1))}
            disabled={pag===0}
            style={{
              width:"38px",height:"38px",borderRadius:"50%",
              background:pag===0?"transparent":`rgba(37,99,235,0.15)`,
              border:`2px solid ${pag===0?"#333":C.accent}`,
              color:pag===0?"#444":C.accent2,
              cursor:pag===0?"not-allowed":"pointer",
              fontSize:"16px",display:"flex",alignItems:"center",justifyContent:"center",
              transition:"all 0.2s",
            }}>‹</button>

          {/* Puntos */}
          <div style={{display:"flex",gap:"6px",alignItems:"center"}}>
            {Array.from({length:total},(_,i)=>(
              <button key={i} onClick={()=>setPag(i)} style={{
                width:i===pag?"24px":"8px",height:"8px",
                borderRadius:"4px",border:"none",cursor:"pointer",
                background:i===pag?C.accent:`rgba(37,99,235,0.25)`,
                transition:"all 0.3s",padding:0,
              }}/>
            ))}
          </div>

          {/* Flecha siguiente */}
          <button
            onClick={()=>setPag(p=>Math.min(total-1,p+1))}
            disabled={pag===total-1}
            style={{
              width:"38px",height:"38px",borderRadius:"50%",
              background:pag===total-1?"transparent":`rgba(37,99,235,0.15)`,
              border:`2px solid ${pag===total-1?"#333":C.accent}`,
              color:pag===total-1?"#444":C.accent2,
              cursor:pag===total-1?"not-allowed":"pointer",
              fontSize:"16px",display:"flex",alignItems:"center",justifyContent:"center",
              transition:"all 0.2s",
            }}>›</button>

          {/* Contador */}
          <span style={{color:C.muted,fontSize:"11px",minWidth:"50px"}}>
            {pag+1} / {total}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Modal agregar carrito ─────────────────────────────────────────────────────
function ModalAgregarCarrito({prod,tc,token,onClose,onSuccess}){
  const [qty,setQty]=useState(1);
  const [load,setLoad]=useState(false);
  if(!prod) return null;

  const esExt=prod.plataforma&&prod.plataforma!=="local";
  const cot=calcImport(parseFloat(prod.precio||0),prod.peso||0.5,prod.categoria||"otros",20,15,1,tc);
  const total=cot.total*qty;
  const img=prod.imagen_url||prod.imagen||"";

  async function confirmar(){
    setLoad(true);
    const body=esExt
      ?{tipo:"externo",
        id_producto_externo:prod.id_producto_externo||prod.id_producto_exterior||String(prod.id_producto||""),
        nombre:prod.nombre,precio:prod.precio,peso:prod.peso||0.5,
        categoria:prod.categoria||"electronico",plataforma:prod.plataforma,
        url:prod.enlace||"",cantidad:qty}
      :{tipo:"local",id_producto:prod.id_producto,cantidad:qty};
    const r=await fetch(`${API}/cliente/carrito/agregar`,{
      method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},
      body:JSON.stringify(body)});
    const d=await r.json();setLoad(false);
    d.success?(onSuccess(d.message),onClose()):alert(d.detail||d.message||"Error al agregar");
  }

  return(
    <div style={ov}>
      <div style={mWrap}>
        <div style={mHead}><h3 style={mTitle}>🛒 Agregar al Carrito</h3><button onClick={onClose} style={btnX}>✕</button></div>
        <div style={mBody}>
          <div style={{display:"flex",gap:"16px",flexWrap:"wrap"}}>
            <img src={img} alt={prod.nombre}
              style={{width:120,height:120,objectFit:"cover",borderRadius:"8px",border:`2px solid rgba(37,99,235,0.2)`}}
              onError={e=>{e.target.onerror=null;e.target.src=`https://via.placeholder.com/120x120/0d1117/3b82f6?text=IMG`;}}/>
            <div style={{flex:1,minWidth:190}}>
              <h4 style={{color:C.text,margin:"0 0 6px",fontSize:"15px"}}>{prod.nombre}</h4>
              <div style={{color:C.accent2,fontSize:"22px",fontWeight:"800",marginBottom:"14px"}}>{fmt(prod.precio)}</div>
              <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"14px"}}>
                <button onClick={()=>setQty(q=>Math.max(1,q-1))} style={btnQty}>−</button>
                <span style={{color:C.text,fontWeight:"800",fontSize:"16px",minWidth:"24px",textAlign:"center"}}>{qty}</span>
                <button onClick={()=>setQty(q=>Math.min(10,q+1))} style={btnQty}>+</button>
                <span style={{color:C.muted,fontSize:"11px"}}>máx. 10</span>
              </div>
              <div style={{background:C.pageBg,borderRadius:"8px",padding:"12px",border:`1px solid rgba(37,99,235,0.15)`}}>
                {[["Costo importación",(cot.total-parseFloat(prod.precio||0))*qty,C.muted],
                  [`Total estimado ×${qty}`,total,C.success]].map(([k,v,col],i)=>(
                  <div key={k} style={{display:"flex",justifyContent:"space-between",
                    ...(i===1?{borderTop:`1px solid rgba(37,99,235,0.15)`,paddingTop:"8px",marginTop:"8px"}:{marginBottom:"5px"})}}>
                    <span style={{color:i===1?C.text:C.muted,fontSize:"12px",fontWeight:i===1?"700":"400"}}>{k}:</span>
                    <span style={{color:col,fontSize:i===1?"15px":"12px",fontWeight:i===1?"800":"400"}}>{fmt(v)}</span>
                  </div>
                ))}
                <div style={{color:"#555",fontSize:"10px",textAlign:"right",marginTop:"4px"}}>T/C: Bs. {tc.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>
        <div style={mFoot}>
          <button onClick={onClose} style={btnSec}>Cancelar</button>
          <button onClick={confirmar} disabled={load} style={{...btnPri,opacity:load?0.7:1}}>
            {load?"Agregando...":"✅ Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal cotización ──────────────────────────────────────────────────────────
const DIMS={"20x15x1":{l:20,a:15,h:1},"20x15x15":{l:20,a:15,h:15},"25x15x15":{l:25,a:15,h:15},
  "30x20x20":{l:30,a:20,h:20},"35x20x20":{l:35,a:20,h:20},"50x40x10":{l:50,a:40,h:10},"60x60x60":{l:60,a:60,h:60}};

function ModalCotizacion({tc,token,onClose}){
  const [form,setForm]=useState({precio:"",peso:"",categoria:"electronico",tamano:"20x15x1"});
  const [res,setRes]=useState(null);
  const [load,setLoad]=useState(false);
  const [ok,setOk]=useState("");

  function calcular(){
    if(!form.precio||!form.peso) return;
    const d=DIMS[form.tamano];
    setRes(calcImport(parseFloat(form.precio),parseFloat(form.peso),form.categoria,d.l,d.a,d.h,tc));
  }
  async function guardar(){
    if(!res) return calcular();
    setLoad(true);
    const d=DIMS[form.tamano];
    const r=await fetch(`${API}/cliente/cotizacion/guardar`,{
      method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},
      body:JSON.stringify({nombre_producto:"Cotización rápida",
        precio:parseFloat(form.precio),peso:parseFloat(form.peso),
        categoria:form.categoria,tamano:form.tamano,largo:d.l,ancho:d.a,alto:d.h})});
    const data=await r.json();setLoad(false);
    if(data.success){setOk("✅ Cotización guardada");setTimeout(onClose,1600);}
    else alert(data.detail||"Error al guardar");
  }

  return(
    <div style={ov}>
      <div style={{...mWrap,maxWidth:"580px"}}>
        <div style={mHead}><h3 style={mTitle}>💰 Calculadora de Importación</h3><button onClick={onClose} style={btnX}>✕</button></div>
        <div style={{...mBody,maxHeight:"480px"}}>
          {ok&&<div style={{background:C.success,color:"#fff",padding:"10px 14px",borderRadius:"6px",marginBottom:"14px",fontWeight:"600"}}>{ok}</div>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px"}}>
            {[["Precio (USD)","precio","number","0.00"],["Peso (kg)","peso","number","0.5"]].map(([lbl,key,t,ph])=>(
              <div key={key}>
                <label style={lbl_}>{lbl}</label>
                <input style={inp_} type={t} placeholder={ph} value={form[key]}
                  onChange={e=>setForm({...form,[key]:e.target.value})}/>
              </div>
            ))}
            <div>
              <label style={lbl_}>Categoría</label>
              <select style={sel_} value={form.categoria} onChange={e=>setForm({...form,categoria:e.target.value})}>
                <option value="electronico">📱 Electrónico (30%)</option>
                <option value="ropa">👕 Ropa (20%)</option>
                <option value="hogar">🏠 Hogar (15%)</option>
                <option value="deportes">⚽ Deportes (25%)</option>
                <option value="otros">📦 Otros (18%)</option>
              </select>
            </div>
            <div>
              <label style={lbl_}>Tamaño de Caja</label>
              <select style={sel_} value={form.tamano} onChange={e=>setForm({...form,tamano:e.target.value})}>
                <option value="20x15x1">Pequeño 20×15×1 — Bs.135</option>
                <option value="20x15x15">Mediano 20×15×15 — Bs.180</option>
                <option value="25x15x15">Grande 25×15×15 — Bs.225</option>
                <option value="30x20x20">Extra 30×20×20 — Bs.270</option>
                <option value="35x20x20">35×20×20 — Bs.360</option>
                <option value="50x40x10">Laptop 50×40×10 — Bs.450</option>
                <option value="60x60x60">Grande 60×60×60 — Bs.1800</option>
              </select>
            </div>
          </div>
          {res&&(
            <div style={{background:C.pageBg,borderRadius:"10px",padding:"16px",marginTop:"18px",
              border:`1px solid rgba(37,99,235,0.2)`}}>
              <div style={{color:C.accent2,fontWeight:"700",marginBottom:"12px",fontSize:"13px"}}>📊 Desglose</div>
              {[["Producto",res.desglose.producto],["Flete",res.desglose.flete],
                ["Seguro (2%)",res.desglose.seguro],["Arancel",res.desglose.aduana],
                [`Almacén (Bs.${res.desglose.almacen_bs})`,res.desglose.almacen]].map(([k,v])=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",marginBottom:"5px"}}>
                  <span style={{color:C.muted,fontSize:"12px"}}>{k}:</span>
                  <span style={{color:C.text,fontSize:"12px",fontWeight:"600"}}>{fmt(v)}</span>
                </div>
              ))}
              <div style={{borderTop:`2px solid ${C.accent}`,paddingTop:"10px",marginTop:"10px",
                display:"flex",justifyContent:"space-between"}}>
                <span style={{color:C.text,fontWeight:"800"}}>TOTAL:</span>
                <span style={{color:C.success,fontWeight:"800",fontSize:"18px"}}>{fmt(res.total)}</span>
              </div>
            </div>
          )}
        </div>
        <div style={mFoot}>
          <button onClick={onClose} style={btnSec}>Cerrar</button>
          <button onClick={calcular} style={{...btnSec,borderColor:C.accent,color:C.accent}}>🔢 Calcular</button>
          {res&&<button onClick={guardar} disabled={load} style={{...btnPri,opacity:load?0.7:1}}>{load?"Guardando...":"💾 Guardar"}</button>}
        </div>
      </div>
    </div>
  );
}

// ── Modal simple ──────────────────────────────────────────────────────────────
function ModalSimple({title,onClose,footer,children}){
  return(
    <div style={ov}>
      <div style={{...mWrap,maxWidth:"620px"}}>
        <div style={mHead}><h3 style={mTitle}>{title}</h3><button onClick={onClose} style={btnX}>✕</button></div>
        <div style={mBody}>{children}</div>
        {footer&&<div style={mFoot}>{footer}</div>}
      </div>
    </div>
  );
}

// ── PÁGINA PRINCIPAL ──────────────────────────────────────────────────────────
export default function ClienteDashboard(){
  const router=useRouter();
  const [user,setUser]=useState(null);
  const [token,setToken]=useState("");
  const [data,setData]=useState(null);
  const [load,setLoad]=useState(true);

  const [mCarrito,  setMCarrito]  =useState(null);
  const [mEnvios,   setMEnvios]   =useState(false);
  const [mCots,     setMCots]     =useState(false);
  const [mMiCart,   setMMiCart]   =useState(false);
  const [mCotForm,  setMCotForm]  =useState(false);
  const [toast,     setToast]     =useState("");

  const showToast=useCallback(msg=>{setToast(msg);setTimeout(()=>setToast(""),3000);},[]);

  useEffect(()=>{
    const u=JSON.parse(sessionStorage.getItem("user")||"null");
    const t=document.cookie.split(";").find(c=>c.trim().startsWith("access_token="))?.split("=")[1];
    if(!t||!u) return router.push("/login");
    setUser(u);setToken(t);
    fetch(`${API}/cliente/dashboard`,{headers:{Authorization:`Bearer ${t}`}})
      .then(r=>{if(!r.ok) throw new Error(r.status);return r.json();})
      .then(d=>{setData(d);setLoad(false);})
      .catch(()=>{setLoad(false);router.push("/login");});
  },[router]);

  if(load) return(
    <div style={{height:"100vh",background:C.pageBg,display:"flex",overflow:"hidden",
      alignItems:"center",justifyContent:"center",flexDirection:"column",gap:"16px"}}>
      <div style={{width:"48px",height:"48px",border:`4px solid rgba(37,99,235,0.2)`,
        borderTop:`4px solid ${C.accent}`,borderRadius:"50%",
        animation:"spin 0.9s linear infinite"}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{color:C.muted,fontFamily:"Cinzel,serif",fontSize:"13px"}}>Cargando panel…</div>
    </div>
  );
  if(!data) return null;

  const {
    stats={},pedidos_recientes=[],envios_camino=[],carrito_items=[],
    total_carrito_monto=0,cotizaciones_pendientes=[],
    productos_por_categoria={},productos_externos=[],
    productos_destacados=[],tipo_cambio=9.17,
  }=data;

  const CAT_ICONS={electronico:"📱",ropa:"👕",hogar:"🏠",deportes:"⚽",otros:"📦"};

  return(
    <div style={{height:"100vh",background:C.pageBg,display:"flex",overflow:"hidden"}}>
      <ClienteSidebar user={user} carritoCount={stats?.total_carrito||0}/>

      <main style={{flex:1,padding:"28px",overflowY:"auto",overflowX:"hidden",background:C.pageBg}}>

        {/* Toast */}
        {toast&&(
          <div style={{position:"fixed",top:20,right:20,background:C.success,color:"#fff",
            padding:"12px 22px",borderRadius:"8px",zIndex:9999,fontWeight:"700",
            boxShadow:"0 4px 16px rgba(0,0,0,0.5)",fontSize:"14px"}}>{toast}</div>
        )}

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
          marginBottom:"28px",flexWrap:"wrap",gap:"12px",
          borderBottom:`2px solid ${C.accent}`,paddingBottom:"18px"}}>
          <div>
            <h1 style={{margin:0,fontFamily:"Cinzel,serif",color:C.accent2,fontSize:"22px",fontWeight:"700"}}>
              ¡Bienvenido, {user?.nombre?.split(" ")[0]} 👋
            </h1>
            <p style={{margin:"4px 0 0",color:C.muted,fontSize:"13px"}}>Panel de Cliente · VMBol en Red</p>
          </div>
          <button onClick={()=>setMCotForm(true)} style={{
            background:`linear-gradient(135deg,${C.accent},${C.accent2})`,
            border:"none",color:"#fff",padding:"11px 22px",borderRadius:"8px",
            cursor:"pointer",fontWeight:"700",fontSize:"13px",
            boxShadow:`0 2px 10px rgba(37,99,235,0.4)`,
          }}>💰 Cotización Rápida</button>
        </div>

        {/* Stats */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",
          gap:"16px",marginBottom:"28px"}}>
          <StatCard icon="📋" label="Pedidos Activos"  value={stats?.total_pedidos||0}
            color={C.accent}  sub="Click para detalles" onClick={()=>router.push("/cliente/pedidos")}/>
          <StatCard icon="🚚" label="Envíos en Camino" value={stats?.envios_camino||0}
            color={C.success} sub="Click para seguimiento" onClick={()=>setMEnvios(true)}/>
          <StatCard icon="💵" label="Cotizaciones"     value={stats?.cotizaciones_pendientes||0}
            color={C.indigo}  sub="Click para ver" onClick={()=>setMCots(true)}/>
          <StatCard icon="🛒" label="Items en Carrito" value={stats?.total_carrito||0}
            color={C.warning} sub="Click para ver" onClick={()=>setMMiCart(true)}/>
        </div>

        {/* Productos Amazon/eBay */}
        {productos_externos.length>0&&(
          <Section title="🌐 Productos Amazon & eBay" href="/cliente/tienda">
            <Carrusel prods={productos_externos} tc={tipo_cambio} onAgregar={setMCarrito}/>
          </Section>
        )}

        {/* Por categoría */}
        {Object.entries(productos_por_categoria).map(([cat,prods])=>(
          <Section key={cat}
            title={`${CAT_ICONS[cat]||"📦"} ${cat.charAt(0).toUpperCase()+cat.slice(1)}`}
            href={`/cliente/tienda?categoria=${cat}`}>
            <Carrusel prods={prods} tc={tipo_cambio} onAgregar={setMCarrito}/>
          </Section>
        ))}

        {/* Destacados */}
        {productos_destacados.length>0&&(
          <Section title="🔥 Productos Destacados" href="/cliente/tienda">
            <Carrusel prods={productos_destacados} tc={tipo_cambio} onAgregar={setMCarrito}/>
          </Section>
        )}

        {/* Pedidos recientes */}
        <Section title="📦 Pedidos Recientes" href="/cliente/pedidos">
          {pedidos_recientes.length===0
            ?<div style={{color:C.muted,textAlign:"center",padding:"30px",fontSize:"13px"}}>
               No tienes pedidos aún. ¡Empieza a comprar en la tienda! 🛍️
             </div>
            :(
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",minWidth:"500px"}}>
                  <thead>
                    <tr>
                      {["# Pedido","Fecha","Total","Estado","Acción"].map(h=>(
                        <th key={h} style={{background:C.pageBg,color:C.muted,padding:"10px 14px",
                          textAlign:"left",fontSize:"11px",fontWeight:"700",textTransform:"uppercase",
                          letterSpacing:"0.5px",borderBottom:`2px solid ${C.accent}`}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pedidos_recientes.map(p=>{
                      const bd=BADGE_ESTADO[p.estado]||{bg:"#555",col:"#fff"};
                      return(
                        <tr key={p.id_pedido} style={{borderBottom:`1px solid rgba(37,99,235,0.08)`}}>
                          <td style={{padding:"11px 14px",color:C.accent2,fontWeight:"700"}}>#VM{p.id_pedido}</td>
                          <td style={{padding:"11px 14px",color:C.text,fontSize:"13px"}}>{fDate(p.fecha)}</td>
                          <td style={{padding:"11px 14px"}}>
                            <strong style={{color:C.success,fontSize:"14px"}}>{fmt(p.total)}</strong>
                          </td>
                          <td style={{padding:"11px 14px"}}>
                            <span style={{background:bd.bg,color:bd.col,padding:"3px 10px",
                              borderRadius:"12px",fontSize:"11px",fontWeight:"700"}}>
                              {(p.estado||"").toUpperCase()}
                            </span>
                          </td>
                          <td style={{padding:"11px 14px"}}>
                            <button onClick={()=>router.push("/cliente/pedidos")} style={{
                              background:"transparent",border:`1px solid ${C.accent}`,
                              color:C.accent,padding:"5px 14px",borderRadius:"6px",
                              cursor:"pointer",fontSize:"12px",fontWeight:"600"}}>Ver →</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          }
        </Section>

      </main>

      {/* ── Modales ───────────────────────────────────────────────────────── */}

      {mCarrito&&(
        <ModalAgregarCarrito prod={mCarrito} tc={tipo_cambio} token={token}
          onClose={()=>setMCarrito(null)}
          onSuccess={msg=>{showToast(msg);window.location.reload();}}/>
      )}

      {mEnvios&&(
        <ModalSimple title="🚚 Envíos en Camino" onClose={()=>setMEnvios(false)}
          footer={<><button onClick={()=>setMEnvios(false)} style={btnSec}>Cerrar</button>
            <a href="/cliente/pedidos" style={btnPri}>Ver Pedidos</a></>}>
          {envios_camino.length===0
            ?<div style={{color:C.muted,textAlign:"center",padding:"30px"}}>No hay envíos en camino.</div>
            :envios_camino.map(e=>(
              <div key={e.id_pedido} style={{background:C.pageBg,borderRadius:"8px",padding:"14px",
                marginBottom:"10px",border:`1px solid rgba(37,99,235,0.2)`}}>
                <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:"10px"}}>
                  <div>
                    <strong style={{color:C.text}}>#VM{e.id_pedido}</strong>
                    <div style={{color:C.muted,fontSize:"12px",marginTop:"4px"}}>Total: {fmt(e.total)}</div>
                    <div style={{color:C.muted,fontSize:"12px"}}>Guía: <strong style={{color:C.accent2}}>{e.guia_aerea||"Pendiente"}</strong></div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{color:C.muted,fontSize:"11px"}}>Llegada estimada</div>
                    <strong style={{color:C.success,fontSize:"13px"}}>{e.fecha_llegada_bolivia||"Por confirmar"}</strong>
                    <div style={{marginTop:"4px"}}>
                      <span style={{background:C.accent,color:"#fff",padding:"2px 8px",
                        borderRadius:"10px",fontSize:"10px",fontWeight:"700"}}>EN TRÁNSITO</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          }
        </ModalSimple>
      )}

      {mCots&&(
        <ModalSimple title="💵 Cotizaciones Pendientes" onClose={()=>setMCots(false)}
          footer={<><button onClick={()=>setMCots(false)} style={btnSec}>Cerrar</button>
            <button onClick={()=>{setMCots(false);setMCotForm(true);}} style={btnPri}>Nueva Cotización</button></>}>
          {cotizaciones_pendientes.length===0
            ?<div style={{color:C.muted,textAlign:"center",padding:"30px"}}>No hay cotizaciones pendientes.</div>
            :cotizaciones_pendientes.map(c=>(
              <div key={c.id_cotizacion} style={{background:C.pageBg,borderRadius:"8px",padding:"14px",
                marginBottom:"10px",border:`1px solid rgba(37,99,235,0.2)`}}>
                <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:"10px"}}>
                  <div>
                    <strong style={{color:C.text}}>#{c.id_cotizacion} · {c.nombre_producto}</strong>
                    <div style={{color:C.muted,fontSize:"12px",marginTop:"3px"}}>
                      Base: {fmt(c.precio_base)} · Peso: {c.peso}kg
                    </div>
                    <div style={{color:"#555",fontSize:"11px",marginTop:"2px"}}>
                      Flete: {fmt(c.costo_flete)} | Aduana: {fmt(c.costo_aduana)} | Almacén: {fmt(c.costo_almacen)}
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <strong style={{color:C.success,fontSize:"18px",display:"block"}}>{fmt(c.costo_total)}</strong>
                    <span style={{background:C.warning,color:"#000",padding:"2px 8px",
                      borderRadius:"10px",fontSize:"10px",fontWeight:"700"}}>PENDIENTE</span>
                  </div>
                </div>
              </div>
            ))
          }
        </ModalSimple>
      )}

      {mMiCart&&(
        <ModalSimple title="🛒 Tu Carrito de Compras" onClose={()=>setMMiCart(false)}
          footer={<><button onClick={()=>setMMiCart(false)} style={btnSec}>Seguir Comprando</button>
            {carrito_items.length>0&&<a href="/cliente/carrito" style={btnPri}>Ir al Carrito →</a>}</>}>
          {carrito_items.length===0
            ?<div style={{color:C.muted,textAlign:"center",padding:"30px"}}>Tu carrito está vacío.</div>
            :<>
              {carrito_items.map(item=>(
                <div key={item.id_carrito} style={{display:"flex",gap:"12px",alignItems:"center",
                  padding:"10px 0",borderBottom:`1px solid rgba(37,99,235,0.1)`}}>
                  <img src={item.imagen_url||""} alt={item.nombre}
                    style={{width:52,height:52,objectFit:"cover",borderRadius:"6px",
                      border:`1px solid rgba(37,99,235,0.2)`}}
                    onError={e=>{e.target.onerror=null;e.target.src="https://via.placeholder.com/52x52/0d1117/3b82f6?text=IMG";}}/>
                  <div style={{flex:1}}>
                    <div style={{color:C.text,fontSize:"13px",fontWeight:"600"}}>{item.nombre}</div>
                    <div style={{color:C.muted,fontSize:"11px"}}>{fmt(item.precio)} × {item.cantidad}</div>
                  </div>
                  <strong style={{color:C.success,fontSize:"14px"}}>{fmt(item.precio*item.cantidad)}</strong>
                </div>
              ))}
              <div style={{display:"flex",justifyContent:"space-between",marginTop:"14px",
                paddingTop:"12px",borderTop:`2px solid ${C.accent}`}}>
                <span style={{color:C.text,fontWeight:"700",fontSize:"15px"}}>Total:</span>
                <strong style={{color:C.success,fontSize:"20px"}}>{fmt(total_carrito_monto)}</strong>
              </div>
            </>
          }
        </ModalSimple>
      )}

      {mCotForm&&(
        <ModalCotizacion tc={tipo_cambio} token={token} onClose={()=>setMCotForm(false)}/>
      )}
    </div>
  );
}