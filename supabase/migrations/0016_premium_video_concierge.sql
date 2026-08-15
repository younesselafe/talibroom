-- ─── Migration 0016: Premium Video & Concierge ───────────────────────────────
--
-- 1. Video URL columns on messages and posts
-- 2. Daily video count tracked via video_url column on messages
-- 3. Concierge tables: requests → offers → offer_items
-- 4. RLS for all concierge tables
-- 5. Storage buckets for videos and concierge images

-- ─── 1. Video columns ────────────────────────────────────────────────────────

alter table public.messages   add column if not exists video_url text;
alter table public.posts      add column if not exists video_url text;
-- apartments already has video_url from schema 0001

-- ─── 2. Concierge requests (premium users submit) ────────────────────────────

create table if not exists public.concierge_requests (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  city         text        not null,
  budget_min   numeric,
  budget_max   numeric,
  rooms        integer,
  move_in_date date,
  notes        text,
  status       text        not null default 'pending'
                           check (status in ('pending', 'fulfilled', 'cancelled')),
  created_at   timestamptz not null default now()
);

-- ─── 3. Concierge offers (admin fulfills a request) ──────────────────────────

create table if not exists public.concierge_offers (
  id          uuid        primary key default gen_random_uuid(),
  request_id  uuid        not null references public.concierge_requests(id) on delete cascade,
  admin_id    uuid        not null references auth.users(id),
  title       text        not null,
  description text,
  created_at  timestamptz not null default now()
);

-- ─── 4. Concierge offer items (≤ 10 per offer) ───────────────────────────────

create table if not exists public.concierge_offer_items (
  id            uuid        primary key default gen_random_uuid(),
  offer_id      uuid        not null references public.concierge_offers(id) on delete cascade,
  title         text,
  city          text,
  address       text,
  price         numeric,
  rooms         integer,
  realtor_name  text,
  realtor_phone text,
  image_urls    text[]      not null default '{}',
  video_url     text,
  notes         text,
  sort_order    integer     not null default 0,
  created_at    timestamptz not null default now()
);

-- ─── 5. RLS ──────────────────────────────────────────────────────────────────

alter table public.concierge_requests   enable row level security;
alter table public.concierge_offers     enable row level security;
alter table public.concierge_offer_items enable row level security;

-- Helper: is the caller an admin?
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

-- Helper: is the caller premium?
create or replace function public.is_premium()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select is_premium from public.profiles where id = auth.uid()),
    false
  );
$$;

-- concierge_requests
drop policy if exists "cr_user_select"   on public.concierge_requests;
drop policy if exists "cr_premium_insert" on public.concierge_requests;
drop policy if exists "cr_admin_select"  on public.concierge_requests;
drop policy if exists "cr_admin_update"  on public.concierge_requests;

create policy "cr_user_select" on public.concierge_requests
  for select using (auth.uid() = user_id or public.is_admin());

create policy "cr_premium_insert" on public.concierge_requests
  for insert with check (auth.uid() = user_id and public.is_premium());

create policy "cr_admin_update" on public.concierge_requests
  for update using (public.is_admin());

-- concierge_offers
drop policy if exists "co_select" on public.concierge_offers;
drop policy if exists "co_admin_insert" on public.concierge_offers;
drop policy if exists "co_admin_update" on public.concierge_offers;
drop policy if exists "co_admin_delete" on public.concierge_offers;

create policy "co_select" on public.concierge_offers
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.concierge_requests
      where id = request_id and user_id = auth.uid()
    )
  );

create policy "co_admin_insert" on public.concierge_offers
  for insert with check (auth.uid() = admin_id and public.is_admin());

create policy "co_admin_update" on public.concierge_offers
  for update using (public.is_admin());

create policy "co_admin_delete" on public.concierge_offers
  for delete using (public.is_admin());

-- concierge_offer_items
drop policy if exists "coi_select" on public.concierge_offer_items;
drop policy if exists "coi_admin_insert" on public.concierge_offer_items;
drop policy if exists "coi_admin_update" on public.concierge_offer_items;
drop policy if exists "coi_admin_delete" on public.concierge_offer_items;

create policy "coi_select" on public.concierge_offer_items
  for select using (
    public.is_admin()
    or exists (
      select 1
      from public.concierge_offers co
      join public.concierge_requests cr on co.request_id = cr.id
      where co.id = offer_id and cr.user_id = auth.uid()
    )
  );

create policy "coi_admin_insert" on public.concierge_offer_items
  for insert with check (public.is_admin());

create policy "coi_admin_update" on public.concierge_offer_items
  for update using (public.is_admin());

create policy "coi_admin_delete" on public.concierge_offer_items
  for delete using (public.is_admin());

-- ─── 6. Realtime for concierge (user sees new offers instantly) ──────────────

do $$
begin
  perform pg_catalog.set_config('search_path', 'public', false);
  -- Only add if realtime publication exists
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.concierge_requests;
    alter publication supabase_realtime add table public.concierge_offers;
    alter publication supabase_realtime add table public.concierge_offer_items;
  end if;
exception when others then null;
end $$;

-- ─── 7. Storage buckets (run separately in Supabase dashboard if needed) ─────
-- Bucket "videos" for all video uploads (chat, community, apartment, concierge)
-- Bucket "concierge-images" for admin-uploaded offer item images
-- These are created via SQL below using Supabase storage schema:

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('videos',            'videos',            true, 104857600, -- 100 MB
   array['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v']),
  ('concierge-images',  'concierge-images',  true, 10485760,  -- 10 MB
   array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Storage RLS for videos bucket
create policy "videos_public_read" on storage.objects
  for select using (bucket_id = 'videos');

create policy "videos_auth_insert" on storage.objects
  for insert with check (
    bucket_id = 'videos'
    and auth.role() = 'authenticated'
  );

create policy "videos_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'videos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage RLS for concierge-images bucket
create policy "concierge_images_public_read" on storage.objects
  for select using (bucket_id = 'concierge-images');

create policy "concierge_images_admin_insert" on storage.objects
  for insert with check (
    bucket_id = 'concierge-images'
    and public.is_admin()
  );

create policy "concierge_images_admin_delete" on storage.objects
  for delete using (
    bucket_id = 'concierge-images'
    and public.is_admin()
  );
