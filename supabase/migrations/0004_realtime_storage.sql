-- ════════════════════════════════════════════════════════════════════════
--  TalibRoom — 0004  Realtime & Storage
--  Run AFTER 0003. Idempotent.
-- ════════════════════════════════════════════════════════════════════════

-- ─── Realtime ───────────────────────────────────────────────────────────
-- Add tables to the supabase_realtime publication (skip if already present).
do $$ begin alter publication supabase_realtime add table public.messages;      exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.comments;      exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.post_likes;    exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.notifications; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.profiles;      exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.links;         exception when duplicate_object then null; end $$;

-- REPLICA IDENTITY FULL — so realtime DELETE/UPDATE payloads include old rows
-- (needed for unlike events and message edits to carry the row id).
alter table public.post_likes    replica identity full;
alter table public.messages      replica identity full;
alter table public.notifications replica identity full;
alter table public.links         replica identity full;

-- ─── Storage buckets ────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values  ('avatars',          'avatars',          true),
        ('post-images',      'post-images',      true),
        ('apartment-images', 'apartment-images', true)
on conflict (id) do nothing;

-- ─── Storage policies (on storage.objects) ──────────────────────────────
-- Public read for all three buckets.
drop policy if exists storage_public_read on storage.objects;
create policy storage_public_read on storage.objects for select
  using (bucket_id in ('avatars','post-images','apartment-images'));

-- Authenticated users may upload to the three buckets.
drop policy if exists storage_auth_insert on storage.objects;
create policy storage_auth_insert on storage.objects for insert to authenticated
  with check (bucket_id in ('avatars','post-images','apartment-images'));

-- Users may modify / remove only files they own.
drop policy if exists storage_owner_update on storage.objects;
create policy storage_owner_update on storage.objects for update to authenticated
  using (owner = auth.uid());
drop policy if exists storage_owner_delete on storage.objects;
create policy storage_owner_delete on storage.objects for delete to authenticated
  using (owner = auth.uid());
