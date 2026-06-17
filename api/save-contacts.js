const SUPABASE_URL = 'https://irvmktpyvcxndyenqjwb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ohu7nt7hNBhYC9XEPMOKwg_HZ2ISu8h';

const STOP_WORDS = ['and','the','of','a','an','at','by','for','in','on','to','cafe','restaurant','grill','bar','shop','store','studio','services','service','solutions','trading','farm','garden','market','gallery','repairs','construction','mobile','internet','wifi','only','rescue','project','tree','elderly','aesthetics','ceramics','pottery','brewing','company','stall','bay','plettenberg'];

function makeShortSlug(name) {
  const words = name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP_WORDS.includes(w));
  const slug = words.slice(0, 2).join('');
  return slug.slice(0, 14) || name.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 10);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { contacts, town_slug } = req.body;
  if (!contacts || !Array.isArray(contacts)) return res.status(400).json({ error: 'No contacts provided' });
  if (!town_slug) return res.status(400).json({ error: 'No town_slug provided' });

  const results = { saved: 0, updated: 0, errors: [] };

  for (const contact of contacts) {
    const slug = makeShortSlug(contact.name);
    const record = {
      name: contact.name,
      slug,
      town_slug,
      category: contact.category || 'Other',
      type: contact.type || 'business',
      phone: contact.phone || null,
      email: contact.email || null,
      website: contact.website || null,
      address: contact.address || null,
      description: contact.description || null,
      tags: contact.tags || [],
      mentions: contact.mentions || 1,
      sentiment: contact.sentiment || 'neutral',
      source: 'wa_export',
      updated_at: new Date().toISOString()
    };

    const response = await fetch(`${SUPABASE_URL}/rest/v1/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(record)
    });

    if (response.ok) {
      results.saved++;
    } else {
      const err = await response.json();
      results.errors.push({ name: contact.name, error: err.message });
    }
  }

  return res.status(200).json(results);
}
