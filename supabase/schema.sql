-- progress shared Guest demo schema.
-- Public reads are allowed; all writes go through the shared-api Edge Function.

create table if not exists public.profiles (
  id uuid primary key,
  name text not null default 'Guest',
  avatar_url text default 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=120&h=120&q=80',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '',
  cover_image_url text not null default '',
  started_at date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.records(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  image_urls text[] not null default array[]::text[],
  activity_minutes integer not null default 0 check (activity_minutes between 0 and 1440),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.posts
  add column if not exists likes_count integer not null default 0;

create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  visitor_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (post_id, visitor_id)
);

-- Migrate projects created with the earlier authenticated-user schema.
alter table public.profiles drop constraint if exists profiles_id_fkey;
alter table public.records add column if not exists started_at date;
update public.records set started_at = created_at::date where started_at is null;
alter table public.records alter column started_at set default current_date;
alter table public.records alter column started_at set not null;

insert into public.profiles (id, name)
values ('00000000-0000-4000-8000-000000000001', 'Guest')
on conflict (id) do update set name = excluded.name;

create index if not exists idx_records_user_id_created_at
  on public.records(user_id, created_at desc);
create index if not exists idx_posts_record_id_created_at
  on public.posts(record_id, created_at desc);
create index if not exists idx_posts_created_at
  on public.posts(created_at desc);

alter table public.profiles enable row level security;
alter table public.records enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;

do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles', 'records', 'posts')
  loop
    execute format(
      'drop policy %I on public.%I',
      existing_policy.policyname,
      existing_policy.tablename
    );
  end loop;
end;
$$;

create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (true);
create policy "Records are viewable by everyone"
  on public.records for select using (true);
create policy "Posts are viewable by everyone"
  on public.posts for select using (true);

revoke all on table public.post_likes from anon, authenticated;
grant all on table public.post_likes to service_role;

drop trigger if exists on_auth_user_created on auth.users;

insert into storage.buckets (id, name, public)
values ('progress-media', 'progress-media', true)
on conflict (id) do update set public = true;

drop policy if exists "Public Access to progress-media" on storage.objects;
drop policy if exists "Authenticated users can upload media" on storage.objects;
drop policy if exists "Users can delete their own media" on storage.objects;

create policy "Public Access to progress-media"
  on storage.objects for select using (bucket_id = 'progress-media');

create table if not exists public.guest_api_rate_limits (
  ip_hash text primary key,
  window_started_at timestamptz not null,
  request_count integer not null
);
alter table public.guest_api_rate_limits enable row level security;

create or replace function public.consume_guest_api_rate_limit(
  p_ip_hash text,
  p_max_requests integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_count integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'not authorized';
  end if;

  if random() < 0.01 then
    delete from public.guest_api_rate_limits
    where window_started_at < now() - interval '1 day';
  end if;

  insert into public.guest_api_rate_limits (ip_hash, window_started_at, request_count)
  values (p_ip_hash, now(), 1)
  on conflict (ip_hash) do update
  set
    window_started_at = case
      when guest_api_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds)
      then now()
      else guest_api_rate_limits.window_started_at
    end,
    request_count = case
      when guest_api_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds)
      then 1
      else guest_api_rate_limits.request_count + 1
    end
  returning request_count into current_count;

  return current_count <= p_max_requests;
end;
$$;

revoke all on table public.guest_api_rate_limits from anon, authenticated;
grant all on table public.guest_api_rate_limits to service_role;
revoke all on function public.consume_guest_api_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_guest_api_rate_limit(text, integer, integer)
  to service_role;

create or replace function public.update_post_likes_count()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts
    set likes_count = likes_count + 1
    where id = new.post_id;
    return new;
  end if;

  update public.posts
  set likes_count = greatest(0, likes_count - 1)
  where id = old.post_id;
  return old;
end;
$$;

drop trigger if exists update_post_likes_count on public.post_likes;
create trigger update_post_likes_count
  after insert or delete on public.post_likes
  for each row execute function public.update_post_likes_count();

update public.posts p
set likes_count = (
  select count(*)::integer
  from public.post_likes l
  where l.post_id = p.id
)
where p.likes_count <> (
  select count(*)::integer
  from public.post_likes l
  where l.post_id = p.id
);

create or replace function public.get_guest_post_like_states(p_visitor_id uuid)
returns table (post_id uuid, like_count bigint, is_liked boolean)
language sql
security definer
set search_path = public, pg_temp
as $$
  select
    p.id,
    count(l.visitor_id),
    coalesce(bool_or(l.visitor_id = p_visitor_id), false)
  from public.posts p
  left join public.post_likes l on l.post_id = p.id
  group by p.id;
$$;

create or replace function public.toggle_guest_post_like(
  p_post_id uuid,
  p_visitor_id uuid
)
returns table (is_liked boolean, like_count bigint)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  already_liked boolean;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'not authorized';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_post_id::text || ':' || p_visitor_id::text, 0)
  );

  select exists (
    select 1
    from public.posts p
    where p.id = p_post_id
  ) into already_liked;
  if not already_liked then
    raise exception 'post not found';
  end if;

  select exists (
    select 1
    from public.post_likes l
    where l.post_id = p_post_id
      and l.visitor_id = p_visitor_id
  ) into already_liked;

  if already_liked then
    delete from public.post_likes
    where post_id = p_post_id and visitor_id = p_visitor_id;
  else
    insert into public.post_likes (post_id, visitor_id)
    values (p_post_id, p_visitor_id);
  end if;

  return query
    select
      exists (
        select 1 from public.post_likes l
        where l.post_id = p_post_id and l.visitor_id = p_visitor_id
      ),
      p.likes_count::bigint
    from public.posts p
    where p.id = p_post_id;
end;
$$;

revoke all on function public.get_guest_post_like_states(uuid)
  from public, anon, authenticated;
revoke all on function public.toggle_guest_post_like(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.get_guest_post_like_states(uuid)
  to service_role;
grant execute on function public.toggle_guest_post_like(uuid, uuid)
  to service_role;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'records'
    ) then
      alter publication supabase_realtime add table public.records;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'posts'
    ) then
      alter publication supabase_realtime add table public.posts;
    end if;
  end if;
end;
$$;
