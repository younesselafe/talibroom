-- ════════════════════════════════════════════════════════════════════════
--  TalibRoom — 0019  Realtor Account Type (RBAC)
--  Introduces account_type on profiles and DB-level restrictions so realtors
--  cannot initiate chats or create community posts/groups.
--  Run AFTER 0018. Idempotent.
-- ════════════════════════════════════════════════════════════════════════

-- ─── 1. Add account_type column ─────────────────────────────────────────
alter table public.profiles
  add column if not exists account_type text not null default 'student'
  check (account_type in ('student', 'realtor', 'admin'));

-- ─── 2. Sync existing admin rows ────────────────────────────────────────
update public.profiles set account_type = 'admin' where is_admin = true;

-- ─── 3. Update handle_new_user to read account_type from signup metadata ─
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_account_type text;
begin
  v_account_type := coalesce(new.raw_user_meta_data->>'account_type', 'student');
  -- Validate — reject any unknown type to prevent privilege escalation.
  if v_account_type not in ('student', 'realtor') then
    v_account_type := 'student';
  end if;

  insert into public.profiles (id, full_name, account_type)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    v_account_type
  )
  on conflict (id) do nothing;
  return new;
end $$;

-- ─── 4. Helper: is the current auth user a realtor? ─────────────────────
create or replace function public.is_realtor()
returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and account_type = 'realtor'
  );
$$;

-- ─── 5. RLS — links: realtors cannot initiate chats ─────────────────────
--  Realtors may only RECEIVE link requests from students (via apartment
--  inquiry flow). They may update / read links they are part of.
drop policy if exists links_insert on public.links;
create policy links_insert on public.links
  for insert with check (
    sender_id = auth.uid()
    and not public.is_realtor()
  );

-- ─── 6. RLS — posts: realtors cannot post to the community ──────────────
drop policy if exists posts_insert on public.posts;
create policy posts_insert on public.posts
  for insert with check (
    user_id = auth.uid()
    and not public.is_realtor()
  );

-- ─── 7. RLS — comments: realtors cannot comment ─────────────────────────
drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments
  for insert with check (
    user_id = auth.uid()
    and not public.is_realtor()
  );

-- ─── 8. RLS — post_likes: realtors cannot like posts ────────────────────
drop policy if exists post_likes_insert on public.post_likes;
create policy post_likes_insert on public.post_likes
  for insert with check (
    user_id = auth.uid()
    and not public.is_realtor()
  );

-- ─── 9. RLS — groups: realtors cannot create or join groups ─────────────
drop policy if exists groups_insert on public.groups;
create policy groups_insert on public.groups
  for insert with check (
    owner_id = auth.uid()
    and not public.is_realtor()
  );

drop policy if exists group_members_insert on public.group_members;
create policy group_members_insert on public.group_members
  for insert with check (
    (user_id = auth.uid() and not public.is_realtor())
    or exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid())
  );

-- ─── 10. apartments INSERT — allow both students and realtors ────────────
--  The existing policy already allows student_owner_id = auth.uid().
--  Realtors also set student_owner_id = auth.uid() (with owner_type='realtor'),
--  so no policy change is needed — just a note for future maintainers.
