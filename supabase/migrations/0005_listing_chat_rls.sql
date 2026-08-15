-- ════════════════════════════════════════════════════════════════════════
--  TalibRoom — 0005  Listing-chat messaging RLS
--  Run AFTER 0004. Idempotent.
--
--  Apartment & marketplace inquiries open a conversation immediately — the
--  owner / seller has not "accepted" a link yet. The original messages_insert
--  policy (0002) required links.status = 'accepted', which blocked the very
--  first message on every listing thread:
--      new row violates row-level security policy for table "messages"
--
--  This widens the rule: listing-kind links (apartment_inquiry, marketplace)
--  may exchange messages without acceptance; roommate / direct links still
--  require an accepted link before chatting.
-- ════════════════════════════════════════════════════════════════════════

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert with check (
  sender_id = auth.uid()
  and public.is_link_participant(link_id)
  and exists (
    select 1 from public.links l
    where l.id = link_id
      and (
        l.status = 'accepted'
        or l.kind in ('apartment_inquiry', 'marketplace')
      )
  )
);
