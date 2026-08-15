-- ════════════════════════════════════════════════════════════════════════
--  TalibRoom — 0001  Schema
--  PART A creates the target schema on a fresh project.
--  PART B reconciles a pre-existing TalibRoom database (upgrade in place).
--  Idempotent: safe to run on either, and safe to re-run.
-- ════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  PART A — base schema                                                ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ─── Enums (skipped if they already exist) ──────────────────────────────
do $$ begin create type gender_enum         as enum ('male','female','other'); exception when duplicate_object then null; end $$;
do $$ begin create type owner_type          as enum ('student','realtor'); exception when duplicate_object then null; end $$;
do $$ begin create type post_type           as enum ('social','marketplace'); exception when duplicate_object then null; end $$;
do $$ begin create type link_status         as enum ('pending','accepted','declined'); exception when duplicate_object then null; end $$;
do $$ begin create type group_status        as enum ('open','closed','matched'); exception when duplicate_object then null; end $$;
do $$ begin create type group_member_role   as enum ('owner','member'); exception when duplicate_object then null; end $$;
do $$ begin create type group_member_status as enum ('pending','accepted','declined'); exception when duplicate_object then null; end $$;
-- NB: links.kind and notifications.type are kept as `text` to match the
--     existing production database — no enum is created for them.

-- ─── profiles ───────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  full_name      text        not null default '',
  avatar_url     text,
  gender         gender_enum,
  university     text,
  city           text,
  budget         integer,
  lifestyle_json jsonb        not null default '{}'::jsonb,
  is_premium     boolean      not null default false,
  last_seen      timestamptz           default now(),
  created_at     timestamptz  not null default now()
);

-- ─── realtors ───────────────────────────────────────────────────────────
create table if not exists public.realtors (
  id          uuid        primary key default gen_random_uuid(),
  full_name   text        not null,
  phone       text        not null,
  city        text        not null,
  agency_name text,
  avatar_url  text,
  verified    boolean     not null default false,
  created_at  timestamptz not null default now()
);

-- ─── apartments ─────────────────────────────────────────────────────────
create table if not exists public.apartments (
  id               uuid        primary key default gen_random_uuid(),
  title            text        not null,
  price            integer     not null,
  rooms            smallint    not null default 1,
  city             text        not null,
  description      text,
  image_urls       text[]      not null default '{}',     -- multi-photo gallery
  video_url        text,
  is_premium       boolean     not null default false,
  owner_type       owner_type  not null default 'student',
  student_owner_id uuid        references public.profiles(id) on delete cascade,
  realtor_id       uuid        references public.realtors(id) on delete set null,
  total_slots      smallint    not null default 1,
  available_slots  smallint    not null default 1,
  created_at       timestamptz not null default now()
);

-- ─── posts ──────────────────────────────────────────────────────────────
create table if not exists public.posts (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  content    text        not null default '',
  image_url  text,
  type       post_type   not null default 'social',
  category   text        not null default 'Other',
  is_sold    boolean     not null default false,
  created_at timestamptz not null default now()
);

-- ─── comments ───────────────────────────────────────────────────────────
create table if not exists public.comments (
  id         uuid        primary key default gen_random_uuid(),
  post_id    uuid        not null references public.posts(id) on delete cascade,
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  content    text        not null,
  created_at timestamptz not null default now()
);

