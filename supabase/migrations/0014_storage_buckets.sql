-- ════════════════════════════════════════════════════════════════════════
--  TalibRoom — 0014  Storage buckets
--   Creates the Supabase Storage buckets the app writes to, and
--   adds minimal RLS policies so authenticated users can read/write.
--   Safe to re-run — all statements use ON CONFLICT / IF NOT EXISTS.
-- ════════════════════════════════════════════════════════════════════════

-- ─── Buckets ────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit)
values
  ('avatars',           'avatars',           true, 5242880),
  ('post-images',       'post-images',       true, 5242880),
  ('apartment-images',  'apartment-images',  true, 5242880),
  ('chat-images',       'chat-images',       true, 5242880)
on conflict (id) do nothing;

-- ─── Storage RLS ────────────────────────────────────────────────────────
-- Public read for all buckets (files already have public URLs).
drop policy if exists "public read"         on storage.objects;
drop policy if exists "authenticated write" on storage.objects;
drop policy if exists "owner delete"        on storage.objects;

create policy "public read" on storage.objects
  for select using (true);

create policy "authenticated write" on storage.objects
  for insert to authenticated
  with check (auth.role() = 'authenticated');

create policy "owner delete" on storage.objects
  for delete to authenticated
  using (auth.uid()::text = (storage.foldername(name))[1]
         or auth.role() = 'authenticated');
