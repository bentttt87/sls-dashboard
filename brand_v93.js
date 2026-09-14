// SLS Control Tower v95 branding — larger stacked QUADRA above ROMAN.
(function(){
  'use strict';
  const SRC='https://raw.githubusercontent.com/bentttt87/sls-wms/main/quadra-roman-logo.svg?v=20260914-2210';
  function stack(width){
    const topW=width, botW=Math.round(width*0.78);
    const wrap=document.createElement('div');
    wrap.className='brand-logo-v95';
    wrap.style.cssText='display:flex;flex-direction:column;align-items:center;justify-content:center;background:#fff;border-radius:12px;padding:10px 12px;gap:4px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.10);';
    wrap.style.width=(width+24)+'px';
    wrap.innerHTML=`<svg viewBox="0 0 250 110" width="${topW}" height="${Math.round(topW*0.44)}" aria-label="QUADRA"><image href="${SRC}" width="420" height="110"/></svg><svg viewBox="270 0 150 110" width="${botW}" height="${Math.round(botW*0.72)}" aria-label="ROMAN"><image href="${SRC}" width="420" height="110"/></svg>`;
    return wrap;
  }
  function apply(){
    const loginBox=document.querySelector('.login-box');
    if(loginBox){
      loginBox.querySelectorAll('.brand-logo-v93,.brand-logo-v94,.brand-logo-v95').forEach(x=>x.remove());
      const old=loginBox.querySelector('.roman-logo'); if(old) old.remove();
      const logo=stack(250);logo.style.margin='0 auto 16px';loginBox.insertBefore(logo,loginBox.firstChild);
    }
    const brand=document.querySelector('.sidebar .brand');
    if(brand){
      brand.style.cssText+=';display:flex;flex-direction:column;align-items:center;gap:8px;margin-bottom:12px;';
      brand.querySelectorAll('.roman-logo,.brand-logo-v93,.brand-logo-v94,.brand-logo-v95').forEach(x=>x.remove());
      const logo=stack(178);brand.insertBefore(logo,brand.firstChild);
      const txt=brand.querySelector('span');if(txt){txt.style.fontSize='13px';txt.style.letterSpacing='.2px';txt.style.alignSelf='flex-start';}
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
  [100,400,1000,2200].forEach(ms=>setTimeout(apply,ms));
})();