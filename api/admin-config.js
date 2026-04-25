/**
 * /api/admin-config
 * CRUD for study_config table. Password-protected.
 *
 * POST body: {
 *   password: string,
 *   action: 'list' | 'create' | 'update' | 'delete' | 'activate',
 *   ...args depending on action
 * }
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password, action, ...args } = req.body;
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_KEY;
  const headers = {
    'Content-Type':  'application/json',
    'apikey':        serviceKey,
    'Authorization': `Bearer ${serviceKey}`,
  };

  try {
    if (action === 'list') {
      const r = await fetch(`${supabaseUrl}/rest/v1/study_config?select=*&order=created_at.desc`, { headers });
      const data = await r.json();
      return res.status(200).json(data);
    }

    if (action === 'create') {
      const { name, instruments, splash_title, splash_body, prolific_code } = args;
      const r = await fetch(`${supabaseUrl}/rest/v1/study_config`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify({
          name,
          instruments: instruments || [],
          splash_title: splash_title || '',
          splash_body:  splash_body  || '',
          prolific_code: prolific_code || '',
          is_active: false,
        }),
      });
      if (!r.ok) {
        const text = await r.text();
        return res.status(502).json({ error: 'Supabase error', detail: text });
      }
      const data = await r.json();
      return res.status(200).json(data[0]);
    }

    if (action === 'update') {
      const { id, ...patch } = args;
      patch.updated_at = new Date().toISOString();
      const r = await fetch(`${supabaseUrl}/rest/v1/study_config?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify(patch),
      });
      if (!r.ok) {
        const text = await r.text();
        return res.status(502).json({ error: 'Supabase error', detail: text });
      }
      return res.status(200).json({ success: true });
    }

    if (action === 'delete') {
      const { id } = args;
      const r = await fetch(`${supabaseUrl}/rest/v1/study_config?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers,
      });
      if (!r.ok) {
        const text = await r.text();
        return res.status(502).json({ error: 'Supabase error', detail: text });
      }
      return res.status(200).json({ success: true });
    }

    if (action === 'activate') {
      const { id } = args;
      // Deactivate all, then activate the chosen one
      await fetch(`${supabaseUrl}/rest/v1/study_config?is_active=eq.true`, {
        method: 'PATCH',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ is_active: false }),
      });
      const r = await fetch(`${supabaseUrl}/rest/v1/study_config?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ is_active: true, updated_at: new Date().toISOString() }),
      });
      if (!r.ok) {
        const text = await r.text();
        return res.status(502).json({ error: 'Supabase error', detail: text });
      }
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Unknown action' });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
