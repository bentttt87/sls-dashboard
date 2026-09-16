// SLS Control Tower v108 — WMS management recap only.
// Operational WMS detail stays in WMS. Control Tower receives aggregate KPI / risk / management signal.
(function(){
  'use strict';
  let WMS_BRIDGE=null;
  const WMS_URL='https://sls-wms.vercel.app/';
  const escW=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmtW=v=>Number(v||0).toLocaleString('id-ID');
  const pctW=v=>v==null||!Number.isFinite(Number(v))?'—':Number(v).toLocaleString('id-ID',{maximumFractionDigits:1})+'%';
  const dtW=v=>{if(!v)return '—';try{return new Date(v).toLocaleString('id-ID');}catch(_){return String(v)}};

  function ensureStyles(){
    if(document.getElementById('wmsBridgeStyle'))document.getElementById('wmsBridgeStyle').remove();
    if(document.getElementById('wmsMgmt108Style'))return;
    const s=document.createElement('style');s.id='wmsMgmt108Style';s.textContent=`
      .wms-live-wrap{background:#fff;border:1px solid var(--border);border-radius:12px;padding:14px 16px;margin:0 0 20px}
      .w108m-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}.w108m-title{font-size:12px;font-weight:800;color:var(--navy);letter-spacing:.55px;text-transform:uppercase}.w108m-meta{font-size:10.5px;color:var(--stone);margin-top:2px}
      .w108m-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin-top:10px}.w108m-card{background:#FBFAF8;border:1px solid var(--border);border-radius:9px;padding:10px 11px;min-width:0}.w108m-card.good{border-top:3px solid var(--green)}.w108m-card.watch{border-top:3px solid var(--amber)}.w108m-card.risk{border-top:3px solid var(--red)}
      .w108m-l{font-size:8.5px;font-weight:800;letter-spacing:.45px;color:var(--stone);text-transform:uppercase}.w108m-v{font-size:19px;font-weight:800;color:var(--navy);margin-top:3px}.w108m-s{font-size:9.5px;color:var(--stone);line-height:1.3;margin-top:2px}
      .w108m-insight{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center;border-top:1px dashed var(--border);margin-top:10px;padding-top:9px}.w108m-insight p{margin:0;font-size:10.5px;color:var(--ink-soft);line-height:1.45}.w108m-btn{display:inline-flex;align-items:center;gap:5px;text-decoration:none;background:var(--navy);color:#fff;border-radius:7px;padding:7px 10px;font-size:10px;font-weight:800;white-space:nowrap}
      @media(max-width:1000px){.w108m-grid{grid-template-columns:repeat(3,1fr)}}@media(max-width:700px){.w108m-grid{grid-template-columns:1fr 1fr}.w108m-insight{grid-template-columns:1fr}.w108m-btn{justify-self:start}}
    `;document.head.appendChild(s);
  }

  function host(){
    let el=document.getElementById('wmsLiveBridge');if(el)return el;
    el=document.createElement('div');el.id='wmsLiveBridge';el.className='wms-live-wrap';
    const firstTop=document.querySelector('.main .topbar')||document.querySelector('.topbar');
    if(firstTop&&firstTop.parentNode)firstTop.insertAdjacentElement('afterend',el);else document.querySelector('.main')?.prepend(el);
    return el;
  }

  function aggregate(rows){
    const active=rows.filter(r=>r.has_wms_activity).length,total=rows.length;
    const ready=rows.filter(r=>Number(r.kavling_active||0)>0&&Number(r.capacity_box||0)>0).length;
    const cap=rows.reduce((s,r)=>s+Number(r.capacity_box||0),0),loc=rows.reduce((s,r)=>s+Number(r.located_box||0),0),occ=cap>0?loc/cap*100:null;
    const overload=rows.filter(r=>Number(r.occupancy_pct||0)>=100),high=rows.filter(r=>Number(r.occupancy_pct||0)>=90&&Number(r.occupancy_pct||0)<100);
    const exception=rows.filter(r=>Number(r.pgi_exception_tasks||0)>0||Number(r.pending_gi_tasks||0)>0||Number(r.unlocated_box||0)>0);
    const latest=rows.map(r=>r.last_movement_at||r.last_receiving_at).filter(Boolean).sort().pop()||null;
    return {active,total,ready,occ,overload,high,exception,latest};
  }

  function insight(a){
    if(a.overload.length){const n=a.overload.map(r=>r.rdc).join(', ');return `<b>Capacity risk:</b> ${escW(n)} berada pada/di atas design capacity. Detail lokasi, staging dan corrective action ditangani di WMS.`;}
    if(a.exception.length){return `<b>Execution attention:</b> ${a.exception.length} RDC memiliki exception/pending operational control. Review detail di WMS; Control Tower hanya memonitor status dan business impact.`;}
    if(a.active<a.total){return `<b>Rollout WMS:</b> ${a.active}/${a.total} RDC menunjukkan aktivitas WMS. Management perlu memonitor readiness rollout tanpa membawa transaksi detail ke Control Tower.`;}
    return '<b>WMS execution:</b> tidak ada management-level exception yang terdeteksi dari recap saat ini. Detail operasional tetap berada di WMS.';
  }

  function render(){
    const el=host();if(!el)return;
    if(!WMS_BRIDGE){el.innerHTML='<div class="w108m-title">WMS Management Recap</div><div class="w108m-meta">Menghubungkan ke WMS execution layer…</div>';return;}
    const rows=WMS_BRIDGE.rows||[],a=aggregate(rows),occCls=a.overload.length?'risk':a.high.length?'watch':'good',execCls=a.exception.length?'watch':'good';
    el.innerHTML=`
      <div class="w108m-head"><div><div class="w108m-title">WMS Management Recap</div><div class="w108m-meta">Aggregate KPI / exception signal dari WMS · tanpa detail transaksi · Scope ${escW(WMS_BRIDGE.scope||'-')}</div></div><div class="w108m-meta">Refresh ${dtW(WMS_BRIDGE.generated_at)}</div></div>
      <div class="w108m-grid">
        <div class="w108m-card ${a.active===a.total&&a.total?'good':'watch'}"><div class="w108m-l">WMS Coverage</div><div class="w108m-v">${a.active}/${a.total||5}</div><div class="w108m-s">RDC dengan aktivitas WMS</div></div>
        <div class="w108m-card ${a.ready===a.total&&a.total?'good':'watch'}"><div class="w108m-l">Location Readiness</div><div class="w108m-v">${a.ready}/${a.total||5}</div><div class="w108m-s">RDC memiliki lokasi + kapasitas</div></div>
        <div class="w108m-card ${occCls}"><div class="w108m-l">Network Occupancy</div><div class="w108m-v">${pctW(a.occ)}</div><div class="w108m-s">weighted dari lokasi berkapasitas</div></div>
        <div class="w108m-card ${a.overload.length?'risk':a.high.length?'watch':'good'}"><div class="w108m-l">Capacity Risk</div><div class="w108m-v">${a.overload.length}</div><div class="w108m-s">RDC overload · ${a.high.length} watch ≥90%</div></div>
        <div class="w108m-card ${execCls}"><div class="w108m-l">Execution Attention</div><div class="w108m-v">${a.exception.length}</div><div class="w108m-s">RDC dengan pending/exception</div></div>
      </div>
      <div class="w108m-insight"><p>${insight(a)}${a.latest?` <span style="color:var(--stone)">Last WMS activity ${dtW(a.latest)}.</span>`:''}</p><a class="w108m-btn" href="${WMS_URL}" target="_blank" rel="noopener">Open WMS ↗</a></div>`;
  }

  async function load(){
    try{
      if(typeof sbRpc!=='function'||!AUTH_SESSION_OK)return;
      WMS_BRIDGE=await sbRpc('wms_dashboard_bridge',{});window.WMS_LIVE_BRIDGE=WMS_BRIDGE;render();
    }catch(e){const el=host();if(el)el.innerHTML=`<div class="w108m-title">WMS Management Recap</div><div style="font-size:11px;color:#B3261E">Koneksi recap WMS gagal: ${escW(e.message||e)}</div>`;}
  }

  function patchBoot(){
    if(typeof bootDashboard!=='function'||bootDashboard.__wmsMgmt108)return;
    const base=bootDashboard;const fn=async function(){const v=await base.apply(this,arguments);await load();return v;};fn.__wmsMgmt108=true;bootDashboard=fn;
  }
  function apply(){ensureStyles();patchBoot();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
  setTimeout(apply,300);
})();
