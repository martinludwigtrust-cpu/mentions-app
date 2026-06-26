const SUPABASE_URL = 'https://irvmktpyvcxndyenqjwb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ohu7nt7hNBhYC9XEPMOKwg_HZ2ISu8h';
const GOOGLE_KEY = process.env.GOOGLE_PLACES_KEY;

const STOP_WORDS = ['and','the','of','a','an','at','by','for','in','on','to',
  'cafe','restaurant','grill','bar','shop','store','studio','services','service',
  'solutions','trading','farm','garden','market','gallery','repairs',
  'construction','mobile','internet','wifi','only','rescue','project',
  'tree','elderly','aesthetics','ceramics','pottery','brewing','company','stall'];

function makeSlug(name) {
  const words = name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP_WORDS.includes(w));
  return words.slice(0, 2).join('').slice(0, 14) ||
    name.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 10);
}

const CATEGORY_MAP = {
  'restaurant':'Restaurants','cafe':'Restaurants','bakery':'Restaurants',
  'bar':'Restaurants','grocery_or_supermarket':'Groceries & Farm',
  'supermarket':'Groceries & Farm','electrician':'Services',
  'car_repair':'Services','beauty_salon':'Health & Medical',
  'pharmacy':'Health & Medical','doctor':'Health & Medical',
  'clothing_store':'Arts & Shops','art_gallery':'Arts & Shops',
  'veterinary_care':'Pets & Care','school':'Community','church':'Community'
};

function getCategory(types = []) {
  for (const t of types) { if (CATEGORY_MAP[t]) return CATEGORY_MAP[t]; }
  return 'Other';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { town_slug, town_name, lat, lng } = req.body;
  if (!town_slug || !lat || !lng) return res.status(400).json({ error: 'Missing fields' });
  if (!GOOGLE_KEY) return res.status(500).json({ error: 'GOOGLE_PLACES_KEY not set' });

  const results = { saved: 0, skipped: 0, errors: [], log: [] };

  try {
    // Single test query first
    results.log.push('Starting Google search...');
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=businesses+in+${encodeURIComponent(town_name)}+South+Africa&location=${lat},${lng}&radius=15000&key=${GOOGLE_KEY}`;
    
    results.log.push('Fetching from Google...');
    const response = await fetch(url);
    
    results.log.push(`HTTP status: ${response.status}`);
    const text = await response.text();
    results.log.push(`Response preview: ${text.slice(0, 80)}`);

    const data = JSON.parse(text);
    results.log.push(`Google status: ${data.status}, results: ${(data.results||[]).length}`);

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      return res.status(200).json({ ...results, error: `Google: ${data.status} — ${data.error_message || ''}` });
    }

    // Save each result
    for (const place of (data.results || []).slice(0, 20)) {
      const slug = makeSlug(place.name);
      const record = {
        name: place.name,
        slug,
        town_slug,
        category: getCategory(place.types || []),
        type: 'business',
        address: place.formatted_address || place.vicinity || null,
        tags: (place.types || []).slice(0, 3),
        mentions: 0,
        tier: 'grey',
        source: 'google_places',
        updated_at: new Date().toISOString()
      };

      const saveRes = await fetch(`${SUPABASE_URL}/rest/v1/contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(record)
      });

      if (saveRes.ok) results.saved++;
      else {
        const err = await saveRes.json();
        results.errors.push({ name: place.name, error: err.message });
      }
    }

    // Mark town seeded
    await fetch(`${SUPABASE_URL}/rest/v1/towns?slug=eq.${town_slug}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({ seeded: true })
    });

    return res.status(200).json({ town: town_slug, ...results });

  } catch(e) {
    results.log.push(`Exception: ${e.message}`);
    return res.status(200).json({ ...results, error: e.message });
  }
}
