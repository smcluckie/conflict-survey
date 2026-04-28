# Conflict Style Assessment — Personal Edition

A passive-collection conflict-style assessment using an adaptive head-to-head ("Pit") algorithm with Elo-driven sampling and Bradley-Terry final scoring. No accounts, no payments, no Prolific. Anyone who finds the page can take it; results are aggregated into a public stats page.

## Stack

- **Static HTML + Vercel serverless functions + Supabase**
- Fonts via Google Fonts CDN
- jsPDF (CDN) for the optional PDF download

## Files

```
/
├── index.html              # the assessment (splash → setup → Pit → ranking → results)
├── stats.html              # public-facing aggregate stats page (/stats)
├── vercel.json             # cleanUrls: true
├── setup.sql               # Supabase schema (run once in SQL editor)
├── README.md               # this file
└── api/
    ├── save-personal.js    # POST /api/save-personal  — saves a completed response
    ├── save-feedback.js    # POST /api/save-feedback  — patches thumbs onto a row
    └── stats-data.js       # GET  /api/stats-data     — returns aggregates for stats.html
```

## First-time setup

1. **Create a Supabase project** (a new one, separate from anything else).
2. **Run `setup.sql`** in the Supabase SQL Editor. Creates the `personal_responses` table.
3. **In Vercel project settings → Environment Variables**, add:
   - `SUPABASE_URL` — your project URL (Settings → API)
   - `SUPABASE_SERVICE_KEY` — your service role secret key (Settings → API → service_role)
4. **Deploy.** Push to the connected git repo and Vercel auto-deploys.

## Routing

With `cleanUrls: true`:
- `/` → assessment (`index.html`)
- `/stats` → aggregate stats (`stats.html`)
- `/api/save-personal` etc. → serverless functions

## How it works

### The assessment (`index.html`)

A 3-part flow:

1. **Splash** — what this is, click Begin.
2. **Setup** — optional name/label and a "this is a test run" checkbox. The checkbox flags the row so test-run noise can be filtered out of stats.
3. **Pit** — adaptive head-to-head matchups. Round 1 is fully random; subsequent rounds are picked by an Elo-driven scorer that prioritizes top-2 disambiguation. Stops when:
   - At least 10 rounds played
   - Every style has played ≥ 3 matches
   - Elo gap rank-1-to-2 ≥ 60, rank-2-to-3 ≥ 55, rank-4-to-5 ≥ 55
   - Cap at 20 rounds
4. **Ranking** — drag/tap-to-reorder all 5 styles by description. Acts as a self-comparison anchor.

### Scoring

- **During sampling**: incremental Elo updates (K=64, start=1000) drive pair selection.
- **Final scoring**: Bradley-Terry MLE on the complete match history. BT looks at all matches at once and accounts for opponent strength symmetrically. The participant's ranking is sorted by `bt_strength`. `win_rate`, `wins`, `matches`, and `elo` are also stored for legacy compatibility and analysis.

### Results page

- Primary style + Secondary style (if its strength clears 3/8 = 0.375 win rate) get full descriptive cards.
- Ranks 3-5 (and rank 2 if its strength is below threshold) group under "Less Dominant Styles" with shorter neutral framing.
- Below the cards, a thumbs feedback prompt: 👍 / 👌 / 👎. Tap fires `/api/save-feedback` to patch the choice onto the response row.
- PDF download generates a single-page profile.

### Stats page

`/stats` shows live aggregates pulled from `/api/stats-data`:

- Total responses (excludes test runs by default; toggle to include)
- Mean Pit rounds + median + cap rate
- Average session duration
- Distribution of primary, secondary, and least-dominant styles
- Thumbs feedback breakdown (👍 / 👌 / 👎)
- Stop-round histogram (visualizes whether the algorithm is converging)

No individual rows are exposed.

## Editing splash text

Search `index.html` for `EDIT SPLASH TEXT HERE` — the `<p>` blocks below the comment. Change directly.

## Editing the Pit stopping thresholds

In `index.html`, search for `PIT_GAP_TOP12`. Three constants control the stopping rule (Elo gap thresholds for rank-1↔2, rank-2↔3, rank-4↔5). Lowering them = stops sooner with less confidence; raising them = needs more evidence before stopping. Cap is `PIT_MAX = 20`.

## Data export

Supabase dashboard → Table Editor → `personal_responses` → "..." menu → Export CSV. Or in SQL editor:

```sql
select * from personal_responses where is_test = false order by completed_at desc;
```

To clear test runs:
```sql
delete from personal_responses where is_test = true;
```

## Future-proofing notes

- The `bt_strength` field on each pit score is the canonical ranking value going forward. `win_rate` is kept for legacy/diagnostic purposes.
- Each match in `pit_answers` has `eloA_before`/`eloA_after` for analyzing convergence dynamics if needed.
- `is_test` is boolean — if you ever want richer tagging (categories, etc.), add a column.
- The thumbs question is fixed at three options. If you want to expand to a free-text "why?" later, add a `feedback_text` column and surface a textarea after the user taps a thumb.

## Origin

This is a stripped-down version of a Prolific-based research project. The full version (with TKI baseline, multi-study config, and admin dashboard) lives in a separate repo. If this version proves useful at scale, useful changes can flow back to the research version.
