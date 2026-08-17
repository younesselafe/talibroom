-- ════════════════════════════════════════════════════════════════════════
--  TalibRoom — 0023  Referral premium reward
--  A student's FIRST successful invite unlocks premium status, capped at
--  the first 1000 students to do so. Enforced server-side so it can't be
--  gamed by the client. Run AFTER 0022. Idempotent.
-- ════════════════════════════════════════════════════════════════════════

-- ─── 1. Track which premium grants came from this program ───────────────
-- Kept separate from `is_premium` itself so a future paid-premium path
-- (premium_expires_at) never collides with this program's 1000-person cap.
alter table public.profiles
  add column if not exists premium_via_referral boolean not null default false;

-- ─── 2. Grant premium on a referrer's first successful invite ───────────
create or replace function public.grant_referral_premium()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_referrer_count integer;
  v_referrer_premium boolean;
  v_global_grants integer;
begin
  if new.referred_by is null then
    return new;
  end if;

  select count(*) into v_referrer_count
  from public.profiles where referred_by = new.referred_by;

  -- Only fires the moment the referrer's count goes 0 -> 1.
  if v_referrer_count <> 1 then
    return new;
  end if;

  select is_premium into v_referrer_premium
  from public.profiles where id = new.referred_by;

  if v_referrer_premium then
    return new;
  end if;

  select count(*) into v_global_grants
  from public.profiles where premium_via_referral = true;

  if v_global_grants >= 1000 then
    return new;
  end if;

  update public.profiles
  set is_premium = true, premium_via_referral = true
  where id = new.referred_by;

  return new;
end $$;

drop trigger if exists on_referral_premium on public.profiles;
create trigger on_referral_premium
  after insert on public.profiles
  for each row execute function public.grant_referral_premium();

-- ─── 3. Public counter — how many of the 1000 spots are left ────────────
create or replace function public.get_referral_premium_claimed()
returns integer
language sql security definer stable set search_path = public as $$
  select count(*)::integer from public.profiles where premium_via_referral = true;
$$;

grant execute on function public.get_referral_premium_claimed() to anon, authenticated;
