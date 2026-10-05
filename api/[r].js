import crypto from 'node:crypto';
import { put, del } from '@vercel/blob';
import { sql, hash, verify, makeToken, readToken, migrate } from '../lib.js';

const send = (res, d, c = 200) => res.status(c).json(d);
const MEMBER_COLS = `id,name,relation,generation,parent_id,phone,joined,active,is_participant,role,username`;
const num = v => Math.max(0, parseInt(v, 10) || 0);
const periodOk = p => /^\d{4}-(0[1-9]|1[0-2])$/.test(p || '');
const nowPeriod = () => new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 7); // WIB

async function eligibility(period) {
  const parts = await sql`select id,name from members where active and is_participant order by id`;
  const paid = new Set((await sql`select member_id from payments where period=${period}`).map(x => x.member_id));
  let cycle = (await sql`select coalesce(max(cycle),1) c from draws`)[0].c;
  const won = new Set((await sql`select winner_id from draws where cycle=${cycle}`).map(x => x.winner_id));
  if (parts.length && parts.every(p => won.has(p.id))) { cycle++; won.clear(); } // semua sudah menang: siklus baru
  return { cycle, eligible: parts.filter(p => paid.has(p.id) && !won.has(p.id)), total: parts.length };
}

let ready;
const ensure = () => (ready ??= migrate().catch(e => { ready = null; throw e; })); // skema selalu mutakhir

