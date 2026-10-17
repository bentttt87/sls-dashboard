(function(){
  'use strict';

  var ACTION_CACHE_V112 = null;
  var _renderDoiV112 = (typeof renderDoiReport==='function') ? renderDoiReport : null;

  function nfmt(v,d){
    d=d==null?0:d;
    if(v==null || !Number.isFinite(Number(v))) return '—';
    return Number(v).toLocaleString('id-ID',{minimumFractionDigits:d,maximumFractionDigits:d});
  }
  function esc2(s){
    if(typeof esc==='function') return esc(s);
    return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});
  }
  function actionColor(a){
    return {
      'TRANSFER':'#1F5A9D','FLUSH OUT CANDIDATE':'#B3261E','FLUSH OUT REVIEW':'#8A3E00',
      'HOLD PR / REDUCE':'#946200','REPLENISH':'#1E7B34','REVIEW PROJECT/EXPORT':'#6B4F9D',
      'MAINTAIN':'#4F6B58','NO STOCK':'#8A8780'
    }[a]||'#6E6A63';
  }
  function actionBadge(a){
    var c=actionColor(a);
    return '<span style="display:inline-block;padding:3px 7px;border-radius:5px;background:'+c+'18;color:'+c+';font-size:9.5px;font-weight:800;">'+esc2(a)+'</span>';
  }
  function scopeRdc(rdcName){
    if(typeof CURRENT_RDC_SCOPE!=='undefined' && CURRENT_RDC_SCOPE) return CURRENT_RDC_SCOPE;
    return (rdcName && rdcName!=='Semua') ? rdcName : 'ALL';
  }
  async function fetchSummary(rdcName){
    return await sbRpc('doi_inventory_action_summary_v1',{p_rdc:scopeRdc(rdcName)});
  }
  async function fetchList(rdcName,action,limit){
    return await sbRpc('doi_inventory_action_list_v1',{
      p_rdc:scopeRdc(rdcName),p_action:action||'ALL',p_limit:limit||5000,p_offset:0
    });
  }

  async function renderActionEngine(rdcName){
    var host=document.getElementById('doiActionEngineV112');
    if(!host) return;
    host.innerHTML='<div class="nbc-placeholder">⏳ Menghitung rekomendasi SKU…</div>';
    try{
      var s=await fetchSummary(rdcName);
      ACTION_CACHE_V112=s;
      if(!s || s.status==='DATA REQUIRED' || !Array.isArray(s.rows) || !s.rows.length){
        host.innerHTML='<div style="background:#FFF7E6;border:1px solid #E7C56D;border-radius:9px;padding:12px;font-size:11.5px;color:#6E5610;">'+
          '<b>SKU recommendation belum tersedia.</b> Upload file PR Reference melalui tombol <b>Upload Data Manual</b> pada section DOI. Setelah publish, dashboard akan menghitung Transfer / Hold PR / Replenish / Flush Out Candidate otomatis.'+
          '</div>';
        return;
      }
      var n=s.national||{};
      var rows=s.rows||[];
      var cards=[
        ['Excess Stock',n.excess_stock,'box','Potential inventory reduction'],
        ['Transfer Opportunity',n.transfer_qty,'box','Prioritas sebelum flush out'],
        ['Flush Out Candidate',n.flushout_qty,'box','Tidak otomatis dieksekusi'],
        ['Hold PR / Reduce',n.reduce_qty,'box','Masih bergerak tetapi overstock'],
        ['Replenish Need',n.replenish_qty,'box','Stock di bawah target 2 bulan']
      ];
      var cardsHtml=cards.map(function(x,i){
        var accent=['#1F3864','#1F5A9D','#B3261E','#946200','#1E7B34'][i];
        return '<div class="kpi-card" style="min-height:auto;padding:11px;border-left:4px solid '+accent+';"><div class="kpi-label">'+x[0]+'</div><div class="kpi-value" style="font-size:19px;margin:5px 0;">'+nfmt(x[1])+' <span class="unit">'+x[2]+'</span></div><div class="kpi-sowhat">'+x[3]+'</div></div>';
      }).join('');

      var tableRows=rows.map(function(r){
        return '<tr style="border-bottom:1px solid var(--border);">'+
          '<td style="padding:6px 7px;font-weight:700;">'+esc2(r.rdc)+'</td>'+
          '<td style="padding:6px 7px;text-align:right;">'+nfmt(r.current_stock)+'</td>'+
          '<td style="padding:6px 7px;text-align:right;">'+nfmt(r.excess_stock)+'</td>'+
          '<td style="padding:6px 7px;text-align:right;color:#1F5A9D;font-weight:700;">'+nfmt(r.transfer_qty)+'</td>'+
          '<td style="padding:6px 7px;text-align:right;color:#B3261E;font-weight:700;">'+nfmt(r.flushout_qty)+'</td>'+
          '<td style="padding:6px 7px;text-align:right;color:#946200;font-weight:700;">'+nfmt(r.reduce_qty)+'</td>'+
          '<td style="padding:6px 7px;text-align:right;color:#1E7B34;font-weight:700;">'+nfmt(r.replenish_qty)+'</td>'+
        '</tr>';
      }).join('');

      host.innerHTML=
        '<div style="background:#fff;border:1px solid var(--border);border-radius:12px;padding:14px 16px;">'+
          '<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap;">'+
            '<div><div style="font-size:14px;font-weight:800;color:var(--navy);">SKU Inventory Recovery Recommendation</div>'+
            '<div style="font-size:10.5px;color:var(--stone);margin-top:2px;">Decision engine: transfer antar-RDC → flush out review → hold PR/reduce → replenish → maintain</div></div>'+
            '<div style="display:flex;gap:7px;flex-wrap:wrap;"><button id="actionDetailBtnV112" class="export-btn" style="padding:6px 10px;font-size:10.5px;">Lihat SKU Detail</button><button id="actionExcelBtnV112" class="export-btn" style="padding:6px 10px;font-size:10.5px;background:var(--navy);color:#fff;">📊 Export Recommendation Excel</button></div>'+
          '</div>'+
          '<div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin-top:12px;">'+cardsHtml+'</div>'+
          '<div style="overflow-x:auto;margin-top:12px;"><table style="width:100%;border-collapse:collapse;font-size:11px;min-width:850px;"><thead><tr style="background:var(--navy);color:#fff;text-align:right;"><th style="padding:6px 7px;text-align:left;">RDC</th><th>Stock</th><th>Excess</th><th>Transfer</th><th>Flushout</th><th>Hold/Reduce</th><th>Replenish</th></tr></thead><tbody>'+tableRows+'</tbody></table></div>'+
          '<div style="margin-top:9px;font-size:10.5px;color:var(--stone);line-height:1.5;"><b>Rule:</b> Target Stock = MAX(Avg Sales 3M × 2 bulan, 20 box). Transfer diprioritaskan sebelum flush out. SKU Project/Export tidak auto-flushout. Flush Out tetap <b>candidate/recommendation</b>, bukan keputusan otomatis.</div>'+
        '</div>';
      var d=document.getElementById('actionDetailBtnV112'); if(d)d.onclick=function(){openActionDetail(rdcName);};
      var e=document.getElementById('actionExcelBtnV112'); if(e)e.onclick=function(){exportActionExcel(rdcName);};
    }catch(e){
      host.innerHTML='<div style="background:#FCEBE9;border-radius:8px;padding:11px;color:#B3261E;font-size:11px;">Gagal menghitung SKU recommendation: '+esc2(e.message||e)+'</div>';
    }
  }

  function ensureDetailModal(){
    var m=document.getElementById('actionModalV112'); if(m)return m;
    m=document.createElement('div');m.id='actionModalV112';
    m.style.cssText='display:none;position:fixed;inset:0;background:rgba(15,35,55,.55);z-index:9999;align-items:center;justify-content:center;padding:16px;';
    m.innerHTML='<div style="background:#fff;width:min(1450px,97vw);max-height:93vh;overflow:auto;border-radius:14px;padding:16px;box-shadow:0 18px 60px rgba(0,0,0,.25);">'+
      '<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;"><div><div style="font-size:16px;font-weight:800;color:var(--navy);">SKU Recommendation Detail</div><div id="actionModalSubV112" style="font-size:10.5px;color:var(--stone);margin-top:3px;"></div></div><button id="actionCloseV112" class="export-btn">✕ Tutup</button></div>'+
      '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:12px;"><label style="font-size:10.5px;font-weight:700;">Action</label><select id="actionFilterV112" style="padding:7px;border:1px solid var(--border);border-radius:7px;"><option>ALL</option><option>TRANSFER</option><option>FLUSH OUT CANDIDATE</option><option>FLUSH OUT REVIEW</option><option>HOLD PR / REDUCE</option><option>REPLENISH</option><option>REVIEW PROJECT/EXPORT</option><option>MAINTAIN</option></select><button id="actionApplyV112" class="btn-primary" style="padding:7px 12px;">Terapkan</button><button id="actionModalExcelV112" class="export-btn" style="padding:7px 12px;">📊 Export Excel</button></div>'+
      '<div id="actionModalBodyV112" style="margin-top:12px;"></div></div>';
    document.body.appendChild(m);
    document.getElementById('actionCloseV112').onclick=function(){m.style.display='none';};
    return m;
  }
  async function openActionDetail(rdcName){
    var m=ensureDetailModal();m.style.display='flex';
    document.getElementById('actionModalSubV112').textContent=(rdcName&&rdcName!=='Semua'?rdcName:'Nasional')+' · Target stock 2 bulan, minimum 20 box';
    var load=async function(){
      var action=document.getElementById('actionFilterV112').value;
      var body=document.getElementById('actionModalBodyV112');body.innerHTML='<div class="nbc-placeholder">⏳ Memuat SKU…</div>';
      try{
        var d=await fetchList(rdcName,action,5000), rows=d.rows||[];
        if(!rows.length){body.innerHTML='<div class="nbc-placeholder">Tidak ada SKU untuk filter ini.</div>';return;}
        var html=rows.slice(0,500).map(function(r){
          return '<tr style="border-bottom:1px solid var(--border);">'+
            '<td style="padding:5px 6px;">'+esc2(r.rdc)+'</td><td style="padding:5px 6px;font-weight:700;">'+esc2(r.material)+'</td><td style="padding:5px 6px;">'+esc2(r.description||'')+'</td><td style="padding:5px 6px;">'+esc2(r.size||'')+'</td><td style="padding:5px 6px;">'+esc2(r.product_status||'')+'</td>'+
            '<td style="padding:5px 6px;text-align:right;">'+nfmt(r.physical_inventory)+'</td><td style="padding:5px 6px;text-align:right;">'+nfmt(r.free_stock)+'</td><td style="padding:5px 6px;text-align:right;">'+nfmt(r.ots_po)+'</td><td style="padding:5px 6px;text-align:right;">'+nfmt(r.avg_sales_3m,1)+'</td><td style="padding:5px 6px;text-align:right;">'+nfmt(r.doi_days,1)+'</td><td style="padding:5px 6px;text-align:right;">'+nfmt(r.target_stock)+'</td><td style="padding:5px 6px;text-align:right;font-weight:700;">'+nfmt(r.recommended_qty)+'</td>'+
            '<td style="padding:5px 6px;">'+actionBadge(r.recommended_action)+'</td><td style="padding:5px 6px;">'+actionBadge(r.secondary_action||'')+'</td><td style="padding:5px 6px;">'+esc2(r.suggested_destination||'')+'</td>'+
          '</tr>';
        }).join('');
        body.innerHTML='<div style="font-size:10.5px;color:var(--stone);margin-bottom:7px;">Menampilkan '+Math.min(rows.length,500)+' dari '+nfmt(d.total)+' SKU. Export Excel memuat seluruh hasil.</div><div style="overflow:auto;max-height:65vh;"><table style="width:100%;border-collapse:collapse;font-size:10.5px;min-width:1650px;"><thead><tr style="position:sticky;top:0;background:var(--navy);color:#fff;"><th>RDC</th><th>Material</th><th>Description</th><th>Size</th><th>Status</th><th>Stock</th><th>Free Stock</th><th>OTS PO</th><th>Avg 3M</th><th>DOI Hari</th><th>Target Stock</th><th>Recommended Qty</th><th>Primary Action</th><th>Secondary Action</th><th>Destination</th></tr></thead><tbody>'+html+'</tbody></table></div>';
      }catch(e){body.innerHTML='<div style="color:#B3261E;">'+esc2(e.message||e)+'</div>';}
    };
    document.getElementById('actionApplyV112').onclick=load;
    document.getElementById('actionModalExcelV112').onclick=function(){exportActionExcel(rdcName,document.getElementById('actionFilterV112').value);};
    load();
  }

  async function exportActionExcel(rdcName,filterAction){
    try{
      var scope=scopeRdc(rdcName);
      var s=await sbRpc('doi_inventory_action_summary_v1',{p_rdc:scope});
      var d=await sbRpc('doi_inventory_action_list_v1',{p_rdc:scope,p_action:filterAction||'ALL',p_limit:20000,p_offset:0});
      var rows=(d.rows||[]).filter(function(r){return r.recommended_action!=='NO STOCK';});
      var wb=XLSX.utils.book_new();

      var sum=[['SLS INVENTORY RECOVERY RECOMMENDATION'],['Scope',scope],['Generated At',new Date().toLocaleString('id-ID')],[],['Rule','Value'],['Target Stock','MAX(Avg Sales 3M x 2 months, 20 box)'],['Priority','Transfer before Flush Out'],['Project/Export','Manual review - not auto flushout'],[],['RDC','Current Stock','Excess Stock','Transfer Opportunity','Flush Out Candidate','Hold PR / Reduce','Replenish Need','No Movement 3M']];
      (s.rows||[]).forEach(function(r){sum.push([r.rdc,Number(r.current_stock||0),Number(r.excess_stock||0),Number(r.transfer_qty||0),Number(r.flushout_qty||0),Number(r.reduce_qty||0),Number(r.replenish_qty||0),Number(r.no_movement_3m_stock||0)]);});
      var ws1=XLSX.utils.aoa_to_sheet(sum);ws1['!cols']=[{wch:24},{wch:22},{wch:18},{wch:22},{wch:22},{wch:20},{wch:18},{wch:20}];XLSX.utils.book_append_sheet(wb,ws1,'Management Summary');

      var headers=['RDC','Snapshot Date','Sales Through','Material','Description','Size','Collection','Product Status','Vendor','Physical Inventory','Physical Reserved','Free Stock','OTS PO','Avg Sales 3M','Avg Sales 6M','DOI Days','DOI Months','Target Stock','Excess Qty','Shortage Qty','Transferable Excess','Transfer Out','Transfer In','Stock After Transfer','Free Stock After Transfer','Residual Excess','Residual Actionable Excess','Residual Shortage','Replenish After OTS','Network Avg Sales 3M','Primary Action','Secondary Action','Secondary Qty','Recommended Qty','Recommended Remaining','Suggested Destination','Suggested Source','Last Sales Month','No Movement 3M','No Movement 6M','Source File'];
      var aoa=[headers];
      rows.forEach(function(r){aoa.push([r.rdc,r.snapshot_date,r.sales_through_month,r.material,r.description,r.size,r.collection,r.product_status,r.vendor,Number(r.physical_inventory||0),Number(r.physical_reserved||0),Number(r.free_stock||0),Number(r.ots_po||0),Number(r.avg_sales_3m||0),Number(r.avg_sales_6m||0),r.doi_days==null?'':Number(r.doi_days),r.doi_months==null?'':Number(r.doi_months),Number(r.target_stock||0),Number(r.excess_qty||0),Number(r.shortage_qty||0),Number(r.transferable_excess||0),Number(r.transfer_out_qty||0),Number(r.transfer_in_qty||0),Number(r.stock_after_transfer||0),Number(r.free_stock_after_transfer||0),Number(r.excess_after_transfer||0),Number(r.actionable_excess_after_transfer||0),Number(r.shortage_after_transfer||0),Number(r.replenish_after_ots||0),Number(r.network_avg_sales_3m||0),r.recommended_action,r.secondary_action||'',Number(r.secondary_qty||0),Number(r.recommended_qty||0),Number(r.recommended_remaining||0),r.suggested_destination||'',r.suggested_source||'',r.last_sales_month||'',r.no_movement_3m?'YES':'NO',r.no_movement_6m?'YES':'NO',r.source_file||'']);});
      var ws2=XLSX.utils.aoa_to_sheet(aoa);ws2['!cols']=[{wch:14},{wch:13},{wch:12},{wch:16},{wch:32},{wch:10},{wch:18},{wch:18},{wch:10},{wch:16},{wch:16},{wch:14},{wch:12},{wch:14},{wch:14},{wch:11},{wch:11},{wch:14},{wch:13},{wch:13},{wch:17},{wch:14},{wch:14},{wch:17},{wch:20},{wch:15},{wch:22},{wch:16},{wch:18},{wch:19},{wch:25},{wch:25},{wch:15},{wch:17},{wch:19},{wch:34},{wch:34},{wch:13},{wch:14},{wch:14},{wch:48}];XLSX.utils.book_append_sheet(wb,ws2,'SKU Recommendation');

      function addFiltered(name,fn){
        var rr=rows.filter(fn), a=[headers];rr.forEach(function(r){a.push([r.rdc,r.snapshot_date,r.sales_through_month,r.material,r.description,r.size,r.collection,r.product_status,r.vendor,Number(r.physical_inventory||0),Number(r.physical_reserved||0),Number(r.free_stock||0),Number(r.ots_po||0),Number(r.avg_sales_3m||0),Number(r.avg_sales_6m||0),r.doi_days==null?'':Number(r.doi_days),r.doi_months==null?'':Number(r.doi_months),Number(r.target_stock||0),Number(r.excess_qty||0),Number(r.shortage_qty||0),Number(r.transferable_excess||0),Number(r.transfer_out_qty||0),Number(r.transfer_in_qty||0),Number(r.stock_after_transfer||0),Number(r.free_stock_after_transfer||0),Number(r.excess_after_transfer||0),Number(r.actionable_excess_after_transfer||0),Number(r.shortage_after_transfer||0),Number(r.replenish_after_ots||0),Number(r.network_avg_sales_3m||0),r.recommended_action,r.secondary_action||'',Number(r.secondary_qty||0),Number(r.recommended_qty||0),Number(r.recommended_remaining||0),r.suggested_destination||'',r.suggested_source||'',r.last_sales_month||'',r.no_movement_3m?'YES':'NO',r.no_movement_6m?'YES':'NO',r.source_file||'']);});var ws=XLSX.utils.aoa_to_sheet(a);ws['!cols']=ws2['!cols'];XLSX.utils.book_append_sheet(wb,ws,name);
      }
      addFiltered('Transfer Plan',function(r){return r.recommended_action==='TRANSFER';});
      addFiltered('Flushout Candidates',function(r){return r.recommended_action.indexOf('FLUSH OUT')===0;});
      addFiltered('Hold PR Reduce',function(r){return r.recommended_action==='HOLD PR / REDUCE';});
      addFiltered('Replenishment',function(r){return r.recommended_action==='REPLENISH';});
      XLSX.writeFile(wb,'SLS_Inventory_Recovery_Recommendation_'+(scope==='ALL'?'National':scope.replace(/\s+/g,'_'))+'.xlsx');
    }catch(e){alert('Gagal export Excel: '+(e.message||e));}
  }

  if(_renderDoiV112){
    renderDoiReport=async function(rdcName){
      await _renderDoiV112(rdcName);
      var root=document.getElementById('doiReport');
      if(!root)return;
      var host=document.getElementById('doiActionEngineV112');
      if(!host){host=document.createElement('div');host.id='doiActionEngineV112';host.style.marginTop='12px';root.insertAdjacentElement('afterend',host);}
      await renderActionEngine(rdcName);
    };
  }
  window.exportInventoryRecoveryExcelV112=exportActionExcel;
})();