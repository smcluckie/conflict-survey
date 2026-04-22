/**
 * /api/save-response
 * Receives a survey payload and saves it to Supabase server-side.
 * No credentials needed in the browser.
 *
 * POST body: the full survey payload object
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

  try {
    const r = await fetch(`${supabaseUrl}/rest/v1/survey_responses`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify(req.body),
    });

    if (!r.ok) {
      const text = await r.text();
      return res.status(502).json({ error: 'Supabase error', detail: text });
    }

    return res.status(200).json({ success: true });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
