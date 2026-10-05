const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rp=n=>'Rp '+Number(n||0).toLocaleString('id-ID');
const ini=n=>esc(String(n).split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase());
const MON=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const perLabel=p=>MON[+p.slice(5)-1]+' '+p.slice(0,4);
const fdate=d=>d?new Date(d+'T00:00:00').toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'}):'—';
const api=async(p,o={})=>{const r=await fetch('/api/'+p,{method:o.m||'GET',headers:{'Content-Type':'application/json'},body:o.b?JSON.stringify(o.b):undefined});const d=await r.json().catch(()=>({}));if(r.status===401&&p!=='auth')location.reload();if(!r.ok)throw new Error(d.error||'Gagal');return d};
const toast=m=>{const t=$('#toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600)};
const run=async(fn,ok)=>{try{await fn();if(ok)toast(ok);return true}catch(e){toast(e.message);return false}};
let S={me:null,period:'',page:'dashboard'};
const admin=()=>S.me?.role==='admin';
const PAGES={dashboard:['Dashboard','⌂'],arisan:['Arisan','◎'],pengocokan:['Pengocokan Digital','⚡'],silsilah:['Silsilah Keluarga','♧'],anggota:['Anggota','♙'],keuangan:['Keuangan','◈'],agenda:['Agenda','◫'],galeri:['Dokumentasi','▧'],pengumuman:['Pengumuman','◌'],laporan:['Laporan','▤']};

function theme(){const d=document.body.classList.toggle('dark');localStorage.setItem('fh-theme',d?'dark':'light')}
if(localStorage.getItem('fh-theme')==='dark')document.body.classList.add('dark');

/* ---------- modal & form ---------- */
const closeModal=()=>$('#modal').classList.remove('show');
$('#modal').addEventListener('click',e=>{if(e.target.id==='modal')closeModal()});
function modal(html,w=''){$('#modalBox').style.width=w;$('#modalBox').innerHTML=html;$('#modal').classList.add('show')}
function form(title,fields,onSave,btn='Simpan'){
  modal(`<div class="modal-top"><b>${esc(title)}</b><button class="close" onclick="closeModal()" aria-label="Tutup">×</button></div><div style="margin-top:14px" id="fm">${fields.map(f=>{
    const v=f.v??'',id='f_'+f.k;
    const inp=f.t==='select'?`<select id="${id}">${f.o.map(([a,b])=>`<option value="${esc(a)}" ${String(a)===String(v)?'selected':''}>${esc(b)}</option>`).join('')}</select>`
      :f.t==='check'?`<select id="${id}"><option value="1" ${v?'selected':''}>Ya</option><option value="" ${v?'':'selected'}>Tidak</option></select>`
      :`<input id="${id}" type="${f.t||'text'}" value="${esc(v)}" ${f.ph?`placeholder="${esc(f.ph)}"`:''} autocomplete="off">`;
    return `<label for="${id}">${esc(f.l)}</label>${inp}`}).join('')}<button class="primary" style="width:100%" id="fmBtn">${btn}</button></div>`);
  $('#fmBtn').onclick=async()=>{const d={};fields.forEach(f=>{const x=$('#f_'+f.k).value;d[f.k]=f.t==='check'?!!x:x});
    $('#fmBtn').disabled=true;if(await run(()=>onSave(d)))closeModal();else $('#fmBtn').disabled=false};
}
const confirmDo=(msg,fn,ok)=>{if(confirm(msg))run(fn,ok).then(()=>go(S.page))};

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

/* ---------- navigasi ---------- */
async function go(p){
  S.page=p;location.hash=p;$('#pageTitle').textContent=PAGES[p][0];
  document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('active',b.dataset.p===p));
  $('#view').innerHTML='<div class="empty">Memuat…</div>';
  try{$('#view').innerHTML=await VIEWS[p]()}catch(e){$('#view').innerHTML=`<div class="card empty">${esc(e.message)}</div>`}
  window.scrollTo({top:0});
}
const hero=(t,d,extra='')=>`<div class="hero"><div><h1>${t}</h1><p>${d}</p></div>${extra}</div>`;
const tbl=(h,rows,empty='Belum ada data.')=>rows.length?`<div class="scroll"><table class="table"><thead><tr>${h.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`:`<div class="empty">${empty}</div>`;
const del=(path,id)=>admin()?`<button class="lnk red" onclick="confirmDo('Hapus data ini?',()=>api('${path}?id=${id}',{m:'DELETE'}),'Terhapus')">Hapus</button>`:'';
const stat=(l,v,s='')=>`<div class="card stat"><div class="stat-top"><span class="stat-label">${l}</span></div><h2>${v}</h2><small>${s}</small><div class="wave"></div></div>`;

const VIEWS={
async dashboard(){
  const [s,mem,pay,rounds,ev]=await Promise.all([api('summary'),api('members'),api('payments?period='+S.period),api('rounds'),api('events')]);
  const part=mem.filter(m=>m.active&&m.is_participant),paid=new Set(pay.map(p=>p.member_id)),paidN=part.filter(m=>paid.has(m.id)).length;
  const saldo=s.months.reduce((a,m)=>a+m.income-m.expense,0),cur=rounds.find(r=>r.period===S.period);
  const pct=part.length?Math.round(paidN/part.length*100):0,today=new Date().toISOString().slice(0,10);
  const nxt=ev.find(e=>e.date>=today),m6=s.months.slice(-6),mx=Math.max(1,...m6.flatMap(m=>[m.income,m.expense]));
  const line=k=>m6.map((m,i)=>`${m6.length>1?i*700/(m6.length-1):350},${200-m[k]/mx*180}`).join(' ');
  return hero('Selamat datang, '+esc(S.me.name.split(' ')[0])+' 👋','Satu tempat untuk menjaga silaturahmi, transparansi arisan, dan cerita keluarga.',`<div class="hero-date"><strong>${new Date().getDate()}</strong><span>${MON[new Date().getMonth()].toUpperCase()} ${new Date().getFullYear()}</span></div>`)+
  `<div class="grid4">${stat('Saldo kas',rp(saldo))}${stat('Anggota aktif',mem.filter(m=>m.active).length,part.length+' peserta arisan')}${stat('Iuran '+perLabel(S.period),pct+'%',paidN+' dari '+part.length+' lunas')}${stat('Iuran per orang',rp(cur?.fee),cur?'':'Belum diatur')}</div>
  <div class="content2"><div class="card chart-card"><div class="card-head"><h3>Arus kas</h3><span>${m6.length} bulan terakhir</span></div>${m6.length?`<div class="chart"><svg viewBox="0 0 700 210" preserveAspectRatio="none"><polyline points="${line('income')}" fill="none" stroke="#6957ff" stroke-width="4"/><polyline points="${line('expense')}" fill="none" stroke="#22c7a9" stroke-width="3" stroke-dasharray="7 6"/></svg></div><div class="legend"><span><i></i>Pemasukan</span><span><i class="g"></i>Pengeluaran</span></div>`:'<div class="empty">Belum ada transaksi.</div>'}</div>
  <div class="card next"><div class="card-head" style="padding:0 0 18px"><h3>Acara berikutnya</h3></div>${nxt?`<div class="event-date"><div class="datebox"><small>${MON[+nxt.date.slice(5,7)-1].slice(0,3).toUpperCase()}</small><b>${nxt.date.slice(8)}</b></div><div><h4>${esc(nxt.title)}</h4><p>${esc(nxt.location||'')}</p></div></div>`:'<p>Belum ada agenda.</p>'}<div class="progress"><span style="width:${pct}%"></span></div><div class="split"><span>${paidN}/${part.length} iuran masuk</span><b style="color:#22a98f">${pct}%</b></div></div></div>`;
},
async arisan(){
  const [mem,pay,rounds]=await Promise.all([api('members'),api('payments?period='+S.period),api('rounds')]);
  const part=mem.filter(m=>m.active&&m.is_participant),pm=Object.fromEntries(pay.map(p=>[p.member_id,p])),cur=rounds.find(r=>r.period===S.period)||{fee:0};
  const got=pay.reduce((a,p)=>a+p.amount,0),target=part.length*cur.fee;
  const rows=part.map(m=>{const p=pm[m.id];return `<tr><td><b>${esc(m.name)}</b></td><td class="money">${rp(cur.fee)}</td><td><span class="status ${p?'':'pending'}">${p?'Lunas':'Belum'}</span></td><td>${p?new Date(p.paid_at).toLocaleString('id-ID',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'—'}</td><td>${admin()?(p?`<button class="lnk red" onclick="confirmDo('Batalkan pembayaran ${esc(m.name)}?',()=>api('payments?id=${p.id}',{m:'DELETE'}),'Dibatalkan')">Batalkan</button>`:`<button class="lnk" onclick="run(()=>api('payments',{m:'POST',b:{member_id:${m.id},period:'${S.period}'}}),'Pembayaran dicatat').then(()=>go('arisan'))">Catat lunas</button>`):''}</td></tr>`});
  return hero('Monitoring Arisan',perLabel(S.period)+' • transparansi iuran dan penerima giliran.',admin()?`<button class="primary" style="position:relative;z-index:1" onclick="roundForm()">Atur putaran</button>`:'')+
  `<div class="grid4">${stat('Target iuran',rp(target))}${stat('Sudah masuk',rp(got))}${stat('Belum masuk',rp(Math.max(0,target-got)))}${stat('Acara',fdate(cur.event_date),esc(cur.location||''))}</div><div class="card"><div class="card-head"><h3>Arisan ${perLabel(S.period)}</h3></div>${tbl(['Anggota','Iuran','Status','Waktu',''],rows,'Belum ada peserta arisan.')}</div>`;
},
async pengocokan(){
  const d=await api('draws?period='+S.period);
  return hero('Pengocokan Digital','Undian diacak di server, hanya sekali per putaran. Hadiah otomatis tercatat di Keuangan.',`<div class="hero-date"><strong>${perLabel(S.period).split(' ')[0]}</strong><span>PUTARAN ARISAN</span></div>`)+
  `<div class="card" style="margin-bottom:20px"><div class="winner"><small id="dSub">${d.done?'Putaran ini sudah diundi':d.eligible.length+' peserta memenuhi syarat • siklus '+d.cycle}</small><h2 id="dName">${d.done?esc(d.history.find(h=>h.period===S.period).winner_name):'Siap diundi'}</h2>${admin()&&!d.done?`<button class="primary" id="dBtn" onclick="doDraw()" ${d.eligible.length?'':'disabled'}>⚡ Mulai pengocokan</button>`:''}</div></div>
  <div class="card" style="margin-bottom:20px"><div class="card-head"><h3>Peserta eligible</h3><span>aktif • sudah bayar • belum menang di siklus ini</span></div><div class="pad" style="display:flex;flex-wrap:wrap;gap:8px">${d.eligible.map(e=>`<span style="padding:8px 11px;border:1px solid var(--line);border-radius:20px;background:var(--panel2);font-size:11px">✓ ${esc(e.name)}</span>`).join('')||'<span class="empty" style="padding:0">Belum ada. Catat pembayaran di menu Arisan.</span>'}</div></div>
  <div class="card"><div class="card-head"><h3>Histori pengundian</h3></div>${tbl(['Putaran','Waktu','Peserta','Pemenang','Bukti (hash)',''],d.history.map(h=>`<tr><td>${perLabel(h.period)}</td><td>${new Date(h.created_at).toLocaleString('id-ID')}</td><td>${h.participants}</td><td><b>${esc(h.winner_name||'—')}</b></td><td title="${h.proof}"><code>${h.proof.slice(0,10)}…</code></td><td>${del('draws',h.id)}</td></tr>`))}</div>`;
},
async silsilah(){
  const mem=await api('members'),ids=new Set(mem.map(m=>m.id));
  const node=(m,dep=0)=>{const k=dep<12?mem.filter(x=>x.parent_id===m.id):[];return `<div class="node" onclick="profile(${m.id})"><div class="avatar">${ini(m.name)}</div><b>${esc(m.name.split(' ')[0])}</b><span>Generasi ${m.generation}</span></div>`+(k.length?`<div class="connector"></div><div class="branches" style="gap:18px">${k.map(c=>`<div class="branch">${node(c,dep+1)}</div>`).join('')}</div>`:'')};
  const roots=mem.filter(m=>!m.parent_id||!ids.has(m.parent_id));
  return hero('Silsilah Keluarga','Jelajahi hubungan keluarga dari generasi ke generasi.')+`<div class="card"><div class="card-head"><h3>Family tree</h3><span>Klik anggota untuk melihat profil</span></div><div class="tree-wrap"><div class="tree"><div class="branches" style="gap:40px">${roots.map(r=>`<div>${node(r)}</div>`).join('')}</div></div></div></div>`;
},
async anggota(){
  const mem=await api('members');window._mem=mem;
  return hero('Anggota Keluarga','Direktori anggota, hubungan keluarga, dan status arisan.')+`<div class="toolbar"><input class="search" placeholder="Cari nama anggota…" oninput="document.querySelectorAll('#mt tr').forEach(r=>r.style.display=r.innerText.toLowerCase().includes(this.value.toLowerCase())?'':'none')">${admin()?'<button class="primary" onclick="memberForm()">＋ Anggota</button>':''}</div><div class="card">${tbl(['Nama','Hubungan','Gen.','Arisan','Aksi'],mem.map(m=>`<tr><td><b>${esc(m.name)}</b>${m.role==='admin'?' <span class="status">admin</span>':''}</td><td>${esc(m.relation||'—')}</td><td>${m.generation}</td><td><span class="status ${m.active&&m.is_participant?'':'pending'}">${!m.active?'Nonaktif':m.is_participant?'Peserta':'Bukan peserta'}</span></td><td><button class="lnk" onclick="profile(${m.id})">Detail</button>${admin()?`<button class="lnk" onclick="memberForm(${m.id})">Ubah</button>${del('members',m.id)}`:''}</td></tr>`)).replace('<tbody>','<tbody id="mt">')}</div>`;
},
async keuangan(){
  const [t,s]=await Promise.all([api('transactions'),api('summary')]);
  const inn=s.months.reduce((a,m)=>a+m.income,0),out=s.months.reduce((a,m)=>a+m.expense,0);
  return hero('Keuangan Keluarga','Iuran arisan otomatis tercatat sebagai pemasukan. Transaksi lain dicatat di sini.')+`<div class="grid4">${stat('Saldo',rp(inn-out))}${stat('Total pemasukan',rp(inn))}${stat('Total pengeluaran',rp(out))}${stat('Transaksi manual',t.length)}</div><div class="card"><div class="card-head"><h3>Transaksi terbaru</h3>${admin()?'<button class="primary" onclick="txForm()">＋ Transaksi</button>':''}</div>${tbl(['Tanggal','Keterangan','Jenis','Nominal',''],t.map(x=>`<tr><td>${fdate(x.date)}</td><td>${esc(x.description)}</td><td><span class="status ${x.type==='in'?'':'pending'}">${x.type==='in'?'Masuk':'Keluar'}</span></td><td class="money">${x.type==='in'?'+':'-'} ${rp(x.amount)}</td><td>${del('transactions',x.id)}</td></tr>`))}</div>`;
},
async agenda(){
  const e=await api('events');
  return hero('Agenda Keluarga','Semua acara keluarga dalam satu kalender.')+`<div class="card"><div class="card-head"><h3>Acara</h3>${admin()?'<button class="primary" onclick="evForm()">＋ Agenda</button>':''}</div>${tbl(['Tanggal','Kegiatan','Lokasi',''],e.map(x=>`<tr><td><b>${fdate(x.date)}</b></td><td>${esc(x.title)}</td><td>${esc(x.location||'—')}</td><td>${del('events',x.id)}</td></tr>`))}</div>`;
},
async galeri(){
  const ph=await api('photos'),albums=[...new Set(ph.map(p=>p.album))];window._ph=ph;
  return hero('Dokumentasi Keluarga','Kenangan keluarga tersimpan rapi dalam album.')+`<div class="toolbar"><select class="select" onchange="document.querySelectorAll('.ph').forEach(c=>c.style.display=!this.value||c.dataset.a===this.value?'':'none')"><option value="">Semua album</option>${albums.map(a=>`<option>${esc(a)}</option>`).join('')}</select><button class="primary" onclick="photoForm()">＋ Unggah foto</button></div>`+
  (ph.length?`<div class="grid4">${ph.map(p=>`<div class="card ph" data-a="${esc(p.album)}" style="overflow:hidden"><img loading="lazy" src="${esc(p.url)}" alt="Foto album ${esc(p.album)}" onclick="lightbox(${p.id})" style="width:100%;height:170px;object-fit:cover;display:block;cursor:pointer"><div style="padding:10px 12px;font-size:11px"><b>${esc(p.album)}</b><span style="color:var(--muted);display:block">${esc(p.uploaded_by||'')} ${del('photos',p.id)}</span></div></div>`).join('')}</div>`:'<div class="card empty">Belum ada foto. Unggah foto pertama.</div>');
},
async pengumuman(){
  const a=await api('announcements');
  return hero('Pengumuman','Informasi penting untuk seluruh anggota keluarga.')+`<div class="card activity"><div class="card-head"><h3>Terbaru</h3>${admin()?'<button class="primary" onclick="annForm()">＋ Pengumuman</button>':''}</div>${a.map(x=>`<div class="activity-row"><div class="activity-icon">!</div><div class="activity-text" style="flex:1"><b>${esc(x.title)}</b><span>${esc(x.author)} • ${new Date(x.created_at).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})}</span></div>${del('announcements',x.id)}</div>`).join('')||'<div class="empty">Belum ada pengumuman.</div>'}</div>`;
},
async laporan(){
  const s=await api('summary');let run=0;
  const rows=s.months.map(m=>{run+=m.income-m.expense;return `<tr><td>${perLabel(m.m)}</td><td>${rp(m.income)}</td><td>${rp(m.expense)}</td><td class="money">${rp(run)}</td></tr>`}).reverse();
  return hero('Laporan','Ringkasan pemasukan dan pengeluaran per bulan.')+`<div class="card"><div class="card-head"><h3>Per periode</h3><button class="primary" onclick="print()">⇩ Cetak / simpan PDF</button></div>${tbl(['Periode','Pemasukan','Pengeluaran','Saldo akhir'],rows)}</div>`;
}};

