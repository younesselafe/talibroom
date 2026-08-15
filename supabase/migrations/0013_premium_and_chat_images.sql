-- ════════════════════════════════════════════════════════════════════════
--  TalibRoom — 0013  Premium membership + chat image support
--   • profiles.is_premium  — boolean flag, default false
--   • messages.image_url   — optional photo attached to a chat message
--  Run AFTER 0012. Idempotent.
-- ════════════════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists is_premium boolean not null default false;

alter table public.messages
  add column if not exists image_url text;
