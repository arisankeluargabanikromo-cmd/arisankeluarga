import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const BUCKET = 'galeri'; // dibuat oleh supabase/schema.sql (bucket publik)
let sb;
const client = () =>
  (sb ??= createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }));

export const storageReady = () => !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function uploadPhoto(buf) {
  const path = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.jpg`; // nama acak
  const { error } = await client().storage.from(BUCKET).upload(path, buf, { contentType: 'image/jpeg' });
  if (error) throw error;
  return client().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function deletePhoto(url) {
  const path = decodeURIComponent(url.split(`/${BUCKET}/`)[1] || '');
  if (path) await client().storage.from(BUCKET).remove([path]).catch(() => {});
}
