const SUPABASE_URL = 'https://irvmktpyvcxndyenqjwb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ohu7nt7hNBhYC9XEPMOKwg_HZ2ISu8h';

export default async function handler(req, res) {
  const { slug } = req.query;

  if (!slug) {
    return res.status(400).json({ error: 'No slug provided' });
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/contacts?slug=eq.${slug}&limit=1`,
    {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    }
  );

  if (!response.ok) {
    return res.status(500).json({ error: 'Database error' });
  }

  const data = await response.json();

  if (!data || data.length === 0) {
    return res.status(404).json({ error: 'Contact not found' });
  }

  return res.status(200).json(data[0]);
}
