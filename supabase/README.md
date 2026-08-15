# TalibRoom — Supabase schema

SQL migrations for the TalibRoom database, applied in order (`0001`→`0022`)
via the Supabase SQL Editor. All are idempotent.

| # | File | What it does |
|---|------|--------------|
| 1  | `0001_schema.sql` | Enums, tables, indexes |
| 2  | `0002_rls_policies.sql` | RLS + per-table policies |
| 3  | `0003_functions_triggers.sql` | Profile-on-signup, group owner, notification triggers |
| 4  | `0004_realtime_storage.sql` | Realtime publication + storage buckets/policies |
| 5  | `0005_listing_chat_rls.sql` | Apartment/marketplace inquiries can message before acceptance |
| 6  | `0006_group_chat.sql` | Group chat |
| 7  | `0007_pagination.sql` | Pagination indexes |
| 8  | `0008_read_receipts.sql` | Read receipts |
| 9  | `0009_age_and_address.sql` | Profile age + apartment address |
| 10 | `0010_gender_two_options.sql` | Gender: male/female only |
| 11 | `0011_reports_and_moderation.sql` | Reports & moderation, auto-ban trigger |
| 12 | `0012_fix_admin_guard.sql` | Fix admin guard for direct DB access |
| 13 | `0013_premium_and_chat_images.sql` | Premium membership + chat image support |
| 14 | `0014_storage_buckets.sql` | Storage buckets |
| 15 | `0015_reports_gender_limits.sql` | Auto-delete on 3 reports, group gender, push tokens |
| 16 | `0016_premium_video_concierge.sql` | Premium video & concierge |
| 17 | `0017_fix_concierge_user_fk.sql` | Fix concierge FK so admin user-join works |
| 18 | `0018_premium_requests.sql` | Premium upgrade requests (bank-transfer receipts) |
| 19 | `0019_realtor_accounts.sql` | Realtor account type (RBAC) |
| 20 | `0020_security_hardening.sql` | Security hardening (profiles SELECT, storage policies) |
| 21 | `0021_audit_fixes.sql` | Upload paths, `get_link_summaries()`, favorites/blocked_users |
| 22 | `0022_referrals.sql` | Referral tracking + public signup counter |

## Storage buckets

`0004` creates public buckets: `avatars`, `post-images`, `apartment-images`.
`0014` adds more as premium/chat features shipped.

## Realtime

`0004` publishes `messages`, `comments`, `post_likes`, `notifications`,
`profiles`, `links`.
