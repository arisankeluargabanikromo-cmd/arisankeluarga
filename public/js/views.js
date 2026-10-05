/* Navigasi dan tampilan tiap halaman */
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

