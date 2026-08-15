-- ════════════════════════════════════════════════════════════════════════
--  TalibRoom — 0015  Auto-delete on 3 reports | Groups gender | Push tokens
-- ════════════════════════════════════════════════════════════════════════

-- ─── Push token storage ──────────────────────────────────────────────────
-- One row per (user, device). Expo push tokens are unique per install.
create table if not exists public.push_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  token      text not null,
  created_at timestamptz not null default now(),
  unique (user_id, token)
);
alter table public.push_tokens enable row level security;
create policy "owner" on public.push_tokens
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── Groups — gender preference ──────────────────────────────────────────
alter table public.groups
  add column if not exists gender text
    check (gender in ('male', 'female', 'mixed'))
    not null default 'mixed';

-- ─── Posts — multiple images for marketplace ─────────────────────────────
alter table public.posts
  add column if not exists image_urls text[] not null default '{}';

-- ─── Auto-delete content reported ≥ 3 times ──────────────────────────────
create or replace function public.auto_delete_reported_content()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  cnt int;
begin
  select count(*) into cnt
  from public.reports
  where target_type = new.target_type
    and target_id   = new.target_id;

  if cnt >= 3 then
    case new.target_type
      when 'post'      then delete from public.posts      where id = new.target_id;
      when 'apartment' then delete from public.apartments where id = new.target_id;
      when 'comment'   then delete from public.comments   where id = new.target_id;
      else null;
    end case;
  end if;
  return new;
end $$;

drop trigger if exists trg_auto_delete_reported on public.reports;
create trigger trg_auto_delete_reported
  after insert on public.reports
  for each row execute function public.auto_delete_reported_content();
