-- ─── Migration 0017: Fix concierge FK so admin user-join works ───────────────
--
-- concierge_requests.user_id originally pointed to auth.users(id).
-- PostgREST can only embed resources when the FK references the queried table
-- (public.profiles), not auth.users. Since profiles.id = auth.users.id this
-- is a safe reference swap — no data changes, just the FK target.

alter table public.concierge_requests
  drop constraint if exists concierge_requests_user_id_fkey,
  add  constraint concierge_requests_user_id_fkey
       foreign key (user_id) references public.profiles(id) on delete cascade;

-- concierge_offers.admin_id: same swap so admin profiles can be embedded later.
alter table public.concierge_offers
  drop constraint if exists concierge_offers_admin_id_fkey,
  add  constraint concierge_offers_admin_id_fkey
       foreign key (admin_id) references public.profiles(id) on delete cascade;
