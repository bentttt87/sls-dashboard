(function slsV4(){
'use strict';
const $=id=>document.getElementById(id);
const fmt=(n,d=0)=>Number.isFinite(Number(n))?Number(n).toLocaleString('id-ID',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
const safe=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names=['Jakarta','Semarang','Surabaya','Denpasar','Palembang'];
const st={doi:[],occ:[],checks:[],loaded:false,busy:null,asof:null};
const dc={0:'DATA REQUIRED'};
const pct=(a,b)=>b>0?a/b*100:null;
const dateLabel=s=>s?new Date(String(s).slice(0,10)+'T12:00:00').toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}):'—';
const selected=()=>CURRENT_RDC_SCOPE||$('rdcSelector')?.value||CURRENT_RDC||'Semua';
const group=()=>{const area=selected();return area==='Semua'?'Nasional':area};
function paint(id,content){const e=$(id);if(e)e.innerHTML=content}
function rule(v){return v>75?'CRITICAL':v>60?'HIGH':v>45?'WATCH':'NORMAL'}
function label(text,type='soft'){return `<span class="ct4-tag ${type}">${safe(text)}</span>`}
function data(){
const m=new Map();
for(const r of st.doi){if(names.includes(r.rdc_name)&&!m.has(r.rdc_name))m.set(r.rdc_name,r)}
let arr=[...m.values()];
const area=selected();
if(area!=='Semua')arr=arr.filter(r=>r.rdc_name===area);
return arr;
}
function occupancy(){
const g={};
for(const r of st.occ){if(names.includes(r.rdc_name)&&Number(r.kapasitas_box)>0&&Number(r.stock_current_box)>=0){(g[r.snapshot_date]??=[]).push(r)}}
const dates=Object.keys(g).sort().reverse();
const full=dates.find(d=>new Set(g[d].map(x=>x.rdc_name)).size===5),day=full||dates[0];
if(!day)return {date:null,rows:[],complete:false};
const unique=new Map();
for(const r of g[day])if(!unique.has(r.rdc_name))unique.set(r.rdc_name,r);
const area=selected();
return {date:day,rows:[...unique.values()].filter(r=>!CURRENT_RDC_SCOPE||r.rdc_name===CURRENT_RDC_SCOPE).filter(r=>area==='Semua'||r.rdc_name===area),complete:!!full};
}
const css=document.createElement('style');
css.id='ct4-style';
css.textContent=`
/* SLS V4: match the approved V2 GM mockup without removing the operational core */
:root{--ct4-navy:#18355B;--ct4-ink:#243149;--ct4-muted:#66788E;--ct4-line:#DFE6EF;--ct4-bg:#F5F7FA;--ct4-amber:#BC7A17;--ct4-red:#BB493C}
body{background:var(--ct4-bg)!important;color:var(--ct4-ink)!important;font-family:'Inter','Segoe UI',Arial,sans-serif!important}
#appRoot.app{grid-template-columns:236px minmax(0,1fr)!important}
#appRoot.app[style*="display: none"]{display:none!important}
.sidebar{background:#fff!important;border-right:1px solid var(--ct4-line)!important;box-shadow:none!important;padding:23px 14px!important;color:var(--ct4-ink)!important}
.sidebar .brand{gap:10px!important;align-items:center!important;padding:0 9px 12px!important;margin-bottom:8px!important;border-bottom:1px solid var(--ct4-line);flex-direction:row!important}
.sidebar .brand>span{color:var(--ct4-navy)!important;font-weight:800!important;font-size:12px!important;line-height:1.25!important;align-self:center!important}
.sidebar .brand-official-logo{width:78px!important;max-width:78px!important;background:transparent!important}
.sidebar .brand-sub{color:#7c8a9c!important;text-transform:none!important;letter-spacing:0!important;margin:0 9px 7px!important;font-size:11px!important}
.sidebar .nav-scroll{padding:0 14px!important;margin:0 -14px!important}
.sidebar .nav-section-title{color:#8290a2!important;letter-spacing:1.4px!important;font-size:10px!important;font-weight:800!important;margin:17px 9px 9px!important}
.sidebar .nav-item{font-size:14px!important;line-height:1.35!important;font-weight:650!important;color:#5b6e83!important;border-radius:9px!important;margin-bottom:4px!important;padding:11px 12px!important;background:transparent;min-height:42px!important}
.sidebar .nav-item:hover{background:#f1f5fa!important;color:var(--ct4-navy)!important}
.sidebar .nav-item.active{background:#eaf0f8!important;color:var(--ct4-navy)!important;border-left:3px solid var(--ct4-navy)!important;padding-left:9px!important}
.sidebar .nav-icon{color:inherit!important}
.sidebar .sidebar-foot{display:none!important}
.sidebar .logout-btn{color:#536782!important;background:#f2f5f9!important;border:1px solid var(--ct4-line)!important;border-radius:8px!important}
.sidebar .export-btn{font-size:12px!important;border-color:#d8e2ed!important;color:#325276!important}
#roleBadge.master,#roleBadge.user{background:#e9eef6!important;color:var(--ct4-navy)!important;border:1px solid #d8e2ed!important}
#dataGovBadge{background:#e9f0f8!important;color:#315879!important}
#authSessionBadge{border:1px solid #d1e2d5!important}
.main{background:var(--ct4-bg)!important;min-width:0!important;padding:25px 32px 45px!important}
#dashboardStickyHeader{background:var(--ct4-bg)!important;padding:0!important;box-shadow:none!important;position:relative!important;border:none!important;margin:0 0 11px!important}
#dashboardStickyHeader .topbar{align-items:center!important;padding:0 0 12px!important;min-height:auto!important;border:none!important}
#mainTitle{font-size:25px!important;line-height:1.2!important;color:var(--ct4-navy)!important;letter-spacing:-.3px!important;font-weight:800!important}
#periodLine{font-size:12px!important;color:var(--ct4-muted)!important}
#rdcSelectorWrap{background:#fff!important;border:1px solid var(--ct4-line)!important;border-radius:9px!important;padding:10px 12px!important}
#rdcSelector{font-size:14px!important}
#dataStatusLegend,#viewTabsWrap{display:none!important}
#mgmtView{max-width:1700px;margin:0 auto}
#mgmtView > :not(#ct4-executive){display:none!important}
.ct4-ui{font-family:'Inter','Segoe UI',Arial,sans-serif;color:var(--ct4-ink);font-size:14px;line-height:1.5}
.ct4-ui *{box-sizing:border-box}
.ct4-ui h2{font-size:22px!important;line-height:1.35!important;color:var(--ct4-navy)!important;margin:5px 0 12px!important;font-weight:800!important}
.ct4-eyebrow{font-size:11px;letter-spacing:1.2px;font-weight:850;color:#71859b}
.ct4-note{color:var(--ct4-muted);font-size:13px;line-height:1.6}
.ct4-banner{display:flex;gap:8px;align-items:center;flex-wrap:wrap;background:#eaf1f9;border:1px solid #d9e4ef;padding:12px 15px;border-radius:9px;margin:17px 0;color:#385778;font-size:13px}
.ct4-banner b{color:var(--ct4-navy)}
.ct4-section-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap;margin:26px 0 12px}
.ct4-section-head h3{font-size:19px!important;font-weight:850!important;margin:0!important;color:var(--ct4-navy)!important}
.ct4-section-head span{color:#8290a1;font-size:12px}
.ct4-focus{display:grid;grid-template-columns:minmax(0,1.75fr) minmax(0,1fr);gap:15px}
.ct4-focus-left,.ct4-focus-right,.ct4-card,.ct4-panel{background:#fff;border:1px solid var(--ct4-line);border-radius:12px;box-shadow:none}
.ct4-focus-left{border-left:5px solid var(--ct4-amber);padding:20px 23px}
.ct4-focus-right{padding:19px 20px}
.ct4-minor{font-size:11px;letter-spacing:.5px;font-weight:850;color:#bc781a}
.ct4-hero-value{font-size:34px;font-weight:850;color:var(--ct4-navy);line-height:1.17}
.ct4-hero-value small{font-size:14px;color:var(--ct4-muted);font-weight:700}
.ct4-decision{margin-top:15px;padding-top:12px;border-top:1px solid #e6ecf3;font-size:14px;line-height:1.6}
.ct4-decision b{color:var(--ct4-navy)}
.ct4-tags{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}
.ct4-tag{display:inline-block;border-radius:6px;background:#eef1f5;color:#617187;font-size:11px;font-weight:750;padding:5px 8px;line-height:1.3}
.ct4-tag.amber{background:#fff3df;color:#985e13}.ct4-tag.red{background:#fdecea;color:#ad4238}.ct4-tag.green{background:#e5f4eb;color:#227d5a}.ct4-tag.blue{background:#e6f0fb;color:#2d6798}
.ct4-fresh-row{display:flex;justify-content:space-between;align-items:center;gap:12px;border-bottom:1px solid #edf0f4;padding:9px 0;font-size:13px}
.ct4-fresh-row:last-child{border-bottom:0}
.ct4-fresh-row b{font-weight:800;color:var(--ct4-navy)}
.ct4-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:13px}
.ct4-metrics.four{grid-template-columns:repeat(4,minmax(0,1fr))}
.ct4-card{padding:17px 18px;min-height:122px}
.ct4-k{color:#60758d;font-size:13px;font-weight:700}
.ct4-v{font-size:28px;font-weight:850;color:var(--ct4-navy);letter-spacing:-.4px;line-height:1.15;margin:9px 0 6px}
.ct4-v.small{font-size:19px;margin-top:12px}
.ct4-v small{font-size:13px;color:var(--ct4-muted)}
.ct4-m{font-size:12px;color:#78889a;line-height:1.5}
.ct4-two{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:15px}
.ct4-panel{overflow:hidden}
.ct4-panel-head{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:15px 18px;border-bottom:1px solid var(--ct4-line)}
.ct4-panel-head b{color:var(--ct4-navy);font-size:16px}
.ct4-panel-body{padding:17px 19px}
.ct4-table-wrap{overflow-x:auto}
.ct4-table{width:100%;border-collapse:collapse;font-size:14px;line-height:1.4}
.ct4-table th{background:#f5f8fc;color:#60758c;text-align:left;font-size:12px;letter-spacing:0;font-weight:750}
.ct4-table th,.ct4-table td{padding:12px 12px;border-bottom:1px solid #e9eef4}
.ct4-table tr:last-child td{border-bottom:0}
.ct4-table th.r,.ct4-table td.r{text-align:right;font-variant-numeric:tabular-nums}
.ct4-table .highlight{background:#fff8ec}
.ct4-bar{height:10px;background:#e6edf5;border-radius:10px;overflow:hidden;min-width:90px}
.ct4-bar>span{display:block;height:100%;border-radius:10px;background:#39799e}
.ct4-bar>span.warn{background:#ce8d2a}.ct4-bar>span.danger{background:#bd5146}
.ct4-insight{border-left:4px solid #d9e3ee;padding:4px 0 6px 12px;margin-bottom:15px}
.ct4-insight.warn{border-left-color:#cc8b2a}.ct4-insight.danger{border-left-color:#bb493c}
.ct4-insight b{color:var(--ct4-navy);font-size:14px}
.ct4-insight .ct4-note{margin-top:5px}
.ct4-action-line{color:#336e9c;font-weight:750;font-size:13px;margin-top:5px}
.ct4-step{display:flex;gap:10px;margin:12px 0;font-size:13px}
.ct4-step b{min-width:76px;color:#36516c}
.ct4-footnote{color:#8390a2;font-size:12px;margin:11px 0}
.ct4-link{border:1px solid #c9d8e8;background:#fff;border-radius:8px;padding:9px 13px;color:#24466d;font-size:13px;font-weight:800;cursor:pointer;margin:9px 0 0}
.ct4-link:hover{background:#eef4f9}
.ct4-table th{white-space:nowrap}
.ct4-report{margin-top:13px}
#opsView .v3-grid3{grid-template-columns:repeat(3,minmax(0,1fr))}
#opsView .v3-kpi-card,#page-v3-occupancy .v3-kpi-card,#page-v3-costratio .v3-kpi-card,#page-v3-occupancy .v3-block,#page-v3-costratio .v3-block{border-color:var(--ct4-line)!important;border-radius:12px!important;box-shadow:none!important}
#opsView .v3-section-title,#page-v3-occupancy .v3-section-title,#page-v3-costratio .v3-section-title{font-size:20px!important}
#opsView .v3-table,#page-v3-occupancy .v3-table,#page-v3-costratio .v3-table{font-size:14px!important}
#opsView .v3-table th,#page-v3-occupancy .v3-table th,#page-v3-costratio .v3-table th{font-size:12px!important}
#opsView .v3-table td,#page-v3-occupancy .v3-table td,#page-v3-costratio .v3-table td{padding:12px!important}
#page-v3-occupancy,#page-v3-costratio{background:transparent}
#page-v3-occupancy .topbar h1,#page-v3-costratio .topbar h1{font-size:25px!important;color:var(--ct4-navy)!important}
@media(max-width:1200px){.ct4-focus,.ct4-two{grid-template-columns:1fr}.ct4-metrics.four{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:960px){.ct4-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.main{padding:22px 20px!important}}
@media(max-width:820px){#appRoot.app{display:block!important}.sidebar{padding:13px 16px!important;border-bottom:1px solid var(--ct4-line)!important}.main{padding:14px!important}.ct4-focus{grid-template-columns:1fr}.ct4-metrics.four{grid-template-columns:repeat(2,minmax(0,1fr))}.sidebar.mobile-open{z-index:501!important}}
@media(max-width:570px){.ct4-metrics,.ct4-metrics.four,#opsView .v3-grid3{grid-template-columns:1fr}.ct4-ui h2{font-size:19px!important}.ct4-section-head h3{font-size:18px!important}}
@media print{.sidebar,#v3NavCostRatio,#rdcSelectorWrap{display:none!important}.ct4-card,.ct4-panel,.ct4-focus-left,.ct4-focus-right{break-inside:avoid}#mgmtView > :not(#ct4-executive){display:none!important}}
`;
document.head.appendChild(css);
const mg=$('mgmtView');if(!mg)return;
const shell=document.createElement('div');shell.id='ct4-executive';shell.className='ct4-ui';mg.prepend(shell);
const printTools=document.createElement('div');printTools.id='ct4PrintTools';
printTools.innerHTML='<button type="button" class="ct4-link" id="ct4PrintBtn" style="margin:0">Cetak Review</button>';
$('dashboardStickyHeader')?.querySelector('.filters')?.append(printTools);
$('ct4PrintBtn')?.addEventListener('click',()=>{if(typeof exportPDF==='function')exportPDF();});

function draw(){
  if(!$('ct4-executive'))return;
  const r=data(),occ=occupancy(),full=selected()==='Semua',
        stock=r.reduce((s,x)=>s+Number(x.current_stock_box||0),0),
        avg=r.reduce((s,x)=>s+Number(x.avg_sales_3m_box||0),0),
        nm=r.reduce((s,x)=>s+Number(x.no_movement_3m_stock||0),0),
        doi=avg>0?stock/avg*30:null,
        used=occ.rows.reduce((s,x)=>s+Number(x.stock_current_box||0),0),
        capacity=occ.rows.reduce((s,x)=>s+Number(x.kapasitas_box||0),0),
        occPct=pct(used,capacity),
        worst=[...r].sort((a,b)=>Number(b.doi_days)-Number(a.doi_days))[0],
        mostNonMove=[...r].sort((a,b)=>Number(b.no_movement_3m_stock)-Number(a.no_movement_3m_stock))[0],
        occWorst=[...occ.rows].sort((a,b)=>Number(b.stock_current_box)/Number(b.kapasitas_box)-Number(a.stock_current_box)/Number(a.kapasitas_box))[0],
        ready=st.loaded&&r.length>0,
        latestDates=[...new Set(r.map(x=>x.snapshot_date))].sort(),
        issueCount=r.filter(x=>Number(x.doi_days)>75||Number(x.no_movement_3m_stock)>0).length;
  const freshness=`DOI ${latestDates.length?latestDates.map(dateLabel).join(', '):'belum tersedia'} · Occupancy ${dateLabel(occ.date)} · Logistics Cost: DATA REQUIRED`;
  let current=worst?Number(worst.doi_days):null;
  let title=worst?`${worst.rdc_name}: perputaran stok ${current>75?'sangat lambat':current>45?'perlu diperhatikan':'perlu dijaga'}`:'Menyiapkan ringkasan inventory';
  let action=worst?'Review SKU bersama Commercial. Evaluasi hold PR dan program sell-out. Transfer hanya setelah kecocokan SKU/series, demand tujuan, kapasitas, dan ongkos TMS tervalidasi.':'Lengkapi snapshot inventory sebelum mengusulkan transfer.';
  const kd=[
    ['Physical Stock · RDC',ready?fmt(stock)+' <small>box</small>':'DATA REQUIRED','Agregasi snapshot manual DOI'],
    ['Days of Inventory',ready&&doi!=null?fmt(doi,1)+' <small>hari</small>':'DATA REQUIRED','Σ stock ÷ Σ Avg Sales 3M × 30'],
    ['No Movement · 3 Bulan',ready?fmt(nm)+' <small>box</small>':'DATA REQUIRED','Candidate; perlu review SKU'],
    ['Inventory Accuracy','PARTIAL','Stock opname 4/5 RDC · periode tidak sama',true],
    ['Warehouse Occupancy',occPct!=null&&(!full||occ.complete)?fmt(occPct,1)+'%':'DATA REQUIRED',`Snapshot ${dateLabel(occ.date)} · historical`],
    ['Logistics Cost Ratio','DATA REQUIRED','Finance & Net Sales belum terintegrasi',true]
  ];
  const risk=x=>Number(x.doi_days)>75?'CRITICAL':Number(x.doi_days)>60?'HIGH':Number(x.doi_days)>45?'WATCH':'NORMAL';
  const rdcs=r.slice().sort((a,b)=>Number(b.doi_days)-Number(a.doi_days)).map(x=>`<tr class="${Number(x.doi_days)>75?'highlight':''}"><td><b>${safe(x.rdc_name)}</b></td><td class="r">${fmt(x.current_stock_box)}</td><td class="r"><b>${fmt(x.doi_days,1)}</b></td><td class="r">${fmt(x.no_movement_3m_stock)}</td><td>${label(risk(x),Number(x.doi_days)>75?'red':Number(x.doi_days)>45?'amber':'green')}</td></tr>`).join('');
  const occLines=occ.rows.slice().sort((a,b)=>Number(b.stock_current_box)/Number(b.kapasitas_box)-Number(a.stock_current_box)/Number(a.kapasitas_box)).map(x=>{
    const n=pct(Number(x.stock_current_box),Number(x.kapasitas_box)),level=n>=100?'danger':n>=85?'warn':'';
    return `<div style="display:grid;grid-template-columns:96px minmax(75px,1fr) 63px;gap:10px;align-items:center;padding:8px 0"><b>${safe(x.rdc_name)}</b><div class="ct4-bar"><span class="${level}" style="width:${Math.min(100,n)}%"></span></div><b style="text-align:right">${fmt(n,1)}%</b></div>`
  }).join('');
  shell.innerHTML=`
    <div class="ct4-eyebrow">NATIONAL SUPPLY CHAIN · MANAGEMENT REVIEW</div>
    <div class="ct4-note">Dari kinerja operasional → risiko bisnis → tindakan → keputusan manajemen</div>
    <div class="ct4-banner"><b>STATUS SUMBER</b><span>${safe(freshness)}</span>${!ready?label('DATA REQUIRED','red'):label('DOI 5 RDC tersedia','green')}</div>

    <div class="ct4-section-head"><h3>01 · Fokus Manajemen</h3><span>Apa masalah utama? Apa yang harus diputuskan?</span></div>
    <div class="ct4-focus">
      <div class="ct4-focus-left">
        <div class="ct4-minor">PRIORITAS INVENTORY · BUTUH REVIEW SKU</div>
        <h2>${safe(title)}</h2>
        <div class="ct4-hero-value">${current!=null?fmt(current,1):'—'} <small>hari DOI</small></div>
        <div class="ct4-note">${worst?fmt(worst.no_movement_3m_stock)+' box tanpa movement 3 bulan · snapshot '+dateLabel(worst.snapshot_date):'Snapshot belum tersedia'}</div>
        <div class="ct4-decision"><b>Rekomendasi keputusan:</b> ${safe(action)}</div>
        <div class="ct4-tags">${label('Rekomendasi awal','amber')}${label('Belum boleh auto-transfer','red')}${label('Sumber snapshot manual','blue')}</div>
      </div>
      <div class="ct4-focus-right">
        <b style="color:var(--ct4-navy);font-size:16px">Kesiapan Data Pengambilan Keputusan</b><div class="ct4-note">Ketersediaan data ≠ pencapaian KPI.</div>
        <div class="ct4-fresh-row">DOI Summary RDC ${label(ready?`${r.length}/${full?5:1} RDC`:'DATA REQUIRED',ready?'green':'red')}</div>
        <div class="ct4-fresh-row">Detail SKU untuk aksi ${label(st.checks.sku?'Tersedia':'0 baris',st.checks.sku?'green':'red')}</div>
        <div class="ct4-fresh-row">Opname Akunting ${label('4/5 RDC (audit terakhir)','amber')}</div>
        <div class="ct4-fresh-row">OTIF & Logistics Cost ${label(st.checks.otif&&st.checks.cost?'Cek konsistensi data':'DATA REQUIRED',st.checks.otif&&st.checks.cost?'amber':'red')}</div>
        <div class="ct4-fresh-row">Action Tracker ${label(st.checks.action?'>0 record':'DATA REQUIRED','amber')}</div>
      </div>
    </div>

    <div class="ct4-section-head"><h3>02 · Snapshot Kinerja Inventory ${full?'Nasional':safe(group())}</h3><span>Periode tiap sumber dicantumkan, bukan real-time</span></div>
    <div class="ct4-metrics">${kd.map(([t,v,m,small])=>`<div class="ct4-card"><div class="ct4-k">${t}</div><div class="ct4-v${small?' small':''}">${v}</div><div class="ct4-m">${m}</div></div>`).join('')}</div>

    <div class="ct4-section-head" id="ct4InventoryAnchor"><h3>03 · Kondisi RDC & Insight Otomatis</h3><span>Risiko prioritas dengan batasan data yang jelas</span></div>
    <div class="ct4-two">
      <div class="ct4-panel"><div class="ct4-panel-head"><b>RDC Inventory Health</b>${label('Manual snapshot','blue')}</div>
        <div class="ct4-table-wrap"><table class="ct4-table"><thead><tr><th>RDC</th><th class="r">Stock Box</th><th class="r">DOI Hari</th><th class="r">No Move 3M</th><th>Status</th></tr></thead>
        <tbody>${rdcs||'<tr><td colspan="5">DATA REQUIRED — ringkasan DOI belum tersedia.</td></tr>'}</tbody></table></div></div>
      <div class="ct4-panel"><div class="ct4-panel-head"><b>Insight → Action → Decision</b>${label('Rule-based','amber')}</div>
        <div class="ct4-panel-body">
          ${worst?`<div class="ct4-insight danger"><b>${safe(worst.rdc_name)} · Risiko perputaran stok</b><div class="ct4-note">DOI ${fmt(worst.doi_days,1)} hari; ${fmt(worst.no_movement_3m_stock)} box tidak bergerak 3M. Nilai Rp dan keputusan transfer belum valid karena data SKU belum lengkap.</div><div class="ct4-action-line">Action: Review item/SKU bersama Commercial</div></div>`:'<div class="ct4-note">Belum ada data untuk membentuk prioritas.</div>'}
          ${mostNonMove&&mostNonMove!==worst?`<div class="ct4-insight warn"><b>${safe(mostNonMove.rdc_name)} · No movement 3M</b><div class="ct4-note">${fmt(mostNonMove.no_movement_3m_stock)} box kandidat, DOI ${fmt(mostNonMove.doi_days,1)} hari. Perlu Pareto motif/series/size.</div></div>`:''}
          <div class="ct4-insight"><b>Network Transfer · Validasi Wajib</b><div class="ct4-note">Periksa SKU/series identik, free stock, demand tujuan, koridor, dan ongkos sebelum mengajukan kuantitas transfer.</div><div class="ct4-action-line">Decision: Tidak auto-release transfer</div></div>
        </div></div>
    </div>

    <div class="ct4-section-head" id="ct4OccupancyAnchor"><h3>04 · Warehouse Occupancy</h3><span>Snapshot ${dateLabel(occ.date)} · laporan kapasitas RDC</span></div>
    <div class="ct4-metrics four">
      ${[
       ['National / Area Occupancy',occPct!=null&&(!full||occ.complete)?fmt(occPct,1)+'%':'DATA REQUIRED','Σ Stock / Σ Design Capacity'],
       ['Total Used / Stock',occ.rows.length?fmt(used):'—','Box · historical occupancy snapshot'],
       ['Remaining Capacity',occ.rows.length?fmt(capacity-used):'—','Box · bukan instruksi transfer'],
       ['RDC Capacity Watch',occ.rows.length?`${occ.rows.filter(x=>Number(x.stock_current_box)/Number(x.kapasitas_box)>=.85).length} / ${occ.rows.length}`:'—','Batas pantau ≥85%']
      ].map(([t,v,m])=>`<div class="ct4-card"><div class="ct4-k">${t}</div><div class="ct4-v ${String(v).length>15?'small':''}">${v}</div><div class="ct4-m">${m}</div></div>`).join('')}
    </div>
    <div class="ct4-panel ct4-report"><div class="ct4-panel-head"><b>Occupancy by RDC</b>${label('HISTORICAL '+dateLabel(occ.date),'amber')}</div><div class="ct4-panel-body">
       ${occLines||'<div class="ct4-note">Snapshot occupancy tidak tersedia.</div>'}
       <button class="ct4-link" data-ct4-nav="occupancy">Buka laporan Occupancy →</button>
    </div></div>

    <div class="ct4-section-head" id="ct4CostAnchor"><h3>05 · Logistics Cost Ratio</h3><span>Financial Efficiency · Warehouse + Distribution</span></div>
    <div class="ct4-metrics four">${[
      ['Logistics Cost Ratio','Σ cost ÷ Σ net sales × 100%'],
      ['Warehouse Cost','Rent, manpower, handling, operations'],
      ['Distribution Cost','Linehaul, delivery, cross-dock'],
      ['Target Ratio / Variance','Target resmi Finance belum tersedia']
    ].map(([t,m])=>`<div class="ct4-card"><div class="ct4-k">${t}</div><div class="ct4-v small">DATA REQUIRED</div><div class="ct4-m">${m}</div></div>`).join('')}</div>
    <div class="ct4-panel ct4-report"><div class="ct4-panel-body"><div class="ct4-note"><b>Analisis yang disiapkan:</b> Actual vs Target/Budget, trend MoM dan YoY, warehouse vs transport cost, biaya per rit/kg, load factor dan pemicu kenaikan biaya. Tidak ada klaim penghematan tanpa rekonsiliasi Finance.</div><button class="ct4-link" data-ct4-nav="cost">Buka laporan Logistics Cost Ratio →</button></div></div>

    <div class="ct4-section-head"><h3>06 · Enam KPI Resmi Manager</h3><span>Bobot 100% · Achievement ≠ Data Coverage</span></div>
    <div class="ct4-panel"><div class="ct4-table-wrap"><table class="ct4-table">
      <thead><tr><th>KPI</th><th class="r">Bobot</th><th>Current</th><th>Sumber / Issue</th><th>Status Data</th></tr></thead><tbody>
      ${[
        ['Service Level','20%','—','OTIF belum tersedia, SLA historis','DATA REQUIRED','red'],
        ['Inventory Accuracy','20%','—','Stock opname 4/5 RDC, periode tidak konsisten','PARTIAL','amber'],
        ['Warehouse Operational Performance','20%','—','Productivity & breakage memerlukan definisi komposit','PARTIAL','amber'],
        ['Cost Efficiency','15%','—','Net sales + WH/Distribution cost Finance','DATA REQUIRED','red'],
        ['SOP & K3 Compliance','15%','—','Audit, corrective action & target','DATA REQUIRED','red'],
        ['People Development & Team Performance','10%','—','Training, competency, productivity','DATA REQUIRED','red'],
      ].map(x=>`<tr><td><b>${x[0]}</b></td><td class="r">${x[1]}</td><td>${x[2]}</td><td>${x[3]}</td><td>${label(x[4],x[5])}</td></tr>`).join('')}
      </tbody></table></div></div>
    <div class="ct4-section-head" id="ct4ActionSection"><h3>07 · Management Decision &amp; Action Center</h3><span>Proposal tindakan · bukan approval otomatis</span></div>
    <div class="ct4-panel"><div class="ct4-table-wrap"><table class="ct4-table"><thead><tr><th>Isu &amp; Evidence</th><th>Rekomendasi</th><th>Dampak Rp</th><th>Owner</th><th>Status</th></tr></thead><tbody>
    <tr><td><b>${safe(worst?.rdc_name||"Inventory")}</b><div class="ct4-note">DOI ${fmt(worst?.doi_days,1)} hari · ${fmt(worst?.no_movement_3m_stock)} box no movement</div></td><td>Review SKU bersama Commercial dan hold PR untuk excess tervalidasi</td><td>DATA REQUIRED</td><td>Belum ditetapkan</td><td>${label("REVIEW","amber")}</td></tr>
    <tr><td><b>${safe(mostNonMove&&mostNonMove!==worst?mostNonMove.rdc_name:"Network")}</b><div class="ct4-note">Stock tanpa movement memerlukan analisis item</div></td><td>Pareto motif, series dan size; cocokkan dengan kebutuhan RDC tujuan</td><td>DATA REQUIRED</td><td>Belum ditetapkan</td><td>${label("REVIEW","amber")}</td></tr>
    <tr><td><b>Network Transfer</b><div class="ct4-note">Detail SKU belum lengkap</div></td><td>Tahan auto-transfer sampai SKU, demand, kapasitas dan cost TMS tervalidasi</td><td>DATA REQUIRED</td><td>Logistic + Commercial</td><td>${label("BLOCKED","red")}</td></tr>
    </tbody></table></div></div>
    <div class="ct4-note" style="margin-top:10px">Action Tracker dengan PIC, due date, evidence dan status lanjut melalui Operational Control.</div>
    <div class="ct4-footnote">SLS Supply Chain Control Tower · Management Review Layer · Tampilan V4 mengikuti mockup referensi; data mengikuti sumber aktual yang tersedia.</div>
  `;
  shell.querySelectorAll('[data-ct4-nav]').forEach(b=>b.addEventListener('click',()=>{const n=$(b.dataset.ct4Nav==='occupancy'?'v3NavOccupancy':'v3NavCostRatio');n?.click()}));
  if($('periodLine'))$('periodLine').textContent=`Management Review ${safe(group())} · DOI ${latestDates.length?latestDates.map(dateLabel).join(' / '):'Data Required'} · Occupancy ${dateLabel(occ.date)}`;
}
function buildQuality(){
const quality=`
 <div class="ct4-ui">
 <div class="ct4-eyebrow">DATA GOVERNANCE · NATIONAL SUPPLY CHAIN</div>
 <h2>Data Quality & Sources</h2><div class="ct4-note">Mutu data dan kesesuaian periode dipantau terpisah dari pencapaian KPI.</div>
 <div class="ct4-panel" style="margin-top:16px"><div class="ct4-table-wrap"><table class="ct4-table">
 <thead><tr><th>Sumber</th><th>Kondisi</th><th>Periode</th><th>Status</th></tr></thead><tbody>
 <tr><td>DOI Summary RDC</td><td>${st.doi.length}/5 RDC</td><td>${st.doi.map(x=>x.snapshot_date).sort().slice(-1)[0]||'—'}</td><td>${label(st.doi.length>=5?'SUMMARY AVAILABLE':'INCOMPLETE',st.doi.length>=5?'green':'amber')}</td></tr>
 <tr><td>Detail SKU</td><td>${st.checks.sku?'Ada data':'0 baris'}</td><td>—</td><td>${label(st.checks.sku?'REVIEW':'BLOCKER ACTION',st.checks.sku?'amber':'red')}</td></tr>
 <tr><td>Occupancy</td><td>Snapshot box / kapasitas</td><td>${dateLabel(occupancy().date)}</td><td>${label('HISTORICAL','amber')}</td></tr>
 <tr><td>OTIF</td><td>${st.checks.otif?'Ada baris sumber':'0 baris'}</td><td>—</td><td>${label(st.checks.otif?'VALIDATION REQUIRED':'DATA REQUIRED',st.checks.otif?'amber':'red')}</td></tr>
 <tr><td>Logistics Cost</td><td>${st.checks.cost?'Ada baris sumber':'0 baris'}</td><td>—</td><td>${label(st.checks.cost?'RECONCILE FINANCE':'DATA REQUIRED',st.checks.cost?'amber':'red')}</td></tr>
 <tr><td>Net Sales Finance</td><td>${st.checks.financial?'Ada baris sumber':'Belum terintegrasi'}</td><td>—</td><td>${label('DATA REQUIRED','red')}</td></tr>
 <tr><td>Inventory Accuracy</td><td>4/5 RDC audit sebelumnya</td><td>Beragam</td><td>${label('PARTIAL / STALE','amber')}</td></tr>
 <tr><td>Action Tracker</td><td>${st.checks.action?'Ada record':'Belum lengkap'}</td><td>—</td><td>${label('REVIEW','amber')}</td></tr>
 </tbody></table></div></div>
 <div class="ct4-banner"><b>Aturan:</b> skor/rasio tidak boleh dianggap aktual bila numerator, denominator, periode, cakupan RDC atau validasi sumber belum memadai.</div>
 </div>`;
 paint('ct4-quality',quality);
}
async function load(){
 if(st.busy)return st.busy;
 st.busy=(async()=>{
 const targets=[
 ['doi','doi_manual_rdc_snapshot','&order=snapshot_date.desc&limit=50'],
 ['occ','rdc_snapshot_log','&order=snapshot_date.desc,snapshot_at.desc&limit=150'],
 ['sku','doi_manual_sku_snapshot','&limit=1'],
 ['otif','otif_data','&limit=1'],
 ['cost','logistics_cost','&limit=1'],
 ['financial','financial_master','&limit=1'],
 ['action','action_tracker','&limit=1']
 ];
 const out=await Promise.allSettled(targets.map(([,t,q])=>sbSelect(t,q)));
 out.forEach((o,i)=>{
  const [k]=targets[i];const arr=o.status==='fulfilled'&&Array.isArray(o.value)?o.value:[];
  if(k==='doi'||k==='occ')st[k]=arr;
  else st.checks[k]=arr.length>0;
 });
 st.loaded=true;draw();buildQuality();
 })();
 return st.busy;
}
const qualityNav=document.createElement('div');qualityNav.id='ct4QualityNav';qualityNav.className='nav-item';
qualityNav.innerHTML='<span class="nav-icon">◎</span><span>Data Quality &amp; Sources</span>';
$('v3NavDecisions')?.before(qualityNav);
const qualityPage=document.createElement('div');qualityPage.id='page-ct4-quality';qualityPage.className='page';
qualityPage.innerHTML='<div id="ct4-quality" class="ct4-ui"></div>';
$('page-dashboard')?.after(qualityPage);
qualityNav.addEventListener('click',()=>{
 if(CURRENT_RDC_SCOPE)return;
 document.querySelectorAll('.page').forEach(n=>n.classList.remove('active'));
 qualityPage.classList.add('active');
 document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));qualityNav.classList.add('active');
 buildQuality();window.scrollTo(0,0);
});
function moveToExecutive(id){
 const nav=document.querySelector('.nav-item[data-page="dashboard"]');if(!nav)return;
 nav.click();
 if(!CURRENT_RDC_SCOPE)switchView('mgmt');
 if(id){requestAnimationFrame(()=>$(id)?.scrollIntoView({behavior:'smooth',block:'start'}))}
}
$('v3NavDecisions')?.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();moveToExecutive('ct4ActionSection');$('v3NavDecisions')?.classList.add('active')},true);
$('navInventory')?.addEventListener('click',e=>{if(CURRENT_RDC_SCOPE)return;e.preventDefault();e.stopImmediatePropagation();moveToExecutive('ct4InventoryAnchor');$('navInventory')?.classList.add('active')},true);
document.querySelectorAll('.nav-item[data-page]').forEach(n=>n.addEventListener('click',()=>qualityNav.classList.remove('active')));
const oldApplyRole=applyRoleUI;
applyRoleUI=function(){const v=oldApplyRole.apply(this,arguments);qualityNav.style.display=CURRENT_RDC_SCOPE?'none':'flex';return v;};
const oldRender=render;
render=function(rdc){const result=oldRender(rdc);draw();if(!st.busy&&!IS_OFFLINE_MODE)load();return result};
if(!CURRENT_RDC_SCOPE)draw();
})();