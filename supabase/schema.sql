-- ===================================================
-- progress アプリケーション用 Supabase スキーマ定義
-- ===================================================

-- 1. レコード（活動・趣味の記録グループ）テーブル
create table if not exists public.records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid(),
  title text not null,
  description text default '',
  cover_image_url text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. 投稿（日々の活動・進捗ログ）テーブル
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.records(id) on delete cascade,
  user_id uuid default auth.uid(),
  content text not null,
  activity_minutes integer not null default 0,
  image_urls text[] default array[]::text[],
  likes_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- インデックス作成（検索・並び替えの高速化）
create index if not exists idx_records_user_id on public.records(user_id);
create index if not exists idx_records_created_at on public.records(created_at desc);
create index if not exists idx_posts_record_id on public.posts(record_id);
create index if not exists idx_posts_created_at on public.posts(created_at desc);

-- 3. Row Level Security (RLS) の有効化
alter table public.records enable row level security;
alter table public.posts enable row level security;

-- 開発用 / MVP用: 誰でも読み取り可能
create policy "Anyone can read records"
  on public.records for select
  using (true);

create policy "Anyone can insert records"
  on public.records for insert
  with check (true);

create policy "Anyone can update records"
  on public.records for update
  using (true);

create policy "Anyone can delete records"
  on public.records for delete
  using (true);

create policy "Anyone can read posts"
  on public.posts for select
  using (true);

create policy "Anyone can insert posts"
  on public.posts for insert
  with check (true);

create policy "Anyone can update posts"
  on public.posts for update
  using (true);

create policy "Anyone can delete posts"
  on public.posts for delete
  using (true);

-- 4. 画像アップロード用 Storage バケットの作成
insert into storage.buckets (id, name, public)
values ('progress-media', 'progress-media', true)
on conflict (id) do nothing;

create policy "Public Access to progress-media"
  on storage.objects for select
  using (bucket_id = 'progress-media');

create policy "Anyone can upload to progress-media"
  on storage.objects for insert
  with check (bucket_id = 'progress-media');

