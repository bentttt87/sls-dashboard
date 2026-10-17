(function(){
  'use strict';

  var DOI_MANUAL_CACHE_V111 = null;
  var DOI_UPLOAD_PREVIEW_V111 = [];
  var oldRenderDoiReport = (typeof renderDoiReport === 'function') ? renderDoiReport : null;
  var oldExportDoiExcel = (typeof exportDoiExcel === 'function') ? exportDoiExcel : null;

  function fmt(v, dec){
    dec = dec == null ? 0 : dec;
    if(v == null || !Number.isFinite(Number(v))) return '—';
    return Number(v).toLocaleString('id-ID',{minimumFractionDigits:dec,maximumFractionDigits:dec});
  }
  function periodLabel(m){
    if(!m) return '—';
    var p=String(m).slice(0,7).split('-'), y=Number(p[0]), mo=Number(p[1]);
    if(!y||!mo) return String(m);
    return new Date(y,mo-1,1).toLocaleDateString('id-ID',{month:'short',year:'numeric'});
  }
  function statusBadge(status){
    var map={
      HEALTHY:['#E7F6EC','#1E7B34'],WATCH:['#FFF3D6','#946200'],HIGH:['#FFF0E2','#B15A00'],
      CRITICAL:['#FCEBE9','#B3261E'],'DATA REQUIRED':['#EFEDE8','#6E6A63']
    };
    var s=map[status]||['#EFEDE8','#6E6A63'];
    return '<span style="display:inline-block;padding:3px 7px;border-radius:5px;background:'+s[0]+';color:'+s[1]+';font-size:9.5px;font-weight:800;">'+String(status||'-')+'</span>';
  }
  function safe(s){
    if(typeof esc==='function') return esc(s);
    return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});
  }

  async function loadSummary(rdcName){
    var scopeRdc = (typeof CURRENT_RDC_SCOPE!=='undefined' && CURRENT_RDC_SCOPE) ? CURRENT_RDC_SCOPE : ((rdcName && rdcName!=='Semua') ? rdcName : 'ALL');
    try{
      var d=await sbRpc('doi_manual_summary_v1',{p_rdc:scopeRdc});
      if(d && Array.isArray(d.rows) && d.rows.length){ DOI_MANUAL_CACHE_V111=d; return d; }
    }catch(e){ console.warn('DOI manual summary fallback',e); }
    DOI_MANUAL_CACHE_V111=null;
    return null;
  }

  async function renderManualDoi(rdcName){
    var el=document.getElementById('doiReport');
    if(!el) return;
    el.innerHTML='<div class="nbc-placeholder">⏳ Memuat DOI & Stock vs Average Sales…</div>';
    var d=await loadSummary(rdcName);
    if(!d){ if(oldRenderDoiReport) return oldRenderDoiReport(rdcName); return; }

    var n=d.national||{}, rows=d.rows||[];
    var rowHtml=rows.map(function(r){
      return '<tr style="border-bottom:1px solid var(--border);">'+
        '<td style="padding:7px 8px;font-weight:700;text-align:left;">'+safe(typeof displayName==='function'?displayName(r.rdc):r.rdc)+'</td>'+
        '<td style="padding:7px 8px;text-align:right;">'+safe(r.snapshot_date||'—')+'</td>'+
        '<td style="padding:7px 8px;text-align:right;">'+periodLabel(r.sales_through_month)+'</td>'+
        '<td style="padding:7px 8px;text-align:right;">'+fmt(r.sku_count)+'</td>'+
        '<td style="padding:7px 8px;text-align:right;">'+fmt(r.current_stock)+'</td>'+
        '<td style="padding:7px 8px;text-align:right;font-weight:700;">'+fmt(r.avg_sales_3m)+'</td>'+
        '<td style="padding:7px 8px;text-align:right;">'+fmt(r.avg_sales_6m)+'</td>'+
        '<td style="padding:7px 8px;text-align:right;font-weight:800;color:var(--navy);">'+fmt(r.doi_days,1)+'</td>'+
        '<td style="padding:7px 8px;text-align:right;">'+fmt(r.doi_months,2)+'</td>'+
        '<td style="padding:7px 8px;text-align:right;">'+fmt(r.no_movement_3m_stock)+'</td>'+
        '<td style="padding:7px 8px;text-align:center;">'+statusBadge(r.status)+'</td>'+
      '</tr>';
    }).join('');

    var canUpload = (typeof CURRENT_ROLE!=='undefined' && CURRENT_ROLE==='master' && !(typeof IS_OFFLINE_MODE!=='undefined' && IS_OFFLINE_MODE));
    var uploadBtn = canUpload ? '<button class="export-btn" id="doiUploadBtnV111" style="padding:6px 10px;font-size:10.5px;background:var(--navy);color:#fff;">⇧ Upload Data Manual</button>' : '';

    el.innerHTML=
      '<div style="background:#fff;border:1px solid var(--border);border-radius:12px;padding:14px 16px;">'+
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">'+
          '<div><div style="font-size:14px;font-weight:800;color:var(--navy);">DOI &amp; Stock vs Average Sales</div>'+
          '<div style="font-size:10.5px;color:var(--stone);margin-top:2px;">DOI = Physical Stock ÷ Avg Sales 3M × 30 hari</div></div>'+
          '<div style="display:flex;gap:7px;flex-wrap:wrap;">'+uploadBtn+'<button class="export-btn" id="doiRecoExcelBtnV111" style="padding:6px 10px;font-size:10.5px;background:#0F5A78;color:#fff;">📥 Export SKU Recommendation</button><button class="export-btn" id="doiExcelBtnV111" style="padding:6px 10px;font-size:10.5px;">📊 Export DOI Excel</button></div>'+
        '</div>'+
        '<div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin-top:12px;">'+
          '<div class="kpi-card" style="min-height:auto;padding:11px;"><div class="kpi-label">Current Stock</div><div class="kpi-value" style="font-size:20px;margin:5px 0;">'+fmt(n.current_stock)+'</div><div class="kpi-sowhat">box · physical inventory</div></div>'+
          '<div class="kpi-card" style="min-height:auto;padding:11px;"><div class="kpi-label">Avg Sales 3M</div><div class="kpi-value" style="font-size:20px;margin:5px 0;">'+fmt(n.avg_sales_3m)+'</div><div class="kpi-sowhat">box/bulan · denominator DOI</div></div>'+
          '<div class="kpi-card" style="min-height:auto;padding:11px;"><div class="kpi-label">DOI</div><div class="kpi-value" style="font-size:20px;margin:5px 0;">'+fmt(n.doi_days,1)+' <span class="unit">hari</span></div><div class="kpi-sowhat">'+fmt(n.doi_months,2)+' bulan</div></div>'+
          '<div class="kpi-card" style="min-height:auto;padding:11px;"><div class="kpi-label">3M vs 6M Sales</div><div class="kpi-value" style="font-size:20px;margin:5px 0;">'+(n.trend_3m_vs_6m==null?'—':(Number(n.trend_3m_vs_6m)>=0?'+':'')+fmt(n.trend_3m_vs_6m,1)+'%')+'</div><div class="kpi-sowhat">6M = stability check</div></div>'+
          '<div class="kpi-card" style="min-height:auto;padding:11px;"><div class="kpi-label">No Movement 3M</div><div class="kpi-value" style="font-size:20px;margin:5px 0;">'+fmt(n.no_movement_3m_stock)+'</div><div class="kpi-sowhat">box · deadstock candidate</div></div>'+
        '</div>'+
        '<div style="overflow-x:auto;margin-top:12px;"><table style="width:100%;border-collapse:collapse;font-size:11.5px;min-width:1100px;">'+
          '<thead><tr style="background:var(--navy);color:#fff;text-align:right;">'+
            '<th style="padding:7px 8px;text-align:left;">RDC</th><th>Snapshot</th><th>Sales Through</th><th>SKU</th><th>Current Stock</th><th>Avg Sales 3M</th><th>Avg Sales 6M</th><th>DOI Hari</th><th>DOI Bulan</th><th>No Move 3M</th><th>Status</th>'+
          '</tr></thead><tbody>'+rowHtml+'</tbody></table></div>'+
        '<div style="margin-top:10px;padding:9px 10px;background:#F8F6F2;border-left:3px solid var(--navy);font-size:10.5px;color:var(--ink-soft);line-height:1.5;">'+
          '<b>MANUAL TRANSITION:</b> source adalah file PR Reference per RDC. Avg Sales 3M menjadi denominator DOI resmi; Avg 6M hanya stability check. '+
          'File identik ditolak berdasarkan SHA-256. File baru untuk RDC + tanggal snapshot yang sama akan <b>replace snapshot</b>, bukan menambah data ganda.'+
          '<br><b>Future state:</b> SAP/TMS monthly sales + WMS physical stock → DOI engine otomatis → Control Tower recap.'+
        '</div>'+
      '</div>';

    var reco=document.getElementById('doiRecoExcelBtnV111'); if(reco) reco.onclick=function(){exportSkuRecommendation(rdcName);};
    var ex=document.getElementById('doiExcelBtnV111'); if(ex) ex.onclick=function(){exportManualDoi(rdcName);};
    var up=document.getElementById('doiUploadBtnV111'); if(up) up.onclick=openUploadModal;
  }

  async function exportSkuRecommendation(rdcName){
    var scopeRdc = (typeof CURRENT_RDC_SCOPE!=='undefined' && CURRENT_RDC_SCOPE) ? CURRENT_RDC_SCOPE : ((rdcName && rdcName!=='Semua') ? rdcName : 'ALL');
    var btn=document.getElementById('doiRecoExcelBtnV111');
    if(btn){btn.disabled=true;btn.textContent='⏳ Menyiapkan Excel…';}
    try{
      var d=await sbRpc('doi_manual_recommendation_v1',{p_rdc:scopeRdc});
      var rows=(d&&Array.isArray(d.rows))?d.rows:[];
      if(!rows.length){
        alert('Belum ada detail SKU yang dipublish. Klik "Upload Data Manual", upload file PR Reference RDC, Validasi & Preview, lalu Publish. Setelah itu tombol ini akan menghasilkan rekomendasi SKU.');
        return;
      }

      var headers=['RDC','Snapshot Date','Sales Through','Material','Description','Group','Size','Collection','Product Status',
        'Physical Inventory','Reserved','Free Stock','OTS PO','Avg Sales 3M','Avg Sales 6M','DOI Days','DOI Months',
        'Target Stock 2M / Min 20','Excess Qty','Transferable Qty','Shortage After OTS','Transfer Opportunity Qty',
        'Target RDC','Residual Excess','National Avg Sales 3M','Recommended Action','Recommended Qty','Source File'];

      function rowArray(r){
        return [r.rdc,r.snapshot_date||'',r.sales_through_month||'',r.material_code||'',r.material_desc||'',r.product_group||'',
          r.size||'',r.collection||'',r.product_status||'',Number(r.physical_inventory||0),Number(r.physical_reserved||0),
          Number(r.free_stock||0),Number(r.ots_po||0),Number(r.avg_sales_3m||0),Number(r.avg_sales_6m||0),
          r.doi_days==null?'':Number(r.doi_days),r.doi_months==null?'':Number(r.doi_months),Number(r.target_stock||0),
          Number(r.excess_qty||0),Number(r.transferable_qty||0),Number(r.shortage_after_ots||0),Number(r.transfer_opportunity_qty||0),
          r.target_rdc||'',Number(r.residual_excess_qty||0),Number(r.national_avg_sales_3m||0),r.recommended_action||'',
          Number(r.recommended_qty||0),r.source_file||''];
      }

      var counts={};
      var qtys={};
      rows.forEach(function(r){
        var a=r.recommended_action||'OTHER';
        counts[a]=(counts[a]||0)+1;
        qtys[a]=(qtys[a]||0)+Number(r.recommended_qty||0);
      });

      var summary=[
        ['SLS INVENTORY RECOVERY RECOMMENDATION','',''],
        ['Scope',scopeRdc==='ALL'?'National / All RDC':scopeRdc,''],
        ['Method','Target Stock = MAX(Avg Sales 3M × 2 months, 20 box)','',''],
        ['Priority','Transfer antar-RDC → Flush Out Candidate → Hold PR / Reduce → Replenish → Maintain',''],
        ['','',''],
        ['Recommended Action','SKU Count','Recommended Qty Box']
      ];
      Object.keys(counts).sort().forEach(function(a){summary.push([a,counts[a],Math.round(qtys[a]*100)/100]);});

      function makeSheet(data,name){
        var ws=XLSX.utils.aoa_to_sheet([headers].concat(data.map(rowArray)));
        ws['!cols']=[
          {wch:14},{wch:14},{wch:13},{wch:16},{wch:38},{wch:15},{wch:12},{wch:18},{wch:16},
          {wch:16},{wch:12},{wch:14},{wch:12},{wch:16},{wch:16},{wch:11},{wch:11},{wch:20},
          {wch:14},{wch:16},{wch:16},{wch:20},{wch:14},{wch:16},{wch:20},{wch:22},{wch:16},{wch:42}
        ];
        XLSX.utils.book_append_sheet(wb,ws,name);
      }

      var wb=XLSX.utils.book_new();
      var wsSum=XLSX.utils.aoa_to_sheet(summary);
      wsSum['!cols']=[{wch:28},{wch:65},{wch:20}];
      XLSX.utils.book_append_sheet(wb,wsSum,'Management Summary');

      makeSheet(rows,'SKU Recommendation');
      makeSheet(rows.filter(function(r){return r.recommended_action==='TRANSFER';}),'Transfer Plan');
      makeSheet(rows.filter(function(r){return r.recommended_action==='FLUSH OUT CANDIDATE';}),'Flushout Candidates');
      makeSheet(rows.filter(function(r){return r.recommended_action==='HOLD PR / REDUCE'||r.recommended_action==='MONITOR OVERSTOCK';}),'Hold PR Reduce');
      makeSheet(rows.filter(function(r){return r.recommended_action==='REPLENISH / PR';}),'Replenishment');

      var suffix=(scopeRdc==='ALL'?'National':scopeRdc).replace(/\s+/g,'_');
      XLSX.writeFile(wb,'SLS_SKU_Inventory_Recovery_Recommendation_'+suffix+'.xlsx');
    }catch(e){
      alert('Gagal membuat rekomendasi SKU: '+(e.message||e));
    }finally{
      if(btn){btn.disabled=false;btn.textContent='📥 Export SKU Recommendation';}
    }
  }

  function exportManualDoi(rdcName){
    var d=DOI_MANUAL_CACHE_V111;
    if(!d || !Array.isArray(d.rows) || !d.rows.length){ if(oldExportDoiExcel) return oldExportDoiExcel(rdcName); return; }
    var aoa=[['RDC','Snapshot Date','Sales Through','SKU Count','Current Stock Box','Avg Sales 3M Box/Month','Avg Sales 6M Box/Month','DOI Days','DOI Months','3M vs 6M %','No Movement 3M Stock','No Movement 6M Stock','Status','Source']];
    d.rows.forEach(function(r){
      aoa.push([r.rdc,r.snapshot_date||'',r.sales_through_month||'',Number(r.sku_count||0),Number(r.current_stock||0),Number(r.avg_sales_3m||0),Number(r.avg_sales_6m||0),r.doi_days==null?'':Number(r.doi_days),r.doi_months==null?'':Number(r.doi_months),r.trend_3m_vs_6m==null?'':Number(r.trend_3m_vs_6m),Number(r.no_movement_3m_stock||0),Number(r.no_movement_6m_stock||0),r.status||'',r.source_file||'']);
    });
    var wb=XLSX.utils.book_new(), ws=XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols']=[{wch:16},{wch:14},{wch:14},{wch:12},{wch:18},{wch:24},{wch:24},{wch:12},{wch:12},{wch:14},{wch:20},{wch:20},{wch:16},{wch:48}];
    XLSX.utils.book_append_sheet(wb,ws,'DOI Report');
    var suffix=(rdcName&&rdcName!=='Semua'?rdcName:'National').replace(/\s+/g,'_');
    XLSX.writeFile(wb,'SLS_DOI_Stock_vs_AvgSales_'+suffix+'.xlsx');
  }

  function num(v){
    if(v===null||v===undefined||v==='') return 0;
    if(typeof v==='number' && Number.isFinite(v)) return v;
    var s=String(v).trim().replace(/\s/g,'');
    if(!s || /^[-–—]$/.test(s)) return 0;
    var neg=false;
    if(/^\(.*\)$/.test(s)){neg=true;s=s.slice(1,-1);}
    if(s.indexOf(',')>=0 && s.indexOf('.')<0) s=s.replace(',','.');
    s=s.replace(/[^\d.\-]/g,'');
    var n=Number(s);
    return Number.isFinite(n)?(neg?-Math.abs(n):n):0;
  }
  function hnorm(v){return String(v==null?'':v).trim().toLowerCase().replace(/\s+/g,' ').replace(/[._]/g,' ');}
  function detectRdc(name){
    var n=String(name||'').toUpperCase();
    if(/\bJKT\b|JAKARTA/.test(n)) return 'Jakarta';
    if(/\bSBY\b|SURABAYA/.test(n)) return 'Surabaya';
    if(/\bSMG\b|SEMARANG/.test(n)) return 'Semarang';
    if(/\bDPS\b|DENPASAR|\bBALI\b/.test(n)) return 'Denpasar';
    if(/\bPLG\b|\bPLB\b|PALEMBANG/.test(n)) return 'Palembang';
    return '';
  }
  function dateFromName(name){
    var m=String(name||'').match(/(\d{2})[.\-_](\d{2})[.\-_](\d{2,4})/);
    if(!m) return '';
    var y=Number(m[3]); if(y<100)y+=2000;
    var d=Number(m[1]),mo=Number(m[2]);
    if(!y||mo<1||mo>12||d<1||d>31)return '';
    return y+'-'+String(mo).padStart(2,'0')+'-'+String(d).padStart(2,'0');
  }
  function monthFromHeader(v){
    var s=String(v==null?'':v).trim().toLowerCase().replace(/\s+/g,'').replace(/[’\x60]/g,"'");
    var m=s.match(/^([a-z]+)'(\d{2}|\d{4})$/);
    if(!m) return null;
    var map={jan:1,feb:2,mar:3,apr:4,mei:5,may:5,jun:6,juni:6,jul:7,juli:7,agt:8,agst:8,aug:8,agu:8,sep:9,sept:9,okt:10,oct:10,nov:11,des:12,dec:12};
    var mo=map[m[1]]; if(!mo)return null;
    var y=Number(m[2]); if(y<100)y+=2000;
    return y+'-'+String(mo).padStart(2,'0');
  }
  function prevMonth(key,n){
    var p=String(key).split('-').map(Number), d=new Date(p[0],p[1]-1-n,1);
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
  }
  async function sha256(file){
    var buf=await file.arrayBuffer(), hash=await crypto.subtle.digest('SHA-256',buf), a=[].slice.call(new Uint8Array(hash));
    return a.map(function(b){return b.toString(16).padStart(2,'0');}).join('');
  }

  async function parseFile(file){
    var buf=await file.arrayBuffer();
    var wb=XLSX.read(buf,{type:'array',cellDates:true});
    var best=null;

    wb.SheetNames.forEach(function(sn){
      var grid=XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,defval:null,raw:true,cellDates:true});
      for(var r=0;r<Math.min(grid.length,20);r++){
        var h=(grid[r]||[]).map(function(x){return String(x==null?'':x).trim();});
        var norm=h.map(hnorm);
        var hasMaterial=norm.indexOf('material')>=0, hasPhysical=norm.indexOf('physical inventory')>=0;
        var monthCount=h.filter(function(x){return !!monthFromHeader(x);}).length;
        if(hasMaterial && hasPhysical && monthCount>=6){
          var score=monthCount;
          if(sn.trim().toUpperCase()==='REF')score+=100;
          if(sn.toUpperCase().indexOf('STOCK')>=0)score-=10;
          if(sn.indexOf('(3)')>=0)score-=50;
          if(!best||score>best.score)best={sn:sn,grid:grid,headerRow:r,headers:h,norm:norm,score:score};
        }
      }
    });
    if(!best)throw new Error('Sheet current tidak ditemukan. Dibutuhkan Material + Physical Inventory + histori sales bulanan.');

    function idxExact(){
      var aliases=[].slice.call(arguments).map(hnorm);
      return best.norm.findIndex(function(x){return aliases.indexOf(x)>=0;});
    }
    function idxContains(n){return best.norm.findIndex(function(x){return x.indexOf(n)>=0;});}

    var col={
      group:idxExact('Group'),material:idxExact('Material'),uom:idxExact('UOM'),desc:idxContains('material description'),
      size:idxExact('Size'),collection:idxExact('Collection'),status:idxExact('Status'),vendor:idxExact('Vendor'),
      pallet:idxContains('qty /pallet'),physical:idxExact('Physical Inventory'),reserved:idxExact('Physical Reserved'),
      onorder:idxExact('On Order'),free:idxExact('Free stock'),ots:idxExact('Ots PO')
    };
    if(col.material<0||col.physical<0)throw new Error('Kolom Material / Physical Inventory tidak ditemukan.');

    var monthCols=[];
    best.headers.forEach(function(v,i){var m=monthFromHeader(v);if(m)monthCols.push({i:i,m:m});});
    monthCols.sort(function(a,b){return a.m.localeCompare(b.m);});
    var latest=monthCols.length?monthCols[monthCols.length-1].m:null;
    if(!latest)throw new Error('Bulan sales tidak ditemukan.');
    var need6=[5,4,3,2,1,0].map(function(n){return prevMonth(latest,n);});
    var monthIndex={};monthCols.forEach(function(x){monthIndex[x.m]=x.i;});
    var missing3=need6.slice(-3).filter(function(m){return monthIndex[m]===undefined;});
    if(missing3.length)throw new Error('Rolling 3M tidak lengkap: '+missing3.join(', '));

    var rows=[], seen={}, dup=[], neg3=0, skippedNonBox=0, invalidStock=0;
    for(var rr=best.headerRow+1;rr<best.grid.length;rr++){
      var a=best.grid[rr]||[], material=String(a[col.material]==null?'':a[col.material]).trim();
      if(!material||material==='0')continue;
      var uom=col.uom>=0?String(a[col.uom]==null?'':a[col.uom]).trim().toUpperCase():'BOX';
      if(uom&&uom!=='BOX'){skippedNonBox++;continue;}
      if(seen[material])dup.push(material); else seen[material]=true;
      var physical=num(a[col.physical]); if(physical<0){invalidStock++;continue;}
      var salesHistory={};
      need6.forEach(function(m){salesHistory[m]=num(a[monthIndex[m]]);});
      var last6=need6.map(function(m){return Number(salesHistory[m]||0);});
      var last3=last6.slice(-3); neg3+=last3.filter(function(x){return x<0;}).length;
      var avg3=last3.reduce(function(s,x){return s+x;},0)/3, avg6=last6.reduce(function(s,x){return s+x;},0)/6;
      var lastSalesMonth=null;
      for(var mi=monthCols.length-1;mi>=0;mi--){if(num(a[monthCols[mi].i])>0){lastSalesMonth=monthCols[mi].m;break;}}
      rows.push({
        material_code:material,uom:uom||'BOX',material_desc:col.desc>=0?String(a[col.desc]==null?'':a[col.desc]).trim():'',
        product_group:col.group>=0?String(a[col.group]==null?'':a[col.group]).trim():'',size:col.size>=0?String(a[col.size]==null?'':a[col.size]).trim():'',
        collection:col.collection>=0?String(a[col.collection]==null?'':a[col.collection]).trim():'',product_status:col.status>=0?String(a[col.status]==null?'':a[col.status]).trim():'',
        vendor:col.vendor>=0?String(a[col.vendor]==null?'':a[col.vendor]).trim():'',qty_per_pallet:col.pallet>=0?num(a[col.pallet]):0,
        physical_inventory:physical,physical_reserved:col.reserved>=0?num(a[col.reserved]):0,on_order:col.onorder>=0?num(a[col.onorder]):0,
        free_stock:col.free>=0?num(a[col.free]):0,ots_po:col.ots>=0?num(a[col.ots]):0,avg_sales_3m:avg3,avg_sales_6m:avg6,
        doi_days:avg3>0?physical/avg3*30:null,doi_months:avg3>0?physical/avg3:null,last_sales_month:lastSalesMonth,
        no_movement_3m:physical>0&&!last3.some(function(x){return x>0;}),no_movement_6m:physical>0&&!last6.some(function(x){return x>0;}),sales_history:salesHistory
      });
    }
    if(dup.length)throw new Error('Duplicate Material: '+dup.slice(0,5).join(', ')+(dup.length>5?'…':''));
    if(!rows.length)throw new Error('Tidak ada SKU BOX valid yang terbaca.');

    var stock=rows.reduce(function(s,x){return s+x.physical_inventory;},0);
    var avg3sum=rows.reduce(function(s,x){return s+x.avg_sales_3m;},0);
    var avg6sum=rows.reduce(function(s,x){return s+x.avg_sales_6m;},0);
    return {
      file:file,fileName:file.name,hash:await sha256(file),sheetName:best.sn,rdc:detectRdc(file.name),snapshotDate:dateFromName(file.name),
      salesThrough:latest,rows:rows,negativeSalesCells3m:neg3,skippedNonBox:skippedNonBox,invalidStock:invalidStock,
      skuCount:rows.length,currentStock:stock,avg3:avg3sum,avg6:avg6sum,doiDays:avg3sum>0?stock/avg3sum*30:null,doiMonths:avg3sum>0?stock/avg3sum:null,
      noMove3Stock:rows.filter(function(x){return x.no_movement_3m;}).reduce(function(s,x){return s+x.physical_inventory;},0),
      noMove6Stock:rows.filter(function(x){return x.no_movement_6m;}).reduce(function(s,x){return s+x.physical_inventory;},0)
    };
  }

  function ensureModal(){
    var m=document.getElementById('doiUploadModalV111'); if(m)return m;
    m=document.createElement('div');m.id='doiUploadModalV111';
    m.className='sls-popout-overlay';
    m.style.cssText='display:none;position:fixed;inset:0;background:rgba(15,35,55,.58);z-index:9999;align-items:center;justify-content:center;padding:16px;';
    m.innerHTML=
      '<div class="sls-popout-card" style="background:#fff;width:min(820px,96vw);max-height:88vh;overflow:auto;border-radius:14px;box-shadow:0 18px 60px rgba(0,0,0,.25);padding:0;">'+
        '<div class="sls-popout-head" style="position:sticky;top:0;z-index:2;background:#fff;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;gap:12px;align-items:center;padding:14px 16px;">'+
          '<div style="min-width:0;"><div style="font-size:16px;font-weight:800;color:var(--navy);line-height:1.2;">Upload DOI / Avg Sales Manual</div><div style="font-size:10.5px;color:var(--stone);margin-top:3px;">PR Reference RDC · bisa beberapa file</div></div>'+
          '<button id="doiUploadCloseV111" class="sls-popout-close" type="button" aria-label="Tutup">✕</button>'+
        '</div>'+
        '<div style="padding:14px 16px 16px;">'+
          '<div style="padding:9px 11px;background:#F8F6F2;border-radius:8px;font-size:10.8px;line-height:1.45;">Upload file PR Reference. Sistem hitung <b>Avg Sales 3M & DOI</b>; file revisi mengganti snapshot lama.</div>'+
          '<div style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;margin-top:12px;"><input id="doiUploadInputV111" type="file" accept=".xlsx,.xls" multiple style="font-size:11px;min-width:0;width:100%;"><button class="btn-primary" id="doiParseBtnV111" style="padding:9px 14px;white-space:nowrap;">Validasi & Preview</button></div>'+
          '<div id="doiUploadMsgV111" style="font-size:11px;margin-top:8px;"></div><div id="doiUploadPreviewV111" style="margin-top:12px;"></div>'+
          '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;"><button class="btn-primary" id="doiPublishBtnV111" style="display:none;padding:9px 16px;">Publish / Replace Snapshot</button></div>'+
        '</div>'+
      '</div>';
    document.body.appendChild(m);
    document.getElementById('doiUploadCloseV111').onclick=function(){m.style.display='none';};
    m.addEventListener('click',function(e){if(e.target===m)m.style.display='none';});
    document.getElementById('doiParseBtnV111').onclick=parseSelection;
    document.getElementById('doiPublishBtnV111').onclick=publishSelection;
    return m;
  }
  function openUploadModal(){
    if(typeof CURRENT_ROLE!=='undefined' && CURRENT_ROLE!=='master'){alert('Upload manual DOI hanya untuk Master.');return;}
    var m=ensureModal(); DOI_UPLOAD_PREVIEW_V111=[];
    document.getElementById('doiUploadInputV111').value='';
    document.getElementById('doiUploadPreviewV111').innerHTML='';
    document.getElementById('doiUploadMsgV111').textContent='';
    document.getElementById('doiPublishBtnV111').style.display='none';
    m.style.display='flex';
  }
  function renderPreview(){
    var el=document.getElementById('doiUploadPreviewV111'), rdcs=['Jakarta','Semarang','Surabaya','Denpasar','Palembang'];
    var body=DOI_UPLOAD_PREVIEW_V111.map(function(x,i){
      var opts=rdcs.map(function(n){return '<option value="'+n+'" '+(x.rdc===n?'selected':'')+'>'+n+'</option>';}).join('');
      return '<tr style="border-bottom:1px solid var(--border);">'+
        '<td style="padding:6px;max-width:280px;">'+safe(x.fileName)+'</td>'+
        '<td style="padding:6px;text-align:center;"><select data-doi-i="'+i+'" data-doi-f="rdc" style="padding:5px;border:1px solid var(--border);border-radius:6px;">'+opts+'</select></td>'+
        '<td style="padding:6px;text-align:center;"><input data-doi-i="'+i+'" data-doi-f="snapshotDate" type="date" value="'+safe(x.snapshotDate||'')+'" style="padding:5px;border:1px solid var(--border);border-radius:6px;"></td>'+
        '<td style="padding:6px;text-align:center;font-weight:700;">'+periodLabel(x.salesThrough)+'</td>'+
        '<td style="padding:6px;text-align:right;">'+fmt(x.skuCount)+'</td><td style="padding:6px;text-align:right;">'+fmt(x.currentStock)+'</td>'+
        '<td style="padding:6px;text-align:right;">'+fmt(x.avg3)+'</td><td style="padding:6px;text-align:right;font-weight:800;">'+fmt(x.doiDays,1)+'</td>'+
        '<td style="padding:6px;text-align:right;">'+fmt(x.noMove3Stock)+'</td><td style="padding:6px;text-align:center;">'+(x.negativeSalesCells3m?'⚠ '+x.negativeSalesCells3m+' negative cell':'✓')+'</td></tr>';
    }).join('');
    el.innerHTML='<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:10.5px;min-width:1050px;"><thead><tr style="background:var(--navy);color:#fff;"><th style="padding:6px;text-align:left;">File</th><th>RDC</th><th>Snapshot</th><th>Sales Through</th><th>SKU</th><th>Stock</th><th>Avg 3M</th><th>DOI Hari</th><th>No Move 3M</th><th>Warning</th></tr></thead><tbody>'+body+'</tbody></table></div>';
    el.querySelectorAll('[data-doi-i]').forEach(function(inp){inp.addEventListener('change',function(){DOI_UPLOAD_PREVIEW_V111[Number(inp.dataset.doiI)][inp.dataset.doiF]=inp.value;});});
  }
  async function parseSelection(){
    var files=[].slice.call(document.getElementById('doiUploadInputV111').files||[]), msg=document.getElementById('doiUploadMsgV111');
    if(!files.length){msg.textContent='Pilih minimal 1 file Excel.';return;}
    msg.textContent='⏳ Membaca dan memvalidasi file…'; DOI_UPLOAD_PREVIEW_V111=[]; var errors=[];
    for(var i=0;i<files.length;i++){
      try{
        var p=await parseFile(files[i]);
        if(!p.rdc)errors.push(files[i].name+': RDC tidak terdeteksi — pilih pada preview.');
        if(!p.snapshotDate)errors.push(files[i].name+': tanggal snapshot tidak terdeteksi — isi manual.');
        DOI_UPLOAD_PREVIEW_V111.push(p);
      }catch(e){errors.push(files[i].name+': '+e.message);}
    }
    renderPreview();
    document.getElementById('doiPublishBtnV111').style.display=DOI_UPLOAD_PREVIEW_V111.length?'inline-flex':'none';
    msg.innerHTML=(DOI_UPLOAD_PREVIEW_V111.length?'✓ '+DOI_UPLOAD_PREVIEW_V111.length+' file valid. ':'')+(errors.length?'<span style="color:#B3261E;">'+errors.map(safe).join('<br>')+'</span>':'Tidak ada error struktur.');
  }
  async function publishSelection(){
    var msg=document.getElementById('doiUploadMsgV111'), btn=document.getElementById('doiPublishBtnV111');
    if(!DOI_UPLOAD_PREVIEW_V111.length)return;
    for(var i=0;i<DOI_UPLOAD_PREVIEW_V111.length;i++){
      if(!DOI_UPLOAD_PREVIEW_V111[i].rdc||!DOI_UPLOAD_PREVIEW_V111[i].snapshotDate){msg.innerHTML='<span style="color:#B3261E;">RDC dan tanggal snapshot wajib diisi.</span>';return;}
    }
    btn.disabled=true;msg.textContent='⏳ Publishing snapshot manual…'; var results=[];
    try{
      for(var j=0;j<DOI_UPLOAD_PREVIEW_V111.length;j++){
        var x=DOI_UPLOAD_PREVIEW_V111[j];
        var res=await sbRpc('doi_manual_upload_v1',{
          p_rdc:x.rdc,p_snapshot_date:x.snapshotDate,p_sales_through_month:x.salesThrough,p_source_file:x.fileName,p_file_hash:x.hash,
          p_sheet_name:x.sheetName,p_warning_count:x.negativeSalesCells3m,p_rows:x.rows
        });
        results.push(res);
      }
      var dup=results.filter(function(x){return x&&x.duplicate;}).length;
      msg.innerHTML='✓ Selesai: '+(results.length-dup)+' snapshot dipublish / direplace'+(dup?' · '+dup+' file duplicate dilewati':'')+'.';
      DOI_MANUAL_CACHE_V111=null;
      await renderManualDoi(typeof CURRENT_RDC!=='undefined'?CURRENT_RDC:'Semua');
      setTimeout(function(){var m=document.getElementById('doiUploadModalV111');if(m)m.style.display='none';},900);
    }catch(e){msg.innerHTML='<span style="color:#B3261E;">Gagal publish: '+safe(e.message||e)+'</span>';}
    finally{btn.disabled=false;}
  }

  async function syncManualDoiToRdc(){
    try{
      var d=await sbRpc('doi_manual_summary_v1',{p_rdc:'ALL'});
      if(!d||!Array.isArray(d.rows)||!d.rows.length)return;
      d.rows.forEach(function(r){
        var x=(typeof RDC!=='undefined')?RDC[r.rdc]:null;
        if(!x)return;
        x.avg_sales_3m=Number(r.avg_sales_3m||0);
        x.avg_sales_6m=Number(r.avg_sales_6m||0);
        x.doi_days=r.doi_days==null?null:Number(r.doi_days);
        x.doi_months=r.doi_months==null?null:Number(r.doi_months);
        x.doi_status=r.status||'DATA REQUIRED';
        x.sales_trend_3m_vs_6m=r.trend_3m_vs_6m==null?null:Number(r.trend_3m_vs_6m);
        x.doi_latest_month=r.sales_through_month||null;
        x.invdays=x.doi_days;
      });
      if(typeof RDC!=='undefined' && RDC['Semua'] && d.national){
        var n=d.national;
        RDC['Semua'].avg_sales_3m=Number(n.avg_sales_3m||0);
        RDC['Semua'].avg_sales_6m=Number(n.avg_sales_6m||0);
        RDC['Semua'].doi_days=n.doi_days==null?null:Number(n.doi_days);
        RDC['Semua'].doi_months=n.doi_months==null?null:Number(n.doi_months);
        RDC['Semua'].sales_trend_3m_vs_6m=n.trend_3m_vs_6m==null?null:Number(n.trend_3m_vs_6m);
        RDC['Semua'].invdays=RDC['Semua'].doi_days;
      }
      DOI_MANUAL_CACHE_V111=d;
    }catch(e){console.warn('DOI manual sync skipped',e);}
  }
  window.applyDoiManualSummaryV111=syncManualDoiToRdc;

  try{
    if(typeof bootDashboard==='function'){
      var _bootDoiV111=bootDashboard;
      bootDashboard=async function(){
        var v=await _bootDoiV111.apply(this,arguments);
        await syncManualDoiToRdc();
        if(typeof render==='function')render((typeof CURRENT_RDC_SCOPE!=='undefined'&&CURRENT_RDC_SCOPE)||(typeof CURRENT_RDC!=='undefined'?CURRENT_RDC:'Semua'));
        return v;
      };
    }
    if(typeof refreshLocalData==='function'){
      var _refreshDoiV111=refreshLocalData;
      refreshLocalData=async function(){
        var v=await _refreshDoiV111.apply(this,arguments);
        await syncManualDoiToRdc();
        return v;
      };
    }
  }catch(e){console.warn('DOI boot sync patch skipped',e);}

  try{
    renderDoiReport = renderManualDoi;
    exportDoiExcel = exportManualDoi;
  }catch(e){
    window.renderDoiReport = renderManualDoi;
    window.exportDoiExcel = exportManualDoi;
  }
  window.openDoiManualUpload = openUploadModal;
})();