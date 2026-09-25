// SLS Control Tower v95 — canonical shared login roles + QUADRA ROMAN branding + breakage terminology.
(function(){
  'use strict';
  const BRAND_SRC='https://raw.githubusercontent.com/bentttt87/sls-wms/main/quadra-roman-logo.svg?v=20260911';

  function applyQuadraRomanBrand(){
    document.querySelectorAll('.roman-logo').forEach(el=>{
      if(el.tagName==='IMG'){
        el.src=BRAND_SRC; el.alt='QUADRA ROMAN'; return;
      }
      const img=document.createElement('img');
      img.className='roman-logo'; img.src=BRAND_SRC; img.alt='QUADRA ROMAN'; img.style.objectFit='contain';
      if(el.closest('.login-box')){
        img.style.width='176px'; img.style.height='102px'; img.style.marginBottom='10px';
      }else{
        img.style.width='106px'; img.style.height='62px'; img.style.flex='0 0 auto';
      }
      el.replaceWith(img);
    });
  }

  function patchRoleUI(){
    if(typeof applyRoleUI!=='function' || applyRoleUI.__slsV94) return;
    const base=applyRoleUI;
    const fn=function(){
      base();
      const badge=document.getElementById('roleBadge');
      const isMaster=CURRENT_ROLE==='master';
      const isManagement=CURRENT_ROLE==='management';
      const isSupervisor=CURRENT_ROLE==='supervisor';
      const isNational=isMaster||isManagement;

      if(isManagement && badge){
        badge.textContent='📊 MANAGEMENT — Semua RDC · VIEW ONLY';
        badge.className='badge-role user';
      }else if(isSupervisor && badge){
        badge.textContent='SPV — '+(CURRENT_RDC_SCOPE||'RDC');
        badge.className='badge-role user';
      }

      // National Management = management review only, never transactional/admin input.
      if(isManagement){
        ['navKelola','navStockOpname','navUpload','navManual'].forEach(id=>{
          const el=document.getElementById(id); if(el) el.style.display='none';
        });
      }

      const rdcWrap=document.getElementById('rdcSelectorWrap'); if(rdcWrap) rdcWrap.style.display=isNational?'flex':'none';
      const fin=document.getElementById('managementFinancialSection'); if(fin) fin.style.display=isNational?'block':'none';
      const title=document.getElementById('mainTitle'); if(title) title.textContent=isNational?'SLS Supply Chain Profitability Control Tower':'SLS Warehouse Operational Dashboard';
      const scoped=document.getElementById('footerScopedNote'); if(scoped) scoped.style.display=isNational?'none':'inline';
      const pulse=document.getElementById('pulseSectionLabel'); if(pulse) pulse.style.display=isNational?'flex':'none';
      const mgmtTab=document.getElementById('viewTabMgmt'); if(mgmtTab) mgmtTab.style.display=isNational?'block':'none';
      const tabs=document.getElementById('viewTabsWrap'); if(tabs) tabs.style.display=isNational?'flex':'none';
      if(typeof switchView==='function') switchView(isNational?'mgmt':'ops');
    };
    fn.__slsV94=true;
    applyRoleUI=fn;
  }

  function applyLoginCopy(){
    const u=document.getElementById('loginUsername');
    if(u) u.placeholder='SPV.JKT / MANAGEMENT.SLS / MASTER.SLS';
    const hint=document.querySelector('.login-hint');
    if(hint) hint.textContent='Dashboard: MASTER & MANAGEMENT melihat All RDC · SUPERVISOR melihat RDC sendiri.';
  }

  function installBreakageTerminology(){
    if(window.__slsBreakageTermsV95) return;
    window.__slsBreakageTermsV95=true;

    const exact=new Map([
      ['Pecah Kiriman','Pecah Kirim'],
      ['Pecah Pengiriman','Pecah Kirim'],
      ['Rasio Pecah Kiriman','Rasio Pecah Kirim'],
      ['Rasio Pecah Pengiriman','Rasio Pecah Kirim'],
      ['Delivery Breakage Rate','Rasio Pecah Kirim'],
      ['Pecah Gudang','Pecah Pallet'],
      ['Pecah dalam Pallet','Pecah Pallet'],
      ['Pecah Pallet/Gudang','Pecah Pallet'],
      ['Rasio Pecah Gudang','Rasio Pecah Pallet'],
      ['Warehouse Breakage Rate','Rasio Pecah Pallet'],
      ['Pecah Kirim','Pecah Kirim'],
      ['Pecah Pallet','Pecah Pallet']
    ]);
    const phrases=[
      ['Pecah Kiriman','Pecah Kirim'],
      ['Pecah Pengiriman','Pecah Kirim'],
      ['Rasio Pecah Kiriman','Rasio Pecah Kirim'],
      ['Rasio Pecah Pengiriman','Rasio Pecah Kirim'],
      ['Delivery Breakage Rate','Rasio Pecah Kirim'],
      ['Pecah Pallet/Gudang','Pecah Pallet'],
      ['Pecah dalam Pallet','Pecah Pallet'],
      ['Pecah Gudang','Pecah Pallet'],
      ['Rasio Pecah Gudang','Rasio Pecah Pallet'],
      ['Warehouse Breakage Rate','Rasio Pecah Pallet']
    ];

    function normalizeText(text){
      const lead=(text.match(/^\s*/)||[''])[0];
      const trail=(text.match(/\s*$/)||[''])[0];
      const raw=text.trim();
      if(!raw) return text;
      if(exact.has(raw)) return lead+exact.get(raw)+trail;
      let out=raw;
      for(const [from,to] of phrases) out=out.split(from).join(to);
      return lead+out+trail;
    }
    function apply(root=document.body){
      if(!root) return;
      if(root.nodeType===Node.TEXT_NODE){
        const v=normalizeText(root.nodeValue||'');
        if(v!==root.nodeValue) root.nodeValue=v;
        return;
      }
      if(root.nodeType!==Node.ELEMENT_NODE && root.nodeType!==Node.DOCUMENT_NODE && root.nodeType!==Node.DOCUMENT_FRAGMENT_NODE) return;
      const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(node){
        const p=node.parentElement;
        if(!p||['SCRIPT','STYLE','NOSCRIPT','TEXTAREA'].includes(p.tagName)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }});
      const nodes=[];
      while(walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(n=>{const v=normalizeText(n.nodeValue||'');if(v!==n.nodeValue)n.nodeValue=v;});
    }

    apply();
    const observer=new MutationObserver(muts=>muts.forEach(m=>{
      if(m.type==='characterData') apply(m.target);
      m.addedNodes.forEach(n=>apply(n));
    }));
    observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
    [200,700,1600,3200].forEach(ms=>setTimeout(apply,ms));
  }

  function apply(){
    applyQuadraRomanBrand(); patchRoleUI(); applyLoginCopy(); installBreakageTerminology();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',apply,{once:true}); else apply();
  setTimeout(apply,500); setTimeout(apply,1400);
})();
