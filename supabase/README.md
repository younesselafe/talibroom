# TalibRoom — Supabase setup

SQL migrations for the TalibRoom database (project `jzzmbxbefxzxtoygzzda`).
Apply them **in order** in the Supabase **SQL Editor**.

## Detected: existing database → upgrade in place (Option A)

Your project already has all 12 tables. These migrations **upgrade it in
place and preserve your data** — they do not drop anything.

`0001` is split: **Part A** would build the schema on a fresh project;
**Part B** reconciles your existing one. Part B makes three real changes:

| Your current DB | Becomes | Data |
|---|---|---|
| `profiles.lifestyle_vec` (jsonb, default `'[]'`) | `profiles.lifestyle_json` (default `'{}'`) | renamed; `'[]'`/null rows normalised to `'{}'` |
| `apartments.image_url` (text) | `apartments.image_urls` (text[]) | each URL copied into a 1-element array |
| `notifications.type` CHECK = `like/comment/message/…` | CHECK = `post_like/post_comment/new_message/…` | legacy rows migrated to the new names |

## Apply order

| # | File | What it does |
|---|------|--------------|
| 1 | `migrations/0001_schema.sql` | Enums, tables, **+ Part B upgrades**, indexes |
| 2 | `migrations/0002_rls_policies.sql` | Enables RLS + every table policy |
| 3 | `migrations/0003_functions_triggers.sql` | Profile-on-signup, group owner, notification triggers |
| 4 | `migrations/0004_realtime_storage.sql` | Realtime publication + storage buckets/policies |
| 5 | `migrations/0005_listing_chat_rls.sql` | Lets apartment/marketplace inquiries message before acceptance |

All five are idempotent — safe to re-run.

### How to run

Dashboard → **SQL Editor** → **New query** → paste `0001`, **Run** → repeat
for `0002`, `0003`, `0004`, `0005` in order.

## Later migrations (already applied, kept for history)

Every migration below `0005` was written and run one at a time as a feature
shipped, directly in the SQL Editor — not part of the original bootstrap.
They're kept here as the permanent record of how the schema reached its
current shape; there's nothing left to run unless you're setting up a fresh
project from scratch, in which case apply all of them in order (0001→0022).

| # | File | What it does |
|---|------|--------------|
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
| 21 | `0021_audit_fixes.sql` | Audit fixes — upload paths, `get_link_summaries()`, favorites/blocked_users |
| 22 | `0022_referrals.sql` | Referral tracking + public signup counter |

## ⚠️ Review before running — possible conflicts with existing objects

These migrations can't see what policies/triggers you already have. Check:

1. **Existing RLS policies** — `0002` drops/recreates policies by *its* names
   (`profiles_select`, etc.). Policies you created under *other* names are
   left untouched and will stack (RLS policies OR together). Drop old ones if
   you want only the new set.
2. **Existing signup / notification triggers** — if your DB already has a
   trigger that creates a profile on signup, or that writes notifications,
   `0003` adds its own alongside them → duplicates. Drop the old ones, or
   skip the overlapping functions in `0003`.
3. **`posts.category` CHECK** — your DB allows: *Books & Textbooks, Furniture,
   Electronics, Kitchen & Dining, Clothing & Accessories, Sports & Outdoors,
   Other*. The app's `MARKETPLACE_CATEGORIES` constant currently lists
   different values — post inserts with a non-matching category will be
   rejected. This is fixed in app code during STEP 5 (no DB change needed).

## Storage buckets

`0004` creates three **public** buckets: `avatars`, `post-images`,
`apartment-images`. If `storage.buckets` inserts are blocked, create them
manually: Dashboard → **Storage** → **New bucket** → Public = on.

## Realtime

`0004` adds `messages`, `comments`, `post_likes`, `notifications`, `profiles`,
`links` to the `supabase_realtime` publication.

## Verify

```sql
-- 12 rows, every rls_enabled = true
select tablename, rowsecurity as rls_enabled
from pg_tables where schemaname = 'public' order by tablename;

-- profiles has lifestyle_json (not lifestyle_vec)
select column_name from information_schema.columns
where table_schema='public' and table_name='profiles' and column_name like 'lifestyle%';

-- apartments has image_urls text[]
select column_name, data_type from information_schema.columns
where table_schema='public' and table_name='apartments' and column_name like 'image%';

-- 3 storage buckets
select id, public from storage.buckets order by id;
```
