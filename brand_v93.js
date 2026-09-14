// SLS Control Tower v93 branding — exact user-approved QUADRA + ROMAN artwork.
(function(){
  'use strict';
  const SRC='https://raw.githubusercontent.com/bentttt87/sls-wms/main/quadra-roman-logo.svg?v=20260914-2045';
  function makeImg(width){
    const img=document.createElement('img');
    img.src=SRC;img.alt='QUADRA + ROMAN';
    img.style.cssText=`display:block;width:${width}px;max-width:100%;height:auto;object-fit:contain;object-position:center;background:#fff;border-radius:8px;padding:3px 6px;`;
    return img;
  }
  function apply(){
    // Login: large centered logo pair.
    const loginBox=document.querySelector('.login-box');
    if(loginBox){
      const old=loginBox.querySelector('.roman-logo,.brand-logo-v93');
      if(old&&!old.classList.contains('brand-logo-v93')){
        const img=makeImg(220);img.className='brand-logo-v93';img.style.margin='0 auto 10px';old.replaceWith(img);
      }else if(!old){
        const img=makeImg(220);img.className='brand-logo-v93';img.style.margin='0 auto 10px';loginBox.insertBefore(img,loginBox.firstChild);
      }
    }
    // Sidebar: stack official pair above product name so nothing overlaps.
    const brand=document.querySelector('.sidebar .brand');
    if(brand){
      brand.style.cssText+=';display:flex;flex-direction:column;align-items:flex-start;gap:6px;margin-bottom:6px;';
      const old=brand.querySelector('.roman-logo,.brand-logo-v93');
      if(old&&!old.classList.contains('brand-logo-v93')){
        const img=makeImg(154);img.className='brand-logo-v93';old.replaceWith(img);
      }else if(!old){
        const img=makeImg(154);img.className='brand-logo-v93';brand.insertBefore(img,brand.firstChild);
      }
      const txt=brand.querySelector('span');if(txt){txt.style.fontSize='13px';txt.style.letterSpacing='.2px';}
    }
    // Any remaining old Roman-only marks are replaced.
    document.querySelectorAll('svg.roman-logo,svg[aria-label="Roman"],img[src*="roman-logo"]').forEach(el=>{
      if(el.classList.contains('brand-logo-v93'))return;
      const img=makeImg(el.closest('.login-box')?220:140);img.className='brand-logo-v93';el.replaceWith(img);
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
  [100,400,1000,2200].forEach(ms=>setTimeout(apply,ms));
})();
