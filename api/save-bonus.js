/**
 * /api/save-bonus
 * Patches bonus engagement data onto an existing survey response row.
 *
 * POST body: { session_id, bonus_engagement, bonus_completed_at }
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Server not configured' });
  }

  const { session_id, ...patch } = req.body;

  if (!session_id) {
    return res.status(400).json({ error: 'Missing session_id' });
  }

  try {
    const r = await fetch(
      `${supabaseUrl}/rest/v1/survey_responses?session_id=eq.${encodeURIComponent(session_id)}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type':  'application/json',
          'apikey':        serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Prefer':        'return=minimal',
        },
        body: JSON.stringify(patch),
      }
    );

    if (!r.ok) {
      const text = await r.text();
      return res.status(502).json({ error: 'Supabase error', detail: text });
    }

    return res.status(200).json({ success: true });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
