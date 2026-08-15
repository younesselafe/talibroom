-- ═══════════════════════════════════════════════════════════════════════
--  TalibRoom — 0018  Premium upgrade requests (bank-transfer receipts)
--   • premium_requests table — user submits receipt URL, admin approves
--   • Realtime publication for instant status-change sync
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists public.premium_requests (
  id          uuid         primary key default gen_random_uuid(),
  user_id     uuid         not null references public.profiles(id) on delete cascade,
  receipt_url text,
  status      text         not null default 'pending'
                           check (status in ('pending', 'approved', 'rejected')),
  notes       text,
  created_at  timestamptz  not null default now()
);

alter table public.premium_requests enable row level security;

create policy "pr_user_select" on public.premium_requests
  for select using (auth.uid() = user_id or public.is_admin());

create policy "pr_user_insert" on public.premium_requests
  for insert with check (auth.uid() = user_id);

create policy "pr_admin_update" on public.premium_requests
  for update using (public.is_admin());

-- Expose to Realtime so the frontend can subscribe to status changes.
alter publication supabase_realtime add table public.premium_requests;

-- Storage bucket for receipt images (idempotent insert).
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

create policy "receipts_user_upload" on storage.objects
  for insert with check (
    bucket_id = 'receipts' and auth.uid() is not null
  );

create policy "receipts_user_read" on storage.objects
  for select using (
    bucket_id = 'receipts' and
    (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin())
  );