/* ---------- aksi ---------- */
async function profile(id){
  const [mem,pay]=await Promise.all([api('members'),api('payments?period='+S.period)]);const m=mem.find(x=>x.id===id),p=mem.find(x=>x.id===m.parent_id);
  modal(`<div class="modal-top"><b>Profil keluarga</b><button class="close" onclick="closeModal()" aria-label="Tutup">×</button></div><div class="profile" style="margin-top:14px"><div class="avatar">${ini(m.name)}</div><h2>${esc(m.name)}</h2><p>${esc(m.relation||'')} • Generasi ${m.generation}</p></div><div class="detail-grid"><div class="detail"><span>Status arisan</span><b>${m.active&&m.is_participant?'✓ Peserta':'Tidak ikut'}</b></div><div class="detail"><span>Iuran ${perLabel(S.period)}</span><b>${pay.some(x=>x.member_id===id)?'Lunas':'Belum'}</b></div><div class="detail"><span>Orang tua</span><b>${esc(p?.name||'—')}</b></div><div class="detail"><span>Anggota sejak</span><b>${m.joined||'—'}</b></div></div>`);
}
async function memberForm(id){
  const mem=await api('members'),m=mem.find(x=>x.id===id)||{generation:1,is_participant:true,active:true,role:'member'};
  form(id?'Ubah anggota':'Tambah anggota',[{k:'name',l:'Nama lengkap',v:m.name},{k:'relation',l:'Hubungan (mis. Anak, Cucu)',v:m.relation},{k:'generation',l:'Generasi',t:'number',v:m.generation},{k:'parent_id',l:'Orang tua',t:'select',v:m.parent_id||'',o:[['','— tidak ada —'],...mem.filter(x=>x.id!==id).map(x=>[x.id,x.name])]},{k:'phone',l:'No. HP',v:m.phone},{k:'is_participant',l:'Peserta arisan',t:'check',v:m.is_participant},{k:'active',l:'Aktif',t:'check',v:m.active},{k:'role',l:'Peran',t:'select',v:m.role,o:[['member','Anggota'],['admin','Admin']]},{k:'username',l:'Username login (opsional)',v:m.username},{k:'password',l:id?'Password baru (kosongkan jika tidak diubah)':'Password (opsional, min. 8)',t:'password'}],
  async d=>{await api(id?'members?id='+id:'members',{m:id?'PUT':'POST',b:d});toast('Tersimpan');go('anggota')});
}
const roundForm=async()=>{const r=(await api('rounds')).find(x=>x.period===S.period)||{};form('Atur putaran '+perLabel(S.period),[{k:'fee',l:'Iuran per orang (Rp)',t:'number',v:r.fee},{k:'event_date',l:'Tanggal acara',t:'date',v:r.event_date},{k:'location',l:'Lokasi',v:r.location}],async d=>{await api('rounds',{m:'POST',b:{...d,period:S.period}});toast('Tersimpan');go('arisan')})};
const txForm=()=>form('Tambah transaksi',[{k:'date',l:'Tanggal',t:'date',v:new Date().toISOString().slice(0,10)},{k:'description',l:'Keterangan'},{k:'type',l:'Jenis',t:'select',o:[['out','Pengeluaran'],['in','Pemasukan']]},{k:'amount',l:'Nominal (Rp)',t:'number'}],async d=>{await api('transactions',{m:'POST',b:d});go('keuangan')});
const evForm=()=>form('Tambah agenda',[{k:'date',l:'Tanggal',t:'date'},{k:'title',l:'Kegiatan'},{k:'location',l:'Lokasi'}],async d=>{await api('events',{m:'POST',b:d});go('agenda')});
const annForm=()=>form('Tambah pengumuman',[{k:'title',l:'Isi pengumuman'}],async d=>{await api('announcements',{m:'POST',b:d});go('pengumuman')});
const shrink=f=>new Promise((ok,no)=>{const i=new Image();i.onload=()=>{const k=Math.min(1,1600/Math.max(i.width,i.height)),c=document.createElement('canvas');c.width=Math.round(i.width*k);c.height=Math.round(i.height*k);c.getContext('2d').drawImage(i,0,0,c.width,c.height);c.toBlob(b=>b?ok(b):no(new Error('Gagal memproses foto')),'image/jpeg',.82)};i.onerror=()=>no(new Error('Format foto tidak didukung'));i.src=URL.createObjectURL(f)});
function photoForm(){
  const albums=[...new Set((window._ph||[]).map(p=>p.album))];
  modal(`<div class="modal-top"><b>Unggah foto</b><button class="close" onclick="closeModal()" aria-label="Tutup">×</button></div><div style="margin-top:14px"><label for="p_al">Album</label><input id="p_al" list="albs" placeholder="mis. Arisan Oktober 2026" autocomplete="off"><datalist id="albs">${albums.map(a=>`<option value="${esc(a)}">`).join('')}</datalist><label for="p_f">Pilih foto (boleh banyak)</label><input id="p_f" type="file" accept="image/*" multiple><button class="primary" style="width:100%" id="p_btn">Unggah</button><div id="p_st" class="empty" style="padding:10px 0 0"></div></div>`);
  $('#p_btn').onclick=async()=>{const fs=[...$('#p_f').files];if(!fs.length)return toast('Pilih foto dulu');const al=$('#p_al').value.trim()||'Umum';$('#p_btn').disabled=true;let ok=0;
    for(const [i,f] of fs.entries()){$('#p_st').textContent='Mengunggah '+(i+1)+' dari '+fs.length+'…';
      try{const b=await shrink(f),r=await fetch('/api/photos?album='+encodeURIComponent(al),{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:b});if(!r.ok)throw new Error((await r.json().catch(()=>({}))).error||'Gagal');ok++}catch(e){toast(f.name+': '+e.message)}}
    closeModal();toast(ok+' foto terunggah');go('galeri')};
}
function lightbox(id){const p=window._ph.find(x=>x.id===id);modal(`<div class="modal-top"><b>${esc(p.album)}</b><button class="close" onclick="closeModal()" aria-label="Tutup">×</button></div><img src="${esc(p.url)}" alt="" style="width:100%;max-height:75vh;object-fit:contain;border-radius:14px;margin-top:12px">`,'min(900px,100%)')}
const pwForm=()=>form('Ganti password',[{k:'old',l:'Password lama',t:'password'},{k:'password',l:'Password baru (min. 8 karakter)',t:'password'}],async d=>{await api('auth',{m:'POST',b:{action:'password',...d}});toast('Password diganti')});
async function doDraw(){
  const btn=$('#dBtn'),nm=$('#dName');btn.disabled=true;
  const names=[...document.querySelectorAll('.pad span')].map(s=>s.textContent.replace('✓ ',''));
  const spin=setInterval(()=>nm.textContent=names[Math.floor(Math.random()*names.length)]||'…',90);
  try{const[res]=await Promise.all([api('draws',{m:'POST',b:{period:S.period}}),new Promise(r=>setTimeout(r,2500))]);clearInterval(spin);nm.textContent=res.winner;toast('Pemenang: '+res.winner);setTimeout(()=>go('pengocokan'),1800)}
  catch(e){clearInterval(spin);toast(e.message);go('pengocokan')}
}
boot().catch(e=>{document.body.innerHTML='<p style="padding:30px;font-family:sans-serif">Gagal memuat: '+esc(e.message)+'</p>'});
