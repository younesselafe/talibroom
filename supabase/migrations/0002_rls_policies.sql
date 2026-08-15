-- ════════════════════════════════════════════════════════════════════════
--  TalibRoom — 0002  Row-Level Security  (policies for every table)
--  Run AFTER 0001. Idempotent — drops + recreates each policy.
-- ════════════════════════════════════════════════════════════════════════

-- Helper: is the current user a participant of this link?  SECURITY DEFINER
-- so the messages policy can check it without recursive RLS evaluation.
create or replace function public.is_link_participant(p_link uuid)
returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.links l
    where l.id = p_link
      and (l.sender_id = auth.uid() or l.receiver_id = auth.uid())
  );
$$;

-- ─── Enable RLS ─────────────────────────────────────────────────────────
alter table public.profiles           enable row level security;
alter table public.realtors           enable row level security;
alter table public.apartments         enable row level security;
alter table public.posts              enable row level security;
alter table public.comments           enable row level security;
alter table public.post_likes         enable row level security;
alter table public.links              enable row level security;
alter table public.messages           enable row level security;
alter table public.conversation_reads enable row level security;
alter table public.notifications      enable row level security;
alter table public.groups             enable row level security;
alter table public.group_members      enable row level security;

-- ─── profiles — world-readable, self-writable ───────────────────────────
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select using (true);
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert with check (id = auth.uid());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- ─── realtors — world-readable; writes via service role only ────────────
drop policy if exists realtors_select on public.realtors;
create policy realtors_select on public.realtors for select using (true);

-- ─── apartments — world-readable; student owner writes ──────────────────
drop policy if exists apartments_select on public.apartments;
create policy apartments_select on public.apartments for select using (true);
drop policy if exists apartments_insert on public.apartments;
create policy apartments_insert on public.apartments for insert with check (student_owner_id = auth.uid());
drop policy if exists apartments_update on public.apartments;
create policy apartments_update on public.apartments for update using (student_owner_id = auth.uid()) with check (student_owner_id = auth.uid());
drop policy if exists apartments_delete on public.apartments;
create policy apartments_delete on public.apartments for delete using (student_owner_id = auth.uid());

-- ─── posts — world-readable; author writes ──────────────────────────────
drop policy if exists posts_select on public.posts;
create policy posts_select on public.posts for select using (true);
drop policy if exists posts_insert on public.posts;
create policy posts_insert on public.posts for insert with check (user_id = auth.uid());
drop policy if exists posts_update on public.posts;
create policy posts_update on public.posts for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists posts_delete on public.posts;
create policy posts_delete on public.posts for delete using (user_id = auth.uid());

-- ─── comments — world-readable; author writes ───────────────────────────
drop policy if exists comments_select on public.comments;
create policy comments_select on public.comments for select using (true);
drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments for insert with check (user_id = auth.uid());
drop policy if exists comments_update on public.comments;
create policy comments_update on public.comments for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists comments_delete on public.comments;
create policy comments_delete on public.comments for delete using (user_id = auth.uid());

-- ─── post_likes — world-readable; user toggles own ──────────────────────
drop policy if exists post_likes_select on public.post_likes;
create policy post_likes_select on public.post_likes for select using (true);
drop policy if exists post_likes_insert on public.post_likes;
create policy post_likes_insert on public.post_likes for insert with check (user_id = auth.uid());
drop policy if exists post_likes_delete on public.post_likes;
create policy post_likes_delete on public.post_likes for delete using (user_id = auth.uid());

-- ─── links — only the two participants ──────────────────────────────────
drop policy if exists links_select on public.links;
create policy links_select on public.links for select using (sender_id = auth.uid() or receiver_id = auth.uid());
drop policy if exists links_insert on public.links;
create policy links_insert on public.links for insert with check (sender_id = auth.uid());
drop policy if exists links_update on public.links;
create policy links_update on public.links for update using (sender_id = auth.uid() or receiver_id = auth.uid());

-- ─── messages — participants read; send only when link is accepted ──────
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages for select using (public.is_link_participant(link_id));
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert with check (
  sender_id = auth.uid()
  and public.is_link_participant(link_id)
  and exists (select 1 from public.links l where l.id = link_id and l.status = 'accepted')
);

-- ─── conversation_reads — own rows only ─────────────────────────────────
drop policy if exists conv_reads_all on public.conversation_reads;
create policy conv_reads_all on public.conversation_reads for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ─── notifications — recipient reads/updates/deletes own ────────────────
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select using (user_id = auth.uid());
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications for update using (user_id = auth.uid());
drop policy if exists notifications_delete on public.notifications;
create policy notifications_delete on public.notifications for delete using (user_id = auth.uid());
-- Inserts come from SECURITY DEFINER triggers (0003); this covers client-side inserts too.
drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications for insert with check (actor_id = auth.uid() or actor_id is null);

-- ─── groups — world-readable; owner writes ──────────────────────────────
drop policy if exists groups_select on public.groups;
create policy groups_select on public.groups for select using (true);
drop policy if exists groups_insert on public.groups;
create policy groups_insert on public.groups for insert with check (owner_id = auth.uid());
drop policy if exists groups_update on public.groups;
create policy groups_update on public.groups for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists groups_delete on public.groups;
create policy groups_delete on public.groups for delete using (owner_id = auth.uid());

-- ─── group_members — world-readable; self joins, owner manages ──────────
drop policy if exists group_members_select on public.group_members;
create policy group_members_select on public.group_members for select using (true);
drop policy if exists group_members_insert on public.group_members;
create policy group_members_insert on public.group_members for insert with check (
  user_id = auth.uid()
  or exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid())
);
drop policy if exists group_members_update on public.group_members;
create policy group_members_update on public.group_members for update using (
  user_id = auth.uid()
  or exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid())
);
drop policy if exists group_members_delete on public.group_members;
create policy group_members_delete on public.group_members for delete using (
  user_id = auth.uid()
  or exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid())
);
