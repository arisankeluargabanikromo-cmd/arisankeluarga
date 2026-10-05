/* Login, setup awal, dan inisialisasi aplikasi */
/* ---------- auth ---------- */
async function boot(){
  const a=await api('auth');
  if(a.needSetup)return authView('setup');
  if(!a.user)return authView('login');
  const s=await api('summary');S.me=s.me;S.period=s.period;
  $('#auth').style.display='none';$('#app').style.display='block';
  $('#app').style.display='flex';
  $('#meAv').textContent=ini(S.me.name);$('#meName').textContent=S.me.name;$('#meRole').textContent=admin()?'Admin keluarga':'Anggota';
  $('#nav').innerHTML=Object.entries(PAGES).map(([k,[l,i]])=>`<button data-p="${k}" onclick="go('${k}')"><span class="nav-icon">${i}</span><span>${l}</span></button>`).join('');
  go(location.hash.slice(1)in PAGES?location.hash.slice(1):'dashboard');
}
function authView(mode){
  const setup=mode==='setup';$('#app').style.display='none';const el=$('#auth');el.style.display='grid';
  el.innerHTML=`<div class="card"><h2>${setup?'Pengaturan awal':'Masuk ke FamilyHub'}</h2><p>${setup?'Buat akun admin pertama. Kunci setup ada di Environment Variables Vercel (SETUP_KEY).':'Gunakan akun yang dibuat admin keluarga.'}</p>
  ${setup?'<label>Kunci setup</label><input id="a_key" type="password"><label>Nama lengkap</label><input id="a_name">':''}
  <label>Username</label><input id="a_user" autocomplete="username"><label>Password${setup?' (min. 8 karakter)':''}</label><input id="a_pw" type="password" autocomplete="current-password">
  <button class="primary" style="width:100%" id="a_btn">${setup?'Buat admin':'Masuk'}</button></div>`;
  const submit=async()=>{$('#a_btn').disabled=true;const b={action:mode,username:$('#a_user').value,password:$('#a_pw').value};
    if(setup){b.key=$('#a_key').value;b.name=$('#a_name').value}
    if(await run(()=>api('auth',{m:'POST',b})))boot();else $('#a_btn').disabled=false};
  $('#a_btn').onclick=submit;$('#a_pw').onkeydown=e=>{if(e.key==='Enter')submit()};
}
async function logout(){await api('auth',{m:'POST',b:{action:'logout'}});location.reload()}

boot().catch(e=>{document.body.innerHTML='<p style="padding:30px;font-family:sans-serif">Gagal memuat: '+esc(e.message)+'</p>'});
