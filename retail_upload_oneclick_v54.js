(function retailOneClickV54(){
'use strict';
const $=id=>document.getElementById(id);
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(n,d=0)=>Number(n||0).toLocaleString('id-ID',{minimumFractionDigits:d,maximumFractionDigits:d});
const norm=s=>String(s??'').trim().toUpperCase().replace(/\s+/g,' ');
const parseMoney=window.SLSUploadV48?.parsePriceNumber||function(v){const x=Number(v);return Number.isFinite(x)?x:null};
const page=$('page-pricelist-retail');
if(!page)return;
const old=page.querySelector('.retailup');
if(!old)return;
old.innerHTML=`<div class="retailup-head">
 <div><div class="retailup-eyebrow">MASTER DATA · SLS CONTROL TOWER</div><h2>Upload Pricelist Retail</h2>
 <p>Proses otomatis. Pilih file Excel, sistem memeriksa data dan mengunggahnya tanpa memilih kolom satu per satu.</p></div>
 <span class="retailup-pill">MASTER ONLY</span></div>
 <div class="retailup-card" style="padding:24px">
  <label class="retail-v54-drop" id="retailOneDrop54" tabindex="0" for="retailOneFile54">
   <span class="retail-v54-icon">↑</span><strong>Pilih atau tarik file Pricelist Retail</strong>
   <span>Format Excel .xlsx / .xls / .ods · maksimal 25 MB</span>
   <span class="retail-v54-action">Pilih File Excel</span>
   <input id="retailOneFile54" type="file" accept=".xlsx,.xls,.ods" aria-label="Pilih file Pricelist Retail" />
  </label>
  <div class="retail-v54-status" id="retailOneStatus54" role="status" aria-live="polite">Belum ada file dipilih. Setelah memilih file, validasi dan upload berjalan otomatis.</div>
  <div id="retailOnePreview54"></div>
 </div>
 <div class="retailup-card">
  <h3>Riwayat Pricelist Retail</h3>
  <div id="retailUpHistory" class="retailup-info">Riwayat akan ditampilkan setelah login Master.</div>
 </div>
 <div class="retailup-info retailup-warning">Bulan publikasi dibaca dari <b>nama file</b>; tanggal efektif dibaca dari <b>isi Excel</b>. Kedua tanggal bisa berbeda. File identik tidak ditambahkan ulang; file berbeda pada bulan yang sama ditahan untuk pemeriksaan revisi. Pricelist adalah harga jual referensi, bukan HPP atau Actual Net Sales.</div>`;
const css=document.createElement('style');
css.textContent=`
.retail-v54-drop{display:flex!important;align-items:center;justify-content:center;text-align:center;flex-direction:column;gap:8px;padding:32px 18px;background:#f5f9fe;border:2px dashed #aac1da;border-radius:14px;cursor:pointer;color:#274c72;transition:background .15s}
.retail-v54-drop:hover,.retail-v54-drop.drag{background:#eaf3fc;border-color:#3978b3}
.retail-v54-drop input{position:absolute!important;width:1px!important;height:1px!important;opacity:0!important;pointer-events:none!important}
.retail-v54-drop .retail-v54-icon{width:48px;height:48px;border-radius:14px;background:#e3effb;color:#1f5d91;display:grid;place-items:center;font-size:27px;font-weight:800}
.retail-v54-drop strong{font-size:19px;color:#173f68;line-height:1.35}
.retail-v54-drop span:not(.retail-v54-icon):not(.retail-v54-action){font-size:12px;color:#6a819a}
.retail-v54-action{display:inline-block;background:#2565a1;border-radius:9px;padding:11px 21px;color:#fff;font-size:13px;font-weight:800;margin-top:8px}
.retail-v54-status{margin-top:15px;padding:12px 15px;background:#eef4fa;color:#3b5977;border-radius:9px;font-size:13px;line-height:1.55;font-weight:650}
.retail-v54-status.success{background:#e6f5eb;color:#206b48}.retail-v54-status.warn{background:#fff2db;color:#8b5b17}.retail-v54-status.error{background:#fcebe8;color:#b34539}
.retail-v54-summary{margin-top:15px;padding:17px;border:1px solid #dce5ee;border-radius:12px;background:#fff}
.retail-v54-info{display:flex;flex-wrap:wrap;gap:10px}
.retail-v54-info>div{flex:1;min-width:150px;background:#f5f8fc;padding:12px;border-radius:9px}
.retail-v54-info small{display:block;font-weight:700;font-size:11px;color:#71859a}
.retail-v54-info strong{font-size:17px;color:#234a71}
.retail-v54-table{width:100%;border-collapse:collapse;font-size:12px}
.retail-v54-table th,.retail-v54-table td{border-bottom:1px solid #e6ecf3;text-align:left;padding:8px}
.retail-v54-table th{color:#516b82;background:#f4f7fb}
.retail-v54-scroll{max-width:100%;overflow-x:auto;margin-top:12px}
@media(max-width:640px){.retail-v54-drop strong{font-size:16px}.retail-v54-info>div{min-width:120px}}
`;
document.head.appendChild(css);
const fileInput=$('retailOneFile54'),drop=$('retailOneDrop54'),status=$('retailOneStatus54'),preview=$('retailOnePreview54');
const months={
 jan:1,january:1,januari:1,feb:2,february:2,februari:2,mar:3,march:3,maret:3,apr:4,april:4,mei:5,may:5,
 jun:6,june:6,juni:6,jul:7,july:7,juli:7,aug:8,august:8,agu:8,agustus:8,sep:9,sept:9,september:9,
 oct:10,october:10,okt:10,oktober:10,nov:11,november:11,des:12,dec:12,december:12,desember:12
};
const mnames=Object.keys(months).sort((a,b)=>b.length-a.length).join('|');
function periodFromName(name){
 const str=String(name||'').replace(/\.(xlsx|xls|ods)$/i,'').toLowerCase().replace(/\(\d+\)$/,'').trim();
 const m1=str.match(new RegExp(`\\b(${mnames})[\\s_.\\-]+(20\\d{2})\\b`,'i'));
 if(m1)return m1[2]+'-'+String(months[m1[1].toLowerCase()]).padStart(2,'0');
 const m2=str.match(new RegExp(`\\b(20\\d{2})[\\s_.\\-]+(${mnames})\\b`,'i'));
 if(m2)return m2[1]+'-'+String(months[m2[2].toLowerCase()]).padStart(2,'0');
 const m3=str.match(/\b(20\d{2})[-_.](0?[1-9]|1[0-2])\b/);
 if(m3)return m3[1]+'-'+m3[2].padStart(2,'0');
 const m4=str.match(/\b(0?[1-9]|1[0-2])[-_.](20\d{2})\b/);
 if(m4)return m4[2]+'-'+m4[1].padStart(2,'0');
 return null;
}
function validYMD(y,m,d){
 const dt=new Date(Date.UTC(y,m-1,d));
 return dt.getUTCFullYear()===y&&dt.getUTCMonth()===m-1&&dt.getUTCDate()===d;
}
function parseEffective(grid){
 for(const row of grid.slice(0,32)){
  for(const v of row||[]){
   if(v instanceof Date&&!isNaN(v.getTime()))continue;
   const t=String(v??'').trim();
   if(!/(efektif|effective|berlaku|valid\s*from)/i.test(t))continue;
   let m=t.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](20\d{2})/);
   if(m){const d=+m[1],mo=+m[2],y=+m[3];if(validYMD(y,mo,d))return `${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;}
   m=t.match(/(20\d{2})-(\d{1,2})-(\d{1,2})/);
   if(m){const y=+m[1],mo=+m[2],d=+m[3];if(validYMD(y,mo,d))return `${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;}
  }
 }
 return null;
}
function detectSheet(workbook){
 const found=[];
 for(const name of workbook.SheetNames.slice(0,12)){
  const grid=XLSX.utils.sheet_to_json(workbook.Sheets[name],{header:1,defval:null,raw:true,cellDates:true});
  const top=Math.min(60,grid.length);
  for(let i=0;i<top;i++){
   const header=(grid[i]||[]).map(norm),width=Math.max(header.length,(grid[i-1]||[]).length);
   const colCode=header.findIndex(x=>/^(MATERIAL|MATERIAL CODE|KODE MATERIAL|KODE BARANG|ITEM CODE|SKU|PRODUCT CODE)$/.test(x));
   const colUom=header.findIndex(x=>/^(UOM|SATUAN|UNIT OF MEASURE|UNIT)$/.test(x));
   if(colCode<0||colUom<0||colCode===colUom)continue;
   const prior=(grid[i-1]||[]).map(norm),prior2=(grid[i-2]||[]).map(norm);
   let ex=-1,inc=-1;
   for(let j=0;j<width;j++){
    const h=header[j]||'',hint=(prior[j]||'')+' '+(prior2[j]||'');
    if(/(EXCLUDE VAT|EXCL VAT|EX VAT|EX PPN|SEBELUM PPN|HARGA NET)/.test(h+' '+hint))ex=j;
    if(/(INCLUDE VAT|INCL VAT|INC VAT|IN PPN|TERMASUK PPN)/.test(h+' '+hint))inc=j;
   }
   if(ex<0){
    const candidates=header.map((h,j)=>({h,j})).filter(o=>/(PRICE LIST|PRICE EX|HARGA JUAL|NET PRICE|HARGA SEBELUM)/.test(o.h));
    if(candidates.length===1&&candidates[0].j!==colUom&&candidates[0].j!==colCode)ex=candidates[0].j;
   }
   if(ex<0||ex===colCode||ex===colUom)continue;
   if(inc===ex)inc=-1;
   const score=15+(prior[ex]?.includes('EXCLUDE')?5:0)+(inc>=0?4:0)+(grid.length>i+10?3:0);
   found.push({name,grid,headerIndex:i,codeCol:colCode,uomCol:colUom,exCol:ex,incCol:inc,score});
  }
 }
 found.sort((a,b)=>b.score-a.score);
 if(!found.length)throw Error('Format tidak dikenali. Excel harus memiliki header Material, UOM, dan harga sebelum PPN (Exclude VAT).');
 return found[0];
}
function parseRecords(config){
 const {grid,headerIndex,codeCol,uomCol,exCol,incCol}=config;
 const items=[],seen=new Set(),errors=[],duplicate=[];
 let blanks=0,skipped=0;
 for(let i=headerIndex+1;i<grid.length;i++){
  const r=grid[i]||[],code=norm(r[codeCol]),uom=norm(r[uomCol]),raw=r[exCol];
  if(!code&&!uom&&(raw==null||String(raw).trim()==='')){blanks++;continue}
  if(/^(TOTAL|GRAND TOTAL|SUBTOTAL|JUMLAH|SUMMARY)\b/.test(code)){skipped++;continue}
  const price=parseMoney(raw);
  const priceInc=incCol>=0&&r[incCol]!=null&&String(r[incCol]).trim()!==''?parseMoney(r[incCol]):null;
  if(!code||!uom||code.length>100||uom.length>20||price===null||!Number.isFinite(price)||price<0||
    (incCol>=0&&r[incCol]!=null&&String(r[incCol]).trim()!==''&&(priceInc===null||!Number.isFinite(priceInc)||priceInc<0))){
   if(errors.length<14)errors.push('Baris '+(i+1)+': material, UOM atau harga tidak valid');
   continue;
  }
  const key=code+'|'+uom;
  if(seen.has(key)){if(duplicate.length<14)duplicate.push('Baris '+(i+1)+' · '+key);continue}
  seen.add(key);
  items.push({material_code:code,uom,price_ex_vat:price,price_inc_vat:priceInc});
 }
 if(!items.length)throw Error('Tidak ada harga barang yang dapat dibaca.');
 if(items.length>20000)throw Error('Maksimum 20.000 kombinasi material + UOM per file.');
 if(errors.length||duplicate.length)throw Error(`File memiliki data bermasalah. ${errors.slice(0,3).join('; ')} ${duplicate.slice(0,3).join('; ')}. Perbaiki file sebelum upload.`);
 return {items,blanks,skipped};
}
async function sha256(file){
 const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer()));
 return Array.from(bytes,v=>v.toString(16).padStart(2,'0')).join('');
}
function message(t,tone=''){
 status.className='retail-v54-status'+(tone?' '+tone:'');
 status.textContent=t;
}
function drawSummary(info){
 const count=info.items.length,box=info.items.filter(x=>x.uom==='BOX').length,pc=info.items.filter(x=>x.uom==='PC').length;
 preview.innerHTML=`<div class="retail-v54-summary">
  <div class="retail-v54-info">
    <div><small>Bulan publikasi</small><strong>${safe(info.period)}</strong></div>
    <div><small>Tanggal efektif di Excel</small><strong>${safe(info.effective)}</strong></div>
    <div><small>Material + UOM valid</small><strong>${fmt(count)}</strong></div>
    <div><small>BOX / PC</small><strong>${fmt(box)} / ${fmt(pc)}</strong></div>
  </div>
  <div class="retail-v54-scroll"><table class="retail-v54-table"><thead><tr><th>Material</th><th>UOM</th><th>Harga sebelum PPN</th><th>Harga termasuk PPN</th></tr></thead><tbody>
  ${info.items.slice(0,5).map(x=>`<tr><td>${safe(x.material_code)}</td><td>${safe(x.uom)}</td><td>Rp ${fmt(x.price_ex_vat,2)}</td><td>${x.price_inc_vat==null?'—':'Rp '+fmt(x.price_inc_vat,2)}</td></tr>`).join('')}</tbody></table></div>
  <div class="ct4-note" style="margin-top:12px">Sumber: ${safe(info.name)} · Sheet: ${safe(info.sheet)} · header baris ${info.headerIndex+1}. Bulan file dan tanggal efektif berbeda jika Commercial menerbitkan ulang harga yang mulai berlaku lebih awal.</div>
 </div>`;
}
let busy=false;
async function handleFile(file){
 if(busy||!file)return;
 busy=true;fileInput.disabled=true;
 preview.innerHTML='';
 try{
  if(typeof CURRENT_ROLE==='undefined'||CURRENT_ROLE!=='master'||!AUTH_SESSION_OK||!AUTH_SESSION?.access_token||IS_OFFLINE_MODE)
   throw Error('Hanya Master dengan login aktif yang dapat upload pricelist.');
  if(!/\.(xlsx|xls|ods)$/i.test(file.name)||file.size>25e6)throw Error('Gunakan Excel .xls/.xlsx/.ods maksimal 25 MB.');
  const period=periodFromName(file.name);
  if(!period)throw Error('Nama file harus mencantumkan bulan dan tahun, contoh: Pricelist Nov 2026.xlsx. Periode tidak ditebak dari tanggal efektif.');
  message('Membaca Excel dan validasi material, UOM, harga, serta tanggal efektif…');
  const [hash,buffer]=await Promise.all([sha256(file),file.arrayBuffer()]);
  const workbook=XLSX.read(buffer,{type:'array',cellDates:true});
  const cfg=detectSheet(workbook),effective=parseEffective(cfg.grid);
  if(!effective)throw Error('Tanggal efektif tidak ditemukan pada bagian awal Excel. Tambahkan tulisan Efektif: DD.MM.YYYY pada file sumber.');
  const records=parseRecords(cfg);
  const details={items:records.items,period,effective,name:file.name,sheet:cfg.name,headerIndex:cfg.headerIndex};
  drawSummary(details);
  message('Memeriksa riwayat upload agar tidak menambahkan data ganda…');
  const hist=await sbSelect('retail_pricelist_batch_v1','&order=created_at.desc&limit=300');
  if(hist.some(x=>x.file_sha256===hash)){message('DUPLIKAT: file identik sudah tersimpan. Tidak ada data ditambahkan.', 'warn');return}
  const existing=hist.find(x=>x.period_month===period);
  if(existing){message('REVISI DITAHAN: bulan '+period+' sudah ada file lain ('+existing.source_file+'). Tidak ada harga yang ditimpa.', 'warn');return}
  message('Validasi berhasil: '+fmt(records.items.length)+' material+UOM unik. Mengirim master harga ke database…');
  const result=await sbRpc('upload_retail_pricelist_v1',{p_payload:{period_month:period,effective_date:effective,source_file:file.name,file_sha256:hash,items:records.items}});
  if(result?.status==='INSERTED'){
   message('BERHASIL: '+fmt(result.rows)+' harga tersimpan untuk '+period+' tanpa data ganda.', 'success');
   const nav=$('navRetailPriceUpload');if(nav)nav.click();
  }else if(result?.status==='DUPLICATE')message('DUPLIKAT: file sudah tersimpan. Tidak menambah baris.', 'warn');
  else if(result?.status==='REVISION_REVIEW')message('REVISI DITAHAN: periode ini sudah ada. Data lama tidak ditimpa.', 'warn');
  else throw Error('Database tidak mengonfirmasi status upload.');
 }catch(err){message('Upload dibatalkan: '+String(err?.message||err),'error')}
 finally{busy=false;fileInput.disabled=false;fileInput.value=''}
}
fileInput.addEventListener('change',()=>{handleFile(fileInput.files?.[0])});
drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('drag')});
drop.addEventListener('dragleave',()=>drop.classList.remove('drag'));
drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('drag');const f=e.dataTransfer?.files?.[0];if(f)handleFile(f)});
drop.addEventListener('keydown',e=>{if(e.target===drop&&(e.key==='Enter'||e.key===' ')){e.preventDefault();fileInput.click()}});
window.SLSRetailOneClick=Object.freeze({version:'v5.4',periodFromName,parseEffective,detectSheet,parseRecords});
})();