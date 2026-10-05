import pg from 'pg';

// Gunakan connection string "Transaction pooler" Supabase (port 6543) — wajib untuk Vercel (IPv4).
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1, // 1 koneksi per instance serverless; pooler Supabase yang membagi koneksi
  idleTimeoutMillis: 10000,
});

// sql`select ... where id=${id}`  -> nilai selalu dikirim sebagai parameter (aman dari SQL injection)
// sql.query('select ... $1', [nilai]) untuk query dinamis. Keduanya mengembalikan array baris.
export const sql = Object.assign(
  (strings, ...vals) =>
    pool.query(strings.reduce((a, s, i) => a + (i ? '$' + i : '') + s, ''), vals).then(r => r.rows),
  { query: (text, params) => pool.query(text, params).then(r => r.rows) }
);
