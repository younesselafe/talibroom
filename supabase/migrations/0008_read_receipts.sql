-- ════════════════════════════════════════════════════════════════════════
--  TalibRoom — 0008  Phase 2 — read receipts
--  A link participant may now read BOTH conversation_reads rows for their
--  thread, so the sender can tell whether the recipient has seen it.
--  Writes stay restricted to the owning user. Run AFTER 0007. Idempotent.
-- ════════════════════════════════════════════════════════════════════════

drop policy if exists conv_reads_all    on public.conversation_reads;
drop policy if exists conv_reads_select on public.conversation_reads;
drop policy if exists conv_reads_insert on public.conversation_reads;
drop policy if exists conv_reads_update on public.conversation_reads;

-- Read: either participant of the link.
create policy conv_reads_select on public.conversation_reads for select
  using (public.is_link_participant(link_id));

-- Write: only your own row.
create policy conv_reads_insert on public.conversation_reads for insert
  with check (user_id = auth.uid());
create policy conv_reads_update on public.conversation_reads for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
