/**
 * /api/stats-data
 * Returns aggregate stats from personal_responses.
 *
 * Query params:
 *   ?include_tests=1   include rows where is_test=true (default: exclude)
 *
 * Response shape:
 *   {
 *     total: number,
 *     mean_rounds: number | null,
 *     median_rounds: number | null,
 *     cap_rate: number,           // 0..1
 *     min_stop: number,           // count stopping at 10
 *     primary_distribution: { Style: count, ... },
 *     secondary_distribution: { Style: count, ... },
 *     least_distribution: { Style: count, ... },
 *     thumbs: { up: n, side: n, down: n, none: n },
 *     mean_duration_min: number | null,
 *   }
 *
 * No auth on the GET — output is aggregate, no individual data exposed.
 */
export default async function handler(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Server not configured' });
  }

  const includeTests = req.query?.include_tests === '1';

  try {
    let endpoint = `${supabaseUrl}/rest/v1/personal_responses?select=is_test,pit_scores,pit_answers,feedback_thumbs,total_duration_ms`;
    if (!includeTests) endpoint += '&is_test=not.eq.true';

    const r = await fetch(endpoint, {
      headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` },
    });
    if (!r.ok) return res.status(502).json({ error: 'Supabase error' });
    const rows = await r.json();

    const total = rows.length;
    const mean = arr => arr.length ? arr.reduce((a,b)=>a+b,0) / arr.length : null;
    const median = arr => {
      if (!arr.length) return null;
      const sorted = [...arr].sort((a,b) => a-b);
      return sorted[Math.floor(sorted.length / 2)];
    };

    // Pit rounds
    const pitRoundCounts = rows
      .map(r => Array.isArray(r.pit_answers) ? r.pit_answers.length : null)
      .filter(n => n != null && n > 0);
    const meanRounds   = mean(pitRoundCounts);
    const medianRounds = median(pitRoundCounts);
    const PIT_MAX = 20, PIT_MIN_RD = 10;
    const capCount = pitRoundCounts.filter(n => n >= PIT_MAX).length;
    const minStop  = pitRoundCounts.filter(n => n === PIT_MIN_RD).length;
    const capRate  = pitRoundCounts.length ? capCount / pitRoundCounts.length : 0;

    // Stop-round histogram
    const stopHistogram = {};
    for (let r = PIT_MIN_RD; r <= PIT_MAX; r++) stopHistogram[r] = 0;
    pitRoundCounts.forEach(n => { stopHistogram[Math.min(n, PIT_MAX)]++; });

    // Style distributions — primary, secondary, least
    const primaryDist   = {};
    const secondaryDist = {};
    const leastDist     = {};
    rows.forEach(row => {
      if (!Array.isArray(row.pit_scores) || row.pit_scores.length < 5) return;
      // pit_scores is sorted by rank ascending (rank 1 first)
      const ranked = [...row.pit_scores].sort((a,b) => a.rank - b.rank);
      const p = ranked[0]?.style;
      const s = ranked[1]?.style;
      const l = ranked[4]?.style;
      if (p) primaryDist[p]   = (primaryDist[p]   || 0) + 1;
      if (s) secondaryDist[s] = (secondaryDist[s] || 0) + 1;
      if (l) leastDist[l]     = (leastDist[l]     || 0) + 1;
    });

    // Thumbs
    const thumbs = { up: 0, side: 0, down: 0, none: 0 };
    rows.forEach(row => {
      const v = row.feedback_thumbs;
      if (v && thumbs[v] != null) thumbs[v]++;
      else thumbs.none++;
    });

    // Duration
    const durationsMin = rows
      .filter(r => r.total_duration_ms)
      .map(r => r.total_duration_ms / 60000);
    const meanDurationMin = mean(durationsMin);

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    return res.status(200).json({
      total,
      mean_rounds:           meanRounds    != null ? +meanRounds.toFixed(1)    : null,
      median_rounds:         medianRounds,
      cap_rate:              +capRate.toFixed(3),
      cap_count:             capCount,
      min_stop:              minStop,
      stop_histogram:        stopHistogram,
      primary_distribution:  primaryDist,
      secondary_distribution: secondaryDist,
      least_distribution:    leastDist,
      thumbs,
      mean_duration_min:     meanDurationMin != null ? +meanDurationMin.toFixed(1) : null,
      include_tests:         includeTests,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
