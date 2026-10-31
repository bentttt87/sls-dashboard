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
      .ua-create-coords{background:#f8fbfe;border:1px solid #cddfed;border-left:5px solid #2a6b9d;padding:17px 18px;border-radius:12px;margin:13px 0 18px}
      .ua-create-coords h3{font-size:16px;color:#193959;margin:0 0 8px}
      .ua-create-coords p{font-size:12.5px;color:#596f88;line-height:1.55;margin:0 0 13px}
      .ua-coord-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      .ua-coord-option{border:1px solid #d8e3ef;background:#fff;border-radius:10px;padding:12px 14px}
      .ua-coord-option strong{font-size:14px;display:block;margin-bottom:4px;color:#223f62}
      .ua-coord-option small{display:block;font-size:11.5px;color:#586c83;line-height:1.5;min-height:40px}
      .ua-coord-option button{margin-top:10px;font-size:12px;padding:10px 13px;display:inline-flex;align-items:center}
      .ua-credential-result{display:none;margin-top:13px;border:1px solid #cfe8d7;border-radius:8px;background:#f2faf4;padding:12px;color:#216346}
      .ua-credential-result strong{display:block;margin-bottom:7px;font-size:13px}
      .ua-credential-result code{font:650 14px/1.6 ui-monospace,SFMono-Regular,Consolas,monospace;word-break:break-all}
      .ua-credential-result .ua-credential-line{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:7px 0}
      .ua-credential-result .ua-credential-line span{font-size:12px;font-weight:700;min-width:70px}
      .ua-new-grid{display:grid;grid-template-columns:1.5fr 1fr 1fr 1.4fr auto;gap:10px;align-items:end}
      .ua-new-grid label{display:block;font-size:12px;font-weight:800;color:#4a5f79}
      .ua-new-grid input,.ua-new-grid select{width:100%;margin-top:5px;padding:11px;border:1px solid #c9d6e5;border-radius:8px;font-size:13px;background:white;color:#213b5d}
      .ua-new-grid button{padding:12px 15px;font-size:12px}
      .ua-new-hint{font-size:12px;color:#667b92;line-height:1.6;margin-top:10px}
      .ua-pw-cell{display:flex;gap:6px;align-items:center;min-width:270px}
      .ua-pw-cell input{flex:1;min-width:145px;width:170px!important;padding:10px 8px!important;font-size:12px!important}
      .ua-eye{border:1px solid #d3dfeb;background:#f7faff;color:#24577c;border-radius:8px;cursor:pointer;padding:8px;min-width:42px}
      .ua-save{font-size:12px!important;padding:10px 13px!important;white-space:nowrap}
      .ua-msg{font-size:13px!important;line-height:1.5;position:sticky;top:0;background:white;padding:8px 0;z-index:2}
      @media(max-width:1100px){.ua-new-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:900px){.ua-grid,.ua-coord-options{grid-template-columns:1fr}.ua-new-grid{grid-template-columns:1fr}.ua-table{min-width:1050px}.ua-wrap{overflow:auto}}
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
      <div class="topbar"><div><h1>Kelola User</h1><div class="period">Khusus Master — buat akun seluruh RDC, kelola akses, serta simpan/reset password</div></div></div>
      <div class="ua-note"><b>Satu akun SLS untuk semua aplikasi yang menggunakan Supabase Auth bersama.</b> Buat akun sesuai kewenangan dan lokasi. Password baru harus disimpan dengan tombol <b>Simpan Password</b> di baris akun. Tombol <b>Lihat</b> menampilkan teks yang sedang diketik; password tersimpan tidak dapat ditampilkan kembali.</div>
      <div class="ua-head"><h3>Akun SLS Aktif</h3><div class="grow"></div><button class="ua-btn gray" id="uaRefresh107">↻ Muat Ulang</button></div>
      <div id="uaMsg107" class="ua-msg"></div>
      <section class="ua-create-coords" aria-label="Buat akun SLS semua RDC">
        <h3>Buat Akun Baru — Semua RDC</h3>
        <p>Akun menggunakan ID kanonis Control Tower dan Supabase Auth bersama. Pilih hak akses sesuai tugas; Management = seluruh RDC (lihat laporan); Supervisor, Admin dan Staff dibatasi pada RDC masing-masing.</p>
        <form class="ua-new-grid" id="uaCreateAll107">
          <label>User ID<input id="uaNewId107" required maxlength="50" autocomplete="off" placeholder="Contoh: SPV.JKT.002" pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,49}"></label>
          <label>Hak Akses<select id="uaNewRole107"><option value="staff">Staff</option><option value="supervisor">Supervisor</option><option value="admin">Admin RDC</option><option value="management">Management / Nasional</option></select></label>
          <label>Area / RDC<select id="uaNewRdc107"><option>Jakarta</option><option>Semarang</option><option>Surabaya</option><option>Denpasar</option><option>Palembang</option><option value="ALL RDC">ALL RDC</option></select></label>
          <label>Password Awal<div class="ua-pw-cell"><input type="password" autocomplete="new-password" id="uaNewPw107" placeholder="Kosong = acak otomatis" minlength="9"><button class="ua-eye" type="button" id="uaNewShow107" aria-label="Lihat password awal">Lihat</button></div></label>
          <button class="ua-btn blue" id="uaNewSubmit107" type="submit">Buat Akun</button>
        </form>
        <div class="ua-new-hint">Login ID wajib unik; minimal 9 karakter untuk password dengan huruf dan angka. Password kosong akan dibuat acak. Akun Master baru tidak dapat dibuat melalui menu ini. Pembuatan tidak mengubah hak akses aplikasi lain secara otomatis.</div>
      </section>
      <section class="ua-create-coords" aria-label="Buat akun Koordinator">
        <h3>Buat Akun Koordinator Nasional</h3>
        <p>Dua ID terpisah untuk penelusuran aktivitas QW dan RDC. Role <b>MANAGEMENT</b>, cakupan <b>ALL RDC</b>, bukan Master dan tidak diberikan akses kelola user. Password awal dibuat acak dan hanya muncul setelah pembuatan berhasil; salin dan bagikan secara aman kepada pemegang akun.</p>
        <div class="ua-coord-options">
          <div class="ua-coord-option"><strong>KOORD.QW</strong><small>Koordinator QW · laporan nasional Roman | Quadra (read-only dashboard)</small>
            <button class="ua-btn blue" type="button" id="uaCreateQw107">Buat Akun Koordinator QW</button></div>
          <div class="ua-coord-option"><strong>KOORD.RDC</strong><small>Koordinator RDC · laporan nasional 5 RDC (read-only dashboard)</small>
            <button class="ua-btn blue" type="button" id="uaCreateRdc107">Buat Akun Koordinator RDC</button></div>
        </div>
        <div id="uaCoordinatorResult107" class="ua-credential-result" aria-live="polite"></div>
      </section>
      <div class="ua-wrap"><table class="ua-table"><thead><tr><th>User ID</th><th>Role</th><th>RDC</th><th>Status</th><th>Last Login</th><th>Password Baru</th><th>Konfirmasi</th></tr></thead><tbody id="uaBody107"><tr><td colspan="7">Memuat...</td></tr></tbody></table></div>
    `;
    main.appendChild(pg);
    $('uaRefresh107').onclick=loadUsers;
    $('uaCreateQw107').onclick=()=>createCoordinatorAccount('KOORD.QW','Koordinator QW','uaCreateQw107');
    $('uaCreateRdc107').onclick=()=>createCoordinatorAccount('KOORD.RDC','Koordinator RDC','uaCreateRdc107');
    $('uaNewRole107').onchange=()=>{
      const s=$('uaNewRdc107'),national=$('uaNewRole107').value==='management';
      if(national)s.value='ALL RDC';else if(s.value==='ALL RDC')s.value='Jakarta';
      [...s.options].forEach(o=>{if(o.value==='ALL RDC')o.disabled=!national;else o.disabled=national});
      s.disabled=national;
    };
    $('uaNewRole107').onchange();
    $('uaNewShow107').onclick=()=>togglePassword('uaNewPw107','uaNewShow107');
    $('uaCreateAll107').onsubmit=e=>{e.preventDefault();createNewAccount();};
  }

  function showMsg(text,ok=false){const m=$('uaMsg107'); if(!m)return; m.textContent=text||''; m.className='ua-msg '+(text?(ok?'ok':'err'):'');}

  function secureInitialPassword(){
    if(!window.crypto?.getRandomValues)throw new Error('Browser harus menggunakan HTTPS agar password acak aman.');
    // Never use Math.random() for account credentials. Different character classes are mandatory.
    const abc='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#%';
    const bytes=new Uint8Array(64);window.crypto.getRandomValues(bytes);
    const chars=Array.from({length:24},(_,i)=>abc[bytes[i]%abc.length]);
    chars[0]='Q';chars[1]='w';chars[2]='7';chars[3]='!';
    for(let i=chars.length-1;i>0;i--){const j=bytes[24+i]%(i+1);[chars[i],chars[j]]=[chars[j],chars[i]];}
    return chars.join('');
  }

  async function createCoordinatorAccount(loginId,description,buttonId){
    if(typeof CURRENT_ROLE==='undefined'||CURRENT_ROLE!=='master')return showMsg('Akses Master diperlukan.');
    const btn=$(buttonId), area=$('uaCoordinatorResult107');
    if(!btn||!area)return;
    btn.disabled=true;btn.textContent='Membuat akun…';
    try{
      const password=secureInitialPassword();
      // Edge Function checks active Master JWT and creates Supabase Auth user + role mapping + audit.
      const response=await userApi('create',{
        login_id:loginId,
        role:'management',
        rdc_name:'ALL RDC',
        password
      });
      if(!response?.ok||response.login_id!==loginId)throw new Error('Pembuatan akun belum dapat diverifikasi.');
      const entry=document.createElement('div');
      entry.style.cssText='border-bottom:1px solid #cde1d4;padding:6px 0 14px;margin-bottom:9px';
      const heading=document.createElement('strong');heading.textContent='Akun '+description+' berhasil dibuat';
      const uid=document.createElement('div');uid.className='ua-credential-line';
      const ulabel=document.createElement('span');ulabel.textContent='Login ID';const uvalue=document.createElement('code');uvalue.textContent=loginId;
      uid.append(ulabel,uvalue);
      const credential=document.createElement('div');credential.className='ua-credential-line';
      const plabel=document.createElement('span');plabel.textContent='Password';const pvalue=document.createElement('code');pvalue.textContent=password;
      const copy=document.createElement('button');copy.type='button';copy.className='ua-btn gray';copy.textContent='Salin Password';
      copy.addEventListener('click',async()=>{
        try{await navigator.clipboard.writeText(password);copy.textContent='Tersalin';}
        catch(e){copy.textContent='Salin manual dari teks password';}
      });
      credential.append(plabel,pvalue,copy);
      const notice=document.createElement('div');notice.style.cssText='font-size:11.5px;margin-top:7px;line-height:1.5;color:#456d52';
      notice.textContent='Simpan kredensial ini secara aman sekarang. Password tidak bisa dibuka lagi melalui menu ini; gunakan Reset Password jika hilang. Sarankan ganti password saat penggunaan pertama.';
      const close=document.createElement('button');close.type='button';close.className='ua-btn gray';close.textContent='Sembunyikan Password';
      close.onclick=()=>{entry.remove();if(!area.children.length)area.style.display='none';};
      entry.append(heading,uid,credential,notice,close);
      area.append(entry);area.style.display='block';
      btn.textContent='Akun Sudah Dibuat';
      showMsg('✓ '+loginId+' aktif sebagai Management / ALL RDC. Akun lain dapat dibuat terpisah.',true);
      await loadUsers(false);
    }catch(e){
      const message=String(e.message||e);
      showMsg('Gagal membuat '+loginId+': '+message);
      btn.textContent=message.includes('Login ID sudah digunakan')?'ID Sudah Terdaftar':'Coba Buat Lagi';
    }finally{btn.disabled=false;}
  }

  function togglePassword(inputId,buttonId){
    const input=$(inputId),btn=$(buttonId);if(!input||!btn)return;
    input.type=input.type==='password'?'text':'password';
    btn.textContent=input.type==='password'?'Lihat':'Sembunyikan';
    btn.setAttribute('aria-pressed',input.type==='text'?'true':'false');
  }

  async function createNewAccount(){
    const form=$('uaCreateAll107'),submit=$('uaNewSubmit107');
    if(!form||!submit)return;
    const loginId=String($('uaNewId107').value||'').trim().toUpperCase();
    const role=$('uaNewRole107').value;
    const rdc=role==='management'?'ALL RDC':$('uaNewRdc107').value;
    const supplied=$('uaNewPw107').value;
    if(!/^[A-Z0-9][A-Z0-9._-]{2,49}$/.test(loginId))return showMsg('Format User ID tidak valid.');
    if(!['management','admin','supervisor','staff'].includes(role))return showMsg('Role tidak dikenal.');
    if(role!=='management'&&!['Jakarta','Semarang','Surabaya','Denpasar','Palembang'].includes(rdc))return showMsg('Pilih RDC valid.');
    if(supplied && (supplied.length<9||!/[a-z]/i.test(supplied)||!/[0-9]/.test(supplied)))return showMsg('Password harus minimal 9 karakter serta mengandung huruf dan angka.');
    submit.disabled=true;submit.textContent='Membuat…';
    try{
      const password=supplied||secureInitialPassword();
      const result=await userApi('create',{login_id:loginId,role,rdc_name:rdc,password});
      if(!result?.ok||result.login_id!==loginId)throw new Error('Server belum mengonfirmasi pembuatan user.');
      showCredential({loginId,password,description:role.toUpperCase()+' · '+rdc});
      $('uaNewId107').value='';$('uaNewPw107').value='';$('uaNewPw107').type='password';$('uaNewShow107').textContent='Lihat';
      showMsg('✓ '+loginId+' berhasil dibuat; simpan password lalu uji login pada aplikasi tujuan.',true);
      await loadUsers(false);
    }catch(e){showMsg('Gagal membuat akun: '+String(e.message||e));}
    finally{submit.disabled=false;submit.textContent='Buat Akun';}
  }

  function showCredential({loginId,password,description}){
    const area=$('uaCoordinatorResult107');if(!area)return;
    const entry=document.createElement('div');entry.style.cssText='border-bottom:1px solid #cde1d4;padding:9px 0;margin-bottom:9px';
    const heading=document.createElement('strong');heading.textContent=loginId+' · '+description+' berhasil dibuat';
    const line=document.createElement('div');line.className='ua-credential-line';
    const title=document.createElement('span');title.textContent='Password';
    const pass=document.createElement('code');pass.textContent=password;
    const copy=document.createElement('button');copy.className='ua-btn gray';copy.type='button';copy.textContent='Salin Password';
    copy.onclick=async()=>{try{await navigator.clipboard.writeText(password);copy.textContent='Tersalin';}catch(e){copy.textContent='Salin manual';}};
    const hide=document.createElement('button');hide.className='ua-btn gray';hide.type='button';hide.textContent='Sembunyikan';hide.onclick=()=>{entry.remove();if(!area.children.length)area.style.display='none';};
    line.append(title,pass,copy,hide);entry.append(heading,line);area.append(entry);area.style.display='block';
  }

  async function resetPassword(userId,loginId,role,rdc,inputId){
    const inp=$(inputId); const pw=inp?.value||'';
    if(pw.length<9||!/[a-z]/i.test(pw)||!/[0-9]/.test(pw)){showMsg(`Password ${loginId} harus minimal 9 karakter, mengandung huruf dan angka.`); inp?.focus(); return;}
    const btn=document.querySelector(`[data-ua-reset="${CSS.escape(userId)}"]`); if(btn){btn.disabled=true;btn.textContent='Menyimpan...';}
    try{
      await userApi('update',{user_id:userId,login_id:loginId,role,rdc_name:rdc,active:true,password:pw});
      if(inp) inp.value='';
      showMsg(`✓ Password ${loginId} berhasil disimpan di Supabase Auth. Gunakan password baru ini pada aplikasi SLS yang memakai Supabase yang sama.`,true);
      await loadUsers(false);
    }catch(e){showMsg(`Gagal reset ${loginId}: ${e.message}`);}
    finally{if(btn){btn.disabled=false;btn.textContent='Simpan Password';}}
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
          <td><div class="ua-pw-cell"><input id="${inputId}" type="password" minlength="9" autocomplete="new-password" placeholder="Masukkan password baru">
          <button type="button" class="ua-eye" data-ua-show="${i}" aria-label="Lihat password ${esc(r.login_id)}">Lihat</button></div></td>
          <td><button type="button" class="ua-btn blue ua-save" data-ua-reset="${esc(r.user_id)}" data-idx="${i}">Simpan Password</button></td>
        </tr>`;
      }).join('');
      rows.forEach((r,i)=>{
        const b=body.querySelector(`[data-idx="${i}"]`);
        if(b) b.onclick=()=>resetPassword(r.user_id,r.login_id,r.role,r.rdc_name,'uaPw107_'+i);
        const show=body.querySelector(`[data-ua-show="${i}"]`);
        if(show)show.onclick=()=>togglePassword('uaPw107_'+i,'uaShowPw107_'+i);
        if(show)show.id='uaShowPw107_'+i;
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

// SLS Control Tower v114 — canonical Breakage display terminology.
// Data keys and backend categories are intentionally unchanged.
(function(){
  'use strict';
  const phraseMap=[
    ['Pecah Breakage (Gudang)','Pecah Pallet — Lainnya'],
    ['Pecah Pallet/Gudang','Pecah Pallet'],
    ['Rasio Pecah Pengiriman','Rasio Pecah Kirim'],
    ['Rasio Pecah Kiriman','Rasio Pecah Kirim'],
    ['Rasio Pecah Gudang','Rasio Pecah Pallet'],
    ['Delivery Breakage Rate','Pecah Kirim Rate'],
    ['Warehouse Breakage Rate','Pecah Pallet Rate'],
    ['Delivery Breakage','Pecah Kirim'],
    ['Warehouse Breakage','Pecah Pallet'],
    ['Pecah dalam Pallet','Pecah Pallet'],
    ['Pecah Pengiriman','Pecah Kirim'],
    ['Pecah Kiriman','Pecah Kirim'],
    ['Pecah Gudang','Pecah Pallet'],
    ['Breakage Rate gudang','Pecah Pallet Rate']
  ];
  const breakageRoots='#page-breakage,#breakageDetailSection,#kpiGridQuality,#extraKpiGrid,#uploadResult,#managerKpiScorecard,#priorityKpiStrip';

  function inBreakageContext(node){
    const el=node?.nodeType===Node.ELEMENT_NODE?node:node?.parentElement;
    return !!el?.closest?.(breakageRoots);
  }
  function normalizeText(text,node){
    const lead=(text.match(/^\s*/)||[''])[0],trail=(text.match(/\s*$/)||[''])[0];
    let raw=text.trim();if(!raw)return text;
    for(const [from,to] of phraseMap) raw=raw.split(from).join(to);
    if(inBreakageContext(node)){
      if(raw==='Delivery Rate')raw='Pecah Kirim Rate';
      if(raw==='Warehouse Rate')raw='Pecah Pallet Rate';
    }
    return lead+raw+trail;
  }
  function apply(root=document.body){
    if(!root)return;
    if(root.nodeType===Node.TEXT_NODE){const v=normalizeText(root.nodeValue||'',root);if(v!==root.nodeValue)root.nodeValue=v;return;}
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(node){
      const p=node.parentElement;if(!p||['SCRIPT','STYLE','NOSCRIPT','TEXTAREA'].includes(p.tagName))return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }});
    const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(n=>{const v=normalizeText(n.nodeValue||'',n);if(v!==n.nodeValue)n.nodeValue=v;});
  }
  apply();
  const observer=new MutationObserver(muts=>muts.forEach(m=>{
    if(m.type==='characterData')apply(m.target);
    m.addedNodes.forEach(n=>apply(n));
  }));
  observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
  [100,400,1000,2500,5000].forEach(ms=>setTimeout(apply,ms));
  window.slsNormalizeBreakageTerminology=apply;
})();
