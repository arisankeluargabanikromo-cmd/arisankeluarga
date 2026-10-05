/* Aksi: form tambah/ubah, galeri, pengundian */
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
