// SLS Control Tower v94 branding — larger stacked QUADRA above ROMAN.
(function(){
  'use strict';
  const SRC='https://raw.githubusercontent.com/bentttt87/sls-wms/main/quadra-roman-logo.svg?v=20260914-2200';
  function stack(width){
    const topW=width, botW=Math.round(width*0.72);
    const wrap=document.createElement('div');
    wrap.className='brand-logo-v94';
    wrap.style.cssText='display:flex;flex-direction:column;align-items:center;justify-content:center;background:#fff;border-radius:10px;padding:7px 8px;gap:4px;overflow:hidden;';
    wrap.style.width=(width+16)+'px';
    wrap.innerHTML=`<svg viewBox="0 0 250 110" width="${topW}" height="${Math.round(topW*0.44)}" aria-label="QUADRA"><image href="${SRC}" width="420" height="110"/></svg><svg viewBox="280 0 140 110" width="${botW}" height="${Math.round(botW*0.78)}" aria-label="ROMAN"><image href="${SRC}" width="420" height="110"/></svg>`;
    return wrap;
  }
  function apply(){
    const loginBox=document.querySelector('.login-box');
    if(loginBox){
      loginBox.querySelectorAll('.brand-logo-v93,.brand-logo-v94').forEach(x=>x.remove());
      const old=loginBox.querySelector('.roman-logo'); if(old) old.remove();
      const logo=stack(210);logo.style.margin='0 auto 14px';loginBox.insertBefore(logo,loginBox.firstChild);
    }
    const brand=document.querySelector('.sidebar .brand');
    if(brand){
      brand.style.cssText+=';display:flex;flex-direction:column;align-items:flex-start;gap:7px;margin-bottom:10px;';
      brand.querySelectorAll('.roman-logo,.brand-logo-v93,.brand-logo-v94').forEach(x=>x.remove());
      const logo=stack(146);brand.insertBefore(logo,brand.firstChild);
      const txt=brand.querySelector('span');if(txt){txt.style.fontSize='13px';txt.style.letterSpacing='.2px';}
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
  [100,400,1000,2200].forEach(ms=>setTimeout(apply,ms));
})();