// SLS Control Tower v72 — canonical login tier labels + official QUADRA ROMAN branding.
(function(){
  'use strict';
  const BRAND_SRC='https://raw.githubusercontent.com/bentttt87/sls-wms/main/quadra-roman-logo.svg?v=20260911';

  function applyQuadraRomanBrand(){
    document.querySelectorAll('.roman-logo').forEach(el=>{
      if(el.tagName==='IMG'){
        el.src=BRAND_SRC;
        el.alt='QUADRA ROMAN';
        return;
      }
      const img=document.createElement('img');
      img.className='roman-logo';
      img.src=BRAND_SRC;
      img.alt='QUADRA ROMAN';
      img.style.objectFit='contain';
      if(el.closest('.login-box')){
        img.style.width='176px';
        img.style.height='102px';
        img.style.marginBottom='10px';
      }else{
        img.style.width='106px';
        img.style.height='62px';
        img.style.flex='0 0 auto';
      }
      el.replaceWith(img);
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',applyQuadraRomanBrand,{once:true});
  else applyQuadraRomanBrand();
  window.setTimeout(applyQuadraRomanBrand,500);

  const oldApplyRoleUI=applyRoleUI;
  applyRoleUI=function(){
    oldApplyRoleUI();
    const badge=document.getElementById('roleBadge');
    if(CURRENT_ROLE==='rdc_manager' && !CURRENT_RDC_SCOPE && badge){
      badge.textContent='📊 MGR NASIONAL — Semua RDC';
      badge.className='badge-role user';
    }else if(CURRENT_ROLE==='supervisor' && badge){
      badge.textContent='SPV — '+(CURRENT_RDC_SCOPE||'RDC');
    }else if(CURRENT_ROLE==='operator' && badge){
      badge.textContent='OPERATOR — '+(CURRENT_RDC_SCOPE||'RDC');
    }
  };
  const u=document.getElementById('loginUsername');if(u)u.placeholder='OP.JKT.001 / SPV.JKT / MGR.SLS / MASTER.SLS';
  const hint=document.querySelector('.login-hint');if(hint)hint.textContent='Role SLS: Operator & SPV per RDC · Mgr & Master Nasional.';
})();
