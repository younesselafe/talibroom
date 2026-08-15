-- ════════════════════════════════════════════════════════════════════════
--  TalibRoom — 0020  Security hardening
--
--  Fixes four audit findings in one idempotent migration:
--   F1/F6 — guard_profile_moderation: re-add is_premium + account_type
--   F2    — storage INSERT: enforce per-user path ownership
--   F3    — storage DELETE: remove the "or authenticated" escape hatch
--   F8    — profiles SELECT: restrict to authenticated callers only
-- ════════════════════════════════════════════════════════════════════════

-- ─── F1 + F6  guard_profile_moderation ──────────────────────────────────
-- Migration 0012 accidentally dropped is_premium from the reset list.
-- We also add account_type so users cannot self-escalate their RBAC role.
create or replace function public.guard_profile_moderation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Allow the change when:
  --   1. the caller is an admin (is_admin = true in JWT context)
  --   2. the auto-ban trigger set the transaction-local bypass flag
  --   3. no JWT context at all (SQL editor / service_role / postgres superuser)
  if not public.is_admin()
     and coalesce(current_setting('moroom.allow_mod_update', true), 'off') <> 'on'
     and auth.uid() is not null
  then
    -- Privilege flags — never self-modifiable
    new.is_banned    := old.is_banned;
    new.banned_until := old.banned_until;
    new.is_admin     := old.is_admin;
    new.is_premium   := old.is_premium;   -- F1: was missing since 0012
    new.account_type := old.account_type; -- F6: prevents RBAC self-escalation
  end if;
  return new;
end $$;

-- Ensure the trigger is wired up on profiles (idempotent)
drop trigger if exists guard_profile_moderation on public.profiles;
create trigger guard_profile_moderation
  before update on public.profiles
  for each row execute function public.guard_profile_moderation();


-- ─── F2  Storage INSERT — enforce per-user path ownership ────────────────
-- The old policy allowed any authenticated user to upload to any path.
-- Correct policy: the first path segment must equal the uploader's UID.
drop policy if exists "authenticated write" on storage.objects;
drop policy if exists storage_auth_insert   on storage.objects; -- 0004 name

create policy "authenticated write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('avatars','post-images','apartment-images','chat-images')
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ─── F3  Storage DELETE — remove the "or authenticated" escape hatch ─────
-- The old policy allowed any authenticated user to delete any file because
-- the second OR branch was always true for logged-in users.
drop policy if exists "owner delete" on storage.objects;
drop policy if exists storage_owner_delete  on storage.objects; -- 0004 name

create policy "owner delete" on storage.objects
  for delete to authenticated
  using ((storage.foldername(name))[1] = auth.uid()::text);


-- ─── F8  profiles SELECT — require authentication ────────────────────────
-- Previously any anonymous caller could read all profile PII (gender, age,
-- budget, lifestyle_json, is_banned). Restrict to authenticated users only.
drop policy if exists profiles_select on public.profiles;

create policy profiles_select on public.profiles
  for select
  using (auth.role() = 'authenticated');
