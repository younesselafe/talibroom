-- ════════════════════════════════════════════════════════════════════════
--  TalibRoom — 0006  Group chat
--  • A message may now belong to a GROUP instead of a 1-on-1 link.
--  • Group join requests are approval-based: the owner approves a member
--    before they can see and post in the group thread.
--  Run AFTER 0005. Idempotent.
-- ════════════════════════════════════════════════════════════════════════

-- ─── messages: allow group-scoped messages ──────────────────────────────
alter table public.messages alter column link_id drop not null;
alter table public.messages add column if not exists group_id uuid
  references public.groups(id) on delete cascade;

-- Exactly one target — a link thread OR a group thread.
do $$ begin
  alter table public.messages add constraint messages_target_chk check (
    (link_id is not null and group_id is null)
    or (link_id is null and group_id is not null)
  );
exception when duplicate_object then null; end $$;

create index if not exists idx_messages_group on public.messages(group_id, created_at);

-- ─── helper: is the current user an accepted member of this group? ──────
-- NB: the parameter is named `p_group_id` to match any pre-existing copy of
-- this function — CREATE OR REPLACE cannot rename an input parameter.
create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.group_members gm
    where gm.group_id = p_group_id
      and gm.user_id = auth.uid()
      and gm.status = 'accepted'
  );
$$;

-- ─── messages RLS — cover link threads AND group threads ────────────────
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages for select using (
  (link_id is not null and public.is_link_participant(link_id))
  or (group_id is not null and public.is_group_member(group_id))
);

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert with check (
  sender_id = auth.uid()
  and (
    (
      link_id is not null
      and public.is_link_participant(link_id)
      and exists (
        select 1 from public.links l
        where l.id = link_id
          and (l.status = 'accepted' or l.kind in ('apartment_inquiry', 'marketplace'))
      )
    )
    or (
      -- Any accepted member of the group may post to its thread.
      group_id is not null
      and public.is_group_member(group_id)
    )
  )
);

-- ─── Group notifications ────────────────────────────────────────────────
-- notifications gains a group_id so group alerts can deep-link to the chat.
alter table public.notifications add column if not exists group_id uuid
  references public.groups(id) on delete cascade;

-- A new group message → notify every other accepted member of the group.
create or replace function public.notify_group_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.group_id is null then return new; end if;   -- only group messages
  insert into public.notifications (user_id, actor_id, type, group_id, message_id, preview)
  select gm.user_id, new.sender_id, 'new_message', new.group_id, new.id, left(new.content, 80)
  from public.group_members gm
  where gm.group_id = new.group_id
    and gm.status = 'accepted'
    and gm.user_id <> new.sender_id;
  return new;
end $$;

drop trigger if exists on_group_message_sent on public.messages;
create trigger on_group_message_sent after insert on public.messages
  for each row execute function public.notify_group_message();

-- Group joins are approval-based: a pending request notifies the owner, and
-- the owner accepting it notifies the new member.
create or replace function public.notify_group_join()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_name text;
begin
  select owner_id, name into v_owner, v_name from public.groups where id = new.group_id;
  if tg_op = 'INSERT' then
    if new.role = 'owner' then return new; end if;   -- skip the owner's auto-membership
    -- pending join request → notify the group owner
    if v_owner is not null and v_owner <> new.user_id then
      insert into public.notifications (user_id, actor_id, type, group_id, preview)
      values (v_owner, new.user_id, 'group_invite', new.group_id,
              'wants to join your group "' || coalesce(v_name, 'your group') || '"');
    end if;
  elsif tg_op = 'UPDATE' and new.status = 'accepted'
        and old.status is distinct from 'accepted' then
    -- request approved → notify the new member
    insert into public.notifications (user_id, actor_id, type, group_id, preview)
    values (new.user_id, v_owner, 'group_joined', new.group_id,
            'accepted you into "' || coalesce(v_name, 'the group') || '"');
  end if;
  return new;
end $$;

drop trigger if exists on_group_member_added on public.group_members;
create trigger on_group_member_added after insert or update on public.group_members
  for each row execute function public.notify_group_join();
