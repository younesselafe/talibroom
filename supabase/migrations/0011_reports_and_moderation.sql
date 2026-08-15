-- ════════════════════════════════════════════════════════════════════════
--  TalibRoom — 0011  Reports & moderation
--   • reports table — users flag profiles / posts / listings / comments
--   • profiles gains is_banned / banned_until / is_admin
--   • 5+ distinct reporters of one user → automatic 24-hour ban
--   • banned users cannot post, comment, message, list, or open new chats
--   • moderation fields are admin-only — a user cannot un-ban themselves
--  Run AFTER 0010. Idempotent — safe to re-run.
-- ════════════════════════════════════════════════════════════════════════

-- ─── profiles: moderation columns ───────────────────────────────────────
alter table public.profiles add column if not exists is_banned    boolean     not null default false;
alter table public.profiles add column if not exists banned_until timestamptz;
alter table public.profiles add column if not exists is_admin     boolean     not null default false;

-- ─── reports table ──────────────────────────────────────────────────────
-- reported_user_id is the OWNER of the flagged content (the profile itself
-- for a profile report) — auto-ban counts distinct reporters of that user.
create table if not exists public.reports (
  id               uuid        primary key default gen_random_uuid(),
  reporter_id      uuid        not null references public.profiles(id) on delete cascade,
  reported_user_id uuid                 references public.profiles(id) on delete cascade,
  target_type      text        not null check (target_type in ('profile','post','apartment','comment')),
  target_id        uuid        not null,
  reason           text,
  resolved         boolean     not null default false,
  created_at       timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)   -- one report per item per user
);
create index if not exists idx_reports_reported_user
  on public.reports(reported_user_id) where resolved = false;
create index if not exists idx_reports_created on public.reports(created_at desc);

-- ─── helper functions ───────────────────────────────────────────────────
create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and is_admin = true);
$$;

create or replace function public.is_current_user_banned()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and is_banned = true
      and (banned_until is null or banned_until > now())
  );
$$;

-- ─── RLS: reports ───────────────────────────────────────────────────────
alter table public.reports enable row level security;

drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports for insert
  with check (reporter_id = auth.uid());

-- A reporter sees their own reports; an admin sees everything.
drop policy if exists reports_select on public.reports;
create policy reports_select on public.reports for select
  using (reporter_id = auth.uid() or public.is_admin());

drop policy if exists reports_update on public.reports;
create policy reports_update on public.reports for update
  using (public.is_admin()) with check (public.is_admin());

-- ─── RLS: an admin may update any profile (ban / unban) ─────────────────
drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles for update
  using (public.is_admin()) with check (public.is_admin());

-- ─── guard: moderation fields are not user-writable ─────────────────────
-- A normal client UPDATE can never change is_banned / banned_until /
-- is_admin — those revert to their old values. Admins and the auto-ban
-- trigger (which sets the transaction-local flag below) are exempt.
create or replace function public.guard_profile_moderation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin()
     and coalesce(current_setting('moroom.allow_mod_update', true), 'off') <> 'on' then
    new.is_banned    := old.is_banned;
    new.banned_until := old.banned_until;
    new.is_admin     := old.is_admin;
  end if;
  return new;
end $$;

drop trigger if exists guard_profile_moderation_trg on public.profiles;
create trigger guard_profile_moderation_trg before update on public.profiles
  for each row execute function public.guard_profile_moderation();

-- ─── auto-ban: 5+ distinct reporters of a user → 24-hour ban ────────────
create or replace function public.handle_new_report()
returns trigger language plpgsql security definer set search_path = public as $$
declare reporter_count int;
begin
  if new.reported_user_id is null then return new; end if;

  select count(distinct reporter_id) into reporter_count
  from public.reports
  where reported_user_id = new.reported_user_id and resolved = false;

  if reporter_count >= 5 then
    -- flag the moderation guard so this server-side update is allowed
    perform set_config('moroom.allow_mod_update', 'on', true);
    update public.profiles
       set is_banned = true, banned_until = now() + interval '24 hours'
     where id = new.reported_user_id;
    perform set_config('moroom.allow_mod_update', 'off', true);
  end if;
  return new;
end $$;

drop trigger if exists on_report_created on public.reports;
create trigger on_report_created after insert on public.reports
  for each row execute function public.handle_new_report();

-- ─── enforcement: a banned user cannot create content ───────────────────
create or replace function public.block_banned_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_current_user_banned() then
    raise exception 'Your account is temporarily suspended after multiple reports. Please try again later.'
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists block_banned_posts on public.posts;
create trigger block_banned_posts before insert on public.posts
  for each row execute function public.block_banned_insert();

drop trigger if exists block_banned_comments on public.comments;
create trigger block_banned_comments before insert on public.comments
  for each row execute function public.block_banned_insert();

drop trigger if exists block_banned_messages on public.messages;
create trigger block_banned_messages before insert on public.messages
  for each row execute function public.block_banned_insert();

drop trigger if exists block_banned_apartments on public.apartments;
create trigger block_banned_apartments before insert on public.apartments
  for each row execute function public.block_banned_insert();

drop trigger if exists block_banned_links on public.links;
create trigger block_banned_links before insert on public.links
  for each row execute function public.block_banned_insert();

-- ════════════════════════════════════════════════════════════════════════
--  AFTER running this migration, make yourself an admin from the Supabase
--  SQL editor (replace the email with your account):
--
--    update public.profiles set is_admin = true
--    where id = (select id from auth.users where email = 'you@example.com');
--
--  The hidden /admin route on the web app is visible only to is_admin users.
-- ════════════════════════════════════════════════════════════════════════
