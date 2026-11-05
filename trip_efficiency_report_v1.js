(function(){
'use strict';
const $=id=>document.getElementById(id);
const fmt=n=>Number(n||0).toLocaleString('id-ID',{maximumFractionDigits:2});
const money=n=>'Rp '+fmt(n);
const pct=n=>fmt(n)+'%';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=x=>{const n=Number(x);return Number.isFinite(n)?n:0};
let rows=[],filtered=[],ready=false;
function calc(r){
 const cap=num(r.vehicle_capacity),load=num(r.actual_load)||num(r.weight_kg),cost=num(r.cost);
 if(!(cap>0&&load>0&&cost>=0))return null;
 const base=cost/cap,actual=cost/load;
 return {...r,cap,load,cost,base,actual,util:load/cap*100,index:actual/base*100,extra:actual-base,unused:Math.max(cap-load,0)};
}
function capture(){const container=$('page-v3-costratio');if(!container||$('ctTripEfficiency'))return;
const panel=document.createElement('section');panel.id='ctTripEfficiency';panel.className='v3-block';
panel.style.cssText='margin:18px 0 28px;padding:20px;box-sizing:border-box';
panel.innerHTML=`
 <h2 style="font-size:22px;line-height:1.35;margin:0 0 8px;color:#1F3864">Efisiensi Biaya Kiriman per Trip</h2>
 <div style="font-size:13px;line-height:1.65;color:#57534e;margin-bottom:15px">Indikator operasional berbeda dari <b>Logistics Cost / Net Sales</b>. Baseline 100% = biaya per kg pada kapasitas standar truk, dengan ongkos trip yang sama. Jika tonase turun, indeks biaya per kg akan meningkat. Baris tanpa berat, kapasitas atau biaya valid tidak dihitung.</div>
 <div class="v3-controls" style="display:flex;flex-wrap:wrap;gap:10px;align-items:end">
  <label>RDC<select id="ctTripRdc"><option value="">Semua RDC</option></select></label>
  <label>Vendor<select id="ctTripVendor"><option value="">Semua vendor</option></select></label>
  <label>Periode<input id="ctTripMonth" type="month"></label>
  <button id="ctTripRefresh" type="button">Refresh Data</button>
  <button id="ctTripExport" type="button">Export CSV</button>
 </div>
 <div id="ctTripStatus" style="font-size:12px;color:#78716c;margin:12px 0"></div>
 <div id="ctTripKpis" class="v3-grid3" style="margin-bottom:15px"></div>
 <div class="v3-table-wrap" style="overflow-x:auto"><table class="v3-table" style="min-width:1050px;width:100%;font-size:13px"><thead><tr><th>Tanggal</th><th>RDC</th><th>Vendor</th><th>Trip / Rute</th><th>Kapasitas</th><th>Aktual</th><th>Load Utilization</th><th>Biaya Trip</th><th>Rp/kg Baseline</th><th>Rp/kg Aktual</th><th>Cost Index</th><th>Selisih</th></tr></thead><tbody id="ctTripBody"></tbody></table></div>
 <div class="v3-warning" style="margin-top:13px"><b>Metode agregasi:</b> Load Utilization = total berat aktual ÷ total kapasitas; Cost Index = (total ongkos ÷ total berat aktual) ÷ (total ongkos ÷ total kapasitas). Hanya trip yang valid dijumlahkan; ongkos dan tonase tidak di-rata-rata per baris. Indeks ini mengukur efisiensi muatan pada biaya trip tetap, bukan realisasi penghematan kas.</div>
 <div class="v3-block" style="margin-top:18px;padding:15px;background:#f7f9fc">
   <div class="v3-section-title">Simulasi Per Trip — bukan data aktual</div>
   <div class="v3-controls"><label>Kapasitas (kg)<input id="ctSimCap" type="number" min="1" value="8000"></label><label>Tonase aktual (kg)<input id="ctSimLoad" type="number" min="1" value="7000"></label><label>Ongkos per Trip (Rp)<input id="ctSimCost" type="number" min="0" value="1000000"></label></div>
   <div id="ctSimResult" style="font-size:15px;margin:12px 0;line-height:1.8"></div>
 </div>`;
const before=$('v3CostContent'); if(before)before.insertAdjacentElement('afterend',panel);else container.appendChild(panel);
$('ctTripRefresh').addEventListener('click',load);$('ctTripExport').addEventListener('click',exportCsv);
['ctTripRdc','ctTripVendor','ctTripMonth'].forEach(id=>$(id).addEventListener('change',render));
['ctSimCap','ctSimLoad','ctSimCost'].forEach(id=>$(id).addEventListener('input',simulate));simulate();
}
function simulate(){
 if(!$('ctSimResult'))return;
 const cap=num($('ctSimCap').value),load=num($('ctSimLoad').value),cost=num($('ctSimCost').value);
 $('ctSimResult').innerHTML=cap>0&&load>0&&cost>=0?`Load Utilization: <b>${pct(load/cap*100)}</b> &nbsp;|&nbsp; Cost Index: <b style="color:${load<cap?'#b45309':'#15803d'}">${pct(cap/load*100)}</b> &nbsp;|&nbsp; Rp/kg: <b>${money(cost/cap)} → ${money(cost/load)}</b> &nbsp;|&nbsp; Perubahan: <b>${pct((cap/load-1)*100)}</b>`:'Masukkan kapasitas dan tonase lebih besar dari 0.';
}
function filters(){
 const rdc=$('ctTripRdc')?.value||'',vendor=$('ctTripVendor')?.value||'',month=$('ctTripMonth')?.value||'';
 filtered=rows.map(calc).filter(Boolean).filter(r=>(!rdc||r.rdc_name===rdc)&&(!vendor||r.vendor_name===vendor)&&(!month||String(r.cost_date||'').startsWith(month)));
}
function render(){
 if(!$('ctTripBody'))return;filters();
 const sum=(k)=>filtered.reduce((a,r)=>a+r[k],0),cap=sum('cap'),load=sum('load'),cost=sum('cost');
 const utilization=cap>0?load/cap*100:null,idx=load>0?cap/load*100:null;
 $('ctTripStatus').textContent=ready?`${filtered.length} trip valid dari ${rows.length} baris sumber logistics_cost. ${rows.length?'Sumber: database Control Tower.':'Belum ada data aktual; simulasi tetap dapat digunakan.'}`:'Memuat data aktual...';
 $('ctTripKpis').innerHTML=[
 ['Total Berat Aktual',load?fmt(load)+' kg':'DATA REQUIRED',fmt(cap)+' kg kapasitas'],
 ['Load Utilization',utilization==null?'DATA REQUIRED':pct(utilization), 'Total berat / total kapasitas'],
 ['Cost Index',idx==null?'DATA REQUIRED':pct(idx),load?'Biaya per kg '+money(cost/load)+' vs standar '+money(cost/cap):'Actual cost and weight needed']
 ].map(([k,v,d])=>`<div class="v3-kpi-card"><div class="v3-eyebrow">${k}</div><div class="v3-big" style="font-size:23px">${v}</div><div class="v3-muted">${d}</div></div>`).join('');
 $('ctTripBody').innerHTML=filtered.length?filtered.slice(0,500).map(r=>`<tr><td>${esc(r.cost_date)}</td><td>${esc(r.rdc_name)}</td><td>${esc(r.vendor_name||r.vendor_or_own||'—')}</td><td>${esc(r.trip_id||r.shipment_id||r.lane||r.route||'—')}</td><td>${fmt(r.cap)}</td><td>${fmt(r.load)}</td><td>${pct(r.util)}</td><td>${money(r.cost)}</td><td>${money(r.base)}</td><td>${money(r.actual)}</td><td style="font-weight:700;color:${r.index>100?'#b45309':'#15803d'}">${pct(r.index)}</td><td>${pct(r.index-100)}</td></tr>`).join(''):'<tr><td colspan="12" style="text-align:center;padding:22px">Belum ada data trip valid untuk filter ini. Isi data logistics_cost dengan tanggal, vendor, kapasitas, berat aktual, dan biaya trip.</td></tr>';
}
async function load(){
 capture();if(!$('ctTripStatus'))return;ready=false;render();
 try{
  if(typeof sbSelect!=='function')throw new Error('Koneksi data tidak tersedia');
  const data=await sbSelect('logistics_cost','&order=cost_date.desc&limit=5000');
  if(!Array.isArray(data))throw new Error('Format respons tidak valid');
  rows=data;
  const opts=(id,values,label)=>{const el=$(id);if(!el)return;const old=el.value;el.innerHTML='<option value="">'+label+'</option>'+[...new Set(values.filter(Boolean))].sort().map(v=>'<option value="'+esc(v)+'">'+esc(v)+'</option>').join('');el.value=old;};
  opts('ctTripRdc',rows.map(r=>r.rdc_name),'Semua RDC');opts('ctTripVendor',rows.map(r=>r.vendor_name),'Semua vendor');
  ready=true;render();
 }catch(e){ready=true;rows=[];render();$('ctTripStatus').textContent='Data aktual belum dapat dibaca: '+String(e.message||e)+'. Simulasi tetap tersedia.';}
}
function exportCsv(){
 const cols=['Tanggal','RDC','Vendor','Trip','Kapasitas KG','Aktual KG','Utilization %','Biaya Rp','Baseline Rp/Kg','Aktual Rp/Kg','Cost Index %','Variance %'];
 const vals=filtered.map(r=>[r.cost_date,r.rdc_name,r.vendor_name||r.vendor_or_own,r.trip_id||r.shipment_id||r.route,r.cap,r.load,r.util,r.cost,r.base,r.actual,r.index,r.index-100]);
 const csv=[cols,...vals].map(a=>a.map(x=>'"'+String(x??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');
 const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='SLS_Trip_Cost_Index_'+new Date().toISOString().slice(0,10)+'.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
let retries=0;const interval=setInterval(()=>{const p=$('page-v3-costratio');if(!p&&++retries<30)return;clearInterval(interval);if(!p)return;capture();load();},300);
})();