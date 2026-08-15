-- ════════════════════════════════════════════════════════════════════════
--  TalibRoom — 0009  Profile age + apartment address
--   • profiles.age   — student age, collected during onboarding (16-99)
--   • apartments.address — neighbourhood / street within the city
--  Idempotent: safe to run on a fresh or existing database, and to re-run.
-- ════════════════════════════════════════════════════════════════════════

-- ─── profiles.age ───────────────────────────────────────────────────────
alter table public.profiles add column if not exists age smallint;

do $$ begin
  alter table public.profiles add constraint profiles_age_chk
    check (age is null or (age >= 16 and age <= 99));
exception when duplicate_object then null; end $$;

-- ─── apartments.address ─────────────────────────────────────────────────
-- Free-text neighbourhood / street; `city` stays the structured dropdown.
alter table public.apartments add column if not exists address text;
