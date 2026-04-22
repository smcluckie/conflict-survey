/**
 * /api/exclude-response
 * Toggles the `excluded` boolean on a survey_responses row.
 *
 * POST body: { password, session_id, excluded: true|false }
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password, session_id, excluded } = req.body;

  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!session_id || excluded === undefined) {
    return res.status(400).json({ error: 'Missing session_id or excluded' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_KEY;

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
        body: JSON.stringify({ excluded: !!excluded }),
      }
    );

    if (!r.ok) {
      const text = await r.text();
      return res.status(502).json({ error: 'Supabase error', detail: text });
    }

    return res.status(200).json({ success: true, session_id, excluded });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
