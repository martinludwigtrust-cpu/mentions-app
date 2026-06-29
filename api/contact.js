const SUPABASE_URL = 'https://aplhpcwomndslvwqxyye.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwbGhwY3dvbW5kc2x2d3F4eXllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzNzYwNTYsImV4cCI6MjA5Nzk1MjA1Nn0.FMAZzxtAEHymjHjbuNvrSA0tAHu75c_G6xA_noFKJV4';

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
