// SLS Control Tower v94 — live WMS integration layer.
// Does NOT overwrite historical management baseline in dashboard_data.
// It surfaces current WMS execution status directly from the shared Supabase project.
(function(){
  'use strict';
  let WMS_BRIDGE=null;

  function escW(v){
    if(typeof esc==='function') return esc(v);
    return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function fmtW(v){
    const n=Number(v||0); return Number.isFinite(n)?n.toLocaleString('id-ID'):'-';
  }
  function dateW(v){
    if(!v) return '-';
    try{return new Date(v).toLocaleString('id-ID');}catch(_e){return String(v);}
  }

  function ensureStyles(){
    if(document.getElementById('wmsBridgeStyle')) return;
    const s=document.createElement('style'); s.id='wmsBridgeStyle';
    s.textContent=`
      .wms-live-wrap{background:#fff;border:1px solid var(--border);border-radius:12px;padding:14px 16px;margin:0 0 20px;}
      .wms-live-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;flex-wrap:wrap;}
      .wms-live-title{font-size:12px;font-weight:800;color:var(--navy);letter-spacing:.5px;text-transform:uppercase;}
      .wms-live-meta{font-size:10.5px;color:var(--stone);}
      .wms-live-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;}
      .wms-live-card{border:1px solid var(--border);border-radius:9px;padding:10px 11px;background:#FBFAF8;min-width:0;}
      .wms-live-card.live{border-left:4px solid #16A34A;background:#F5FBF7;}
      .wms-live-card.setup{border-left:4px solid #F59E0B;background:#FFFBF3;}
      .wms-live-rdc{font-size:12px;font-weight:800;color:var(--navy);display:flex;justify-content:space-between;gap:6px;}
      .wms-live-status{font-size:8.5px;font-weight:800;padding:2px 5px;border-radius:5px;background:#EEE9E0;color:#6B6459;white-space:nowrap;}
      .wms-live-kpis{display:grid;grid-template-columns:1fr 1fr;gap:4px 8px;margin-top:8px;font-size:10.5px;}
      .wms-live-kpis span{color:var(--stone);}.wms-live-kpis b{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap;}
      .wms-live-foot{font-size:9.5px;color:var(--stone);margin-top:8px;border-top:1px dashed var(--border);padding-top:6px;line-height:1.4;}
      @media(max-width:1100px){.wms-live-grid{grid-template-columns:repeat(3,minmax(0,1fr));}}
      @media(max-width:760px){.wms-live-grid{grid-template-columns:1fr;}}
    `;
    document.head.appendChild(s);
  }

  function host(){
    let el=document.getElementById('wmsLiveBridge');
    if(el) return el;
    el=document.createElement('div'); el.id='wmsLiveBridge'; el.className='wms-live-wrap';
    const firstTop=document.querySelector('.main .topbar')||document.querySelector('.topbar');
    if(firstTop && firstTop.parentNode) firstTop.insertAdjacentElement('afterend',el);
    else{
      const main=document.querySelector('.main'); if(main) main.prepend(el);
    }
    return el;
  }

  function render(){
    const el=host(); if(!el) return;
    if(!WMS_BRIDGE){
      el.innerHTML='<div class="wms-live-title">WMS LIVE</div><div class="wms-live-meta">Menghubungkan ke execution layer WMS…</div>';
      return;
    }
    const rows=WMS_BRIDGE.rows||[];
    el.innerHTML=`
      <div class="wms-live-head">
        <div><div class="wms-live-title">WMS LIVE · EXECUTION LAYER</div>
        <div class="wms-live-meta">Data realtime dari database WMS yang sama · Scope: ${escW(WMS_BRIDGE.scope||'-')}</div></div>
        <div class="wms-live-meta">Refresh ${dateW(WMS_BRIDGE.generated_at)}</div>
      </div>
      <div class="wms-live-grid">${rows.map(r=>{
        const live=!!r.has_wms_activity;
        const occ=r.occupancy_pct==null?'-':Number(r.occupancy_pct).toLocaleString('id-ID')+'%';
        const capReady=Number(r.kavling_active||0)>0?`${fmtW(r.kavling_with_capacity)}/${fmtW(r.kavling_active)}`:'0/0';
        return `<div class="wms-live-card ${live?'live':'setup'}">
          <div class="wms-live-rdc"><span>${escW(r.rdc)}</span><span class="wms-live-status">${escW(r.wms_status)}</span></div>
          <div class="wms-live-kpis">
            <span>Stock WMS</span><b>${fmtW(r.stock_total_box)} box</b>
            <span>Located</span><b>${fmtW(r.located_box)} box</b>
            <span>Unlocated</span><b>${fmtW(r.unlocated_box)} box</b>
            <span>Occupancy</span><b>${occ}</b>
            <span>Kapasitas lokasi</span><b>${fmtW(r.capacity_box)} box</b>
            <span>Kavling berkapasitas</span><b>${capReady}</b>
            <span>Picking open</span><b>${fmtW(r.open_picking_tasks)}</b>
            <span>Staging</span><b>${fmtW(r.staging_qty_box)} box</b>
          </div>
          <div class="wms-live-foot">Last movement: ${dateW(r.last_movement_at)}<br>Last receiving: ${dateW(r.last_receiving_at)}</div>
        </div>`;
      }).join('')}</div>
      <div class="wms-live-meta" style="margin-top:9px">Catatan: panel ini adalah data transaksi WMS live. KPI historis Dashboard tetap memakai baseline management sampai cut-over WMS disetujui.</div>`;
  }

  async function load(){
    try{
      if(typeof sbRpc!=='function' || !AUTH_SESSION_OK) return;
      WMS_BRIDGE=await sbRpc('wms_dashboard_bridge',{});
      window.WMS_LIVE_BRIDGE=WMS_BRIDGE;
      render();
    }catch(e){
      const el=host();
      if(el) el.innerHTML=`<div class="wms-live-title">WMS LIVE</div><div style="font-size:11px;color:#B3261E">Koneksi WMS gagal: ${escW(e.message)}</div>`;
    }
  }

  function patchBoot(){
    if(typeof bootDashboard!=='function' || bootDashboard.__wmsBridgeV94) return;
    const base=bootDashboard;
    const fn=async function(){
      const v=await base.apply(this,arguments);
      await load();
      return v;
    };
    fn.__wmsBridgeV94=true;
    bootDashboard=fn;
  }

  function apply(){ ensureStyles(); patchBoot(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',apply,{once:true}); else apply();
  setTimeout(apply,300);
})();
