-- FamilyHub — jalankan SEKALI di Supabase: SQL Editor -> New query -> paste -> Run
-- Aman dijalankan ulang (idempoten).

create table if not exists members(
  id serial primary key, name text not null, relation text,
  generation int default 1, parent_id int references members(id) on delete set null,
  phone text, joined int default extract(year from now())::int,
  active boolean default true, is_participant boolean default true,
  role text default 'member', username text unique, pw_hash text);

create table if not exists rounds(
  period text primary key, fee int not null default 0, event_date date, location text);

create table if not exists payments(
  id serial primary key, member_id int not null references members(id) on delete cascade,
  period text not null, amount int not null, paid_at timestamptz default now(),
  unique(member_id, period));

create table if not exists draws(
  id serial primary key, period text unique not null, cycle int not null,
  winner_id int references members(id) on delete set null, winner_name text,
  participants int, eligible jsonb, proof text, tx_id int,
  created_at timestamptz default now());

create table if not exists transactions(
  id serial primary key, date date not null default current_date, description text not null,
  type text not null check (type in ('in','out')), amount int not null check (amount > 0));

create table if not exists events(
  id serial primary key, date date not null, title text not null, location text);

create table if not exists announcements(
  id serial primary key, title text not null, author text, created_at timestamptz default now());

create table if not exists photos(
  id serial primary key, album text not null default 'Umum', url text not null,
  caption text, uploaded_by text, created_at timestamptz default now());

create table if not exists login_fails(
  key text primary key, n int not null default 1, first_at timestamptz not null default now());

-- KEAMANAN: Supabase membuka tabel schema public lewat REST API (anon key bersifat publik).
-- RLS tanpa policy = API publik tidak bisa membaca/menulis apa pun.
-- Aplikasi mengakses data lewat koneksi Postgres dari server (role postgres), yang tidak terhalang RLS.
alter table members       enable row level security;
alter table rounds        enable row level security;
alter table payments      enable row level security;
alter table draws         enable row level security;
alter table transactions  enable row level security;
alter table events        enable row level security;
alter table announcements enable row level security;
alter table photos        enable row level security;
alter table login_fails   enable row level security;

-- Bucket foto: publik untuk dibaca; unggah/hapus hanya lewat server (service role key)
insert into storage.buckets (id, name, public) values ('galeri', 'galeri', true)
on conflict (id) do nothing;
