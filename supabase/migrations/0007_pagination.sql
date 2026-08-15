-- ════════════════════════════════════════════════════════════════════════
--  TalibRoom — 0007  Pagination indexes
--  Supports cursor pagination of the community feed and chat history.
--  Run AFTER 0006. Idempotent.
-- ════════════════════════════════════════════════════════════════════════

-- Community feed — paged per type, newest first.
create index if not exists idx_posts_type_created
  on public.posts(type, created_at desc);

-- Chat history — `idx_messages_link` (link_id, created_at) and
-- `idx_messages_group` (group_id, created_at) from migration 0001 already
-- serve the "latest N, then older than cursor" query; no new index needed.
