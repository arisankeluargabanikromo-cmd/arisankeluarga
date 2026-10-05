import crypto from 'node:crypto';

export const hash = (pw, salt = crypto.randomBytes(16).toString('hex')) =>
  salt + ':' + crypto.scryptSync(pw, salt, 32).toString('hex');

export const verify = (pw, h) => {
  if (!h) return false;
  const [s, k] = h.split(':');
  const a = Buffer.from(k, 'hex'), b = crypto.scryptSync(pw, s, 32);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

// AUTH_SECRET bersifat opsional. Jika kosong, kunci sesi diturunkan dari DATABASE_URL (yang juga rahasia).
const secret = () => process.env.AUTH_SECRET || crypto.createHash('sha256').update('familyhub:' + process.env.DATABASE_URL).digest('hex');
const sign = p => crypto.createHmac('sha256', secret()).update(p).digest('base64url');

// Pengaturan awal: pemilik membuktikan diri dengan password database Supabase (bagian dari DATABASE_URL).
// Tidak perlu membuat variabel tambahan di Vercel.
export const setupKeyOk = k => {
  let pw;
  try { pw = decodeURIComponent(new URL(process.env.DATABASE_URL).password); } catch { return false; }
  const h = x => crypto.createHash('sha256').update(String(x)).digest();
  return !!pw && crypto.timingSafeEqual(h(pw), h(k || ''));
};

export const makeToken = id => {
  const p = Buffer.from(JSON.stringify({ id, exp: Date.now() + 6048e5 })).toString('base64url');
  return p + '.' + sign(p);
};

export const readToken = req => {
  const m = (req.headers.cookie || '').match(/(?:^|;\s*)fh=([^;]+)/);
  if (!m) return null;
  const [p, s] = m[1].split('.');
  if (!p || !s) return null;
  const e = sign(p);
  if (e.length !== s.length || !crypto.timingSafeEqual(Buffer.from(e), Buffer.from(s))) return null;
  const d = JSON.parse(Buffer.from(p, 'base64url'));
  return d.exp > Date.now() ? d.id : null;
};
