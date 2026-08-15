-- ════════════════════════════════════════════════════════════════════════
--  TalibRoom — 0021  Audit fixes
--
--  Server-side enforcement + scaling fixes from the June 2026 audit:
--   A1 — links: real unique-pair constraint (the code already defends
--        against it; the constraint never existed)
--   A2 — notifications: client inserts restricted to admins; CHECK gains
--        'concierge_fulfilled' (AdminPage already sends it and it fails)
--   A3 — premium expiry: premium_expires_at column; is_premium() honours it
--   A4 — apartments: privileged columns (is_premium / owner_type) guarded
--   A5 — blocked_users table wired into links + messages RLS
--   A6 — daily limits enforced in the database (were client-side only)
--   A7 — realtor listings premium-gated in RLS (was client-side only)
--   A8 — favorites table (persistent shortlist)
--   A9 — get_link_summaries() RPC: inbox previews/unread without
--        downloading entire message histories
--   A10 — storage: per-user path rule for the videos + receipts buckets
--   A11 — supporting indexes
--  Run AFTER 0020. Idempotent.
-- ════════════════════════════════════════════════════════════════════════

-- ─── A1  links unique pair ────────────────────────────────────────────────
-- Deduplicate any existing pairs first (keep the oldest thread; messages on
-- the duplicates are re-pointed at the survivor before the dupes are deleted).
do $$
declare dup record;
begin
  for dup in
    select least(sender_id, receiver_id) a, greatest(sender_id, receiver_id) b,
           (array_agg(id order by created_at))[1] keep_id,
           array_remove(array_agg(id order by created_at), (array_agg(id order by created_at))[1]) drop_ids
    from public.links
    group by 1, 2
    having count(*) > 1
  loop
    update public.messages set link_id = dup.keep_id where link_id = any(dup.drop_ids);
    update public.notifications set link_id = dup.keep_id where link_id = any(dup.drop_ids);
    delete from public.conversation_reads where link_id = any(dup.drop_ids);
    delete from public.links where id = any(dup.drop_ids);
  end loop;
end $$;

create unique index if not exists links_unique_pair
  on public.links (least(sender_id, receiver_id), greatest(sender_id, receiver_id));

-- ─── A2  notifications hardening ─────────────────────────────────────────
-- All organic notifications come from SECURITY DEFINER triggers (which run
-- as the table owner and bypass RLS). The only legitimate client insert is
-- the admin concierge-fulfilled notice — so restrict the policy to admins.
-- Previously any user could insert arbitrary "system" text into anyone's
-- notification feed (in-app phishing vector).
drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications
  for insert with check (public.is_admin());

-- The CHECK from 0001 was missing 'concierge_fulfilled' — the admin
-- notification has been silently failing its constraint.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.notifications'::regclass and contype = 'c'
  loop
    execute format('alter table public.notifications drop constraint %I', c.conname);
  end loop;
  alter table public.notifications add constraint notifications_type_chk
    check (type in (
      'link_request','link_accepted','new_message','post_like','post_comment',
      'apartment_inquiry','group_invite','group_joined','concierge_fulfilled','system'
    ));
end $$;

-- ─── A3  premium expiry ──────────────────────────────────────────────────
alter table public.profiles
  add column if not exists premium_expires_at timestamptz;

-- is_premium() now honours the expiry window. The boolean column stays the
-- display flag; this function is what every RLS policy / trigger checks.
create or replace function public.is_premium()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select is_premium
        and (premium_expires_at is null or premium_expires_at > now())
     from public.profiles where id = auth.uid()),
    false
  );
$$;

-- premium_expires_at joins the never-self-modifiable column set.
create or replace function public.guard_profile_moderation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin()
     and coalesce(current_setting('moroom.allow_mod_update', true), 'off') <> 'on'
     and auth.uid() is not null
  then
    new.is_banned          := old.is_banned;
    new.banned_until       := old.banned_until;
    new.is_admin           := old.is_admin;
    new.is_premium         := old.is_premium;
    new.premium_expires_at := old.premium_expires_at;
    new.account_type       := old.account_type;
  end if;
  return new;
end $$;

drop trigger if exists guard_profile_moderation on public.profiles;
create trigger guard_profile_moderation
  before update on public.profiles
  for each row execute function public.guard_profile_moderation();