async function auth(req, res) {
  const { method: m, body: b = {} } = req;
  if (m === 'GET') {
    try {
      const admins = await sql`select 1 from members where role='admin' and pw_hash is not null limit 1`;
      if (!admins.length) return send(res, { needSetup: true });
    } catch { return send(res, { needSetup: true }); }
    const id = readToken(req);
    const u = id && (await sql`select id,name,role from members where id=${id} and active`)[0];
    return send(res, { user: u || null });
  }
  if (m !== 'POST') return send(res, { error: 'Method tidak didukung' }, 405);
  if (b.action === 'logout') {
    res.setHeader('Set-Cookie', 'fh=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');
    return send(res, { ok: true });
  }
  const setCookie = id => res.setHeader('Set-Cookie', `fh=${makeToken(id)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`);
  if (b.action === 'setup') {
    if (!process.env.SETUP_KEY || b.key !== process.env.SETUP_KEY) return send(res, { error: 'Kunci setup salah' }, 403);
    if (!b.name || !b.username || (b.password || '').length < 8) return send(res, { error: 'Nama, username, dan password (min. 8 karakter) wajib diisi' }, 400);
    await migrate();
    if ((await sql`select 1 from members where role='admin' limit 1`).length) return send(res, { error: 'Admin sudah ada' }, 409);
    const [u] = await sql`insert into members(name,relation,generation,role,username,pw_hash) values(${b.name},'Kepala keluarga',1,'admin',${b.username.toLowerCase()},${hash(b.password)}) returning id`;
    setCookie(u.id);
    return send(res, { ok: true });
  }
  if (b.action === 'password') {
    const id = readToken(req);
    const [u] = id ? await sql`select pw_hash from members where id=${id} and active` : [];
    if (!u) return send(res, { error: 'Silakan login' }, 401);
    if (!verify(String(b.old || ''), u.pw_hash)) return send(res, { error: 'Password lama salah' }, 400);
    if ((b.password || '').length < 8) return send(res, { error: 'Password baru minimal 8 karakter' }, 400);
    await sql`update members set pw_hash=${hash(b.password)} where id=${id}`;
    return send(res, { ok: true });
  }
  // login, dibatasi 5 kali gagal per username+IP dalam 15 menit
  const un = String(b.username || '').toLowerCase().slice(0, 60);
  const key = un + '|' + ((req.headers['x-forwarded-for'] || '').split(',')[0].trim() || '?');
  const [f] = await sql`select n from login_fails where key=${key} and first_at > now() - interval '15 minutes'`;
  if (f?.n >= 5) return send(res, { error: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.' }, 429);
  const [u] = await sql`select id,pw_hash,active from members where username=${un}`;
  if (!u || !u.active || !verify(String(b.password || ''), u.pw_hash)) {
    await sql`insert into login_fails(key) values(${key}) on conflict(key) do update set
      n = case when login_fails.first_at > now() - interval '15 minutes' then login_fails.n + 1 else 1 end,
      first_at = case when login_fails.first_at > now() - interval '15 minutes' then login_fails.first_at else now() end`;
    await new Promise(r => setTimeout(r, 600));
    return send(res, { error: 'Username atau password salah' }, 401);
  }
  await sql`delete from login_fails where key=${key}`;
  setCookie(u.id);
  return send(res, { ok: true });
}

export default async function handler(req, res) {
  const { r, id, period } = req.query;
  const m = req.method, b = req.body || {};
  try {
    await ensure();
    if (r === 'auth') return await auth(req, res);

    const uid = readToken(req);
    const me = uid && (await sql`select id,name,role from members where id=${uid} and active`)[0];
    if (!me) return send(res, { error: 'Silakan login' }, 401);
    if (m !== 'GET' && me.role !== 'admin' && !(r === 'photos' && m === 'POST')) return send(res, { error: 'Hanya admin yang dapat mengubah data' }, 403);

    switch (r) {
      case 'members': {
        if (m === 'GET') return send(res, await sql.query(`select ${MEMBER_COLS} from members order by generation, name`));
        if (m === 'DELETE') {
          if (+id === me.id) return send(res, { error: 'Tidak dapat menghapus akun sendiri' }, 400);
          await sql`delete from members where id=${id}`; return send(res, { ok: true });
        }
        if (!b.name?.trim()) return send(res, { error: 'Nama wajib diisi' }, 400);
        const pid = b.parent_id ? +b.parent_id : null;
        if (m === 'PUT' && pid === +id) return send(res, { error: 'Orang tua tidak boleh diri sendiri' }, 400);
        const un = b.username ? b.username.trim().toLowerCase() : null;
        const ph = b.password ? hash(b.password) : null;
        if (b.password && b.password.length < 8) return send(res, { error: 'Password minimal 8 karakter' }, 400);
        const role = b.role === 'admin' ? 'admin' : 'member';
        try {
          if (m === 'POST') {
            const [x] = await sql`insert into members(name,relation,generation,parent_id,phone,is_participant,active,role,username,pw_hash) values(${b.name.trim()},${b.relation || null},${num(b.generation) || 1},${pid},${b.phone || null},${b.is_participant !== false},${b.active !== false},${role},${un},${ph}) returning id`;
            return send(res, x, 201);
          }
          await sql`update members set name=${b.name.trim()},relation=${b.relation || null},generation=${num(b.generation) || 1},parent_id=${pid},phone=${b.phone || null},is_participant=${b.is_participant !== false},active=${b.active !== false},role=${role},username=${un},pw_hash=coalesce(${ph},pw_hash) where id=${id}`;
          return send(res, { ok: true });
        } catch (e) {
          if (String(e.message).includes('unique')) return send(res, { error: 'Username sudah dipakai' }, 409);
          throw e;
        }
      }
      case 'rounds': {
        if (m === 'GET') return send(res, await sql`select period,fee,to_char(event_date,'YYYY-MM-DD') event_date,location from rounds order by period desc`);
        if (!periodOk(b.period)) return send(res, { error: 'Periode tidak valid' }, 400);
        await sql`insert into rounds(period,fee,event_date,location) values(${b.period},${num(b.fee)},${b.event_date || null},${b.location || null}) on conflict(period) do update set fee=excluded.fee,event_date=excluded.event_date,location=excluded.location`;
        return send(res, { ok: true });
      }
      case 'payments': {
        if (m === 'GET') return send(res, await sql`select id,member_id,period,amount,paid_at from payments where period=${period || nowPeriod()}`);
        if (m === 'DELETE') { await sql`delete from payments where id=${id}`; return send(res, { ok: true }); }
        if (!periodOk(b.period) || !b.member_id) return send(res, { error: 'Data tidak lengkap' }, 400);
        const [rd] = await sql`select fee from rounds where period=${b.period}`;
        const amount = num(b.amount) || rd?.fee || 0;
        if (!amount) return send(res, { error: 'Atur iuran putaran ini dulu' }, 400);
        await sql`insert into payments(member_id,period,amount) values(${b.member_id},${b.period},${amount}) on conflict(member_id,period) do nothing`;
        return send(res, { ok: true }, 201);
      }
      case 'draws': {
        if (m === 'GET') {
          const p = period || nowPeriod();
          const e = await eligibility(p);
          const history = await sql`select id,period,cycle,winner_name,participants,proof,created_at from draws order by created_at desc`;
          return send(res, { ...e, done: history.some(h => h.period === p), history });
        }
        if (m === 'DELETE') {
          const [d] = await sql`delete from draws where id=${id} returning tx_id`;
          if (d?.tx_id) await sql`delete from transactions where id=${d.tx_id}`; // batalkan pencatatan hadiahnya juga
          return send(res, { ok: true });
        }
        if (!periodOk(b.period)) return send(res, { error: 'Periode tidak valid' }, 400);
        const { cycle, eligible } = await eligibility(b.period);
        if (!eligible.length) return send(res, { error: 'Belum ada peserta eligible (harus aktif, sudah bayar, dan belum menang di siklus ini)' }, 400);
        const w = eligible[crypto.randomInt(eligible.length)]; // CSPRNG di server, bukan di browser
        const proof = crypto.createHash('sha256').update(JSON.stringify({ p: b.period, e: eligible.map(x => x.id), w: w.id, t: Date.now() })).digest('hex');
        const ins = await sql`insert into draws(period,cycle,winner_id,winner_name,participants,eligible,proof) values(${b.period},${cycle},${w.id},${w.name},${eligible.length},${JSON.stringify(eligible.map(x => x.name))},${proof}) on conflict(period) do nothing returning id`;
        if (!ins.length) return send(res, { error: 'Putaran ini sudah diundi' }, 409);
        const pot = (await sql`select coalesce(sum(amount),0)::int s from payments where period=${b.period}`)[0].s;
        if (pot > 0) {
          const [tx] = await sql`insert into transactions(description,type,amount) values(${'Hadiah arisan ' + b.period + ' - ' + w.name},'out',${pot}) returning id`;
          await sql`update draws set tx_id=${tx.id} where id=${ins[0].id}`;
        }
        return send(res, { winner: w.name, participants: eligible.length, proof, pot }, 201);
      }
      case 'transactions':
        if (m === 'GET') return send(res, await sql`select id,to_char(date,'YYYY-MM-DD') date,description,type,amount from transactions order by date desc,id desc limit 200`);
        if (m === 'DELETE') { await sql`delete from transactions where id=${id}`; return send(res, { ok: true }); }
        if (!b.description?.trim() || !num(b.amount) || !['in', 'out'].includes(b.type)) return send(res, { error: 'Keterangan, jenis, dan nominal wajib diisi' }, 400);
        await sql`insert into transactions(date,description,type,amount) values(${b.date || new Date().toISOString().slice(0, 10)},${b.description.trim()},${b.type},${num(b.amount)})`;
        return send(res, { ok: true }, 201);
      case 'events':
        if (m === 'GET') return send(res, await sql`select id,to_char(date,'YYYY-MM-DD') date,title,location from events order by date`);
        if (m === 'DELETE') { await sql`delete from events where id=${id}`; return send(res, { ok: true }); }
        if (!b.title?.trim() || !b.date) return send(res, { error: 'Judul dan tanggal wajib diisi' }, 400);
        await sql`insert into events(date,title,location) values(${b.date},${b.title.trim()},${b.location || null})`;
        return send(res, { ok: true }, 201);
      case 'announcements':
        if (m === 'GET') return send(res, await sql`select id,title,author,created_at from announcements order by created_at desc limit 50`);
        if (m === 'DELETE') { await sql`delete from announcements where id=${id}`; return send(res, { ok: true }); }
        if (!b.title?.trim()) return send(res, { error: 'Isi pengumuman wajib diisi' }, 400);
        await sql`insert into announcements(title,author) values(${b.title.trim()},${me.name})`;
        return send(res, { ok: true }, 201);
      case 'photos': {
        if (m === 'GET') return send(res, await sql`select id,album,url,uploaded_by,created_at from photos order by created_at desc limit 300`);
        if (m === 'DELETE') {
          const [p] = await sql`delete from photos where id=${id} returning url`;
          if (p) await del(p.url).catch(() => {});
          return send(res, { ok: true });
        }
        const buf = req.body;
        if (!process.env.BLOB_READ_WRITE_TOKEN) return send(res, { error: 'Vercel Blob belum dihubungkan ke project' }, 500);
        if (!Buffer.isBuffer(buf) || buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return send(res, { error: 'File harus berupa foto JPEG' }, 400);
        if (buf.length > 4 * 1024 * 1024) return send(res, { error: 'Foto terlalu besar (maks. 4 MB)' }, 413);
        const album = String(req.query.album || 'Umum').trim().slice(0, 60) || 'Umum';
        const bl = await put(`galeri/${Date.now()}.jpg`, buf, { access: 'public', contentType: 'image/jpeg', addRandomSuffix: true });
        await sql`insert into photos(album,url,uploaded_by) values(${album},${bl.url},${me.name})`;
        return send(res, { ok: true }, 201);
      }
      case 'summary': {
        const months = await sql`select m, sum(i)::float8 income, sum(o)::float8 expense from (
          select to_char(paid_at at time zone 'Asia/Jakarta','YYYY-MM') m, amount i, 0 o from payments
          union all select to_char(date,'YYYY-MM'), case when type='in' then amount else 0 end, case when type='out' then amount else 0 end from transactions
        ) t group by m order by m`;
        return send(res, { me, period: nowPeriod(), months });
      }
      default: return send(res, { error: 'Tidak ditemukan' }, 404);
    }
  } catch (e) {
    console.error(e);
    return send(res, { error: 'Terjadi kesalahan server' }, 500);
  }
}