-- ─── post_likes ─────────────────────────────────────────────────────────
create table if not exists public.post_likes (
  post_id    uuid        not null references public.posts(id) on delete cascade,
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- ─── links  (connection requests + DM threads) ──────────────────────────
create table if not exists public.links (
  id            uuid        primary key default gen_random_uuid(),
  sender_id     uuid        not null references public.profiles(id) on delete cascade,
  receiver_id   uuid        not null references public.profiles(id) on delete cascade,
  status        link_status not null default 'pending',
  kind          text        not null default 'roommate',
  context_id    uuid,
  context_label text,
  created_at    timestamptz not null default now()
);

-- ─── messages ───────────────────────────────────────────────────────────
create table if not exists public.messages (
  id         uuid        primary key default gen_random_uuid(),
  link_id    uuid        not null references public.links(id) on delete cascade,
  sender_id  uuid        not null references public.profiles(id) on delete cascade,
  content    text        not null,
  created_at timestamptz not null default now()
);

-- ─── conversation_reads ─────────────────────────────────────────────────
create table if not exists public.conversation_reads (
  link_id      uuid        not null references public.links(id) on delete cascade,
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (link_id, user_id)
);

-- ─── notifications ──────────────────────────────────────────────────────
create table if not exists public.notifications (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  actor_id     uuid        references public.profiles(id) on delete set null,
  type         text        not null,
  post_id      uuid        references public.posts(id) on delete cascade,
  comment_id   uuid        references public.comments(id) on delete cascade,
  link_id      uuid        references public.links(id) on delete cascade,
  message_id   uuid        references public.messages(id) on delete cascade,
  apartment_id uuid        references public.apartments(id) on delete cascade,
  preview      text,
  is_read      boolean     not null default false,
  created_at   timestamptz not null default now()
);

-- ─── groups ─────────────────────────────────────────────────────────────
create table if not exists public.groups (
  id          uuid         primary key default gen_random_uuid(),
  name        text         not null,
  description text,
  city        text         not null,
  owner_id    uuid         not null references public.profiles(id) on delete cascade,
  max_size    integer      not null default 4,
  status      group_status not null default 'open',
  created_at  timestamptz  not null default now()
);

-- ─── group_members ──────────────────────────────────────────────────────
create table if not exists public.group_members (
  id         uuid                primary key default gen_random_uuid(),
  group_id   uuid                not null references public.groups(id) on delete cascade,
  user_id    uuid                not null references public.profiles(id) on delete cascade,
  role       group_member_role   not null default 'member',
  status     group_member_status not null default 'pending',
  created_at timestamptz         not null default now(),
  unique (group_id, user_id)
);

-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  PART B — upgrades for an existing TalibRoom database                   ║
-- ║  Each block is guarded; it no-ops on a fresh install (PART A built    ║
-- ║  the final shape already).                                           ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- profiles: rename lifestyle_vec → lifestyle_json -----------------------
do $$ begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='profiles' and column_name='lifestyle_vec')
     and not exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='profiles' and column_name='lifestyle_json')
  then
    alter table public.profiles rename column lifestyle_vec to lifestyle_json;
  end if;
end $$;

-- normalise legacy '[]' / null values, then lock the column down
update public.profiles
  set lifestyle_json = '{}'::jsonb
  where lifestyle_json is null or lifestyle_json = '[]'::jsonb;
alter table public.profiles alter column lifestyle_json set default '{}'::jsonb;
alter table public.profiles alter column lifestyle_json set not null;

-- apartments: image_url (text) → image_urls (text[]) --------------------
do $$ begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='apartments' and column_name='image_url')
     and not exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='apartments' and column_name='image_urls')
  then
    alter table public.apartments add column image_urls text[] not null default '{}';
    update public.apartments
      set image_urls = array[image_url]
      where image_url is not null and image_url <> '';
    alter table public.apartments drop column image_url;
  end if;
end $$;

-- notifications: refresh the `type` CHECK + migrate legacy values -------
do $$
declare c record;
begin
  -- 1. drop every existing CHECK constraint on the table
  for c in
    select conname from pg_constraint
    where conrelid = 'public.notifications'::regclass and contype = 'c'
  loop
    execute format('alter table public.notifications drop constraint %I', c.conname);
  end loop;

  -- 2. migrate legacy values to the names the app + triggers use
  update public.notifications set type = 'post_like'    where type = 'like';
  update public.notifications set type = 'post_comment' where type = 'comment';
  update public.notifications set type = 'new_message'  where type = 'message';

  -- 3. add the current CHECK
  alter table public.notifications add constraint notifications_type_chk
    check (type in (
      'link_request','link_accepted','new_message','post_like','post_comment',
      'apartment_inquiry','group_invite','group_joined','system'
    ));
end $$;

-- ─── Indexes (created if missing) ───────────────────────────────────────
create index if not exists idx_apartments_city    on public.apartments(city);
create index if not exists idx_apartments_owner   on public.apartments(student_owner_id);
create index if not exists idx_posts_user         on public.posts(user_id);
create index if not exists idx_posts_type         on public.posts(type);
create index if not exists idx_comments_post      on public.comments(post_id);
create index if not exists idx_links_sender       on public.links(sender_id);
create index if not exists idx_links_receiver     on public.links(receiver_id);
create index if not exists idx_messages_link      on public.messages(link_id, created_at);
create index if not exists idx_notifications_user on public.notifications(user_id, is_read, created_at desc);
create index if not exists idx_group_members_grp  on public.group_members(group_id);
create index if not exists idx_group_members_usr  on public.group_members(user_id);
