/**
 * /api/admin-data
 * Vercel serverless function — keeps Supabase service role key and admin
 * password server-side, away from the browser.
 *
 * Environment variables to set in Vercel dashboard (Settings → Environment Variables):
 *   SUPABASE_URL          your Supabase project URL
 *   SUPABASE_SERVICE_KEY  your Supabase service role (secret) key
 *   ADMIN_PASSWORD        whatever password you want to use for the dashboard
 */

export default async function handler(req, res) {
  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password, study } = req.body;

  // Check password against environment variable
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Server not configured' });
  }

  // Build Supabase query
  let endpoint = `${supabaseUrl}/rest/v1/survey_responses?select=*&order=completed_at.desc`;
  if (study) endpoint += `&study_id=eq.${encodeURIComponent(study)}`;

  try {
    const r = await fetch(endpoint, {
      headers: {
        'apikey':        serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
    });

    if (!r.ok) {
      const text = await r.text();
      return res.status(502).json({ error: 'Supabase error', detail: text });
    }

    const data = await r.json();

    // Set cache header — data can be up to 30s stale, fine for a dashboard
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate');
    return res.status(200).json(data);

  } catch (e) {
    return res.status(500).json({ error: 'Fetch failed', detail: e.message });
  }
}
