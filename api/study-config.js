/**
 * /api/study-config
 * Returns the currently active study config to the survey.
 * Public — no password needed.
 */

export default async function handler(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Server not configured' });
  }

  try {
    const r = await fetch(
      `${supabaseUrl}/rest/v1/study_config?is_active=eq.true&select=*&limit=1`,
      {
        headers: {
          'apikey':        serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
        },
      }
    );

    if (!r.ok) {
      return res.status(502).json({ error: 'Supabase error' });
    }

    const data = await r.json();
    if (!data.length) {
      return res.status(404).json({ error: 'No active config' });
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    return res.status(200).json(data[0]);

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
