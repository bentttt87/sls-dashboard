// SLS Control Tower v109 — WMS recap lives inside OPERATIONAL view only.
// Detailed WMS execution remains in WMS; Control Tower receives aggregate KPI / risk / management signal.
(function(){
  'use strict';
  let WMS_BRIDGE=null;
  const WMS_URL='https://sls-wms.vercel.app/';
  const escW=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pctW=v=>v==null||!Number.isFinite(Number(v))?'—':Number(v).toLocaleString('id-ID',{maximumFractionDigits:1})+'%';
  const dtW=v=>{if(!v)return '—';try{return new Date(v).toLocaleString('id-ID');}catch(_){return String(v)}};

  function ensureStyles(){
    document.getElementById('wmsBridgeStyle')?.remove();
    if(document.getElementById('wmsMgmt109Style'))return;
    const s=document.createElement('style');s.id='wmsMgmt109Style';s.textContent=`
      #wmsLiveSection{margin-top:22px}.wms-live-wrap{background:#fff;border:1px solid var(--border);border-radius:12px;padding:14px 16px;margin:0 0 20px}
      .w109-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}.w109-title{font-size:12px;font-weight:800;color:var(--navy);letter-spacing:.55px;text-transform:uppercase}.w109-meta{font-size:10.5px;color:var(--stone);margin-top:2px}
      .w109-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin-top:10px}.w109-card{background:#FBFAF8;border:1px solid var(--border);border-radius:9px;padding:10px 11px;min-width:0}.w109-card.good{border-top:3px solid var(--green)}.w109-card.watch{border-top:3px solid var(--amber)}.w109-card.risk{border-top:3px solid var(--red)}
      .w109-l{font-size:8.5px;font-weight:800;letter-spacing:.45px;color:var(--stone);text-transform:uppercase}.w109-v{font-size:19px;font-weight:800;color:var(--navy);margin-top:3px}.w109-s{font-size:9.5px;color:var(--stone);line-height:1.3;margin-top:2px}
      .w109-insight{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center;border-top:1px dashed var(--border);margin-top:10px;padding-top:9px}.w109-insight p{margin:0;font-size:10.5px;color:var(--ink-soft);line-height:1.45}.w109-btn{display:inline-flex;align-items:center;gap:5px;text-decoration:none;background:var(--navy);color:#fff;border-radius:7px;padding:7px 10px;font-size:10px;font-weight:800;white-space:nowrap}
      @media(max-width:1000px){.w109-grid{grid-template-columns:repeat(3,1fr)}}@media(max-width:700px){.w109-grid{grid-template-columns:1fr 1fr}.w109-insight{grid-template-columns:1fr}.w109-btn{justify-self:start}}
    `;document.head.appendChild(s);
  }

  function host(){
    const ops=document.getElementById('opsView');
    if(!ops)return null;
    let section=document.getElementById('wmsLiveSection');
    if(!section){
      section=document.createElement('div');section.id='wmsLiveSection';
      section.innerHTML='<div class="section-label">WMS Operational Recap <span class="tag">execution summary</span></div><div id="wmsLiveBridge" class="wms-live-wrap"></div>';
      const today=document.getElementById('todaysControl');
      if(today)today.insertAdjacentElement('afterend',section);
      else ops.insertAdjacentElement('afterbegin',section);
    }
    return document.getElementById('wmsLiveBridge');
  }

  function aggregate(rows){
    const active=rows.filter(r=>r.has_wms_activity).length,total=rows.length;
    const ready=rows.filter(r=>Number(r.kavling_active||0)>0&&Number(r.capacity_box||0)>0).length;
    const cap=rows.reduce((s,r)=>s+Number(r.capacity_box||0),0),loc=rows.reduce((s,r)=>s+Number(r.located_box||0),0),occ=cap>0?loc/cap*100:null;
    const overload=rows.filter(r=>Number(r.occupancy_pct||0)>=100),high=rows.filter(r=>Number(r.occupancy_pct||0)>=90&&Number(r.occupancy_pct||0)<100);
    const attention=rows.filter(r=>Number(r.pgi_exception_tasks||0)>0||Number(r.pending_gi_tasks||0)>0||Number(r.unlocated_box||0)>0);
    const latest=rows.map(r=>r.last_movement_at||r.last_receiving_at).filter(Boolean).sort().pop()||null;
    return {active,total,ready,occ,overload,high,attention,latest};
  }

  function insight(a){
    if(a.overload.length){const n=a.overload.map(r=>r.rdc).join(', ');return `<b>Operational capacity risk:</b> ${escW(n)} berada pada/di atas design capacity. Detail lokasi, staging, dan corrective action tetap ditangani di WMS.`;}
    if(a.attention.length){return `<b>Execution attention:</b> ${a.attention.length} RDC memiliki pending/exception yang perlu kontrol operasional. Buka WMS untuk transaksi/detail penyebab.`;}
    if(a.active<a.total){return `<b>WMS rollout:</b> ${a.active}/${a.total} RDC menunjukkan aktivitas WMS. Operational Control memonitor readiness tanpa memindahkan transaksi ke Control Tower.`;}
    return '<b>WMS execution:</b> tidak ada exception level-operasional yang terdeteksi pada recap saat ini. Detail transaksi tetap berada di WMS.';
  }

  function render(){
    const el=host();if(!el)return;
    if(!WMS_BRIDGE){el.innerHTML='<div class="w109-title">WMS Operational Recap</div><div class="w109-meta">Menghubungkan ke WMS execution layer…</div>';return;}
    const rows=WMS_BRIDGE.rows||[],a=aggregate(rows),occCls=a.overload.length?'risk':a.high.length?'watch':'good',attCls=a.attention.length?'watch':'good';
    el.innerHTML=`
      <div class="w109-head"><div><div class="w109-title">WMS Operational Recap</div><div class="w109-meta">Ringkasan execution WMS untuk Operational Control · tanpa detail transaksi · Scope ${escW(WMS_BRIDGE.scope||'-')}</div></div><div class="w109-meta">Refresh ${dtW(WMS_BRIDGE.generated_at)}</div></div>
      <div class="w109-grid">
        <div class="w109-card ${a.active===a.total&&a.total?'good':'watch'}"><div class="w109-l">WMS Coverage</div><div class="w109-v">${a.active}/${a.total||5}</div><div class="w109-s">RDC dengan aktivitas WMS</div></div>
        <div class="w109-card ${a.ready===a.total&&a.total?'good':'watch'}"><div class="w109-l">Location Readiness</div><div class="w109-v">${a.ready}/${a.total||5}</div><div class="w109-s">RDC memiliki lokasi + kapasitas</div></div>
        <div class="w109-card ${occCls}"><div class="w109-l">Network Occupancy</div><div class="w109-v">${pctW(a.occ)}</div><div class="w109-s">weighted dari lokasi berkapasitas</div></div>
        <div class="w109-card ${a.overload.length?'risk':a.high.length?'watch':'good'}"><div class="w109-l">Capacity Risk</div><div class="w109-v">${a.overload.length}</div><div class="w109-s">RDC overload · ${a.high.length} watch ≥90%</div></div>
        <div class="w109-card ${attCls}"><div class="w109-l">Execution Attention</div><div class="w109-v">${a.attention.length}</div><div class="w109-s">RDC dengan pending/exception</div></div>
      </div>
      <div class="w109-insight"><p>${insight(a)}${a.latest?` <span style="color:var(--stone)">Last WMS activity ${dtW(a.latest)}.</span>`:''}</p><a class="w109-btn" href="${WMS_URL}" target="_blank" rel="noopener">Open WMS Detail ↗</a></div>`;
  }

  async function load(){
    try{
      if(typeof sbRpc!=='function'||!AUTH_SESSION_OK)return;
      WMS_BRIDGE=await sbRpc('wms_dashboard_bridge',{});window.WMS_LIVE_BRIDGE=WMS_BRIDGE;render();
    }catch(e){const el=host();if(el)el.innerHTML=`<div class="w109-title">WMS Operational Recap</div><div style="font-size:11px;color:#B3261E">Koneksi recap WMS gagal: ${escW(e.message||e)}</div>`;}
  }

  function patchBoot(){
    if(typeof bootDashboard!=='function'||bootDashboard.__wmsOps109)return;
    const base=bootDashboard;const fn=async function(){const v=await base.apply(this,arguments);await load();return v;};fn.__wmsOps109=true;bootDashboard=fn;
  }
  function apply(){ensureStyles();host();patchBoot();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
  setTimeout(apply,300);
})();
