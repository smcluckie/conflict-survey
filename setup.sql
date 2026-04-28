-- ─────────────────────────────────────────────────────────────────────────────
-- Personal-site conflict-style assessment: schema setup
--
-- Paste this into the Supabase SQL Editor for your new project, run once.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists personal_responses (
  -- Primary key + identity
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null unique,

  -- Optional self-labeling
  name_label      text,        -- "Scott", "Friend's friend", or null
  is_test         boolean default false,  -- user-checked "this is a test run"

  -- Per-instrument data
  pit_answers     jsonb,       -- full Pit matchup history
  pit_scores     jsonb,       -- final Pit scores with bt_strength/elo/win_rate
  ranking_answers jsonb,       -- ranking entries
  ranking_scores  jsonb,       -- ranking entries scored
  all_results     jsonb,       -- canonical {pit: {...}, ranking: {...}}
  instruments_run text[],      -- ['pit','ranking']

  -- Feedback (set later by /api/save-feedback)
  feedback_thumbs text,        -- 'up' | 'side' | 'down' | null
  feedback_at     timestamptz,

  -- Metadata
  total_duration_ms bigint,
  completed_at      timestamptz default now(),
  created_at        timestamptz default now()
);

-- Index for the stats page filtering on is_test
create index if not exists idx_personal_responses_is_test
  on personal_responses (is_test);

-- Index for completed_at (so future "responses over time" queries are fast)
create index if not exists idx_personal_responses_completed_at
  on personal_responses (completed_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- Notes
-- ─────────────────────────────────────────────────────────────────────────────
-- 1. The serverless functions use SUPABASE_SERVICE_KEY (bypasses RLS), so
--    no row-level security policies are required. If you later open up the
--    REST API directly to the browser, add RLS and policies.
--
-- 2. To export data for analysis: Supabase dashboard → Table Editor →
--    personal_responses → ··· menu → Export CSV. Or use the SQL editor
--    with `select * from personal_responses where is_test = false`.
--
-- 3. To delete all test runs: `delete from personal_responses where is_test = true;`
