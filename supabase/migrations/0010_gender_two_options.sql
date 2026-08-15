-- ════════════════════════════════════════════════════════════════════════
--  TalibRoom — 0010  Gender: two options only
--  The app now offers just 'male' / 'female'. Postgres cannot drop an enum
--  value, so the legacy 'other' value stays on gender_enum but is no longer
--  used — existing 'other' profiles are reset to NULL so they re-pick.
--  Idempotent: safe to re-run.
-- ════════════════════════════════════════════════════════════════════════

update public.profiles set gender = null where gender = 'other';
