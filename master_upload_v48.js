(function secureUploadUiV1(){
'use strict';
const $=id=>document.getElementById(id);
const safe=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const fmt=(x,d=0)=>Number(x||0).toLocaleString('id-ID',{maximumFractionDigits:d,minimumFractionDigits:d});
const master=()=>typeof CURRENT_ROLE!=='undefined'&&CURRENT_ROLE==='master';
const signed=()=>typeof AUTH_SESSION_OK!=='undefined'&&AUTH_SESSION_OK&&typeof AUTH_SESSION!=='undefined'&&!!AUTH_SESSION?.access_token;
const canOpname=()=>signed()&&!IS_OFFLINE_MODE&&(master()||['admin','supervisor'].includes(CURRENT_ROLE));
const sem=date=>/^\d{4}-\d{2}-\d{2}$/.test(date)?date.slice(0,4)+'-S'+(Number(date.slice(5,7))<=6?'1':'2'):'';
const norm=s=>String(s??'').trim().toUpperCase().replace(/\s+/g,' ');
const fileExt=s=>/\.(xlsx|xls|ods)$/i.test(s||'');
async function fileHash(file){
 if(!globalThis.crypto?.subtle)throw Error('Browser tidak mendukung SHA-256; buka aplikasi menggunakan HTTPS.');
 const buf=await file.arrayBuffer(),digest=await crypto.subtle.digest('SHA-256',buf);
 return Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join('');
}
function report(msg,kind='info',el='stockOpnameGlobalMsg'){
 const box=$(el);if(!box)return;
 box.textContent=msg;box.style.color=kind==='error'?'#b3261e':kind==='success'?'#26764e':'#5b6e83';
 box.style.fontWeight=kind==='error'?'800':'600';
}
function normalizedPrice(v){
 if(typeof v==='number')return Number.isFinite(v)?v:null;
 let s=String(v??'').trim().replace(/Rp\.?/gi,'').replace(/\s/g,'');
 if(!s||s==='-')return null;
 if(/^\(.*\)$/.test(s))return null;
 s=s.replace(/[^\d,.]/g,'');
 if(!s)return null;
 if(s.includes(',')&&s.includes('.')){
  const dec=s.lastIndexOf(',')>s.lastIndexOf('.');
  s=dec?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'');
 }else if(s.includes(',')){
  const a=s.split(',');
  s=a.length>2||a.at(-1).length===3?s.replace(/,/g,''):s.replace(',','.');
 }else if(s.includes('.')){
  const a=s.split('.');
  if(a.length>2||a.length===2&&a[1].length===3)s=a.join('');
 }
 const n=Number(s);return Number.isFinite(n)&&n>=0?n:null;
}
const opa={parsed:[],uploaded:[],busy:false};
const previewBtn=$('stockOpnameParseBtn'),sendBtn=$('stockOpnameUploadBtn'),fileInp=$('stockOpnameFileInput');
async function parseOpnameNow(){
 if(!canOpname())return report('Akses upload hanya untuk Master atau Admin/SPV RDC melalui login aktif.','error');
 const files=[...(fileInp?.files||[])];
 if(!files.length)return report('Pilih file Stock Opname terlebih dahulu.','error');
 if(files.length>10)return report('Maksimum 10 file per proses.','error');
 if(files.some(f=>!fileExt(f.name)||f.size>25e6))return report('Hanya .xls/.xlsx/.ods sampai 25 MB per file.','error');
 opa.parsed=[];report('Membaca Excel, menghitung SHA-256, dan mengecek data yang sudah tersimpan…');
 await parseSelectedStockOpnameFiles();
 let previous=[];
 try{previous=await sbSelect('inventory_opname_uploaded_summary_v2','&order=ingested_at.desc&limit=1000');}
 catch(e){report('Gagal memeriksa histori upload secara aman: '+e.message,'error');sendBtn.disabled=true;return}
 for(let i=0;i<files.length;i++){
  const file=files[i],p=STOCK_OPNAME_PARSED[i];
  if(!p)continue;
  try{
   const hash=await fileHash(file);
   opa.parsed[i]={hash,file};
   const same=previous.find(r=>r.file_sha256===hash);
   const period=previous.find(r=>r.rdc_name===p.rdc&&sem(r.check_date)===sem(p.date));
   let status=same?'DUPLICATE':period?'REVISION_REVIEW':p.errors?.length?'INVALID':'READY';
   opa.parsed[i].status=status;
   const card=$('stockOpnamePreview')?.querySelector(`[data-so-index="${i}"]`);
   if(card){
    const div=document.createElement('div');div.className='upv-note';div.style.cssText='font-size:12px;margin:8px 0;padding:9px;border-radius:8px;background:'+(status==='READY'?'#e7f3ec':status==='DUPLICATE'?'#e9eef6':'#fff3e2');
    div.textContent=status==='READY'?`BELUM ADA DUPLIKAT · SHA ${hash.slice(0,12)}…`
      :status==='DUPLICATE'?'DUPLIKAT IDENTIK · file sudah tercatat, tidak akan ditambahkan.'
      :status==='REVISION_REVIEW'?`REVISI SEMESTER · ${p.rdc} ${sem(p.date)} sudah punya data (${period.source_file}); upload diblokir.`
      :'FILE TIDAK VALID · periksa header dan data.';
    card.append(div);
   }
  }catch(e){opa.parsed[i]={status:'INVALID',error:String(e)}}
 }
 const valid=opa.parsed.filter(x=>x?.status==='READY').length;
 sendBtn.disabled=!valid;
 report(`${valid} file baru dapat diproses; ${opa.parsed.filter(x=>x?.status==='DUPLICATE').length} duplikat identik; ${opa.parsed.filter(x=>x?.status==='REVISION_REVIEW').length} revisi ditahan. Periksa RDC/tanggal lalu konfirmasi.`,valid?'success':'info');
}
async function submitOpnameNow(){
 if(opa.busy||!canOpname())return report('Login aktif dengan hak akses upload diperlukan.','error');
 if(!opa.parsed.length)return report('Klik Analisa File terlebih dahulu.','error');
 opa.busy=true;sendBtn.disabled=true;
 let inserted=0,duplicated=0,blocked=0,failed=0;
 for(let i=0;i<opa.parsed.length;i++){
  const meta=opa.parsed[i],p=STOCK_OPNAME_PARSED[i];
  if(!meta||!p){failed++;continue}
  if(meta.status==='DUPLICATE'){duplicated++;continue}
  if(meta.status!=='READY'){blocked++;continue}
  try{
   // A changed file/date/rdc after preview is never silently published.
   if(!p.rdc||!p.date||!sem(p.date))throw Error('RDC dan tanggal harus valid; jalankan Analisa File lagi.');
   if(CURRENT_RDC_SCOPE&&p.rdc!==CURRENT_RDC_SCOPE)throw Error('Akses RDC berbeda dari file.');
   if(meta.file?.name!==p.fileName)throw Error('File berubah sejak preview.');
   if(!/^REPORT PER MATERIAL/i.test(norm(p.sheetName)))throw Error('Harus memakai sheet Report per Material yang dapat diaudit.');
   const box=p.lines.filter(x=>norm(x.uom)==='BOX'&&!/^(TOTAL|GRAND TOTAL|SUBTOTAL|JUMLAH|SUMMARY)/i.test(norm(x.sku)));
   if(!box.length)throw Error('Tidak ada baris material BOX yang valid.');
   let system=0,physical=0,abs=0,mismatch=0;
   const keys=new Set();
   for(const row of box){
    const key=norm(row.sku);if(!key||keys.has(key))throw Error('Duplikat material '+key);
    keys.add(key);
    const a=Number(row.system_qty),b=Number(row.physical_qty),v=Number(row.variance_qty);
    if(![a,b,v].every(Number.isFinite)||a<0||b<0)throw Error('Ada angka stok tidak valid pada '+key);
    if(Math.abs(b-a-v)>0.011)mismatch++;
    system+=a;physical+=b;abs+=Math.abs(b-a);
   }
   if(mismatch)throw Error(`${mismatch} baris variance tidak sama dengan fisik − sistem. Publikasi diblokir.`);
   const payload={rdc_name:p.rdc,check_date:p.date,source_file:p.fileName,file_sha256:meta.hash,
    source_sheet:p.sheetName,box_sku_count:box.length,excluded_non_box_rows:p.lines.length-box.length,
    system_qty_box:Number(system.toFixed(3)),physical_qty_box:Number(physical.toFixed(3)),
    abs_variance_box:Number(abs.toFixed(3)),source_variance_discrepancy_rows:0};
   const res=await sbRpc('upload_stock_opname_summary_v3',{p_payload:payload});
   if(res.status==='INSERTED')inserted++;else if(res.status==='DUPLICATE')duplicated++;else blocked++;
  }catch(e){failed++;report(p.fileName+': '+(e.message||e),'error')}
 }
 opa.busy=false;
 report(`Stock Opname: ${inserted} baru, ${duplicated} duplikat dilewati, ${blocked} revisi ditahan, ${failed} gagal. Tidak ada file yang ditumpuk.`,failed?'error':'success');
 opa.parsed=[];sendBtn.disabled=true;
 if(inserted){await refreshOpnameHistory();if(window.commercialKpiLive?.reload)window.commercialKpiLive.reload();alert('Opname tersimpan. Refresh dashboard untuk membaca Inventory Accuracy terbaru.')}
}
if(previewBtn)previewBtn.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();parseOpnameNow().catch(err=>report(err.message,'error'));},true);
if(sendBtn)sendBtn.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();submitOpnameNow().catch(err=>report(err.message,'error'));},true);
const legacySummary=$('stockOpnameCurrentSummary');
if(legacySummary){legacySummary.style.display='none';}
const newSummary=document.createElement('div');newSummary.id='soAuthoritativeHistoryV48';
newSummary.className='retailup-card';
newSummary.style.cssText='background:#fff;border:1px solid #dce5ef;border-radius:12px;padding:16px;margin-top:12px';
legacySummary?.after(newSummary);
async function refreshOpnameHistory(){
 if(!newSummary||!signed()){newSummary.textContent='Login untuk melihat hasil stock opname yang tersimpan.';return}
 try{
  const data=await sbSelect('inventory_opname_uploaded_summary_v2','&order=check_date.desc&limit=100');
  const chosen=[...data].sort((a,b)=>String(b.check_date).localeCompare(String(a.check_date)));
  const last=new Map();for(const x of chosen)if(!last.has(x.rdc_name))last.set(x.rdc_name,x);
  const arr=[...last.values()];
  const tot=arr.reduce((a,x)=>a+Number(x.system_qty_box||0),0),dif=arr.reduce((a,x)=>a+Number(x.abs_variance_box||0),0);
  newSummary.innerHTML='<h3 style="margin:0 0 10px;color:#18355b;font-size:17px">Inventory Accuracy · Sumber Terbaru (Upload Terkendali)</h3>'+
  (arr.length?'<p style="font-size:13px;margin-bottom:12px;color:#385b7d"><b>'+fmt(100*(1-dif/tot),2)+'%</b> indikatif · '+arr.length+'/5 RDC · '+fmt(tot,2)+' box sistem</p>'+
  '<div style="overflow:auto"><table class="retailup-table"><thead><tr><th>RDC</th><th>Semester</th><th>Tanggal</th><th>Akurasi</th><th>Nama file</th></tr></thead><tbody>'+
  arr.map(x=>'<tr><td><b>'+safe(x.rdc_name)+'</b></td><td>'+safe(sem(x.check_date))+'</td><td>'+safe(x.check_date)+'</td><td><b>'+fmt(100*(1-Number(x.abs_variance_box)/Number(x.system_qty_box)),2)+'%</b></td><td>'+safe(x.source_file)+'</td></tr>').join('')+
  '</tbody></table></div>':'Belum ada hasil opname tersimpan untuk area ini.');
 }catch(e){newSummary.textContent='Tidak bisa membaca histori opname: '+(e.message||e)}
}
$('navStockOpname')?.addEventListener('click',()=>{refreshOpnameHistory()},false);
const soIntro=$('page-stockopname')?.querySelector('.so-help');
if(soIntro)soIntro.insertAdjacentHTML('beforeend','<p style="margin:10px 0;color:#254a74;font-weight:700">Anti-duplikasi: 1 laporan / RDC / semester. File identik dilewati; revisi berbeda untuk semester sama harus direview Master. Hasil harus memiliki material BOX serta varians konsisten.</p>');

