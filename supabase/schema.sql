-- ==============================================================================
-- progress: Supabase Database & Storage Schema
-- ==============================================================================

-- 1. profiles テーブル（ユーザープロフィール）
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'guest user',
  avatar_url text default 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=120&h=120&q=80',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. records テーブル（趣味・活動テーマ）
create table if not exists public.records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) > 0),
  description text default '',
  cover_image_url text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. posts テーブル（日々の進捗投稿ログ）
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.records(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  image_urls text[] default array[]::text[],
  activity_minutes integer not null default 0 check (activity_minutes >= 0),
  likes_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ==============================================================================
-- インデックス作成（検索・フィード表示の高速化）
-- ==============================================================================
create index if not exists idx_records_user_id_created_at on public.records(user_id, created_at desc);
create index if not exists idx_posts_record_id_created_at on public.posts(record_id, created_at desc);
create index if not exists idx_posts_created_at on public.posts(created_at desc);

-- ==============================================================================
-- Row Level Security (RLS) の設定
-- ==============================================================================
alter table public.profiles enable row level security;
alter table public.records enable row level security;
alter table public.posts enable row level security;

-- 閲覧（SELECT）: 全員公開（SNSフィード）
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Records are viewable by everyone"
  on public.records for select
  using (true);

create policy "Posts are viewable by everyone"
  on public.posts for select
  using (true);

-- 作成・更新・削除: 認証済みユーザー（本人のデータのみ操作可能）
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert their own records"
  on public.records for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own records"
  on public.records for update
  using (auth.uid() = user_id);

create policy "Users can delete their own records"
  on public.records for delete
  using (auth.uid() = user_id);

create policy "Users can insert their own posts"
  on public.posts for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own posts"
  on public.posts for update
  using (auth.uid() = user_id);

create policy "Users can delete their own posts"
  on public.posts for delete
  using (auth.uid() = user_id);

-- ==============================================================================
-- 新規ユーザー登録時に自動で profiles レコードを作成するトリガー
-- ==============================================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'guest user'),
    coalesce(new.raw_user_meta_data->>'avatar_url', 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=120&h=120&q=80')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ==============================================================================
-- 画像保存用 Storage バケット（progress-media）の作成とポリシー
-- ==============================================================================
insert into storage.buckets (id, name, public)
values ('progress-media', 'progress-media', true)
on conflict (id) do update set public = true;

-- 画像の誰でも閲覧許可
create policy "Public Access to progress-media"
  on storage.objects for select
  using (bucket_id = 'progress-media');

-- 認証ユーザーによるアップロード許可
create policy "Authenticated users can upload media"
  on storage.objects for insert
  with check (
    bucket_id = 'progress-media'
    and auth.role() = 'authenticated'
  );

-- 本人の画像削除許可
create policy "Users can delete their own media"
  on storage.objects for delete
  using (
    bucket_id = 'progress-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
