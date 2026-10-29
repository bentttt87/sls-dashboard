(function controlTowerV3() {
  'use strict';
  const state={snap:[],doi:[],cost:[],loadPromise:null,loaded:false,errors:[],issues:[],selected:null};
  const $=id=>document.getElementById(id);
  const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num=v=>Number.isFinite(Number(v))?Number(v):null;
  const fmt=(v,d=0)=>v==null?'—':Number(v).toLocaleString('id-ID',{minimumFractionDigits:d,maximumFractionDigits:d});
  const month=s=>s?new Date(String(s).slice(0,10)+'T12:00:00').toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}):'—';
  const names=['Jakarta','Semarang','Surabaya','Denpasar','Palembang'];
  const inScope=n=>!CURRENT_RDC_SCOPE||n===CURRENT_RDC_SCOPE;
  const scopeName=v=>CURRENT_RDC_SCOPE||((v&&v!=='Semua')?v:'Semua');
  const percent=(a,b)=>b>0?100*a/b:null;
  const setActive=el=>{document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));if(el)el.classList.add('active');};
  const put=(id,html)=>{if($(id))$(id).innerHTML=html;};

  const css=document.createElement('style');css.textContent=`
    #viewTabsWrap{display:none!important}
    #mgmtView .hero-control-tower,#mgmtView .mgmt-flow-toggle-row,#mgmtView #managementStoryline{display:none!important}
    #opsView #mgmtKpiStrip,#opsView #opsAnchorToday{display:none!important}
    .v3-section-title{font-size:20px;font-weight:800;color:var(--navy);margin:4px 0 8px}
    .v3-muted{font-size:13px;color:var(--stone);line-height:1.6}
    .v3-eyebrow{font-size:11px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;color:#53708c}
    .v3-block{background:#fff;border:1px solid var(--border);border-radius:12px;padding:18px;margin:12px 0}
    .v3-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
    .v3-grid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
    .v3-big{font-size:29px;font-weight:800;line-height:1.1;color:var(--navy);margin-top:8px}
    .v3-kpi-card{border:1px solid var(--border);border-radius:11px;background:white;padding:17px;text-align:left;min-width:0}
    .v3-kpi-card .v3-big{font-size:25px}
    .v3-status{font-size:11px;font-weight:750;color:#946200}
    .v3-danger{color:#B3261E!important}
    .v3-table-wrap{overflow-x:auto}
    .v3-table{width:100%;border-collapse:collapse;font-size:13px}
    .v3-table th{background:#e9eef4;color:#244363;font-size:12px;text-transform:uppercase;letter-spacing:.2px;text-align:left}
    .v3-table th,.v3-table td{padding:11px 10px;border-bottom:1px solid #e7ebef;vertical-align:middle}
    .v3-table td.num{text-align:right;font-variant-numeric:tabular-nums}
    .v3-table tr.v3-selectable{cursor:pointer}
    .v3-table tr.v3-selectable:hover{background:#f1f6fa}
    .v3-table tr.v3-selected{background:#eef4fa}
    .v3-pill{display:inline-block;padding:4px 8px;border-radius:8px;font-size:10px;font-weight:800;background:#e5ebf2;color:#284562;white-space:nowrap}
    .v3-pill.warn{background:#fff0d3;color:#91610d}
    .v3-pill.critical{background:#fce6e4;color:#b3261e}
    .v3-bar{height:9px;border-radius:10px;background:#e5ebf0;overflow:hidden;min-width:85px}
    .v3-bar>span{display:block;height:100%;background:#396d94;border-radius:10px}
    .v3-bar>span.warn{background:#d39737}.v3-bar>span.critical{background:#bd4639}
    .v3-controls{display:flex;align-items:end;gap:10px;flex-wrap:wrap;margin:10px 0 15px}
    .v3-controls label{display:grid;gap:5px;font-size:11px;font-weight:700;color:#516577}
    .v3-controls select,.v3-controls input,.v3-controls button,.v3-input{border:1px solid #cbd6df;border-radius:8px;padding:10px 11px;background:white;color:#203d5c;font-size:13px;min-height:40px}
    .v3-controls button,.v3-button{background:var(--navy);color:white;border:0;border-radius:8px;padding:10px 14px;font-size:12px;font-weight:750;cursor:pointer}
    .v3-deep{margin:18px 0;border:1px solid #cfdae4;border-radius:10px;background:#fff;padding:14px}
    .v3-deep>summary{font-weight:800;color:var(--navy);cursor:pointer;padding:7px}
    .v3-warning{border-left:4px solid #d39b3e;background:#fff8eb;padding:11px 13px;border-radius:7px;color:#6d5120;font-size:12px;line-height:1.6}
    .v3-heading-row{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}
    .v3-issue-details{border-left:4px solid #315a7d;padding:14px;background:#f3f7fa;font-size:13px;line-height:1.65}
    .v3-issue-details b{color:#18355b}
    #v3ExecutiveExtras{margin:14px 0}
    #v3OperationsIntro{margin:0 0 16px}
    @media(max-width:900px){.v3-grid,.v3-grid3{grid-template-columns:1fr}}
  `;document.head.appendChild(css);

  // Reuse existing app pages; operational workbench is intentionally distinct from management.
  const sidebarTitle=document.querySelector('.nav-section-title');
  if(sidebarTitle)sidebarTitle.textContent='MANAGEMENT';
  const executiveNav=document.querySelector('.nav-item[data-page="dashboard"]');
  if(executiveNav)executiveNav.innerHTML='<span class="nav-icon">⌂</span><span>Executive Overview</span>';
  const opsGroup=[...document.querySelectorAll('.nav-section-title')].find(e=>e.textContent.includes('APLIKASI OPERASIONAL'));
  const navOps=$('navSupplyChain'),navTransport=$('navTransportation'),navWms=$('navWms');
  if(opsGroup&&navOps){opsGroup.after(navOps);navOps.innerHTML='<span class="nav-icon">☷</span><span>Operational Control</span>';}
  if(navOps&&navTransport)navOps.after(navTransport);
  if(navTransport)navTransport.innerHTML='<span class="nav-icon">▰</span><span>Delivery &amp; Transport</span>';
  if(navWms)navWms.innerHTML='<span class="nav-icon">↗</span><span>WMS — Warehouse Execution</span>';

  const decisionsNav=document.createElement('div');
  decisionsNav.id='v3NavDecisions';
  decisionsNav.className='nav-item';
  decisionsNav.innerHTML='<span class="nav-icon">✓</span><span>Management Decisions</span>';
  const reportsNav=$('navReports');
  if(reportsNav)reportsNav.before(decisionsNav);
    const inventoryNav=$('navInventory');
  if(inventoryNav){
    inventoryNav.insertAdjacentHTML('afterend',`
      <div class="nav-item" id="v3NavOccupancy"><span class="nav-icon">▤</span><span>Occupancy Report</span></div>
      <div class="nav-item" id="v3NavCostRatio"><span class="nav-icon">％</span><span>Logistics Cost Ratio</span></div>`);
  }

  // Insert report pages into the existing page router (all original pages remain intact).
  const dashboardPage=$('page-dashboard');
  dashboardPage.insertAdjacentHTML('afterend',`
    <div id="page-v3-occupancy" class="page">
      <div class="topbar"><div><h1>Warehouse Occupancy Report</h1><div class="period">National & RDC · kapasitas, penggunaan dan risiko overload</div></div></div>
      <div class="v3-warning">Laporan ini menggunakan <b>stock box ÷ design capacity box</b> dari snapshot terverifikasi, bukan pemakaian posisi pallet/barcode. Untuk occupancy fisik harus diintegrasikan dengan WMS.</div>
      <div class="v3-controls"><label>RDC<select id="v3OccScope"></select></label><button id="v3OccExport">Export Occupancy CSV</button></div>
      <div id="v3OccContent">Memuat data...</div>
    </div>
    <div id="page-v3-costratio" class="page">
      <div class="topbar"><div><h1>Logistics Cost Ratio</h1><div class="period">Warehouse + Distribution Cost terhadap Net Sales</div></div></div>
      <div class="v3-warning"><b>Data governance:</b> Cost Ratio baru boleh ditetapkan sebagai KPI resmi jika biaya dan net sales menggunakan RDC, periode, dan definisi Finance yang sama. Tidak boleh menganggap data kosong sebagai biaya nol.</div>
      <div id="v3CostContent"></div>
      <div class="v3-block"><div class="v3-section-title">Simulasi What-if (bukan KPI aktual)</div><div class="v3-muted">Masukkan biaya dan penjualan untuk menghitung dampak skenario. Nilai tidak disimpan sebagai aktual.</div>
        <div class="v3-controls"><label>Warehouse Cost (Rp)<input id="v3SimWh" type="number" min="0" placeholder="Contoh 100000000"></label>
        <label>Distribution Cost (Rp)<input id="v3SimTransport" type="number" min="0" placeholder="Contoh 200000000"></label>
        <label>Net Sales (Rp)<input id="v3SimSales" type="number" min="0" placeholder="Contoh 10000000000"></label></div>
        <div id="v3SimOutput" class="v3-issue-details">Masukkan tiga nilai untuk menghitung simulasi cost ratio.</div>
      </div>
    </div>`);

  const mgmt=$('mgmtView');
  const summary=$('executiveStatement');
  if(summary)summary.insertAdjacentHTML('afterend',`
    <section id="v3ExecutiveExtras">
      <div class="v3-grid">
        <div class="v3-kpi-card"><div class="v3-eyebrow">Warehouse Occupancy</div><div id="v3ExecutiveOccupancy" class="v3-big">DATA REQUIRED</div><div id="v3ExecutiveOccupancyMeta" class="v3-muted">Menyiapkan snapshot...</div><button type="button" class="v3-button" id="v3OpenOccupancy" style="margin-top:10px">Buka laporan occupancy</button></div>
        <div class="v3-kpi-card"><div class="v3-eyebrow">Logistics Cost Ratio</div><div id="v3ExecutiveCost" class="v3-big">DATA REQUIRED</div><div class="v3-muted">Biaya logistik ÷ net sales. Data Finance belum lengkap; tidak dibuatkan angka estimasi.</div><button type="button" class="v3-button" id="v3OpenCostRatio" style="margin-top:10px">Buka cost ratio</button></div>
      </div>
    </section>`);
  const oldOps=$('opsView');
  const deep=document.createElement('details');deep.id='v3OpsDeepDive';deep.className='v3-deep';deep.innerHTML='<summary>Lihat KPI operasional, DOI, delivery, produktivitas, quality, dan trend terperinci</summary>';
  [...oldOps.childNodes].forEach(node=>deep.appendChild(node));
  oldOps.innerHTML=`
    <section id="v3OpsWorkbench">
      <div id="v3OperationsIntro"><div class="v3-eyebrow">RDC Workbench · WHERE → WHY → WHO → WHAT → WHEN</div>
        <div class="v3-section-title">Operational Control — Exception & Investigation</div>
        <div class="v3-muted">Fokus pada masalah yang perlu ditindaklanjuti. Management melihat keputusan, tim RDC menangani fakta, root cause, dan progress tindakan.</div></div>
      <div class="v3-grid3" id="v3OpsCounts"></div>
      <div class="v3-block"><div class="v3-controls"><label>RDC<select id="v3OpsScope"></select></label>
        <label>Jenis masalah<select id="v3OpsType"><option value="all">Semua exception</option><option value="capacity">Capacity / Occupancy</option><option value="inventory">Inventory / DOI</option></select></label>
        <label>Cari<input id="v3OpsSearch" placeholder="RDC / masalah / kategori" autocomplete="off"></label></div>
        <div class="v3-table-wrap"><table class="v3-table"><thead><tr><th>Prioritas</th><th>RDC</th><th>Exception</th><th>Fakta</th><th>Sumber</th><th>PIC / Status</th></tr></thead><tbody id="v3OpsRows"></tbody></table></div>
        <div id="v3OpsDiagnosis" style="margin-top:14px"></div>
      </div>
    </section>`;
  oldOps.append(deep);

  // Legacy tabs stay in DOM for compatibility with current code, but are never shown.
  const tabs=$('viewTabsWrap');if(tabs)tabs.style.display='none';
  const baseRole=applyRoleUI;
  applyRoleUI=function(){const result=baseRole.apply(this,arguments);if(executiveNav)executiveNav.style.display=CURRENT_RDC_SCOPE?'none':'flex';if($('v3NavDecisions'))$('v3NavDecisions').style.display=CURRENT_RDC_SCOPE?'none':'flex';if(navOps&&CURRENT_RDC_SCOPE)setActive($('navSupplyChain'));return result;};
  const baseSwitch=switchView;
  switchView=function(mode){
    baseSwitch(mode);
    if($('viewTabsWrap'))$('viewTabsWrap').style.display='none';
    if($('page-dashboard')?.classList.contains('active')){
      if(mode==='ops')setActive($('navSupplyChain'));
      else if(!CURRENT_RDC_SCOPE)setActive(executiveNav);
    }
    if($('mainTitle'))$('mainTitle').textContent=mode==='ops'?'SLS Operational Control':'SLS Supply Chain Control Tower';
    if(mode==='ops')renderOps();
  };
  if(executiveNav)executiveNav.addEventListener('click',()=>{switchView(CURRENT_RDC_SCOPE?'ops':'mgmt');});
  if(navOps){
    // Remove the legacy handler that incorrectly jumps to a duplicate KPI strip.
    const replacement=navOps.cloneNode(true);navOps.replaceWith(replacement);
    replacement.addEventListener('click',()=>{const dashboard=$('page-dashboard');document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));dashboard.classList.add('active');switchView('ops');setActive(replacement);$('v3OpsWorkbench')?.scrollIntoView({block:'start',behavior:'smooth'});});
  }
  [ $('navSupplyChain'),$('v3NavOccupancy'),$('v3NavCostRatio'),$('v3NavDecisions') ].filter(Boolean).forEach(n=>{
    n.addEventListener('click',()=>{
      if(window.innerWidth<=820){
        document.querySelector('.sidebar')?.classList.remove('mobile-open');
        $('mobileBackdrop')?.classList.remove('show');
        document.body.classList.remove('mobile-nav-open');
      }
    });
  });
    const v3OpsNav=$('navSupplyChain');
  [inventoryNav,navTransport].forEach(nav=>{if(nav)nav.addEventListener('click',()=>{deep.open=true;setActive(nav);});});

  function navigate(page,nav){
    if(page==='executive'&&CURRENT_RDC_SCOPE)return;
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    const p=$(page==='occupancy'?'page-v3-occupancy':'page-v3-costratio');if(p)p.classList.add('active');
    setActive(nav);
    window.scrollTo({top:0,behavior:'auto'});
    if(page==='occupancy')renderOccupancy();else renderCostRatio();
  }
  $('v3NavDecisions')?.addEventListener('click',()=>{
    if(CURRENT_RDC_SCOPE)return;
    executiveNav?.click();
    $('decisionGrid')?.scrollIntoView({behavior:'smooth',block:'start'});
    setActive($('v3NavDecisions'));
  });
    $('v3NavOccupancy')?.addEventListener('click',()=>navigate('occupancy',$('v3NavOccupancy')));
  $('v3NavCostRatio')?.addEventListener('click',()=>navigate('costratio',$('v3NavCostRatio')));
  $('v3OpenOccupancy')?.addEventListener('click',()=>navigate('occupancy',$('v3NavOccupancy')));
  $('v3OpenCostRatio')?.addEventListener('click',()=>navigate('costratio',$('v3NavCostRatio')));
  $('v3OccScope')?.addEventListener('change',renderOccupancy);
  $('v3OpsScope')?.addEventListener('change',renderOps);
  $('v3OpsType')?.addEventListener('change',renderOps);
  $('v3OpsSearch')?.addEventListener('input',renderOps);
  $('v3OccExport')?.addEventListener('click',downloadOccupancyCSV);
  ['v3SimWh','v3SimTransport','v3SimSales'].forEach(id=>$(id)?.addEventListener('input',renderScenario));
  // Keep sidebar active state singular when switching back to legacy pages.
  document.querySelectorAll('.nav-item[data-page]').forEach(n=>n.addEventListener('click',()=>{
    ['v3NavOccupancy','v3NavCostRatio','v3NavDecisions'].forEach(id=>$(id)?.classList.remove('active'));
  }));
    const baseRender=render;
  render=function(rdc){const result=baseRender(rdc);renderExecutive();renderOps();if(!state.loadPromise&&!IS_OFFLINE_MODE)loadSources();return result;};
  function setOptions(id,includeAll=true){
    const e=$(id);if(!e)return;
    const previous=e.value;let allowed=names.filter(inScope);
    e.innerHTML=(includeAll&&!CURRENT_RDC_SCOPE?'<option value="Semua">Nasional (Semua RDC)</option>':'')+allowed.map(n=>`<option value="${safe(n)}">${safe(n)}</option>`).join('');
    e.value=(allowed.includes(previous)||(!CURRENT_RDC_SCOPE&&previous==='Semua'))?previous:(CURRENT_RDC_SCOPE||'Semua');
    if(!e.value)e.value=allowed[0]||'Semua';
  }
  ['v3OccScope','v3OpsScope'].forEach(id=>setOptions(id));

  async function loadSources(){
    if(state.loadPromise)return state.loadPromise;
    state.loadPromise=(async()=>{
      const data=await Promise.allSettled([
        sbSelect('rdc_snapshot_log','&order=snapshot_date.desc,snapshot_at.desc&limit=120'),
        sbSelect('doi_manual_rdc_snapshot','&order=snapshot_date.desc&limit=50'),
        sbSelect('logistics_cost','&order=cost_date.desc&limit=1000')
      ]);
      ['snap','doi','cost'].forEach((k,i)=>{
        if(data[i].status==='fulfilled')state[k]=Array.isArray(data[i].value)?data[i].value:[];
        else state.errors.push(k+': '+String(data[i].reason));
      });
      state.loaded=true;
      renderExecutive();renderOps();
      if($('page-v3-occupancy').classList.contains('active'))renderOccupancy();
      if($('page-v3-costratio').classList.contains('active'))renderCostRatio();
    })();
    return state.loadPromise;
  }
  function snapshot(){
    const grouped={};const unique=new Map();
    for(const r of state.snap){
      if(!names.includes(r.rdc_name)||!(num(r.kapasitas_box)>0)||num(r.stock_current_box)==null)continue;
      const key=r.snapshot_date+':'+r.rdc_name;
      if(!unique.has(key))unique.set(key,r);
    }
    for(const r of unique.values())(grouped[r.snapshot_date]??=[]).push(r);
    // The national denominator requires a same-date, complete-RDC snapshot.
    const dates=Object.keys(grouped).sort().reverse();
    const complete=dates.find(d=>grouped[d].length===5);
    const dt=complete||dates[0]||null;
    return {date:dt,complete:!!complete,rows:dt?grouped[dt]:[]};
  }
  function currentScope(){
    const sel=$('rdcSelector');
    return scopeName(sel?sel.value:CURRENT_RDC);
  }
  function occupation(rows){
    const totalStock=rows.reduce((s,r)=>s+Number(r.stock_current_box||0),0);
    const totalCap=rows.reduce((s,r)=>s+Number(r.kapasitas_box||0),0);
    return {stock:totalStock,cap:totalCap,free:totalCap-totalStock,pct:percent(totalStock,totalCap)};
  }
  function risk(pct){
    return pct==null?{label:'DATA REQUIRED',cls:''}:pct>100?{label:'OVERLOAD',cls:'critical'}:pct>=Number(CONFIG?.occ_watch_pct||85)?{label:'WATCH',cls:'warn'}:{label:'NORMAL',cls:''};
  }
  function renderExecutive(){
    const s=snapshot(),name=currentScope(),rows=s.rows.filter(r=>inScope(r.rdc_name)&&(name==='Semua'||r.rdc_name===name));
    const o=occupation(rows);
    const isValid=rows.length>0&&(name!=='Semua'||s.complete);
    put('v3ExecutiveOccupancy',isValid?fmt(o.pct,1)+'%':'DATA REQUIRED');
    put('v3ExecutiveOccupancyMeta',isValid?`Stock ${fmt(o.stock)} / capacity ${fmt(o.cap)} box · ${month(s.date)} · ${s.complete?'same-date national':'snapshot RDC'} · historical manual baseline`:'Belum ada snapshot berperiode sama dan lengkap.');
    put('v3ExecutiveCost','DATA REQUIRED');
  }
  function renderOccupancy(){
    if(!state.loaded){put('v3OccContent','<div class="v3-block">Memuat snapshot occupancy dari Supabase...</div>');if(!state.loadPromise&&!IS_OFFLINE_MODE)loadSources();return;}
    const s=snapshot(),scope=scopeName($('v3OccScope')?.value),rows=s.rows.filter(r=>inScope(r.rdc_name)&&(scope==='Semua'||scope===r.rdc_name));
    if(!rows.length){put('v3OccContent','<div class="v3-block">DATA REQUIRED — tidak ada snapshot occupancy valid untuk pilihan ini.</div>');return;}
    const o=occupation(rows),national=scope==='Semua',valid=!national||s.complete;
    const cards=`<div class="v3-grid3">
      <div class="v3-kpi-card"><div class="v3-eyebrow">Occupancy ${national?'Nasional':safe(scope)}</div><div class="v3-big">${valid?fmt(o.pct,1)+'%':'DATA REQUIRED'}</div><div class="v3-muted">Stock / design capacity</div></div>
      <div class="v3-kpi-card"><div class="v3-eyebrow">Stok Terpakai</div><div class="v3-big">${fmt(o.stock)} <span style="font-size:13px">box</span></div><div class="v3-muted">Kapasitas ${fmt(o.cap)} box</div></div>
      <div class="v3-kpi-card"><div class="v3-eyebrow">Capacity Remaining</div><div class="v3-big">${fmt(o.free)} <span style="font-size:13px">box</span></div><div class="v3-muted">Stock minus capacity bila negatif</div></div></div>`;
    const rowsHtml=rows.sort((a,b)=>Number(b.stock_current_box)/Number(b.kapasitas_box)-Number(a.stock_current_box)/Number(a.kapasitas_box)).map(r=>{
      const pct=percent(Number(r.stock_current_box),Number(r.kapasitas_box)),st=risk(pct);
      return `<tr><td><b>${safe(r.rdc_name)}</b></td><td class="num">${fmt(r.stock_current_box)}</td><td class="num">${fmt(r.kapasitas_box)}</td><td class="num">${fmt(Number(r.kapasitas_box)-Number(r.stock_current_box))}</td>
      <td style="min-width:130px"><b>${fmt(pct,1)}%</b><div class="v3-bar"><span class="${st.cls}" style="width:${Math.min(100,Math.max(0,pct))}%"></span></div></td><td><span class="v3-pill ${st.cls}">${st.label}</span></td></tr>`;
    }).join('');
    let issues=rows.filter(r=>percent(Number(r.stock_current_box),Number(r.kapasitas_box))>=Number(CONFIG?.occ_watch_pct||85))
      .map(r=>`${safe(r.rdc_name)} ${fmt(percent(Number(r.stock_current_box),Number(r.kapasitas_box)),1)}%`).join('; ');
    put('v3OccContent',`
      <div class="v3-muted" style="margin:14px 0">Snapshot: <b>${month(s.date)}</b> · ${s.complete?'5 RDC konsisten di tanggal yang sama':'Snapshot nasional belum lengkap'} · Status: HISTORICAL / MANUAL VALIDATED · Target peringatan: ${fmt(CONFIG?.occ_watch_pct||85)}%</div>
      ${cards}<div class="v3-block"><div class="v3-section-title">Occupancy per RDC</div>
      <div class="v3-table-wrap"><table class="v3-table"><thead><tr><th>RDC</th><th>Stock (box)</th><th>Capacity (box)</th><th>Sisa (box)</th><th>Occupancy</th><th>Status</th></tr></thead><tbody>${rowsHtml}</tbody></table></div></div>
      <div class="v3-block"><div class="v3-section-title">Automated Insight & Next Action</div><div class="v3-issue-details">
      ${issues?`<b>Capacity Watch:</b> ${issues}. Validasi slotting, pallet position, dan rencana inbound sebelum memutuskan perpindahan.`:'Tidak ada RDC di pilihan ini yang melampaui batas watch berdasarkan snapshot tersebut.'}
      <div style="margin-top:8px">Transfer antar-RDC <b>belum boleh otomatis dieksekusi</b> tanpa kecocokan SKU/series, free stock, kebutuhan tujuan dan pembandingan biaya TMS.</div></div></div>`);
  }
  function renderCostRatio(){
    if(!state.loaded&&!state.loadPromise&&!IS_OFFLINE_MODE)loadSources();
    const totalRows=state.cost.length;
    put('v3CostContent',`<div class="v3-grid3" style="margin-top:14px">
      <div class="v3-kpi-card"><div class="v3-eyebrow">Logistics Cost Ratio</div><div class="v3-big">DATA REQUIRED</div><div class="v3-muted">Total logistics cost / net sales × 100%</div></div>
      <div class="v3-kpi-card"><div class="v3-eyebrow">Warehouse Cost</div><div class="v3-big">DATA REQUIRED</div><div class="v3-muted">Storage + manpower + handling + overhead terdefinisi</div></div>
      <div class="v3-kpi-card"><div class="v3-eyebrow">Distribution Cost</div><div class="v3-big">DATA REQUIRED</div><div class="v3-muted">${totalRows} entri logistics_cost ditemukan; butuh rekonsiliasi Finance</div></div></div>
      <div class="v3-block"><div class="v3-section-title">Cost Ratio per RDC · ${new Date().toLocaleDateString('id-ID',{month:'long',year:'numeric'})}</div>
      <div class="v3-muted">Belum tersedia net sales per RDC dan sumber warehouse cost yang tervalidasi. Angka tidak dipaksakan menjadi 0%.</div>
      <div class="v3-table-wrap"><table class="v3-table"><thead><tr><th>RDC</th><th>Warehouse</th><th>Distribution</th><th>Net Sales</th><th>Cost Ratio</th></tr></thead>
      <tbody>${names.filter(inScope).map(n=>`<tr><td><b>${safe(n)}</b></td><td>DATA REQUIRED</td><td>DATA REQUIRED</td><td>DATA REQUIRED</td><td><span class="v3-pill warn">DATA REQUIRED</span></td></tr>`).join('')}</tbody></table></div></div>
      <div class="v3-block"><div class="v3-section-title">Formula & Data Requirement</div>
      <div class="v3-muted"><b>Total Cost</b> = Warehouse Cost + Distribution Cost (hindari double count). <b>Cost Ratio</b> = Total Cost ÷ Net Sales × 100%. Bulanan serta YTD = SUM(cost) ÷ SUM(sales), <b>bukan</b> rata-rata rasio RDC atau bulan. Perlu GL/Finance actual, alokasi biaya pusat, net sales sesudah retur/diskon, dan kode RDC/periode yang sama.</div></div>`);
    renderScenario();
  }
  function renderScenario(){
    const w=$('v3SimWh')?.value,t=$('v3SimTransport')?.value,s=$('v3SimSales')?.value;
    if(w===''||t===''||s===''){put('v3SimOutput','Masukkan tiga nilai untuk menghitung simulasi. Nilai tidak masuk KPI aktual.');return;}
    const wh=num(w),dist=num(t),sales=num(s);
    if(wh<0||dist<0||!(sales>0)){put('v3SimOutput','Net Sales harus lebih besar dari 0 dan biaya tidak boleh negatif.');return;}
    put('v3SimOutput',`<b>SIMULASI — BUKAN ACTUAL</b><br>Total cost: <b>Rp ${fmt(wh+dist)}</b> · Net sales: <b>Rp ${fmt(sales)}</b><br><span style="font-size:26px;font-weight:800;color:var(--navy)">${fmt(100*(wh+dist)/sales,2)}%</span> · WH ${fmt(wh/sales*100,2)}% + Distribution ${fmt(dist/sales*100,2)}%`);
  }
  function buildIssues(){
    const s=snapshot(),issues=[];
    s.rows.filter(r=>inScope(r.rdc_name)).forEach(r=>{
      const pct=percent(Number(r.stock_current_box),Number(r.kapasitas_box));
      if(pct>=Number(CONFIG?.occ_watch_pct||85)){
        issues.push({type:'capacity',severity:pct>100?'critical':'warn',rdc:r.rdc_name,title:'Occupancy '+(pct>100?'Overload':'Capacity Watch'),
          value:fmt(pct,1)+'% occupancy',source:month(s.date)+' · historical',fact:`${fmt(r.stock_current_box)} box / ${fmt(r.kapasitas_box)} capacity`,reason:'Kapasitas fisik berdasarkan barcode/pallet belum direkonsiliasi. Demand, slotting dan penerimaan inbound perlu dicek.',
          action:'Cek posisi pallet & inbound, evaluasi penataan ruang; siapkan simulasi transfer jika feasible.'});
      }
    });
    const latest=new Map();state.doi.forEach(r=>{if(!latest.has(r.rdc_name))latest.set(r.rdc_name,r)});
    for(const r of latest.values()){
      if(!inScope(r.rdc_name))continue;const doi=Number(r.doi_days);
      if(doi>45){
        issues.push({type:'inventory',severity:doi>75?'critical':'warn',rdc:r.rdc_name,title:'Inventory Days di atas 45',
          value:fmt(doi,1)+' hari DOI',source:month(r.snapshot_date)+' · manual',fact:`Stok ${fmt(r.current_stock_box)} box, 3M avg ${fmt(r.avg_sales_3m_box)} box/bulan, no movement ${fmt(r.no_movement_3m_stock)} box.`,
          reason:'Klasifikasi SKU dan kecocokan permintaan RDC tujuan belum tervalidasi; DOI agregat bukan bukti deadstock.',
          action:'Lakukan assortment review per SKU, hold PR untuk excess tervalidasi, validasi koridor transfer dan cost.'});
      }else if(Number(r.no_movement_3m_stock)>0){
        issues.push({type:'inventory',severity:'info',rdc:r.rdc_name,title:'Stock Tidak Bergerak 3M',
          value:fmt(r.no_movement_3m_stock)+' box',source:month(r.snapshot_date)+' · manual',
          fact:`DOI agregat ${fmt(doi,1)} hari; ${fmt(r.no_movement_3m_stock)} box tanpa movement 3M.`,
          reason:'Status kandidat, bukan deadstock pasti; memerlukan data material/SKU dan verifikasi dengan Commercial.',
          action:'Review daftar material dan kebijakan stock sebelum rekomendasi transfer atau flush out.'});
      }
    }
    return issues.sort((a,b)=>({'critical':0,'warn':1,'info':2}[a.severity]-{'critical':0,'warn':1,'info':2}[b.severity])||a.rdc.localeCompare(b.rdc));
  }
  function renderOps(){
    if(!$('v3OpsRows'))return;
    if(!state.loaded){put('v3OpsRows','<tr><td colspan="6">Memuat exception dari snapshot Supabase...</td></tr>');return;}
    state.issues=buildIssues();
    const scope=scopeName($('v3OpsScope')?.value),type=$('v3OpsType')?.value||'all',search=($('v3OpsSearch')?.value||'').toLowerCase();
    const filtered=state.issues.filter(x=>(scope==='Semua'||x.rdc===scope)&&(type==='all'||type===x.type)&&(`${x.rdc} ${x.title} ${x.value}`).toLowerCase().includes(search));
    put('v3OpsCounts',[
      ['Total Exceptions',filtered.length,'Berdasarkan snapshot terbaru per sumber'],
      ['Critical',filtered.filter(i=>i.severity==='critical').length,'Perlu investigasi prioritas'],
      ['Capacity Watch',filtered.filter(i=>i.type==='capacity').length,'Bukan konfirmasi overload live']
    ].map(a=>`<div class="v3-kpi-card"><div class="v3-eyebrow">${a[0]}</div><div class="v3-big">${a[1]}</div><div class="v3-muted">${a[2]}</div></div>`).join(''));
    if(!filtered.length){put('v3OpsRows','<tr><td colspan="6">Tidak ada exception untuk filter ini berdasarkan data yang tersedia.</td></tr>');put('v3OpsDiagnosis','');return;}
    if(!filtered.includes(state.selected))state.selected=filtered[0];
    put('v3OpsRows',filtered.map((x,i)=>`<tr class="v3-selectable ${x===state.selected?'v3-selected':''}" data-v3-issue="${i}">
        <td><span class="v3-pill ${x.severity==='info'?'':x.severity}">${x.severity.toUpperCase()}</span></td>
        <td><b>${safe(x.rdc)}</b></td><td>${safe(x.title)}</td><td>${safe(x.value)}</td>
        <td>${safe(x.source)}</td><td>${safe(ACTION_TRACKER?.find(a=>a.issue===x.title+' — '+x.rdc)?.owner||'Pending Assignment')}</td></tr>`).join(''));
    $('v3OpsRows').querySelectorAll('[data-v3-issue]').forEach(tr=>tr.addEventListener('click',()=>{state.selected=filtered[Number(tr.dataset.v3Issue)];renderOps();}));
    const x=state.selected;put('v3OpsDiagnosis',`<div class="v3-issue-details"><div class="v3-eyebrow">RDC Investigation · ${safe(x.rdc)}</div>
      <h3 style="margin:8px 0;color:var(--navy)">${safe(x.title)} · ${safe(x.value)}</h3>
      <p><b>FACT:</b> ${safe(x.fact)}</p><p><b>ROOT CAUSE STATUS:</b> Belum terkonfirmasi. ${safe(x.reason)}</p>
      <p><b>RECOMMENDED NEXT ACTION:</b> ${safe(x.action)}</p>
      <div class="v3-muted">Sumber: ${safe(x.source)} · status ANALISIS RULE-BASED / PERLU VALIDASI LAPANGAN</div>
      ${CURRENT_ROLE==='master'?'<button type="button" class="v3-button" id="v3AssignIssue" style="margin-top:12px">Tugaskan PIC, Deadline & Status</button>':'<div class="v3-muted">Penugasan melalui Master / Action Tracker.</div>'}</div>`);
    $('v3AssignIssue')?.addEventListener('click',()=>openActionEditor(x.title+' — '+x.rdc,x.rdc,x.action,null));
  }
  function downloadOccupancyCSV(){
    const s=snapshot();if(!s.rows.length)return;
    const scope=scopeName($('v3OccScope')?.value);
    const filtered=s.rows.filter(r=>inScope(r.rdc_name)&&(scope==='Semua'||scope===r.rdc_name));
    let csv='\ufeff'+'RDC;Tanggal Snapshot;Stock Box;Capacity Box;Remaining Box;Occupancy %;Source\n'+filtered.map(r=>{
      const pct=percent(Number(r.stock_current_box),Number(r.kapasitas_box));
      return [r.rdc_name,s.date,r.stock_current_box,r.kapasitas_box,Number(r.kapasitas_box)-Number(r.stock_current_box),pct?.toFixed(2),'rdc_snapshot_log'].join(';');
    }).join('\n');
    const u=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a');a.href=u;a.download=`SLS_Occupancy_${scope}_${s.date||'no-date'}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
  }
})();