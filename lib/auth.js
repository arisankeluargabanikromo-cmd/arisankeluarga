import crypto from 'node:crypto';

export const hash = (pw, salt = crypto.randomBytes(16).toString('hex')) =>
  salt + ':' + crypto.scryptSync(pw, salt, 32).toString('hex');

export const verify = (pw, h) => {
  if (!h) return false;
  const [s, k] = h.split(':');
  const a = Buffer.from(k, 'hex'), b = crypto.scryptSync(pw, s, 32);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const sign = p => crypto.createHmac('sha256', process.env.AUTH_SECRET).update(p).digest('base64url');

export const makeToken = id => {
  const p = Buffer.from(JSON.stringify({ id, exp: Date.now() + 6048e5 })).toString('base64url');
  return p + '.' + sign(p);
};

export const readToken = req => {
  const m = (req.headers.cookie || '').match(/(?:^|;\s*)fh=([^;]+)/);
  if (!m || !process.env.AUTH_SECRET) return null;
  const [p, s] = m[1].split('.');
  if (!p || !s) return null;
  const e = sign(p);
  if (e.length !== s.length || !crypto.timingSafeEqual(Buffer.from(e), Buffer.from(s))) return null;
  const d = JSON.parse(Buffer.from(p, 'base64url'));
  return d.exp > Date.now() ? d.id : null;
};
