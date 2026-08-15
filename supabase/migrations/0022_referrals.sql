-- ════════════════════════════════════════════════════════════════════════
--  TalibRoom — 0022  Referral tracking + public signup counter
--  Adds referred_by to profiles, threads it through handle_new_user, and
--  exposes a PII-free signup count for the anonymous landing page.
--  Run AFTER 0021. Idempotent.
-- ════════════════════════════════════════════════════════════════════════

-- ─── 1. referred_by column ───────────────────────────────────────────────
alter table public.profiles
  add column if not exists referred_by uuid references public.profiles(id) on delete set null;

create index if not exists profiles_referred_by_idx on public.profiles(referred_by);

-- ─── 2. handle_new_user — also capture referred_by from signup metadata ──
-- Never trust the client value blindly: it's only kept if it's a valid
-- uuid that already exists as a profile.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_account_type text;
  v_referred_by uuid;
begin
  v_account_type := coalesce(new.raw_user_meta_data->>'account_type', 'student');
  if v_account_type not in ('student', 'realtor') then
    v_account_type := 'student';
  end if;

  begin
    v_referred_by := (new.raw_user_meta_data->>'referred_by')::uuid;
  exception when others then
    v_referred_by := null;
  end;
  if v_referred_by is not null and not exists (select 1 from public.profiles where id = v_referred_by) then
    v_referred_by := null;
  end if;

  insert into public.profiles (id, full_name, account_type, referred_by)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    v_account_type,
    v_referred_by
  )
  on conflict (id) do nothing;
  return new;
end $$;

-- ─── 3. Public, PII-free signup counter for the landing page ─────────────
create or replace function public.get_signup_count()
returns integer
language sql security definer stable set search_path = public as $$
  select count(*)::integer from public.profiles where account_type = 'student';
$$;

grant execute on function public.get_signup_count() to anon, authenticated;
