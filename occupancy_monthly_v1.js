(function monthlyOccupancyEngine(){
  'use strict';
  const all=['Jakarta','Semarang','Surabaya','Denpasar','Palembang'];
  function calc(stockHistory,capacityMaster,scope){
    const expected=scope&&all.includes(scope)?[scope]:all;
    const caps=new Map();
    for(const r of capacityMaster||[]){
      const name=r.name||r.rdc_name,cap=Number(r.kapasitas_box);
      if(!all.includes(name)||!Number.isFinite(cap)||cap<=0)continue;
      const existing=caps.get(name);
      if(!existing||String(r.updated_at||'')>String(existing.updated_at||''))caps.set(name,{capacity:cap,updated_at:r.updated_at||null});
    }
    const periods=new Map();
    for(const r of stockHistory||[]){
      const mo=String(r.month||'');if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(mo))continue;
      const name=r.rdc||r.rdc_name,qty=Number(r.stock_box);
      if(!expected.includes(name)||!Number.isFinite(qty)||qty<0)continue;
      if(!caps.has(name))continue;
      if(!periods.has(mo))periods.set(mo,new Map());
      const month=periods.get(mo),old=month.get(name);
      if(!old||String(r.updated_at||'')>String(old.updated_at||''))month.set(name,r);
    }
    const candidates=[...periods.keys()].sort().reverse();
    const month=candidates.find(m=>periods.get(m).size===expected.length);
    if(!month)return null; // No ratios from incomplete or mixed-month national data.
    const day=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),0)).getUTCDate();
    const periodEnd=month+'-'+String(day).padStart(2,'0');
    const rows=expected.map(name=>{
      const cap=caps.get(name),rec=periods.get(month).get(name);
      return {rdc_name:name,snapshot_date:periodEnd,stock_current_box:Number(rec.stock_box),kapasitas_box:cap.capacity,month,stock_source:'stock_history',capacity_source:'rdc_master',capacity_updated_at:cap.updated_at};
    });
    const previousCandidates=candidates.filter(m=>m<month&&periods.get(m).size===expected.length);
    const prev=previousCandidates[0]||null;
    const stock=rows.reduce((n,x)=>n+x.stock_current_box,0),capacity=rows.reduce((n,x)=>n+x.kapasitas_box,0);
    const prevStock=prev?expected.reduce((n,name)=>n+Number(periods.get(prev).get(name).stock_box),0):null;
    const ratio=capacity?100*stock/capacity:null;
    const prevRatio=prev!=null&&capacity>0?100*prevStock/capacity:null;
    const masterDates=rows.map(r=>r.capacity_updated_at).filter(Boolean).sort();
    const capacityDate=masterDates.length?masterDates[masterDates.length-1].slice(0,10):null;
    return {
      date:periodEnd,month,rows,complete:rows.length===expected.length,coverage:rows.length,
      sourceLabel:'STOCK_HISTORY + RDC_MASTER',status:'CAPACITY_REFERENCE_CHECK_REQUIRED',
      stockSource:'stock_history',capacitySource:'rdc_master',capacityDate,
      capacityVerifiedForMonth:false, // update timestamp is not a certificate of capacity for the report month
      priorMonth:prev,priorRatio,ratio,
      deltaPercentagePoints:prevRatio==null?null:ratio-prevRatio
    };
  }
  window.SLSMonthlyOccupancy=Object.freeze({compute:calc,version:'2026-10-29-monthly-v1'});
})();