-- ════════════════════════════════════════════════════════════════════════
--  TalibRoom — 0003  Functions & Triggers
--  Auto-create profile on signup · auto-add group owner · notification fan-out
--  Run AFTER 0002. Idempotent.
-- ════════════════════════════════════════════════════════════════════════

-- ─── New auth user → profile row ────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── New group → owner becomes an accepted member ───────────────────────
create or replace function public.handle_new_group()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.group_members (group_id, user_id, role, status)
  values (new.id, new.owner_id, 'owner', 'accepted')
  on conflict (group_id, user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_group_created on public.groups;
create trigger on_group_created
  after insert on public.groups
  for each row execute function public.handle_new_group();

-- ─── Notification fan-out ───────────────────────────────────────────────

-- Post liked → notify post author
create or replace function public.notify_post_like()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  select user_id into v_owner from public.posts where id = new.post_id;
  if v_owner is not null and v_owner <> new.user_id then
    insert into public.notifications (user_id, actor_id, type, post_id, preview)
    values (v_owner, new.user_id, 'post_like', new.post_id, 'liked your post');
  end if;
  return new;
end $$;

drop trigger if exists on_post_liked on public.post_likes;
create trigger on_post_liked after insert on public.post_likes
  for each row execute function public.notify_post_like();

-- Comment added → notify post author
create or replace function public.notify_post_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  select user_id into v_owner from public.posts where id = new.post_id;
  if v_owner is not null and v_owner <> new.user_id then
    insert into public.notifications (user_id, actor_id, type, post_id, comment_id, preview)
    values (v_owner, new.user_id, 'post_comment', new.post_id, new.id, left(new.content, 80));
  end if;
  return new;
end $$;

drop trigger if exists on_post_commented on public.comments;
create trigger on_post_commented after insert on public.comments
  for each row execute function public.notify_post_comment();

-- Link created / accepted → notify the other party
create or replace function public.notify_link()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.notifications (user_id, actor_id, type, link_id, preview)
    values (new.receiver_id, new.sender_id, 'link_request', new.id,
            coalesce(new.context_label, 'wants to connect'));
  elsif tg_op = 'UPDATE' and new.status = 'accepted' and old.status <> 'accepted' then
    insert into public.notifications (user_id, actor_id, type, link_id, preview)
    values (new.sender_id, new.receiver_id, 'link_accepted', new.id,
            'accepted your request');
  end if;
  return new;
end $$;

drop trigger if exists on_link_changed on public.links;
create trigger on_link_changed after insert or update on public.links
  for each row execute function public.notify_link();

-- Message sent → notify the other participant
create or replace function public.notify_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_other uuid;
begin
  select case when l.sender_id = new.sender_id then l.receiver_id else l.sender_id end
    into v_other
  from public.links l where l.id = new.link_id;

  if v_other is not null then
    insert into public.notifications (user_id, actor_id, type, link_id, message_id, preview)
    values (v_other, new.sender_id, 'new_message', new.link_id, new.id, left(new.content, 80));
  end if;
  return new;
end $$;

drop trigger if exists on_message_sent on public.messages;
create trigger on_message_sent after insert on public.messages
  for each row execute function public.notify_message();
