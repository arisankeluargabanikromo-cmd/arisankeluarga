/* Helper umum: DOM, format, API client, modal & form */
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