const navStock=$('navStockOpname');
const pricelistNav=document.createElement('div');pricelistNav.id='navRetailPriceUpload';pricelistNav.className='nav-item';
pricelistNav.innerHTML='<span class="nav-icon">▤</span><span>Upload Pricelist Retail</span>';
pricelistNav.style.display='none';
navStock?.after(pricelistNav);
const page=document.createElement('div');page.id='page-pricelist-retail';page.className='page';
page.innerHTML=`<div class="retailup">
  <div class="retailup-head"><div><div class="retailup-eyebrow">MASTER DATA · CONTROL TOWER</div><h2>Upload Pricelist Retail</h2>
  <p>Upload Excel .xls / .xlsx / .ods. Harga <b>sebelum PPN</b> wajib; kode material + UOM harus unik.</p></div>
  <span class="retailup-pill">MASTER ONLY</span></div>
  <div class="retailup-card"><div class="retailup-row"><label>Bulan publikasi <input id="retailUpMonth" type="month"></label>
  <label>Tanggal efektif dalam file <input id="retailUpEffective" type="date"></label></div>
  <label class="retailup-file">Pilih file Pricelist Retail <input type="file" id="retailUpFile" accept=".xls,.xlsx,.ods"></label>
  <div class="retailup-grid">
  <label>Sheet Excel <select id="retailUpSheet"></select></label>
  <label>Baris Header <select id="retailUpHeader"></select></label>
  <label>Kolom Material <select id="retailUpMaterial"></select></label>
  <label>Kolom UOM <select id="retailUpUom"></select></label>
  <label>Harga Sebelum PPN <select id="retailUpEx"></select></label>
  <label>Harga Termasuk PPN (opsional) <select id="retailUpInc"></select></label>
  </div>
  <div class="retailup-row" style="margin-top:15px"><button class="retailup-btn" id="retailUpPreviewBtn" type="button">Validasi &amp; Preview</button>
  <button class="retailup-btn retailup-green" id="retailUpConfirmBtn" type="button" disabled>Konfirmasi &amp; Upload</button></div>
  <div id="retailUpMsg" class="retailup-info">Pilih file Excel dan tentukan kolom harga sebelum PPN.</div>
  <div id="retailUpPreview"></div></div>
  <div class="retailup-card"><h3>Riwayat Pricelist yang tersimpan</h3><div id="retailUpHistory" class="retailup-info">Membaca setelah login…</div></div>
  <div class="retailup-info retailup-warning"><b>Catatan:</b> Pricelist adalah harga jual referensi, bukan HPP atau Actual Net Sales. Upload ini memperbarui master harga, tetapi angka nilai stok pada snapshot Commercial lama tidak akan otomatis berubah sampai data stok per SKU dihitung ulang.</div>
</div>`;
$('page-dashboard')?.after(page);
const css=document.createElement('style');css.textContent=`
.retailup{font:14px/1.55 Inter,Arial,sans-serif;color:#253651;max-width:1420px}
.retailup *{box-sizing:border-box}.retailup-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:17px}
.retailup h2{font-size:25px;margin:4px 0;color:#18355b}.retailup h3{font-size:17px;color:#18355b;margin:0 0 11px}.retailup p{margin:4px 0;color:#62758e}
.retailup-eyebrow{letter-spacing:1.1px;font-size:11px;color:#71839b;font-weight:850}.retailup-pill{font-size:11px;border-radius:8px;padding:8px 11px;background:#ebeff8;color:#2e4d74;font-weight:800}
.retailup-card{background:white;border:1px solid #dbe3ed;border-radius:12px;padding:20px 22px;margin:15px 0}
.retailup-row{display:flex;gap:13px;align-items:end;flex-wrap:wrap}.retailup-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:13px}
.retailup label{display:block;color:#536a83;font-weight:750;font-size:13px}.retailup input,.retailup select{display:block;width:100%;padding:9px 11px;border:1px solid #ccd8e6;border-radius:8px;margin-top:5px;background:#fff;color:#1e3452;font-size:14px}
.retailup .retailup-file{margin:14px 0}.retailup .retailup-file input{font-size:13px}.retailup-btn{border:0;border-radius:8px;background:#214d79;color:#fff;cursor:pointer;padding:11px 16px;font-size:13px;font-weight:800}
.retailup-btn:disabled{background:#aab8c9;cursor:not-allowed}.retailup-green{background:#267b55}.retailup-info{padding:12px 14px;background:#eef4fa;color:#385b7d;border-radius:9px;margin:13px 0;font-size:13px;overflow-wrap:anywhere}
.retailup-warning{background:#fff5e8;color:#8b651e}.retailup-status{display:inline-block;font-size:11px;font-weight:800;border-radius:6px;padding:4px 7px}
.retailup-status.good{background:#e2f3e8;color:#20764c}.retailup-status.warn{background:#fff1d9;color:#986018}
.retailup-table{border-collapse:collapse;width:100%;font-size:12px}.retailup-table th,.retailup-table td{padding:9px 11px;border-bottom:1px solid #e1e7ef;text-align:left}
.retailup-table th{background:#f1f5f9;color:#536a83}.retailup-scroll{overflow:auto;max-height:390px}
@media(max-width:1100px){.retailup-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:620px){.retailup-grid{grid-template-columns:1fr}.retailup-row>*{width:100%}.retailup-card{padding:15px}}
`;
document.head.appendChild(css);
const state={workbook:null,file:null,grid:null,items:[],hash:null,stage:'',invalid:[],busy:false};
const sel=k=>$('retailUp'+k);
const fields=['Material','Uom','Ex','Inc'];
const setMessage=(s,bad=false)=>{const el=sel('Msg');if(el){el.textContent=s;el.style.background=bad?'#fff0eb':'#eef4fa';el.style.color=bad?'#ae4539':'#385b7d'}};
function options(list,selected=-1,allowBlank=false){
 return (allowBlank?'<option value="-1">— Tidak tersedia —</option>':'')+list.map((v,i)=>`<option value="${i}" ${i===selected?'selected':''}>${safe(v||'Kolom '+(i+1))}</option>`).join('');
}
function headerSheet(){
 const sn=state.workbook?.SheetNames?.[Number(sel('Sheet').value)]||'';
 if(!sn)return;
 state.grid=XLSX.utils.sheet_to_json(state.workbook.Sheets[sn],{header:1,defval:null,raw:true});
 const max=Math.min(state.grid.length,30);
 const scores=state.grid.slice(0,max).map((row,i)=>({i,score:row.filter(x=>/material|kode.*barang|uom|unit|harga|price|sebelum.*ppn|ex.*vat/i.test(String(x||''))).length}));
 const best=scores.sort((a,b)=>b.score-a.score)[0]?.i||0;
 sel('Header').innerHTML=options(state.grid.slice(0,max).map((x,i)=>`Baris ${i+1}: ${x.filter(Boolean).slice(0,4).join(' / ')}`),best);
 sel('Header').value=String(best);mapColumns();
}
function mapColumns(){
 const r=state.grid?.[Number(sel('Header').value)]||[];
 const max=Math.max(1,...state.grid.slice(0,40).map(x=>x.length));
 const headers=Array.from({length:max},(_,i)=>String(r[i]??'').trim()||'Kolom '+(i+1));
 const detect=(patterns,exclude=[])=>headers.findIndex(t=>patterns.some(re=>re.test(norm(t)))&&!exclude.some(re=>re.test(norm(t))));
 const material=detect([/MATERIAL/,/KODE.*BARANG/,/ITEM.*CODE/,/SKU/,/PRODUCT.*CODE/]);
 const uom=detect([/^UOM$/,/\bUNIT\b/,/SATUAN/,/UNIT.*MEASURE/]);
 const ex=detect([/SEBELUM.*PPN/,/EXCL.*PPN/,/EX.*VAT/,/EX.*PPN/,/NET.*PRICE/,/HARGA.*DASAR/,/PRICE.*EXCLUSIVE/]);
 const inc=detect([/TERMASUK.*PPN/,/INCL.*PPN/,/INC.*VAT/,/IN.*PPN/,/PRICE.*INCLUSIVE/]);
 const defaults=[material,uom,ex,inc];
 fields.forEach((key,i)=>{sel(key).innerHTML=options(headers,defaults[i],i===3);sel(key).value=String(defaults[i]??-1)});
 sel('ConfirmBtn').disabled=true;state.stage='';
}
sel('File')?.addEventListener('change',async()=>{
 state.items=[];state.workbook=null;sel('ConfirmBtn').disabled=true;const file=sel('File').files?.[0];
 if(!file)return;
 if(!fileExt(file.name)||file.size>25e6){setMessage('Hanya Excel .xls/.xlsx/.ods maksimal 25 MB.',true);return}
 try{
  setMessage('Membaca workbook dan daftar sheet…');
  const buf=await file.arrayBuffer();state.workbook=XLSX.read(buf,{cellDates:true});
  state.file=file;state.hash=await fileHash(file);
  sel('Sheet').innerHTML=options(state.workbook.SheetNames);
  headerSheet();setMessage('Sheet/kolom terdeteksi. Verifikasi mapping, bulan publikasi dan tanggal efektif sebelum upload.');
 }catch(e){setMessage('Gagal membaca workbook: '+e.message,true)}
});
sel('Sheet')?.addEventListener('change',headerSheet);
sel('Header')?.addEventListener('change',mapColumns);
for(const key of fields)sel(key)?.addEventListener('change',()=>{state.stage='';sel('ConfirmBtn').disabled=true});
['Month','Effective'].forEach(k=>sel(k)?.addEventListener('change',()=>{state.stage='';sel('ConfirmBtn').disabled=true}));
function mapping(){
 const idx=fields.map(key=>Number(sel(key).value));
 if(idx.slice(0,3).some(x=>x<0)||new Set(idx.slice(0,3)).size!==3)throw Error('Pilih kolom Material, UOM dan Harga Sebelum PPN yang berbeda.');
 if(idx[3]>=0&&new Set(idx).size!==4)throw Error('Kolom Harga PPN tidak boleh sama dengan kolom lain.');
 return idx;
}
async function previewPrice(){
 if(!master()||!signed())throw Error('Upload Pricelist hanya untuk Master dengan sesi login aktif.');
 if(!state.workbook||!state.file)throw Error('Pilih file Excel.');
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(sel('Month').value))throw Error('Pilih bulan publikasi.');
 if(!/^\d{4}-\d\d-\d\d$/.test(sel('Effective').value))throw Error('Pilih tanggal efektif berdasarkan isi file.');
 const [ci,ui,pi,vi]=mapping();
 const head=Number(sel('Header').value);
 const rows=state.grid.slice(head+1);
 const items=[],invalid=[],duplicate=[],seen=new Set(),maxErrors=12;
 for(let ri=0;ri<rows.length;ri++){
  const row=rows[ri]||[];
  const code=norm(row[ci]),uom=norm(row[ui]);
  if(!code&&!uom&&!String(row[pi]??'').trim())continue;
  if(/^(TOTAL|GRAND TOTAL|SUBTOTAL|JUMLAH|MATERIAL|NO\.)/.test(code))continue;
  const price=normalizedPrice(row[pi]),incl=vi>=0?normalizedPrice(row[vi]):null;
  if(!code||!uom||price===null||!Number.isFinite(price)||price<0||code.length>100||uom.length>20){
   if(invalid.length<maxErrors)invalid.push(`Baris ${head+ri+2}: Material, UOM atau harga sebelum PPN tidak valid.`);
   continue;
  }
  const key=code+'|'+uom;
  if(seen.has(key)){if(duplicate.length<maxErrors)duplicate.push(`Baris ${head+ri+2}: ${key}`);continue}
  seen.add(key);
  items.push({material_code:code,uom,price_ex_vat:price,price_inc_vat:incl});
 }
 if(!items.length)throw Error('Tidak ada material/UOM/harga yang valid. Periksa mapping kolom.');
 if(items.length>20000)throw Error('Maksimum 20.000 material/UOM per file.');
 state.items=items;state.invalid=invalid;state.stage='';
 const old=await sbSelect('retail_pricelist_batch_v1','&order=created_at.desc&limit=100');
 const same=old.find(x=>x.file_sha256===state.hash);
 const period=old.find(x=>x.period_month===sel('Month').value);
 const status=same?'DUPLICATE':period?'REVISION_REVIEW':invalid.length||duplicate.length?'INVALID':'READY';
 state.stage=status;
 sel('Preview').innerHTML=`<div class="retailup-info ${status!=='READY'?'retailup-warning':''}">
 <span class="retailup-status ${status==='READY'?'good':'warn'}">${safe(status)}</span>
 <b>${fmt(items.length)} pasangan Material + UOM valid</b> · ${fmt(invalid.length)} contoh baris tidak valid · ${fmt(duplicate.length)} contoh duplikat dalam file.
 ${same?'File identik sudah tersimpan; jangan upload ulang.':''}
 ${period?'Bulan ini sudah memiliki file berbeda ('+safe(period.source_file)+'). Revisi harus ditinjau, tidak ditimpa.':''}</div>
 ${invalid.length?'<div class="retailup-info retailup-warning">'+safe(invalid.join(' | '))+'</div>':''}
 ${duplicate.length?'<div class="retailup-info retailup-warning">Duplikat material + UOM: '+safe(duplicate.join(' | '))+'</div>':''}
 <div class="retailup-scroll"><table class="retailup-table"><thead><tr><th>Material</th><th>UOM</th><th>Harga ex PPN</th><th>Harga incl PPN</th></tr></thead>
 <tbody>${items.slice(0,10).map(x=>`<tr><td>${safe(x.material_code)}</td><td>${safe(x.uom)}</td><td>Rp ${fmt(x.price_ex_vat,2)}</td><td>${x.price_inc_vat!=null?'Rp '+fmt(x.price_inc_vat,2):'—'}</td></tr>`).join('')}</tbody></table></div>`;
 sel('ConfirmBtn').disabled=status!=='READY';
 setMessage(status==='READY'?'Validasi berhasil. Cek preview dan klik Konfirmasi & Upload.':status==='INVALID'?'Ada baris invalid atau kode material/UOM ganda. Perbaiki file lalu validasi ulang.':'Sudah ada upload identik atau periode sama. Data tidak akan digandakan.',status!=='READY');
}
sel('PreviewBtn')?.addEventListener('click',()=>previewPrice().catch(e=>{sel('ConfirmBtn').disabled=true;setMessage(e.message,true)}));
sel('ConfirmBtn')?.addEventListener('click',async()=>{
 if(state.busy||state.stage!=='READY'||!master()||!signed())return;
 state.busy=true;sel('ConfirmBtn').disabled=true;
 try{
  const newhash=await fileHash(state.file);
  if(newhash!==state.hash)throw Error('File berubah setelah preview; validasi ulang.');
  const payload={period_month:sel('Month').value,effective_date:sel('Effective').value,source_file:state.file.name,file_sha256:newhash,items:state.items};
  const result=await sbRpc('upload_retail_pricelist_v1',{p_payload:payload});
  state.stage=result.status;
  setMessage(result.message||result.status,result.status!=='INSERTED');
  await loadPriceHistory();
  if(result.status==='INSERTED')sel('Preview').insertAdjacentHTML('afterbegin','<div class="retailup-info" style="background:#e6f5e9;color:#227248">Berhasil: '+fmt(result.rows)+' baris disimpan tanpa duplikat. Refresh untuk cek data baru.</div>');
 }catch(e){setMessage('Gagal upload: '+e.message,true)}
 finally{state.busy=false;sel('ConfirmBtn').disabled=true}
});
async function loadPriceHistory(){
 if(!master()||!signed()){sel('History').textContent='Hanya Master dengan login aktif.';return}
 try{
  const arr=await sbSelect('retail_pricelist_batch_v1','&order=period_month.desc&limit=20');
  sel('History').innerHTML=arr.length?'<div class="retailup-scroll"><table class="retailup-table"><thead><tr><th>Bulan</th><th>Tanggal Efektif</th><th>Material+UOM</th><th>File</th><th>Status</th></tr></thead><tbody>'+arr.map(x=>`<tr><td>${safe(x.period_month)}</td><td>${safe(x.effective_date)}</td><td>${fmt(x.row_count)}</td><td>${safe(x.source_file)}</td><td><span class="retailup-status good">Tersimpan</span></td></tr>`).join('')+'</tbody></table></div>':'Belum ada Pricelist Retail tersimpan di master baru.';
 }catch(e){sel('History').textContent='Gagal membaca riwayat: '+e.message}
}
pricelistNav.addEventListener('click',()=>{
 if(!master()||!signed())return alert('Hanya Master yang dapat upload pricelist retail.');
 document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));page.classList.add('active');
 document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));pricelistNav.classList.add('active');
 window.scrollTo(0,0);loadPriceHistory();
});
function showNav(){pricelistNav.style.display=master()&&signed()&&!IS_OFFLINE_MODE?'flex':'none'}
const originalRole=applyRoleUI;
applyRoleUI=function(){const result=originalRole.apply(this,arguments);showNav();return result};
showNav();
window.SLSUploadV48=Object.freeze({version:'v4.8',parsePriceNumber:normalizedPrice,semester:sem});
})();