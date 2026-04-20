"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ClienteSidebar from "@/components/ClienteSidebar";
import { useTheme } from "@/context/ThemeContext";
import "@/styles/dashboard.css"; // mismas variables CSS del dashboard

const API = "http://localhost:8000";

const fmt   = n => `$${parseFloat(n||0).toFixed(2)}`;
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

const FILTROS = ["todos","sin_pago","pagado","enviado","entregado"];

export default function MisPedidos() {
  const { theme } = useTheme();
  const router = useRouter();
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState("");
  const [pedidos, setPedidos] = useState([]);
  const [load,    setLoad]    = useState(true);
  const [filtro,  setFiltro]  = useState("todos");
  const [toast,   setToast]   = useState({ msg:"", ok:true });

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
      showToast("✅ Pedido confirmado como entregado", true);
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
              <span className="ped-empty__ico">📭</span>
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
                      <span style={{animation:"bounce2 .7s infinite",fontSize:"18px"}}>🚴</span>
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
                    <span className="ped-card__date">📅 {fDate(p.fecha)}</span>
                    <span className="ped-card__total">{fmt(p.total)}</span>
                  </div>

                  <div className="ped-card__details">
                    {p.tipo_pedido && (
                      <div className="ped-detail-row">
                        <span className="ped-detail-k">Tipo</span>
                        <span className="ped-detail-v">
                          {p.tipo_pedido==="importacion" ? "🌐 Importación" : "🏠 Local"}
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
                        <span className="ped-detail-k">📍</span>
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
                      <span>⚠️</span> Requiere pago para continuar
                    </div>
                  )}
                  {estaPagado && !tieneUbic && (
                    <div className="ped-alert ped-alert--amber">
                      <span>📍</span> Falta establecer ubicación de entrega
                    </div>
                  )}
                  {puedeConf && (
                    <div className="ped-alert ped-alert--green">
                      <span>✅</span> ¡Tu pedido llegó! Confirma la recepción
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="ped-card__foot">
                  {!estaPagado && (
                    <button className="ped-foot-btn ped-foot-btn--red"
                      onClick={()=>router.push("/cliente/carrito")}>
                      💳 Pagar ahora
                    </button>
                  )}
                  {estaPagado && !tieneUbic && (
                    <button className="ped-foot-btn ped-foot-btn--amber"
                      onClick={()=>router.push(`/cliente/pedidos/${p.id_pedido}`)}>
                      📍 Establecer Ubicación
                    </button>
                  )}
                  {puedeConf && (
                    <button className="ped-foot-btn ped-foot-btn--green"
                      onClick={()=>marcarEntregado(p.id_pedido)}>
                      ✅ Confirmar Recepción
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
    </div>
  );
}