-- ─── A4  apartments privileged columns ───────────────────────────────────
-- Owners could previously set is_premium = true on their own listings (free
-- featured placement) or flip owner_type. Admin-only from now on.
create or replace function public.guard_apartment_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() or auth.uid() is null then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.is_premium := false;
    -- Only real realtor accounts may publish realtor-typed listings.
    if new.owner_type = 'realtor' and not public.is_realtor() then
      new.owner_type := 'student';
    end if;
  else
    new.is_premium := old.is_premium;
    new.owner_type := old.owner_type;
  end if;
  return new;
end $$;

drop trigger if exists guard_apartment_columns on public.apartments;
create trigger guard_apartment_columns
  before insert or update on public.apartments
  for each row execute function public.guard_apartment_columns();

-- ─── A5  user blocking ───────────────────────────────────────────────────
create table if not exists public.blocked_users (
  blocker_id uuid        not null references public.profiles(id) on delete cascade,
  blocked_id uuid        not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.blocked_users enable row level security;

drop policy if exists blocked_users_all on public.blocked_users;
create policy blocked_users_all on public.blocked_users
  for all using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

-- Either direction blocks the pair.
create or replace function public.pair_is_blocked(p_a uuid, p_b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.blocked_users
    where (blocker_id = p_a and blocked_id = p_b)
       or (blocker_id = p_b and blocked_id = p_a)
  );
$$;

create or replace function public.link_is_blocked(p_link uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.links l
    where l.id = p_link and public.pair_is_blocked(l.sender_id, l.receiver_id)
  );
$$;

-- New conversations cannot be opened across a block.
drop policy if exists links_insert on public.links;
create policy links_insert on public.links
  for insert with check (
    sender_id = auth.uid()
    and not public.is_realtor()
    and not public.pair_is_blocked(sender_id, receiver_id)
  );

-- Messages stop flowing in both directions once a block exists.
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert with check (
  sender_id = auth.uid()
  and (
    (
      link_id is not null
      and public.is_link_participant(link_id)
      and not public.link_is_blocked(link_id)
      and exists (
        select 1 from public.links l
        where l.id = link_id
          and (l.status = 'accepted' or l.kind in ('apartment_inquiry', 'marketplace'))
      )
    )
    or (
      group_id is not null
      and public.is_group_member(group_id)
    )
  )
);

-- ─── A6  daily limits in the database ────────────────────────────────────
-- These mirror the client-side caps, which were trivially bypassable with
-- the anon key. Admins and service-role calls are exempt.

create or replace function public.enforce_post_limits()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_premium boolean; v_count int;
begin
  if auth.uid() is null or public.is_admin() then return new; end if;
  v_premium := public.is_premium();

  if new.type = 'marketplace' then
    select count(*) into v_count from public.posts
    where user_id = new.user_id and type = 'marketplace'
      and created_at >= date_trunc('day', now());
    if v_count >= (case when v_premium then 10 else 3 end) then
      raise exception 'Daily marketplace listing limit reached';
    end if;
  end if;

  if new.video_url is not null then
    if not v_premium then
      raise exception 'Video uploads are a Premium feature';
    end if;
    select (select count(*) from public.posts
            where user_id = new.user_id and video_url is not null
              and created_at >= date_trunc('day', now()))
         + (select count(*) from public.messages
            where sender_id = new.user_id and video_url is not null
              and created_at >= date_trunc('day', now()))
      into v_count;
    if v_count >= 5 then
      raise exception 'Daily video limit reached';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists enforce_post_limits on public.posts;
create trigger enforce_post_limits before insert on public.posts
  for each row execute function public.enforce_post_limits();

create or replace function public.enforce_apartment_limits()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  if auth.uid() is null or public.is_admin() then return new; end if;
  select count(*) into v_count from public.apartments
  where student_owner_id = new.student_owner_id
    and created_at >= date_trunc('day', now());
  if v_count >= (case when public.is_premium() then 10 else 3 end) then
    raise exception 'Daily listing limit reached';
  end if;
  return new;
end $$;

drop trigger if exists enforce_apartment_limits on public.apartments;
create trigger enforce_apartment_limits before insert on public.apartments
  for each row execute function public.enforce_apartment_limits();

create or replace function public.enforce_group_limits()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  if auth.uid() is null or public.is_admin() then return new; end if;
  select count(*) into v_count from public.groups
  where owner_id = new.owner_id
    and created_at >= date_trunc('day', now());
  if v_count >= (case when public.is_premium() then 10 else 3 end) then
    raise exception 'Daily group limit reached';
  end if;
  return new;
end $$;

drop trigger if exists enforce_group_limits on public.groups;
create trigger enforce_group_limits before insert on public.groups
  for each row execute function public.enforce_group_limits();

create or replace function public.enforce_message_limits()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_premium boolean; v_count int;
begin
  if auth.uid() is null or public.is_admin() then return new; end if;
  v_premium := public.is_premium();

  if new.image_url is not null and not v_premium then
    select count(*) into v_count from public.messages
    where sender_id = new.sender_id and image_url is not null
      and created_at >= date_trunc('day', now());
    if v_count >= 3 then
      raise exception 'Daily chat photo limit reached';
    end if;
  end if;

  if new.video_url is not null then
    if not v_premium then
      raise exception 'Video uploads are a Premium feature';
    end if;
    select (select count(*) from public.messages
            where sender_id = new.sender_id and video_url is not null
              and created_at >= date_trunc('day', now()))
         + (select count(*) from public.posts
            where user_id = new.sender_id and video_url is not null
              and created_at >= date_trunc('day', now()))
      into v_count;
    if v_count >= 5 then
      raise exception 'Daily video limit reached';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists enforce_message_limits on public.messages;
create trigger enforce_message_limits before insert on public.messages
  for each row execute function public.enforce_message_limits();

-- ─── A7  realtor listings premium-gated in RLS ───────────────────────────
-- The premium gate lived only in React; any authenticated user could read
-- gated listings directly. Owners always see their own rows.
drop policy if exists apartments_select on public.apartments;
create policy apartments_select on public.apartments
  for select using (
    owner_type = 'student'
    or student_owner_id = auth.uid()
    or public.is_premium()
    or public.is_realtor()
    or public.is_admin()
  );

-- ─── A8  favorites (persistent shortlist) ────────────────────────────────
create table if not exists public.favorites (
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  target_type text        not null check (target_type in ('profile', 'apartment')),
  target_id   uuid        not null,
  created_at  timestamptz not null default now(),
  primary key (user_id, target_type, target_id)
);

alter table public.favorites enable row level security;

drop policy if exists favorites_all on public.favorites;
create policy favorites_all on public.favorites
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ─── A9  inbox summaries RPC ─────────────────────────────────────────────
-- Replaces the client pattern of downloading EVERY message of EVERY thread
-- just to compute previews and unread badges.
create or replace function public.get_link_summaries()
returns table (
  link_id         uuid,
  last_content    text,
  last_sender_id  uuid,
  last_message_at timestamptz,
  unread_count    bigint
)
language sql stable security definer set search_path = public as $$
  with my_links as (
    select id from public.links
    where sender_id = auth.uid() or receiver_id = auth.uid()
  ),
  last_msg as (
    select distinct on (m.link_id)
           m.link_id, m.content, m.sender_id, m.created_at
    from public.messages m
    join my_links ml on ml.id = m.link_id
    order by m.link_id, m.created_at desc
  ),
  unread as (
    select m.link_id, count(*) as c
    from public.messages m
    join my_links ml on ml.id = m.link_id
    left join public.conversation_reads r
      on r.link_id = m.link_id and r.user_id = auth.uid()
    where m.sender_id <> auth.uid()
      and m.created_at > coalesce(r.last_read_at, 'epoch'::timestamptz)
    group by m.link_id
  )
  select ml.id, lm.content, lm.sender_id, lm.created_at, coalesce(u.c, 0)
  from my_links ml
  left join last_msg lm on lm.link_id = ml.id
  left join unread u on u.link_id = ml.id;
$$;

revoke all on function public.get_link_summaries() from anon;

-- ─── A10  storage path rules for videos + receipts ───────────────────────
-- 0020 fixed the four image buckets; videos and receipts kept "any path,
-- any authenticated user" inserts. Uploads must live under {uid}/...
drop policy if exists "videos_auth_insert" on storage.objects;
create policy "videos_auth_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "receipts_user_upload" on storage.objects;
create policy "receipts_user_upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─── A11  supporting indexes ─────────────────────────────────────────────
create index if not exists idx_posts_user_created      on public.posts(user_id, created_at desc);
create index if not exists idx_messages_sender_created on public.messages(sender_id, created_at desc);
create index if not exists idx_apartments_owner_created on public.apartments(student_owner_id, created_at desc);
create index if not exists idx_apartments_created      on public.apartments(created_at desc);
create index if not exists idx_groups_owner_created    on public.groups(owner_id, created_at desc);
create index if not exists idx_profiles_last_seen      on public.profiles(last_seen desc nulls last);
