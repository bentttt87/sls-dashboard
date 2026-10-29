(function commercialKpiAddon(){
  "use strict";
  const state={rdc:[],freight:[],loaded:false,pending:null,error:null};
  const $=id=>document.getElementById(id);
  const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const n=x=>Number.isFinite(Number(x))?Number(x):0;
  const f=(x,d=0)=>x===null||x===undefined?'—':n(x).toLocaleString('id-ID',{minimumFractionDigits:d,maximumFractionDigits:d});
  const money=x=>x==null?'DATA REQUIRED':'Rp '+f(n(x)/1e9,2)+' M';
  const pct=(a,b)=>b>0?f(100*a/b,1)+'%':'—';
  const scope=()=>CURRENT_RDC_SCOPE||$('rdcSelector')?.value||'Semua';
  const authorized=()=>!!AUTH_SESSION_OK&&!!AUTH_SESSION?.access_token;
  const rows=()=>state.rdc.filter(r=>scope()==='Semua'||r.rdc_name===scope());
  const sum=(items,key)=>items.reduce((z,x)=>z+n(x[key]),0);
  const totals=r=>{
    const stock=sum(r,'stock_box'),sales=sum(r,'sales_3m_avg_box');
    return {stock,sales,doi:sales?stock/sales*30:null,no3:sum(r,'no_movement_3m_box'),no6:sum(r,'no_movement_6m_box'),excess:sum(r,'excess_candidate_box'),res:sum(r,'reserved_box'),po:sum(r,'on_order_box'),value:sum(r,'list_price_value_ex_vat'),excessValue:sum(r,'excess_list_price_value_ex_vat'),issues:sum(r,'data_issue_sku_count'),sku:sum(r,'box_sku_count'),matched:sum(r,'priced_box_sku_count')};
  };
  const val=(title,figure,note,tone='blue')=>`<div class="comkpi-card tone-${tone}"><span>${title}</span><strong>${figure}</strong><small>${note}</small></div>`;

  const doiTone=x=>x==null?'slate':n(x)>75?'red':n(x)>45?'amber':'green';
  const legend=()=>`<div class="comkpi-legend" aria-label="Arti warna"><b>Arti warna:</b>
  <span class="green">Normal</span><span class="amber">Perlu perhatian</span>
  <span class="red">Kritis</span><span class="purple">Kandidat, perlu review</span>
  <span class="teal">Harga jual referensi</span><span class="slate">Data belum lengkap</span></div>`;
  const explanation=()=>`<details class="comkpi-explain" open>
    <summary>Mengapa muncul Potensi Stok Berlebih? · Cara hitung</summary>
    <p>Perhitungan dilakukan <b>per SKU pada setiap RDC</b>, kemudian dijumlahkan. Ini kandidat review, <b>bukan deadstock otomatis dan bukan instruksi retur/transfer</b>.</p>
    <div class="comkpi-formula">Target stok = MAX(2 × rata-rata penjualan bulanan 3M, 20 box)<br>Potensi Berlebih = MAX(0, Stok Fisik − Reserved − Target Stok)</div>
    <p><b>Contoh:</b> stok 200 box, reserved 30 box, penjualan rata-rata 50 box/bulan. Target 100 box → kandidat 70 box.</p>
    <p>Periksa kebutuhan Commercial, forecast, project, reserved, on-order, kesamaan SKU/series, serta ongkos pemindahan. <b>On-order belum dikurangkan dalam rumus ini</b> dan perlu dipertimbangkan sebelum keputusan.</p>
    <p><b>Jangan jumlahkan Potensi Berlebih dengan No Movement:</b> SKU yang sama bisa termasuk keduanya. Nilai @ Pricelist adalah harga jual referensi, bukan HPP atau kas yang pasti kembali.</p>
  </details>`;
  const tag=x=>`<span class="comkpi-tag ${n(x)>75?'red':n(x)>45?'amber':''}">${n(x)>75?'CRITICAL':n(x)>60?'HIGH':n(x)>45?'WATCH':'NORMAL'}</span>`;
  const css=document.createElement('style');css.textContent=`
    .comkpi-root{font:14px/1.5 'Inter','Segoe UI',sans-serif;color:#243149}
    .comkpi-root h2{font-size:24px;color:#18355b;margin:4px 0 7px}
    .comkpi-root h3{font-size:18px;color:#18355b;margin:4px 0 13px}
    .comkpi-muted{font-size:12px;color:#6e7f91;line-height:1.55}
    .comkpi-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:15px 0}
    .comkpi-card{background:#fff;border:1px solid #dce5ef;border-radius:11px;padding:17px;min-height:124px}
    .comkpi-card>span{font-size:12px;color:#60758d;font-weight:750}
    .comkpi-card strong{display:block;color:#18355b;font-size:26px;line-height:1.12;letter-spacing:-.4px;margin:10px 0 6px}
    .comkpi-card small{font-size:12px;color:#65768b;line-height:1.5}
    .comkpi-card{border-left:5px solid #417ca9}
    .comkpi-card.tone-blue{background:#f4f9ff;border-left-color:#3676ad}
    .comkpi-card.tone-blue strong{color:#235e91}
    .comkpi-card.tone-green{background:#f3faf6;border-left-color:#2d865f}
    .comkpi-card.tone-green strong{color:#257147}
    .comkpi-card.tone-amber{background:#fffbf1;border-left-color:#cb9336}
    .comkpi-card.tone-amber strong{color:#95600f}
    .comkpi-card.tone-red{background:#fff7f5;border-left-color:#c05248}
    .comkpi-card.tone-red strong{color:#a43b33}
    .comkpi-card.tone-purple{background:#faf6ff;border-left-color:#8660ab}
    .comkpi-card.tone-purple strong{color:#6b4293}
    .comkpi-card.tone-teal{background:#f1fbfa;border-left-color:#25898c}
    .comkpi-card.tone-teal strong{color:#216c6d}
    .comkpi-card.tone-slate{background:#f7f9fb;border-left-color:#94a2b3}
    .comkpi-card.tone-slate strong{color:#53667e}
    .comkpi-legend{display:flex;flex-wrap:wrap;gap:7px;margin:12px 0;align-items:center}
    .comkpi-legend b{font-size:12px;color:#55677d;margin-right:6px}
    .comkpi-legend span{font-size:11px;font-weight:800;border-radius:7px;padding:5px 9px;background:#f7f9fb;color:#52687d}
    .comkpi-legend .green{background:#e5f4eb;color:#23794e}
    .comkpi-legend .amber{background:#fff2db;color:#955c13}
    .comkpi-legend .red{background:#fce9e7;color:#ad4238}
    .comkpi-legend .purple{background:#f2eafd;color:#704498}
    .comkpi-legend .teal{background:#e2f4f2;color:#227a78}
    .comkpi-legend .slate{background:#edf1f5;color:#5b6e83}
    .comkpi-explain{border:1px solid #e6d8f0;border-left:5px solid #8660ab;background:#fcfaff;padding:13px 16px;border-radius:10px;margin:13px 0}
    .comkpi-explain summary{color:#68418d;font-weight:800;cursor:pointer;font-size:14px}
    .comkpi-explain p{font-size:13px;color:#596b80;line-height:1.6;margin:10px 0}
    .comkpi-formula{background:#fff;border:1px solid #e5dbee;border-radius:8px;padding:11px;margin:9px 0;font-weight:750;color:#3b4c67;font-size:13px;line-height:1.8}
    .comkpi-purple-value{background:#f2eafa;color:#67418b;border-radius:5px;padding:3px 6px;font-weight:800}
    .comkpi-amber-value{background:#fff4e3;color:#8d5d12;border-radius:5px;padding:3px 6px;font-weight:750}
    .comkpi-hint{font-size:12px;color:#5e6f85;line-height:1.6;margin:10px 0}
    .comkpi-panel{background:#fff;border:1px solid #dce5ef;border-radius:12px;padding:19px;margin:15px 0}
    .comkpi-note{padding:12px 14px;background:#eaf1f9;border:1px solid #dbe6f2;border-radius:8px;color:#345878;font-size:12px;line-height:1.6;margin:13px 0}
    .comkpi-note.warn{background:#fff5e6;border-color:#efd9b2;color:#855919}
    .comkpi-scroll{overflow-x:auto}.comkpi-root table{border-collapse:collapse;min-width:1000px;width:100%;font-size:12px}
    .comkpi-root th{background:#f4f8fc;color:#5b728c;text-align:left;font-size:11px}
    .comkpi-root th,.comkpi-root td{padding:11px 9px;border-bottom:1px solid #e9eef5}
    .comkpi-root td.r{text-align:right;font-variant-numeric:tabular-nums}
    .comkpi-tag{display:inline-block;background:#e6f2eb;color:#237c55;border-radius:5px;padding:4px 7px;font-size:10px;font-weight:750}
    .comkpi-tag.amber{background:#fff0d9;color:#95651b}.comkpi-tag.red{background:#fce8e6;color:#ba4a40}
    .comkpi-action{padding:12px;margin:8px 0;border-left:3px solid #ca9540;background:#f9fbfd;font-size:12px;line-height:1.6}
    .comkpi-button{background:#18355b;color:#fff;font-size:12px;font-weight:750;border:0;border-radius:8px;padding:10px 15px;cursor:pointer}
    #comkpiTeaser{margin:15px 0}#comkpiTeaser .comkpi-card{min-height:115px}
    @media(max-width:1200px){.comkpi-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:650px){.comkpi-grid{grid-template-columns:1fr}}
  `;document.head.appendChild(css);
  const nav=document.createElement('div');nav.id='navCommercialKpi';nav.className='nav-item';nav.innerHTML='<span class="nav-icon">▦</span><span>Commercial KPI &amp; Freight</span>';
  const anchor=$('v3NavOccupancy');if(anchor)anchor.before(nav);
  const page=document.createElement('div');page.id='page-commercial-kpi';page.className='page';page.innerHTML='<div class="comkpi-root" id="commercialKpiBody"></div>';
  $('page-dashboard')?.after(page);
  nav.addEventListener('click',()=>{
    document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
    page.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(x=>x.classList.remove('active'));
    nav.classList.add('active');
    window.scrollTo({top:0,behavior:'auto'});
    if(!state.loaded)load();
    display();
  });
  document.querySelectorAll('.nav-item[data-page]').forEach(x=>x.addEventListener('click',()=>nav.classList.remove('active')));
  function teaser(){
    const shell=$('ct4-executive');if(!shell)return;
    $('comkpiTeaser')?.remove();
    const t=document.createElement('div');t.id='comkpiTeaser';t.className='comkpi-root';
    const first=shell.querySelector('.ct4-metrics');if(first)first.after(t);else shell.append(t);
    if(!authorized()){t.innerHTML='<div class="comkpi-note warn">KPI Commercial dengan informasi nilai barang hanya dapat dibaca melalui sesi akun aman.</div>';return}
    if(!state.loaded){t.innerHTML='<div class="comkpi-note">Memuat KPI Commercial dari sumber terlindungi…</div>';return}
    const rr=rows(),v=totals(rr);if(!rr.length){t.innerHTML='<div class="comkpi-note warn">KPI Commercial tidak tersedia untuk akun/RDC ini.</div>';return}
    t.innerHTML=`<div class="comkpi-muted" style="font-weight:800;margin:12px 0 5px">KPI TAMBAHAN · COMMERCIAL JUL–SEP 2026</div>
      <div class="comkpi-grid">
       ${val('Potensi Stok Berlebih',f(v.excess)+' box','Screening per SKU · bukan instruksi transfer','purple')}
       ${val('No Movement 6 Bulan',f(v.no6)+' box','Perlu review bersama Commercial','amber')}
       ${val('Nilai Stok @ Pricelist',money(v.value),'Harga jual sebelum PPN, bukan HPP','teal')}
       ${val('Nilai Kandidat @ Pricelist',money(v.excessValue),'Nilai jual referensi · bukan kas pasti','purple')}
      </div>${legend()}<div class="comkpi-hint">Potensi Stok Berlebih dihitung dari stok fisik minus reserved dan target 2 bulan (minimal 20 box). <b>Angka ini belum disetujui untuk retur/transfer.</b></div><button class="comkpi-button" id="comkpiOpenFull">Lihat KPI Commercial &amp; Freight</button>`;
    $('comkpiOpenFull')?.addEventListener('click',()=>nav.click());
  }
  window.renderCommercialKpiTeaser=teaser;
  function display(){
    const target=$('commercialKpiBody');if(!target)return;
    if(!authorized()){target.innerHTML='<div class="comkpi-panel"><h2>Commercial KPI &amp; Freight</h2><div class="comkpi-note warn">Sesi Supabase Auth belum aktif; untuk menjaga data Commercial, login ulang melalui aplikasi.</div></div>';return}
    if(!state.loaded){target.innerHTML='<div class="comkpi-panel">Memuat Commercial KPI dan Vendor Benchmark dari Supabase…</div>';return}
    const r=rows(),t=totals(r),status=scope()==='Semua'?r.length===5&&new Set(r.map(x=>x.sales_through_month)).size===1:r.length===1;
    if(!r.length){target.innerHTML='<div class="comkpi-panel">DATA REQUIRED — akses atau snapshot untuk area ini belum tersedia.</div>';return}
    const freight=state.freight.filter(x=>scope()==='Semua'||x.area_code===scope());
    const laneCount=sum(freight,'route_count');
    target.innerHTML=`
      <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center">
       <div><div class="comkpi-muted">MANAGEMENT ANALYSIS · COMMERCIAL + PRICELIST + VENDOR</div><h2>Commercial KPI &amp; Freight</h2>
       <div class="comkpi-muted">Physical Stock, DOI, No Movement, Excess, Inventory Valuation Proxy &amp; Freight Quotation</div></div>
       <button class="comkpi-button" id="comkpiExport">Export CSV</button>
      </div>
      <div class="comkpi-note">Snapshot: ${esc([...new Set(r.map(x=>x.snapshot_date))].join(' / '))} · Sales Juli–September 2026 · ${status?'Agregasi eligible':'CAKUPAN/PERIODE PERLU VALIDASI'} · Nilai barang berasal dari pricelist, bukan GL/Finance.</div>
      <div class="comkpi-grid">
       ${val('Physical Stock BOX',f(t.stock)+' box',r.length+' RDC · '+f(t.sku)+' SKU BOX')}
       ${val('DOI National / Area',status?f(t.doi,2)+' hari':'DATA REQUIRED','Σ Stock / Σ Avg Sales 3M × 30')}
       ${val('No Movement 3M',f(t.no3)+' box',pct(t.no3,t.stock)+' physical stock')}
       ${val('No Movement 6M',f(t.no6)+' box','Kandidat review lebih kuat')}
       ${val('Excess Stock Candidate',f(t.excess)+' box',pct(t.excess,t.stock)+' dari physical stock')}
       ${val('Reserved / On Order',f(t.res)+' / '+f(t.po),'BOX · jangan auto-transfer reserved')}
       ${val('Stok @ Pricelist Ex VAT',money(t.value),f(t.matched)+' / '+f(t.sku)+' SKU match')}
       ${val('Excess @ Pricelist Ex VAT',money(t.excessValue),'Nilai harga jual referensi saja')}
      </div>
      <div class="comkpi-panel"><h3>Inventory Health &amp; DOI per RDC</h3><div class="comkpi-scroll">
      <table><thead><tr><th>RDC</th><th>Snapshot</th><th>Stock BOX</th><th>Sales Avg 3M</th><th>DOI hari</th><th>No Move 3M</th><th>No Move 6M</th><th>Reserved</th><th>On Order</th><th>Excess</th><th>Status</th></tr></thead><tbody>
      ${r.map(x=>`<tr><td><b>${esc(x.rdc_name)}</b></td><td>${esc(x.snapshot_date)}</td><td class="r">${f(x.stock_box)}</td><td class="r">${f(x.sales_3m_avg_box)}</td><td class="r">${f(x.doi_days,1)}</td><td class="r">${f(x.no_movement_3m_box)}</td><td class="r">${f(x.no_movement_6m_box)}</td><td class="r">${f(x.reserved_box)}</td><td class="r">${f(x.on_order_box)}</td><td class="r">${f(x.excess_candidate_box)}</td><td>${tag(x.doi_days)}</td></tr>`).join('')}
      </tbody></table></div></div>
      <div class="comkpi-panel"><h3>Inventory Value · Pricelist Proxy</h3><div class="comkpi-scroll"><table><thead><tr><th>RDC</th><th>SKU BOX</th><th>SKU Price Match</th><th>Stock @ Price List Ex VAT</th><th>Excess @ Pricelist</th><th>No Move 3M @ Pricelist</th><th>Sales Data Issues</th></tr></thead><tbody>
      ${r.map(x=>`<tr><td><b>${esc(x.rdc_name)}</b></td><td class="r">${f(x.box_sku_count)}</td><td class="r">${f(x.priced_box_sku_count)}</td><td class="r">${money(x.list_price_value_ex_vat)}</td><td class="r">${money(x.excess_list_price_value_ex_vat)}</td><td class="r">${money(x.no_movement_list_price_value_ex_vat)}</td><td class="r">${f(x.data_issue_sku_count)}</td></tr>`).join('')}
      </tbody></table></div><div class="comkpi-note warn">Harga adalah price list sebelum PPN, bukan HPP/nilai inventory Finance. Nilai excess bukan estimasi dana tunai yang pasti dapat direalisasi.</div></div>
      <div class="comkpi-panel"><h3>Vendor Freight Rate Benchmark</h3><div class="comkpi-muted">${f(laneCount)} lane memiliki quotation benchmark. Tidak sama dengan actual logistic cost.</div><div class="comkpi-scroll"><table><thead><tr><th>Origin</th><th>RDC</th><th>Lane coverage</th><th>Avg Best Rp/kg</th><th>Min Rp/kg</th><th>Max Rp/kg</th><th>Rate Validity</th></tr></thead><tbody>
      ${freight.map(x=>`<tr><td><b>${esc(x.origin_label)}</b></td><td>${esc(x.area_code)}</td><td class="r">${f(x.route_count)}</td><td class="r">${x.best_quote_rpkg_average!=null?f(x.best_quote_rpkg_average,1):'DATA REQUIRED'}</td><td class="r">${f(x.best_quote_rpkg_min,1)}</td><td class="r">${f(x.best_quote_rpkg_max,1)}</td><td>${esc(x.source_date_note)}</td></tr>`).join('')}
      </tbody></table></div><div class="comkpi-note warn">Tarif Rp/kg adalah quotation pada kapasitas kendaraan. Untuk estimasi biaya perlu berat KG/box SAP, rute aktual, vendor terpilih, rit, jumlah drop, dan biaya tambahan. Palembang belum ada rate benchmark pada sumber.</div></div>
      <div class="comkpi-panel"><h3>Automated Insight → Action</h3>
      ${r.slice().sort((a,b)=>n(b.excess_candidate_box)-n(a.excess_candidate_box)).slice(0,3).map(x=>`<div class="comkpi-action"><b>${esc(x.rdc_name)}</b> · Excess kandidat ${f(x.excess_candidate_box)} box; no movement 3M ${f(x.no_movement_3m_box)} box. <span class="comkpi-muted">Review SKU/series, demand tujuan, status reserved, cost dan persetujuan sebelum transfer atau flush out.</span></div>`).join('')}
      <div class="comkpi-note"><b>Data Quality:</b> ${f(t.issues)} SKU memiliki isu sales 3M; price list coverage ${f(t.matched)}/${f(t.sku)} SKU. <b>Logistics Cost Ratio resmi: DATA REQUIRED</b> tanpa actual WH/transport cost dan Finance net sales.</div></div>`;
    $('comkpiExport')?.addEventListener('click',()=>{
      const data=[['RDC','Snapshot','Stock Box','Sales Avg 3M','DOI Days','No Move 3M','No Move 6M','Reserved','On Order','Excess','Stock @ Pricelist Ex VAT','Excess @ Pricelist Ex VAT'],...r.map(x=>[x.rdc_name,x.snapshot_date,x.stock_box,x.sales_3m_avg_box,x.doi_days,x.no_movement_3m_box,x.no_movement_6m_box,x.reserved_box,x.on_order_box,x.excess_candidate_box,x.list_price_value_ex_vat,x.excess_list_price_value_ex_vat])];
      const csv='\ufeff'+data.map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(';')).join('\r\n');
      const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='SLS_Commercial_KPI_'+scope()+'_Oct2026.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),500);
    });
  }
  async function load(){
    if(state.pending)return state.pending;
    if(!authorized())return;
    state.pending=(async()=>{
      try{
        const [a,b]=await Promise.all([sbSelect('commercial_kpi_rdc_snapshot_v1','&order=snapshot_date.desc&limit=50'),sbSelect('freight_benchmark_summary_v1','&limit=25')]);
        const map=new Map();for(const r of a||[])if(!map.has(r.rdc_name))map.set(r.rdc_name,r);
        state.rdc=[...map.values()];state.freight=b||[];state.loaded=true;
        display();teaser();
      }catch(e){state.error=String(e);state.loaded=true;display();teaser();console.warn('Commercial KPI secure read failed',state.error)}
    })();return state.pending;
  }
  const oldRender=render;
  render=function(area){const v=oldRender(area);if(state.loaded)teaser();if(!state.pending&&!IS_OFFLINE_MODE)load();if(page.classList.contains('active'))display();return v;};
  window.commercialKpiLive={reload:()=>{state.pending=null;state.loaded=false;load()},version:'2026-10-29-v1'};
})();