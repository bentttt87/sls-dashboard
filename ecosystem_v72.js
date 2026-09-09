// SLS Control Tower v72 — canonical login tier labels.
(function(){
  'use strict';
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
