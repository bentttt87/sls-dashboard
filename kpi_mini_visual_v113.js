(function(){
  'use strict';
  var leadtimeHistory={};
  var originalSpark=sparkHtml;
  var originalDeliveryCard=renderDeliverySpeedCard;

  function n(v){var z=Number(v);return Number.isFinite(z)?z:0;}
  function fmt(v){return n(v).toLocaleString('id-ID',{maximumFractionDigits:1});}
  function graphLine(values,note,better){
    if(!Array.isArray(values)||values.length<2)return '<div class="kpi-spark kpi-viz-note">Tren belum tersedia</div>';
    var v=values.map(Number).filter(Number.isFinite);
    if(v.length<2)return '<div class="kpi-spark kpi-viz-note">Tren belum tersedia</div>';
    var min=Math.min.apply(null,v),max=Math.max.apply(null,v),span=max-min||1;
    var pts=v.map(function(a,i){return (i/(v.length-1)*78).toFixed(1)+','+(21-(a-min)/span*20).toFixed(1);}).join(' ');
    var last=v[v.length-1],prev=v[v.length-2],diff=last-prev;
    var good=better==='higher'?diff>0:diff<0;
    var color=diff===0?'#65778A':good?'#168452':'#CB342C';
    var change=prev!==0?Math.abs(diff/prev*100).toFixed(1)+'%':'—';
    var arrow=diff===0?'→':diff>0?'▲':'▼';
    return '<div class="kpi-spark" title="'+note+'">'+
      '<svg viewBox="0 0 78 22" width="78" height="22" preserveAspectRatio="none" role="img" aria-label="'+note+'">'+
      '<polyline points="'+pts+'" fill="none" stroke="'+color+'" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'+
      '<span style="color:'+color+'">'+arrow+' '+change+'</span></div>';
  }

  function initLeadtime(rows){
    leadtimeHistory={}; DELIVERY_LEADTIME={};
    var byMonth={};
    (rows||[]).forEach(function(row){
      if(!row||!row.rdc_name||!row.period)return;
      var period=String(row.period).slice(0,7);
      var keys=['total_so','d0','d1','d2','d3','d4','d5','d5plus'];
      var x={rdc_name:row.rdc_name,period:period};
      keys.forEach(function(k){x[k]=n(row[k]);});
      if(x.total_so<=0)return;
      if(!leadtimeHistory[x.rdc_name])leadtimeHistory[x.rdc_name]=[];
      leadtimeHistory[x.rdc_name].push(x);
      if(!byMonth[period])byMonth[period]=[];
      byMonth[period].push(x);
    });
    Object.keys(leadtimeHistory).forEach(function(name){
      leadtimeHistory[name].sort(function(a,b){return a.period.localeCompare(b.period);});
      var a=leadtimeHistory[name];
      DELIVERY_LEADTIME[name]=a[a.length-1];
    });
    var national=[];
    Object.keys(byMonth).sort().forEach(function(month){
      var a=byMonth[month];
      var needed=['Jakarta','Surabaya','Semarang','Denpasar','Palembang'];
      if(!needed.every(function(name){return a.some(function(x){return x.rdc_name===name;});}))return;
      var o={rdc_name:'Semua',period:month};
      ['total_so','d0','d1','d2','d3','d4','d5','d5plus'].forEach(function(k){
        o[k]=a.reduce(function(s,x){return s+x[k];},0);
      });
      national.push(o);
    });
    if(national.length){
      leadtimeHistory.Semua=national;
      DELIVERY_LEADTIME.Semua=national[national.length-1];
    }
  }
  window.initKpiCardsV113=initLeadtime;

  function miniDoiGauge(d){
    var val=Number(d.doi_days!=null?d.doi_days:d.invdays);
    var target=Number(CONFIG.invdays_target||45);
    if(!Number.isFinite(val)||val<0)return '<div class="kpi-spark kpi-viz-note">Tren DOI belum tersedia</div>';
    var limit=Math.max(90,val*1.15,target*1.2);
    var bar=Math.max(0,Math.min(78,val/limit*78));
    var mark=Math.max(0,Math.min(78,target/limit*78));
    var col=val>75?'#B3261E':val>60?'#BD7B16':'#23865A';
    return '<div class="kpi-spark" title="Grafik DOI saat ini terhadap target; bukan histori bulanan">'+
      '<svg viewBox="0 0 78 22" width="78" height="22" role="img" aria-label="DOI '+fmt(val)+' hari, target '+fmt(target)+' hari">'+
      '<rect x="0" y="7" width="78" height="8" rx="4" fill="#E2E9F1"/>'+
      '<rect x="0" y="7" width="'+bar.toFixed(1)+'" height="8" rx="4" fill="'+col+'"/>'+
      '<line x1="'+mark.toFixed(1)+'" y1="3" x2="'+mark.toFixed(1)+'" y2="19" stroke="#1D3C66" stroke-width="1.8"/></svg>'+
      '<span style="color:'+col+'">vs target '+fmt(target)+' hari</span></div>';
  }

  function miniProductivityBars(){
    var names=['Jakarta','Surabaya','Semarang','Denpasar','Palembang'];
    var a=names.map(function(name){return {name:name,value:Number(RDC?.[name]?.prod)};})
      .filter(function(v){return Number.isFinite(v.value)&&v.value>=0;});
    if(a.length<2)return '<div class="kpi-spark kpi-viz-note">Tren produktivitas belum tersedia</div>';
    var max=Math.max.apply(null,a.map(function(x){return x.value;}))||1;
    var focus=typeof CURRENT_RDC!=='undefined'?CURRENT_RDC:'Semua';
    var bars=a.map(function(x,i){
      var h=Math.max(1,x.value/max*20);
      var fill=focus==='Semua'?'#316B98':x.name===focus?'#0C5DA3':'#CCD8E4';
      return '<rect x="'+(i*16+3)+'" y="'+(22-h).toFixed(1)+'" width="10" height="'+h.toFixed(1)+'" rx="2" fill="'+fill+'">'+
        '<title>'+x.name+' : '+fmt(x.value)+' box/SDM/bulan</title></rect>';
    }).join('');
    return '<div class="kpi-spark" title="Benchmark produktivitas 5 RDC, bukan tren bulanan">'+
      '<svg viewBox="0 0 86 22" width="86" height="22" role="img" aria-label="Perbandingan produktivitas 5 RDC">'+bars+'</svg>'+
      '<span style="color:#46647E">Banding 5 RDC</span></div>';
  }

  sparkHtml=function(k,d){
    if(k.key==='caprem'){
      var cap=n(d.kapasitas);
      var occ=Array.isArray(d.occ_trend)?d.occ_trend:[];
      if(cap>0 && occ.length>1){
        return graphLine(occ.map(function(x){return cap*(100-n(x))/100;}),
          'Estimasi sisa kapasitas dari occupancy historis, dengan asumsi kapasitas RDC tetap','higher');
      }
    }
    if(k.key==='invdays')return miniDoiGauge(d);
    if(k.key==='prod')return miniProductivityBars();
    return originalSpark(k,d);
  };

  renderDeliverySpeedCard=function(rdcName){
    var r=DELIVERY_LEADTIME[rdcName],out=originalDeliveryCard(rdcName);
    if(!r||!(n(r.total_so)>0))return out;
    var history=leadtimeHistory[rdcName]||[];
    var vals=history.map(function(x){return 100*(x.d0+x.d1+x.d2+x.d3)/x.total_so;});
    var chart=graphLine(vals,'Tren SO selesai dalam 0–3 hari menurut laporan bulanan; bukan SLA atau OTIF','higher');
    var label=(function(){
      var t=String(r.period).split('-');
      return new Date(Number(t[0]),Number(t[1])-1,1).toLocaleDateString('id-ID',{month:'long',year:'numeric'});
    })();
    out=out.replaceAll('Juli 2026',label);
    out=out.replace('<div class="kpi-sowhat">',chart+'<div class="kpi-sowhat">');
    return out;
  };
})();