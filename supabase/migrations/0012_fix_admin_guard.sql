-- ════════════════════════════════════════════════════════════════════════
--  TalibRoom — 0012  Fix admin guard for direct DB access
--   • guard_profile_moderation now also bypasses when auth.uid() IS NULL
--     (Supabase SQL editor / service_role run outside a JWT context)
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.guard_profile_moderation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Allow the change when:
  --   1. the caller is an admin (JWT context with is_admin = true)
  --   2. the auto-ban trigger set the transaction-local bypass flag
  --   3. there is no JWT context at all (SQL editor / service_role / postgres superuser)
  if not public.is_admin()
     and coalesce(current_setting('moroom.allow_mod_update', true), 'off') <> 'on'
     and auth.uid() is not null then
    new.is_banned    := old.is_banned;
    new.banned_until := old.banned_until;
    new.is_admin     := old.is_admin;
  end if;
  return new;
end $$;
