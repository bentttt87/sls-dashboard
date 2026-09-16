// SLS Control Tower v107 — Master User Administration
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  function injectStyle(){
    if($('uaStyle107')) return;
    const st=document.createElement('style'); st.id='uaStyle107';
    st.textContent=`
      .ua-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px}
      .ua-card{background:#fff;border:1px solid var(--border);border-radius:12px;padding:14px}
      .ua-head{display:flex;gap:10px;align-items:center;margin-bottom:12px}.ua-head h3{margin:0;font-size:14px}.ua-head .grow{flex:1}
      .ua-note{font-size:11px;color:var(--ink-soft);line-height:1.5;background:#F7F9FC;border:1px solid #DDE6F0;border-radius:8px;padding:9px 11px;margin-bottom:12px}
      .ua-table{width:100%;border-collapse:collapse;font-size:11px;background:#fff}.ua-table th{background:#F3F5F8;text-align:left;padding:8px;border-bottom:1px solid var(--border)}.ua-table td{padding:8px;border-bottom:1px solid var(--border);vertical-align:middle}
      .ua-table input,.ua-table select,.ua-form input,.ua-form select{border:1px solid var(--border);border-radius:7px;padding:7px 8px;font-size:11px;background:#fff}
      .ua-btn{border:0;border-radius:7px;padding:7px 10px;font-size:10.5px;font-weight:700;cursor:pointer}.ua-btn.blue{background:#1F5FAE;color:#fff}.ua-btn.gray{background:#EEF2F6;color:#29415D}.ua-btn.red{background:#FDECEC;color:#A92520}
      .ua-msg{font-size:11px;margin:8px 0;min-height:16px}.ua-msg.ok{color:#16803C}.ua-msg.err{color:#C52922}
      .ua-pill{display:inline-block;border-radius:999px;padding:3px 7px;font-size:9.5px;font-weight:700}.ua-pill.on{background:#E8F6ED;color:#13723A}.ua-pill.off{background:#F1F1F1;color:#6C6C6C}
      @media(max-width:900px){.ua-grid{grid-template-columns:1fr}.ua-table{min-width:900px}.ua-wrap{overflow:auto}}
    `;
    document.head.appendChild(st);
  }

  async function userApi(action,payload={}){
    if(typeof CURRENT_ROLE==='undefined' || CURRENT_ROLE!=='master') throw new Error('Master only');
    if(!AUTH_SESSION || !AUTH_SESSION.access_token) throw new Error('Sesi Master belum aktif. Logout lalu login ulang sebagai MASTER.SLS.');
    const res=await fetch(`${SUPABASE_URL}/functions/v1/sls-user-admin-v73`,{
      method:'POST',
      headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':`Bearer ${AUTH_SESSION.access_token}`,'Content-Type':'application/json'},
      body:JSON.stringify({action,...payload})
    });
    let data={}; try{data=await res.json()}catch(_){data={error:await res.text()}}
    if(!res.ok) throw new Error(data?.error||`HTTP ${res.status}`);
    return data;
  }

  function injectNav(){
    if($('navUserAdmin107')) return;
    const base=$('navKelola'); if(!base) return;
    const el=document.createElement('div');
    el.className='nav-item'; el.id='navUserAdmin107'; el.style.display='none';
    el.innerHTML='<span class="nav-icon">•</span><span>Kelola User</span>';
    base.insertAdjacentElement('afterend',el);
    el.addEventListener('click',()=>openPage());
  }

  function injectPage(){
    if($('page-useradmin107')) return;
    const main=document.querySelector('.main'); if(!main) return;
    const pg=document.createElement('div'); pg.id='page-useradmin107'; pg.className='page';
    pg.innerHTML=`
      <div class="topbar"><div><h1>Kelola User</h1><div class="period">Khusus Master — lihat akun aktif, reset password, dan validasi akses RDC</div></div></div>
      <div class="ua-note"><b>Untuk trial Jakarta:</b> reset password pada STAFF.JKT.001 dan STAFF.JKT.002 melalui kolom Password Baru, lalu klik Reset Password. Password tidak disimpan di halaman ini.</div>
      <div class="ua-head"><h3>Akun SLS Aktif</h3><div class="grow"></div><button class="ua-btn gray" id="uaRefresh107">↻ Muat Ulang</button></div>
      <div id="uaMsg107" class="ua-msg"></div>
      <div class="ua-wrap"><table class="ua-table"><thead><tr><th>User ID</th><th>Role</th><th>RDC</th><th>Status</th><th>Last Login</th><th>Password Baru</th><th>Aksi</th></tr></thead><tbody id="uaBody107"><tr><td colspan="7">Memuat...</td></tr></tbody></table></div>
    `;
    main.appendChild(pg);
    $('uaRefresh107').onclick=loadUsers;
  }

  function showMsg(text,ok=false){const m=$('uaMsg107'); if(!m)return; m.textContent=text||''; m.className='ua-msg '+(text?(ok?'ok':'err'):'');}

  async function resetPassword(userId,loginId,role,rdc,inputId){
    const inp=$(inputId); const pw=inp?.value||'';
    if(pw.length<9){showMsg(`Password ${loginId} minimal 9 karakter.`); inp?.focus(); return;}
    const btn=document.querySelector(`[data-ua-reset="${CSS.escape(userId)}"]`); if(btn){btn.disabled=true;btn.textContent='Memproses...';}
    try{
      await userApi('update',{user_id:userId,login_id:loginId,role,rdc_name:rdc,active:true,password:pw});
      if(inp) inp.value='';
      showMsg(`✓ Password ${loginId} berhasil di-reset. Silakan trial login.`,true);
      await loadUsers(false);
    }catch(e){showMsg(`Gagal reset ${loginId}: ${e.message}`);}
    finally{if(btn){btn.disabled=false;btn.textContent='Reset Password';}}
  }

  async function loadUsers(clear=true){
    if(clear) showMsg('');
    const body=$('uaBody107'); if(!body)return;
    body.innerHTML='<tr><td colspan="7">Memuat akun...</td></tr>';
    try{
      const data=await userApi('list');
      const rows=(data.accounts||[]).filter(x=>x.active).sort((a,b)=>String(a.rdc_name||'').localeCompare(String(b.rdc_name||''))||String(a.login_id||'').localeCompare(String(b.login_id||'')));
      if(!rows.length){body.innerHTML='<tr><td colspan="7">Tidak ada akun aktif.</td></tr>';return;}
      body.innerHTML=rows.map((r,i)=>{
        const inputId='uaPw107_'+i;
        const last=r.last_sign_in_at?new Date(r.last_sign_in_at).toLocaleString('id-ID'):'Belum pernah';
        return `<tr>
          <td><b>${esc(r.login_id)}</b><div style="font-size:9px;color:var(--stone)">${esc(r.auth_email)}</div></td>
          <td>${esc(String(r.role||'').toUpperCase())}</td>
          <td>${esc(r.rdc_name||'All RDC')}</td>
          <td><span class="ua-pill ${r.active?'on':'off'}">${r.active?'ACTIVE':'INACTIVE'}</span></td>
          <td>${esc(last)}</td>
          <td><input id="${inputId}" type="password" autocomplete="new-password" placeholder="Password baru" style="width:150px"></td>
          <td><button class="ua-btn blue" data-ua-reset="${esc(r.user_id)}" data-idx="${i}">Reset Password</button></td>
        </tr>`;
      }).join('');
      rows.forEach((r,i)=>{
        const b=body.querySelector(`[data-idx="${i}"]`);
        if(b) b.onclick=()=>resetPassword(r.user_id,r.login_id,r.role,r.rdc_name,'uaPw107_'+i);
      });
      showMsg(`✓ ${rows.length} akun aktif dimuat.`,true);
    }catch(e){body.innerHTML='<tr><td colspan="7">Gagal memuat user.</td></tr>';showMsg(e.message);}
  }

  function openPage(){
    if(typeof CURRENT_ROLE==='undefined' || CURRENT_ROLE!=='master'){alert('Khusus Master.');return;}
    document.querySelectorAll('.nav-item').forEach(x=>x.classList.remove('active'));
    $('navUserAdmin107')?.classList.add('active');
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    $('page-useradmin107')?.classList.add('active');
    loadUsers();
  }

  function applyVisibility(){
    const nav=$('navUserAdmin107'); if(!nav)return;
    let master=false,offline=false;
    try{master=CURRENT_ROLE==='master';offline=!!IS_OFFLINE_MODE}catch(_){ }
    nav.style.display=(master&&!offline)?'flex':'none';
  }

  injectStyle(); injectNav(); injectPage();
  [100,400,900,1600].forEach(ms=>setTimeout(()=>{injectNav();injectPage();applyVisibility();},ms));
  document.addEventListener('click',()=>setTimeout(applyVisibility,0),true);
})();
