(function slsV4(){
'use strict';
const $=id=>document.getElementById(id);
const fmt=(n,d=0)=>Number.isFinite(Number(n))?Number(n).toLocaleString('id-ID',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
const safe=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names=['Jakarta','Semarang','Surabaya','Denpasar','Palembang'];
const st={doi:[],commercial:[],occ:[],monthStocks:[],capacity:[],opname:[],breakage:[],breakageSync:null,breakageScope:null,breakageError:null,breakageSeq:0,freight:[],slaQuality:[],checks:[],loaded:false,busy:null,asof:null};
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
const latest=window.SLSMonthlyOccupancy?.compute(st.monthStocks,st.capacity,CURRENT_RDC_SCOPE);
if(latest){
 const area=selected();
 return {...latest,rows:latest.rows.filter(r=>area==='Semua'||r.rdc_name===area)};
}
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

function evidence(area){
 const inArea=x=>area==='Semua'||x.rdc_name===area;
 const selectedRdc=area==='Semua'?names:[area];
 const op=st.opname.filter(inArea).filter(x=>Number.isFinite(Number(x.system_qty_box))&&Number(x.system_qty_box)>0
  &&x.abs_variance_box!=null&&Number.isFinite(Number(x.abs_variance_box))&&Number(x.abs_variance_box)>=0);
 const opPct=op.map(x=>Number(x.sample_accuracy_pct)).filter(Number.isFinite);
 const opDate=op.map(x=>x.check_date).filter(Boolean).sort();
 const opSystem=op.reduce((s,x)=>s+Number(x.system_qty_box),0);
 const opVariance=op.reduce((s,x)=>s+Number(x.abs_variance_box),0);
 const opWeighted=opSystem>0?100*(1-opVariance/opSystem):null;
 const opCoverage=op.length+'/'+selectedRdc.length;
 const opMissing=selectedRdc.filter(name=>!op.some(x=>x.rdc_name===name));
 const opSameDate=new Set(opDate).size===1;
 const wh=st.breakage.filter(inArea);
 const months=[...new Set(wh.map(x=>String(x.period||'').slice(0,7)))].sort().reverse();
 const latest=months.find(m=>wh.filter(x=>String(x.period).startsWith(m)).length===selectedRdc.length);
 const monthly=latest?wh.filter(x=>String(x.period).startsWith(latest)):[];
 const delivery=monthly.reduce((z,x)=>z+Number(x.pecah_kiriman_box||0),0);
 const delivered=monthly.reduce((z,x)=>z+Number(x.delivered_box||0),0);
 const broken=monthly.reduce((z,x)=>z+Number(x.pecah_gudang_box||0),0);
 const exposure=monthly.reduce((z,x)=>z+Number(x.stock_exposure_box||0),0);
 const people=st.capacity.filter(x=>area==='Semua'||x.name===area);
 const peopleCount=people.reduce((z,x)=>z+Number(x.total_sdm||0),0);
 const routes=st.freight.filter(x=>area==='Semua'||x.area_code===area).reduce((z,x)=>z+Number(x.route_count||0),0);
 return {op,opPct,opDate,opSystem,opVariance,opWeighted,opCoverage,opMissing,opSameDate,monthly,latest,broken,delivery,delivered,exposure,peopleCount,peopleCountValid:people.length===selectedRdc.length,routes};
}
function breakageArea(){const a=selected();return a==='Semua'?'ALL':names.includes(a)?a:'ALL'}
function breakageData(){return st.breakageScope===breakageArea()?st.breakageSync:null}
async function refreshBreakage(force=false,paintNow=true){
 const scope=breakageArea();if(!force&&st.breakageScope===scope&&st.breakageSync)return;
 if(IS_OFFLINE_MODE||(typeof AUTH_SESSION_OK!=='undefined'&&!AUTH_SESSION_OK))return;
 const seq=++st.breakageSeq;st.breakageScope=scope;st.breakageSync=null;st.breakageError=null;
 if(paintNow)draw();
 try{
 const payload=await sbRpc('control_tower_breakage_sync_v1',{p_rdc:scope});
 if(seq!==st.breakageSeq||scope!==breakageArea())return;
 if(payload?.source!=='SLS Breakage Monitoring')throw new Error('Sumber tidak valid');
 st.breakageSync=payload;
 }catch(err){if(seq!==st.breakageSeq||scope!==breakageArea())return;
 st.breakageError='Gagal mengambil Breakage Monitoring; cek sesi login atau jaringan.';
 console.warn('Breakage integration',err);
 }finally{if(seq===st.breakageSeq&&scope===breakageArea()&&paintNow){draw();buildQuality();}}
}
function monthlyDoi(rows){
 const matched=[];
 for(const x of rows){
  const month=String(x.sales_through_month||'').slice(0,7);
  const sto=st.monthStocks.find(a=>a.rdc===x.rdc_name&&a.month===month);
  const sales=Number(x.avg_sales_3m_box);
  if(sto&&sales>0)matched.push({...x,stock_month:month,stock_sep:Number(sto.stock_box),doi_month:30*Number(sto.stock_box)/sales});
 }
 const totalStock=matched.reduce((z,x)=>z+x.stock_sep,0);
 const totalSales=matched.reduce((z,x)=>z+Number(x.avg_sales_3m_box),0);
 return {rows:matched,period:[...new Set(matched.map(x=>x.stock_month))],doi:totalSales>0?totalStock/totalSales*30:null,stock:totalStock,coverage:matched.length};
}
const css=document.createElement('style');
css.id='ct4-style';
css.textContent=`
/* SLS V4: match the approved V2 GM mockup without removing the operational core */
:root{--ct4-navy:#18355B;--ct4-ink:#243149;--ct4-muted:#66788E;--ct4-line:#DFE6EF;--ct4-bg:#F5F7FA;--ct4-amber:#BC7A17;--ct4-red:#BB493C}
body{background:var(--ct4-bg)!important;color:var(--ct4-ink)!important;font-family:'Inter','Segoe UI',Arial,sans-serif!important}
#appRoot.app{grid-template-columns:236px minmax(0,1fr)!important}
#appRoot.app[style*="display: none"]{display:none!important}
#appRoot.app[style*="display:none"]{display:none!important}
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
#dashboardStickyHeader{
  position:sticky!important;top:0!important;z-index:110!important;
  background:#f5f7fa!important;
  margin:-25px -32px 14px!important;padding:24px 32px 9px!important;
  border:0!important;border-bottom:1px solid #dce5ef!important;
  box-shadow:0 5px 16px rgba(24,53,91,.06)!important;
  transition:padding .18s ease,box-shadow .18s ease!important;
}
#dashboardStickyHeader.compact{padding:8px 32px 7px!important;box-shadow:0 7px 18px rgba(24,53,91,.12)!important}
#dashboardStickyHeader.compact #mainTitle{font-size:21px!important}
#dashboardStickyHeader.compact #mainTitle::before{display:none!important}
#dashboardStickyHeader.compact .topbar{padding-bottom:3px!important}
#dashboardStickyHeader .topbar{margin-bottom:0!important}
#ct4PinnedStatusWrap{margin:0;min-height:0}
#ct4PinnedStatusWrap:empty{display:none}
#ct4-executive>#ct4SourceBanner{display:none!important} /* defensive: never duplicate an old scrolling banner */
#dashboardStickyHeader #ct4PinnedStatusWrap .ct4-banner{
  display:flex;align-items:center;gap:7px 10px;flex-wrap:wrap;
  margin:9px 0 2px!important;padding:10px 13px!important;
  border:1px solid #d9e4ef;border-radius:9px;
  background:#eaf1f9!important;color:#385778!important;
  font-size:12px!important;line-height:1.45!important;
}
#ct4PinnedStatusWrap .ct4-banner>b{white-space:nowrap}
#ct4PinnedStatusWrap .ct4-banner>span:not(.ct4-tag){min-width:0;overflow-wrap:anywhere;flex:1 1 350px}
#ct4-executive>.ct4-eyebrow,#ct4-executive>.ct4-note{display:none!important}
#ct4-executive [id],#opsView [id]{scroll-margin-top:calc(var(--ct4-sticky-height,160px) + 14px)!important}
@media(max-width:960px){
  #dashboardStickyHeader{margin:-22px -20px 13px!important;padding:22px 20px 9px!important}
  #dashboardStickyHeader.compact{padding:8px 20px 7px!important}
}
@media(max-width:820px){
  #dashboardStickyHeader{margin:-14px -14px 13px!important;padding:14px 14px 8px!important}
  #dashboardStickyHeader.compact{padding:10px 14px 7px!important}
  #dashboardStickyHeader .topbar,#dashboardStickyHeader.compact .topbar{padding-left:46px!important;gap:8px!important}
  #dashboardStickyHeader .topbar>div:first-child{min-width:0!important;flex:1!important}
  #dashboardStickyHeader .filters{max-width:48%;min-width:0}
  #dashboardStickyHeader #rdcSelectorWrap{max-width:100%;min-width:0}
  #dashboardStickyHeader #rdcSelector{max-width:100px!important}
  #dashboardStickyHeader #ct4PinnedStatusWrap .ct4-banner{font-size:11px!important;padding:8px 10px!important;max-height:72px;overflow-y:auto}
  #ct4PrintTools{display:none!important}
}
@media(max-width:520px){
  #dashboardStickyHeader #periodLine{display:none!important}
  #dashboardStickyHeader #mainTitle{font-size:16px!important}
  #dashboardStickyHeader #mainTitle::before{font-size:8px!important;letter-spacing:.5px}
}
@media print{
  #dashboardStickyHeader,#dashboardStickyHeader.compact{position:static!important;top:auto!important;
    padding:0!important;margin:0 0 12px!important;box-shadow:none!important}
  #ct4PinnedStatusWrap .ct4-banner{max-height:none!important}
  #ct4PrintTools{display:none!important}
}
#dashboardStickyHeader .topbar{align-items:center!important;padding:0 0 12px!important;min-height:auto!important;border:none!important}
#mainTitle{font-size:25px!important;line-height:1.2!important;color:var(--ct4-navy)!important;letter-spacing:-.3px!important;font-weight:800!important}
#mainTitle::before{content:"NATIONAL SUPPLY CHAIN · MANAGEMENT REVIEW";display:block;font-size:10px;letter-spacing:1.3px;line-height:1.7;font-weight:850;color:#74859b;margin-bottom:2px}
#ct4-executive>.ct4-eyebrow,#ct4-executive>.ct4-note:first-of-type{display:none!important}
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
.ct4-card{padding:17px 18px;min-height:122px;border-left:5px solid #377bb4;background:#f8fbff}
.ct4-card.tone-blue{border-left-color:#3879b4;background:#f6faff}.ct4-card.tone-blue .ct4-v{color:#205c8c}
.ct4-card.tone-green{border-left-color:#328562;background:#f5fbf7}.ct4-card.tone-green .ct4-v{color:#266949}
.ct4-card.tone-amber{border-left-color:#c49435;background:#fffaf2}.ct4-card.tone-amber .ct4-v{color:#91600d}
.ct4-card.tone-red{border-left-color:#c14d44;background:#fff7f5}.ct4-card.tone-red .ct4-v{color:#a43633}
.ct4-card.tone-purple{border-left-color:#8661ac;background:#faf7ff}.ct4-card.tone-purple .ct4-v{color:#67438a}
.ct4-card.tone-slate{border-left-color:#95a4b7;background:#f8fafc}.ct4-card.tone-slate .ct4-v{color:#53677c}
.ct4-card.tone-teal{border-left-color:#2d8b8c;background:#f3fbfa}.ct4-card.tone-teal .ct4-v{color:#237174}
.ct4-meaning{display:flex;align-items:center;flex-wrap:wrap;gap:7px;margin:9px 0}
.ct4-meaning span{border-radius:7px;padding:5px 9px;font-size:11px;font-weight:750}
.ct4-meaning .green{color:#24764d;background:#e5f4eb}
.ct4-meaning .amber{color:#975e11;background:#fff1d8}
.ct4-meaning .red{color:#a84139;background:#fce9e7}
.ct4-meaning .purple{color:#704696;background:#f1eafa}
.ct4-meaning .slate{color:#5f7083;background:#edf1f5}
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
.ct4-accuracy-details{margin-top:13px!important;border-left:4px solid #d09a36!important}
.ct4-accuracy-details>summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:15px 18px;font-weight:800;color:#18355b;font-size:16px}
.ct4-accuracy-details>summary::-webkit-details-marker{display:none}
.ct4-accuracy-details>summary::after{content:"⌄";color:#657b95;font-size:19px}
.ct4-accuracy-details[open]>summary::after{content:"⌃"}
.ct4-accuracy-details .ct4-accuracy-value{color:#975e11;font-size:15px;font-weight:850}
.ct4-accuracy-details .ct4-accuracy-missing{color:#af473a;font-weight:750}
.ct4-accuracy-details .ct4-accuracy-note{padding:11px 18px 15px;color:#62768d;font-size:12px;line-height:1.65;background:#fffbf5;border-top:1px solid #f1e4d0}
.ct4-accuracy-details th,.ct4-accuracy-details td{padding:10px 12px!important}
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
@media(max-width:540px){.ct4-panel-body>div[style*="grid-template-columns:96px"]{grid-template-columns:85px minmax(65px,1fr) 58px 60px!important;gap:6px!important;font-size:11px}}

#opsView .v3-kpi-card,#page-v3-occupancy .v3-kpi-card,#page-v3-costratio .v3-kpi-card,#page-v3-occupancy .v3-block,#page-v3-costratio .v3-block{border-color:var(--ct4-line)!important;border-radius:12px!important;box-shadow:none!important}
#opsView .v3-section-title,#page-v3-occupancy .v3-section-title,#page-v3-costratio .v3-section-title{font-size:20px!important}
#opsView .v3-table,#page-v3-occupancy .v3-table,#page-v3-costratio .v3-table{font-size:14px!important}
#opsView .v3-table th,#page-v3-occupancy .v3-table th,#page-v3-costratio .v3-table th{font-size:12px!important}
#opsView .v3-table td,#page-v3-occupancy .v3-table td,#page-v3-costratio .v3-table td{padding:12px!important}
#page-v3-occupancy,#page-v3-costratio{background:transparent}
#page-v3-occupancy .topbar h1,#page-v3-costratio .topbar h1{font-size:25px!important;color:var(--ct4-navy)!important}
@media(max-width:1200px){.ct4-focus,.ct4-two{grid-template-columns:1fr}.ct4-metrics.four{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:960px){.ct4-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.main{padding:22px 20px!important}}
@media(max-width:820px){#appRoot.app{display:block!important}.sidebar{padding:13px 16px!important;border-bottom:1px solid var(--ct4-line)!important}.main{padding:14px!important}.ct4-focus{grid-template-columns:1fr}.ct4-metrics.four{grid-template-columns:repeat(2,minmax(0,1fr))}.sidebar.mobile-open{z-index:1300!important}}
@media(max-width:570px){.ct4-metrics,.ct4-metrics.four,#opsView .v3-grid3{grid-template-columns:1fr}.ct4-ui h2{font-size:19px!important}.ct4-section-head h3{font-size:18px!important}}
@media print{.sidebar,#v3NavCostRatio,#rdcSelectorWrap{display:none!important}.ct4-card,.ct4-panel,.ct4-focus-left,.ct4-focus-right{break-inside:avoid}#mgmtView > :not(#ct4-executive){display:none!important}}
`;
document.head.appendChild(css);
const mg=$('mgmtView');if(!mg)return;
const shell=document.createElement('div');shell.id='ct4-executive';shell.className='ct4-ui';mg.prepend(shell);
// STATUS SUMBER belongs to the same sticky region as title, RDC filter and Print Review.
const stickyHeader=$('dashboardStickyHeader');
const statusSlot=document.createElement('div');statusSlot.id='ct4PinnedStatusWrap';
stickyHeader?.append(statusSlot);
function syncStickyOffset(){
 if(stickyHeader)document.documentElement.style.setProperty('--ct4-sticky-height',Math.ceil(stickyHeader.getBoundingClientRect().height)+'px');
}
if(stickyHeader&&typeof ResizeObserver==='function')new ResizeObserver(syncStickyOffset).observe(stickyHeader);
else window.addEventListener('resize',syncStickyOffset);
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
  const occPeriod=occ.month?`Stok bulanan ${occ.month} / kapasitas master referensi (${dateLabel(occ.capacityDate)})`:`historis ${dateLabel(occ.date)}`;
  const bs=breakageData(),bi=bs?.incidents||null,bk=bs?.historical_kpi||null;
  const bFresh=bi?.month?`Breakage ${bi.month} (${bi.rdc_reported}/${bs.expected_rdc} RDC)`:'Breakage memuat / belum tersedia';
  const freshness=st.loaded?`DOI ${latestDates.length?latestDates.map(dateLabel).join(', '):'belum tersedia'} · Occupancy ${occPeriod} · ${bFresh} · Logistics Cost: DATA REQUIRED`:'Memuat DOI dan occupancy terbaru…';
  let current=worst?Number(worst.doi_days):null;
  let title=worst?`${worst.rdc_name}: perputaran stok ${current>75?'sangat lambat':current>45?'perlu diperhatikan':'perlu dijaga'}`:'Menyiapkan ringkasan inventory';
  let action=worst?'Review SKU bersama Commercial. Evaluasi hold PR dan program sell-out. Transfer hanya setelah kecocokan SKU/series, demand tujuan, kapasitas, dan ongkos TMS tervalidasi.':'Lengkapi snapshot inventory sebelum mengusulkan transfer.';
  const ev=evidence(selected()), historical=monthlyDoi(r);
  const kd=[
    ['Physical Stock · RDC',ready?fmt(stock)+' <small>box</small>':'DATA REQUIRED','Agregasi snapshot manual DOI',false,ready?'blue':'slate'],
    ['Days of Inventory',ready&&doi!=null?fmt(doi,1)+' <small>hari</small>':'DATA REQUIRED','Σ stock ÷ Σ Avg Sales 3M × 30',false,!ready||doi==null?'slate':doi>75?'red':doi>45?'amber':'green'],
    ['No Movement · 3 Bulan',ready?fmt(nm)+' <small>box</small>':'DATA REQUIRED','Stok perlu review SKU; tidak selalu deadstock',false,!ready?'slate':nm>0?'amber':'green'],
    ['Inventory Accuracy (Opname)',ev.opWeighted!=null?fmt(ev.opWeighted,2)+'%':'DATA REQUIRED',ev.opWeighted!=null?`INDIKATIF · ${ev.opCoverage} RDC · ${dateLabel(ev.opDate[0])} – ${dateLabel(ev.opDate[ev.opDate.length-1])}; bukan skor nasional bulanan`:'Data stock opname BOX belum tersedia untuk area ini',false,ev.opWeighted!=null?'amber':'slate'],
    ['Warehouse Occupancy',occPct!=null&&(!full||occ.complete)?fmt(occPct,1)+'%':'DATA REQUIRED',`Stok ${occ.month||dateLabel(occ.date)} · kapasitas ${occ.month?'master belum diverifikasi ulang':'historis'}`,false,occPct==null?'slate':occPct>=100?'red':occPct>=85?'amber':'green'],
    ['Logistics Cost Ratio','DATA REQUIRED',`Finance Actual + Net Sales belum ada · ${fmt(ev.routes)} rute benchmark bukan biaya aktual`,true,'slate']
  ];
  const risk=x=>Number(x.doi_days)>75?'CRITICAL':Number(x.doi_days)>60?'HIGH':Number(x.doi_days)>45?'WATCH':'NORMAL';
  const rdcs=r.slice().sort((a,b)=>Number(b.doi_days)-Number(a.doi_days)).map(x=>`<tr class="${Number(x.doi_days)>75?'highlight':''}"><td><b>${safe(x.rdc_name)}</b></td><td class="r">${fmt(x.current_stock_box)}</td><td class="r"><b>${fmt(x.doi_days,1)}</b></td><td class="r">${fmt(x.no_movement_3m_stock)}</td><td>${label(risk(x),Number(x.doi_days)>75?'red':Number(x.doi_days)>45?'amber':'green')}</td></tr>`).join('');
  const occLines=occ.rows.slice().sort((a,b)=>Number(b.stock_current_box)/Number(b.kapasitas_box)-Number(a.stock_current_box)/Number(a.kapasitas_box)).map(x=>{
    const n=pct(Number(x.stock_current_box),Number(x.kapasitas_box)),level=n>=100?'danger':n>=85?'warn':'';
    return `<div style="display:grid;grid-template-columns:96px minmax(75px,1fr) 70px 86px;gap:10px;align-items:center;padding:8px 0"><b>${safe(x.rdc_name)}</b><div class="ct4-bar"><span class="${level}" style="width:${Math.min(100,n)}%"></span></div><b style="text-align:right">${fmt(n,1)}%</b><span style="text-align:right;font-size:12px;color:${x.change_pp>0?'#9e681a':x.change_pp<0?'#267a51':'#6e7f91'}">${x.change_pp==null?'—':(x.change_pp>=0?'+':'')+fmt(x.change_pp,2)+' pp'}</span></div>`
  }).join('');
  shell.innerHTML=`
    <div class="ct4-eyebrow">NATIONAL SUPPLY CHAIN · MANAGEMENT REVIEW</div>
    <div class="ct4-note">Dari kinerja operasional → risiko bisnis → tindakan → keputusan manajemen</div>
    <!-- STATUS SUMBER is rendered only inside the pinned header, never in the scrolling report. -->

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
        <div class="ct4-fresh-row">Opname Akunting ${label(ev.opWeighted!=null?fmt(ev.opWeighted,2)+'% · '+ev.opCoverage+' RDC':'DATA REQUIRED',ev.opWeighted!=null?'amber':'red')}</div>
        <div class="ct4-fresh-row">OTIF & Logistics Cost ${label(st.checks.otif&&st.checks.cost?'Cek konsistensi data':'DATA REQUIRED',st.checks.otif&&st.checks.cost?'amber':'red')}</div>
        <div class="ct4-fresh-row">Action Tracker ${label(st.checks.action?'>0 record':'DATA REQUIRED','amber')}</div>
      </div>
    </div>

    <div class="ct4-section-head"><h3>02 · Snapshot Kinerja Inventory ${full?'Nasional':safe(group())}</h3><span>Periode tiap sumber dicantumkan, bukan real-time</span></div>
    <div class="ct4-meaning"><span class="green">Normal</span><span class="amber">Perlu perhatian / data parsial</span><span class="red">Kritis</span><span class="purple">Kandidat perlu review</span><span class="slate">Data belum tersedia</span></div>
    <div class="ct4-metrics">${kd.map(([t,v,m,small,tone])=>`<div class="ct4-card tone-${tone||'blue'}"><div class="ct4-k">${t}</div><div class="ct4-v${small?' small':''}">${v}</div><div class="ct4-m">${m}</div></div>`).join('')}</div>
    <details class="ct4-panel ct4-accuracy-details" id="ct4InventoryAccuracyDetails" open>
      <summary><span>Inventory Accuracy · Detail Hasil Opname per RDC</span><span class="ct4-accuracy-value">${ev.opWeighted!=null?fmt(ev.opWeighted,2)+'% · '+ev.opCoverage+' RDC':'DATA REQUIRED'}</span></summary>
      <div class="ct4-table-wrap"><table class="ct4-table"><thead><tr><th>RDC</th><th>Tanggal stock opname</th><th class="r">Stok sistem (BOX)</th><th class="r">Selisih absolut (BOX)</th><th class="r">Inventory Accuracy</th><th>Status</th></tr></thead><tbody>
      ${(selected()==='Semua'?names:[selected()]).map(name=>{
        const x=ev.op.find(row=>row.rdc_name===name);
        return x?`<tr><td><b>${safe(name)}</b></td><td>${dateLabel(x.check_date)}<div class="ct4-note" title="${safe(x.source_file||'')}">Sumber: ${x.record_status==='UPLOADED_VALIDATED'?'File opname tervalidasi':'Data histori'}</div></td><td class="r">${fmt(x.system_qty_box,2)}</td><td class="r">${fmt(x.abs_variance_box,2)}</td><td class="r"><b>${fmt(x.sample_accuracy_pct,2)}%</b></td><td>${label('OPNAME HISTORIS','amber')}</td></tr>`
         :`<tr><td><b>${safe(name)}</b></td><td colspan="4" class="ct4-accuracy-missing">Belum ada hasil stock opname BOX yang valid untuk area ini</td><td>${label('DATA REQUIRED','red')}</td></tr>`;
      }).join('')}
      ${ev.opWeighted!=null?`<tr style="background:#fff9ed"><td colspan="2"><b>GABUNGAN SAMPEL ${ev.opCoverage} RDC</b></td><td class="r"><b>${fmt(ev.opSystem,2)}</b></td><td class="r"><b>${fmt(ev.opVariance,2)}</b></td><td class="r"><b>${fmt(ev.opWeighted,2)}%</b></td><td>${label('INDIKATIF','amber')}</td></tr>`:''}
      </tbody></table></div>
      <div class="ct4-accuracy-note"><b>Metode:</b> (1 − Σ |selisih BOX| ÷ Σ |stok sistem BOX|) × 100%. Dibobot berdasarkan kuantitas sistem, <b>bukan rata-rata persentase RDC</b>.
      ${ev.opMissing.length?` Data ${safe(ev.opMissing.join(', '))} belum tercakup.`:''}
      Hasil berasal dari <b>6 file stock opname yang diunggah</b>, sheet Report per Material, khusus UOM BOX. Jakarta menggunakan hasil Juli 2026; Februari tetap histori. Baris subtotal, total, serta PC/M2 tidak dicampur. Tanggal opname tiap RDC berbeda; <b>bukan Inventory Accuracy nasional pada satu periode</b> dan belum dapat dianggap pencapaian KPI bulanan resmi.</div>
    </details>

    <div class="ct4-panel ct4-report" style="margin-top:13px">
      <div class="ct4-panel-head"><b>DOI Stok Akhir Bulan · Juli–September 2026</b>${label(historical.coverage===r.length&&historical.period.length===1?'MONTHLY CALCULATED':'PARTIAL','blue')}</div>
      <div class="ct4-panel-body">
        <div class="ct4-note">DOI akhir <b>September 2026</b> = stok akhir Sep dari stock_history ÷ rata-rata sales Juli–September 2026 dari Commercial × 30. <b>Bukan</b> DOI snapshot fisik tanggal 2–5 Oktober. Tidak menghitung DOI bulan terdahulu tanpa 3 bulan sales yang sesuai.</div>
        <div class="ct4-metrics" style="margin:12px 0">
          <div class="ct4-card tone-blue"><div class="ct4-k">DOI Akhir September 2026</div><div class="ct4-v">${historical.coverage===r.length&&historical.period.length===1?fmt(historical.doi,2)+' <small>hari</small>':'DATA REQUIRED'}</div><div class="ct4-m">Stock sep ${fmt(historical.stock)} BOX · cakupan ${historical.coverage}/${r.length} RDC</div></div>
          <div class="ct4-card tone-amber"><div class="ct4-k">DOI Snapshot Awal Oktober 2026</div><div class="ct4-v">${doi!=null?fmt(doi,2)+' <small>hari</small>':'DATA REQUIRED'}</div><div class="ct4-m">Snapshot 2–5 Okt, denominator sales Juli–September</div></div>
        </div>
        <div class="ct4-table-wrap"><table class="ct4-table"><thead><tr><th>RDC</th><th class="r">Stock Akhir Sep</th><th class="r">DOI Sep</th><th class="r">DOI Snapshot Okt</th></tr></thead>
        <tbody>${historical.rows.map(x=>`<tr><td><b>${safe(x.rdc_name)}</b></td><td class="r">${fmt(x.stock_sep)}</td><td class="r">${fmt(x.doi_month,2)} hari</td><td class="r">${fmt(x.doi_days,2)} hari</td></tr>`).join('')||'<tr><td colspan="4">Data penjualan tiga bulan yang cocok belum tersedia.</td></tr>'}</tbody></table></div>
      </div>
    </div>

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

    <div class="ct4-section-head" id="ct4OccupancyAnchor"><h3>04 · Warehouse Occupancy</h3><span>${occ.month?`Stok ${occ.month} · kapasitas master referensi`:`Snapshot ${dateLabel(occ.date)} · historis`}</span></div>
    <div class="ct4-metrics four">
      ${[
       ['National / Area Occupancy',occPct!=null&&(!full||occ.complete)?fmt(occPct,1)+'%':'DATA REQUIRED','Σ Stock / Σ Design Capacity'],
       ['Total Used / Stock',occ.rows.length?fmt(used):'—',occ.month?`Box · stok bulanan ${occ.month}`:'Box · snapshot historis'],
       ['Remaining Capacity',occ.rows.length?fmt(capacity-used):'—','Box · bukan instruksi transfer'],
       ['RDC Capacity Watch',occ.rows.length?`${occ.rows.filter(x=>Number(x.stock_current_box)/Number(x.kapasitas_box)>=.85).length} / ${occ.rows.length}`:'—','Batas pantau ≥85%']
      ].map(([t,v,m])=>`<div class="ct4-card"><div class="ct4-k">${t}</div><div class="ct4-v ${String(v).length>15?'small':''}">${v}</div><div class="ct4-m">${m}</div></div>`).join('')}
    </div>
    <div class="ct4-panel ct4-report"><div class="ct4-panel-head"><b>Occupancy by RDC</b>${label(occ.month?'KAPASITAS REFERENSI '+occ.month:'HISTORICAL '+dateLabel(occ.date),'amber')}</div><div class="ct4-panel-body">
       <div class="ct4-note" style="margin:0 0 12px">Sumber: <b>${occ.month?'stock_history '+safe(occ.month):'rdc_snapshot_log'}</b> / <b>${occ.month?'rdc_master':'snapshot historis'}</b>. ${occ.month?'Kapasitas master belum dikonfirmasi untuk akhir bulan; occupancy berdasarkan box, bukan posisi pallet WMS.':'Snapshot historis; bukan live WMS.'}
       ${occ.deltaPercentagePoints!=null? `Perubahan dibanding ${safe(occ.priorMonth)}: ${occ.deltaPercentagePoints>=0?'+':''}${fmt(occ.deltaPercentagePoints,2)} poin persentase dengan kapasitas referensi sama.` : ''}</div>
       ${occLines||'<div class="ct4-note">Snapshot occupancy tidak tersedia.</div>'}
       <button class="ct4-link" data-ct4-nav="occupancy">Buka laporan Occupancy →</button>
    </div></div>


    <div class="ct4-section-head" id="ct4BreakageAnchor"><h3>04B · Breakage Monitoring</h3><span>Data insiden terkini &amp; KPI historis · sumber terpisah</span></div>
    <div class="ct4-panel ct4-report" style="border-top:4px solid #268b8a">
      <div class="ct4-panel-head"><b>Integrasi SLS Breakage Monitoring</b>${label(bs?'TERHUBUNG':st.breakageError?'ERROR':'MEMUAT',bs?'green':st.breakageError?'red':'blue')}</div>
      <div class="ct4-panel-body">
        <div class="ct4-note">Data insiden berasal langsung dari <b>Breakage Monitoring</b> dan mencakup Draft maupun Approved. Ini bukan rasio breakage nasional ketika baru sebagian RDC melapor. Rekap KPI dengan denominator tersedia terakhir disajikan secara terpisah.</div>
        ${st.breakageError?`<div class="ct4-note" style="color:#ab3936">${safe(st.breakageError)}</div>`:''}
        <div class="ct4-metrics four" style="margin-top:12px">
          <div class="ct4-card tone-teal"><div class="ct4-k">Insiden ${safe(bi?.month||'terkini')}</div><div class="ct4-v">${bi?.month?fmt(bi.incident_count):'DATA REQUIRED'}</div><div class="ct4-m">${bi?.month?fmt(bi.qty_box)+' box · '+bi.rdc_reported+'/'+bs.expected_rdc+' RDC melapor':'Belum tersedia'}</div></div>
          <div class="ct4-card tone-amber"><div class="ct4-k">Belum disetujui</div><div class="ct4-v">${bi?.month?fmt(bi.pending_count):'—'}</div><div class="ct4-m">${bi?.month?fmt(bi.approved_count)+' approved · '+fmt(bi.approved_box)+' box':'Menunggu laporan'}</div></div>
          <div class="ct4-card tone-blue"><div class="ct4-k">Delivery KPI · ${safe(bk?.month||'—')}</div><div class="ct4-v">${bk?.month&&Number(bk.delivered_box)>0?fmt(bk.delivery_rate_10k,2)+' <small>/10rb</small>':'DATA REQUIRED'}</div><div class="ct4-m">Rekap historis · Pecah Kirim / Delivered Box</div></div>
          <div class="ct4-card tone-blue"><div class="ct4-k">Warehouse KPI · ${safe(bk?.month||'—')}</div><div class="ct4-v">${bk?.month&&Number(bk.stock_exposure_box)>0?fmt(bk.warehouse_rate_10k,2)+' <small>/10rb</small>':'DATA REQUIRED'}</div><div class="ct4-m">Rekap legacy · Gudang / Stock Exposure</div></div>
        </div>
        <div class="ct4-table-wrap" style="margin-top:12px"><table class="ct4-table"><thead><tr><th>RDC</th><th class="r">Insiden</th><th class="r">Box</th><th class="r">Delivery</th><th class="r">Warehouse</th><th>Status</th></tr></thead><tbody>
          ${(bs?.rdc_rows||[]).map(x=>`<tr><td><b>${safe(x.rdc)}</b></td><td class="r">${x.reported?fmt(x.incident_count):'—'}</td><td class="r">${x.reported?fmt(x.qty_box):'—'}</td><td class="r">${x.reported?fmt(x.delivery_box):'—'}</td><td class="r">${x.reported?fmt(x.warehouse_box):'—'}</td><td>${label(x.reported?'TERCATAT':'BELUM ADA LAPORAN',x.reported?'green':'amber')}</td></tr>`).join('')||'<tr><td colspan="6">Belum ada data yang dapat dibaca.</td></tr>'}
        </tbody></table></div>
        <div class="ct4-note" style="margin-top:12px">Periode insiden: <b>${safe(bi?.month||'—')}</b> · periode rekap legacy: <b>${safe(bk?.month||'—')}</b> (${fmt(bk?.rdc_count||0)} RDC). Rasio legacy bukan pengganti KPI Pecah Penyimpanan terbaru yang mensyaratkan exposure SAP dan rekonsiliasi di aplikasi Breakage.</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button type="button" class="ct4-link" id="ct4BreakageOpen">Buka Breakage Monitoring ↗</button>
          <button type="button" class="ct4-link" id="ct4BreakageRefresh">↻ Segarkan Breakage</button>
        </div>
      </div>
    </div>
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
        ['Service Level','20%',st.slaQuality[0]?.eligible_otif_records>0?'OTIF: REVIEW REQUIRED':'OTIF: DATA REQUIRED',st.slaQuality[0]?fmt(st.slaQuality[0].source_records)+' catatan SLA s.d. '+(st.slaQuality[0].last_so_date||'—')+'; '+fmt(st.slaQuality[0].eligible_otif_records)+' record memenuhi syarat OTIF. Skor resmi perlu validasi eligibility, promised date, qty.':'Sumber SLA tidak tersedia untuk akun ini; promised date dan qty perlu divalidasi','DATA REQUIRED','red'],
        ['Inventory Accuracy','20%',ev.opWeighted!=null?fmt(ev.opWeighted,2)+'% ('+ev.opCoverage+' RDC)':'DATA REQUIRED',
ev.opWeighted!=null?'Σ |selisih| '+fmt(ev.opVariance,2)+' / Σ |stok sistem| '+fmt(ev.opSystem,2)+' BOX; tanggal '+dateLabel(ev.opDate[0])+' s.d. '+dateLabel(ev.opDate[ev.opDate.length-1])+'. INDIKATIF; bukan KPI nasional pada satu periode.':'Belum ada hasil opname BOX yang dapat dibaca untuk area ini',
ev.opWeighted!=null?'PARTIAL':'DATA REQUIRED',ev.opWeighted!=null?'amber':'red'],
        ['Warehouse Operational Performance','20%',bi?.month?fmt(bi.incident_count)+' insiden · '+fmt(bi.qty_box)+' box ('+bi.month+')':'DATA REQUIRED',bi?.month?'Breakage Monitoring '+bi.rdc_reported+'/'+bs.expected_rdc+' RDC; '+fmt(bi.pending_count)+' belum disetujui. Rasio lengkap terakhir '+(bk?.month||'—')+' (Warehouse '+fmt(bk?.warehouse_rate_10k,2)+'/10rb). Produktivitas belum lengkap.':'Sumber Breakage Monitoring belum terbaca; produktivitas juga belum lengkap.','PARTIAL','amber'],
        ['Cost Efficiency','15%',ev.routes?fmt(ev.routes)+' rute benchmark':'DATA REQUIRED','Tarif vendor adalah quotation, bukan actual WH+delivery cost / net sales. Rasio resmi belum bisa dihitung.','DATA REQUIRED','red'],
        ['SOP & K3 Compliance','15%','DATA REQUIRED','Perlu audit SOP/K3 dan corrective actions, bukan jumlah stock opname','DATA REQUIRED','red'],
        ['People Development & Team Performance','10%',ev.peopleCountValid?fmt(ev.peopleCount)+' orang (master)':'DATA REQUIRED','Headcount bukan achievement training, kompetensi maupun performa SDM','PARTIAL','amber']
      ].map(x=>`<tr><td><b>${safe(x[0])}</b></td><td class="r">${x[1]}</td><td><b>${safe(x[2])}</b></td><td>${safe(x[3])}</td><td>${label(x[4],x[5])}</td></tr>`).join('')}
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
  // Single-owner status: update the same pinned element directly on EVERY draw.
  // Do not create another #ct4SourceBanner inside shell: getElementById would
  // otherwise select the stale pinned one and leave the new one in scroll content.
  if(statusSlot){
    statusSlot.innerHTML=`<div class="ct4-banner" id="ct4SourceBanner" role="status" aria-live="polite"><b>STATUS SUMBER</b><span>${safe(freshness)}</span>${!st.loaded?label('MEMUAT','blue'):!ready?label('DATA REQUIRED','red'):label('DOI '+r.length+' RDC tersedia','green')}</div>`;
  }
  syncStickyOffset();
  shell.querySelectorAll('[data-ct4-nav]').forEach(b=>b.addEventListener('click',()=>{const n=$(b.dataset.ct4Nav==='occupancy'?'v3NavOccupancy':'v3NavCostRatio');n?.click()}));
  $('ct4BreakageOpen')?.addEventListener('click',()=>window.open('https://sls-breakage.vercel.app/','_blank','noopener,noreferrer'));
  $('ct4BreakageRefresh')?.addEventListener('click',()=>refreshBreakage(true));
  if(typeof window.renderCommercialKpiTeaser==='function')window.renderCommercialKpiTeaser();
  if($('mainTitle'))$('mainTitle').textContent='Supply Chain Control Tower';
  if($('periodLine'))$('periodLine').textContent='Dari kinerja operasional → risiko bisnis → tindakan → keputusan manajemen';
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
 <tr><td>Occupancy</td><td>Stok bulanan ÷ kapasitas master (referensi)</td><td>${occupancy().month||dateLabel(occupancy().date)}</td><td>${label(occupancy().month?'CAPACITY RECONFIRMATION':'HISTORICAL','amber')}</td></tr>
 <tr><td>OTIF</td><td>${st.checks.otif?'Ada baris sumber':'0 baris'}</td><td>—</td><td>${label(st.checks.otif?'VALIDATION REQUIRED':'DATA REQUIRED',st.checks.otif?'amber':'red')}</td></tr>
 <tr><td>Logistics Cost</td><td>${st.checks.cost?'Ada baris sumber':'0 baris'}</td><td>—</td><td>${label(st.checks.cost?'RECONCILE FINANCE':'DATA REQUIRED',st.checks.cost?'amber':'red')}</td></tr>
 <tr><td>Net Sales Finance</td><td>${st.checks.financial?'Ada baris sumber':'Belum terintegrasi'}</td><td>—</td><td>${label('DATA REQUIRED','red')}</td></tr>
 <tr><td>Breakage Monitoring</td><td>${st.breakageSync?.incidents?.month?fmt(st.breakageSync.incidents.incident_count)+' insiden / '+fmt(st.breakageSync.incidents.qty_box)+' box':'DATA REQUIRED'}</td><td>${safe(st.breakageSync?.incidents?.month||'—')} / KPI ${safe(st.breakageSync?.historical_kpi?.month||'—')}</td><td>${label(st.breakageSync?'LIVE INSIDEN · KPI HISTORIS':st.breakageError?'ERROR KONEKSI':'MEMUAT',st.breakageSync?'amber':st.breakageError?'red':'blue')}</td></tr>
  <tr><td>Inventory Accuracy</td><td>${evidence('Semua').opWeighted!=null?fmt(evidence('Semua').opWeighted,2)+'% (sampel '+evidence('Semua').opCoverage+' RDC)':'DATA REQUIRED'}</td><td>${evidence('Semua').opDate.length?dateLabel(evidence('Semua').opDate[0])+' – '+dateLabel(evidence('Semua').opDate[evidence('Semua').opDate.length-1]):'—'}</td><td>${label('INDIKATIF · PERIODE BEDA','amber')}</td></tr>
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
 ['doiLegacy','doi_manual_rdc_snapshot','&order=snapshot_date.desc&limit=50'],
 ['commercial','commercial_kpi_rdc_snapshot_v1','&order=snapshot_date.desc&limit=50'],
 ['opname','management_inventory_opname_latest_v2','&limit=15'],
 ['slaQuality','management_sla_quality_v1','&limit=1'],
 ['breakage','breakage_monthly','&order=period.desc&limit=100'],
 ['freight','freight_benchmark_summary_v1','&limit=25'],
 ['occ','rdc_snapshot_log','&order=snapshot_date.desc,snapshot_at.desc&limit=150'],
 ['monthStocks','stock_history','&order=month.desc&limit=200'],
 ['capacity','rdc_master','&limit=50'],
 ['sku','doi_manual_sku_snapshot','&limit=1'],
 ['otif','otif_data','&limit=1'],
 ['cost','logistics_cost','&limit=1'],
 ['financial','financial_master','&limit=1'],
 ['action','action_tracker','&limit=1']
 ];
 const out=await Promise.allSettled(targets.map(([,t,q])=>sbSelect(t,q)));
 out.forEach((o,i)=>{
  const [k]=targets[i];const arr=o.status==='fulfilled'&&Array.isArray(o.value)?o.value:[];
  if(k==='doiLegacy'){ st.doi=arr; }
  else if(k==='commercial'){
   st.commercial=arr;
   if(arr.length)st.doi=arr.map(r=>({rdc_name:r.rdc_name,snapshot_date:r.snapshot_date,sales_through_month:r.sales_through_month,
    current_stock_box:Number(r.stock_box),avg_sales_3m_box:Number(r.sales_3m_avg_box),doi_days:Number(r.doi_days),
    no_movement_3m_stock:Number(r.no_movement_3m_box),no_movement_6m_stock:Number(r.no_movement_6m_box)}));
  }
  else if(['occ','monthStocks','capacity','opname','breakage','freight','slaQuality'].includes(k))st[k]=arr;
  else st.checks[k]=arr.length>0;
 });
 st.loaded=true;await refreshBreakage(false,false);draw();buildQuality();
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
render=function(rdc){const result=oldRender(rdc);draw();if(!st.busy&&!IS_OFFLINE_MODE)load();else if(st.loaded&&breakageArea()!==st.breakageScope)refreshBreakage(false);return result};
if(!CURRENT_RDC_SCOPE)draw();
})();