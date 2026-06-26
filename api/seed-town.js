const SUPABASE_URL = 'https://irvmktpyvcxndyenqjwb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ohu7nt7hNBhYC9XEPMOKwg_HZ2ISu8h';
const GOOGLE_KEY = process.env.GOOGLE_PLACES_KEY;

const CATEGORY_MAP = {
  'restaurant':'Restaurants','cafe':'Restaurants','bakery':'Restaurants',
  'bar':'Restaurants','food':'Restaurants','meal_takeaway':'Restaurants',
  'meal_delivery':'Restaurants','night_club':'Restaurants',
  'grocery_or_supermarket':'Groceries & Farm','supermarket':'Groceries & Farm',
  'convenience_store':'Groceries & Farm','natural_food_store':'Groceries & Farm',
  'electrician':'Services','plumber':'Services','painter':'Services',
  'car_repair':'Services','laundry':'Services','locksmith':'Services',
  'general_contractor':'Services','roofing_contractor':'Services',
  'moving_company':'Services','storage':'Services',
  'art_gallery':'Arts & Shops','clothing_store':'Arts & Shops',
  'home_goods_store':'Arts & Shops','furniture_store':'Arts & Shops',
  'book_store':'Arts & Shops','gift_shop':'Arts & Shops','jewelry_store':'Arts & Shops',
  'shopping_mall':'Arts & Shops','store':'Arts & Shops',
  'veterinary_care':'Pets & Care','pet_store':'Pets & Care',
  'hospital':'Health & Medical','pharmacy':'Health & Medical',
  'doctor':'Health & Medical','dentist':'Health & Medical',
  'physiotherapist':'Health & Medical','beauty_salon':'Health & Medical',
  'spa':'Health & Medical','hair_care':'Health & Medical',
  'school':'Community','church':'Community','place_of_worship':'Community',
  'library':'Community','community_center':'Community','gym':'Community',
  'electronics_store':'Tech','internet_cafe':'Tech'
};

const SEARCH_QUERIES = [
  'restaurants', 'cafes', 'grocery stores', 'supermarkets',
  'hardware stores', 'car repair', 'hair salon', 'beauty salon',
  'pharmacy', 'doctor', 'dentist', 'clothing store',
  'art gallery', 'gift shop', 'accommodation', 'hotel',
  'electrician', 'plumber', 'school', 'church', 'gym'
];

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

function getCategory(types = []) {
  for (const t of types) {
    if (CATEGORY_MAP[t]) return CATEGORY_MAP[t];
  }
  return 'Other';
}

async function searchPlaces(query, location) {
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&location=${location}&radius=15000&key=${GOOGLE_KEY}`;
  const res = await fetch(url);
  const text = await res.text();
  try {
    const data = JSON.parse(text);
    if (data.status === 'REQUEST_DENIED') throw new Error(`API denied: ${data.error_message}`);
    return data.results || [];
  } catch(e) {
    if (e.message.startsWith('API denied')) throw e;
    throw new Error(`Parse error: ${text.slice(0, 100)}`);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { town_slug, town_name, lat, lng } = req.body;
  if (!town_slug || !lat || !lng) return res.status(400).json({ error: 'town_slug, lat, lng required' });
  if (!GOOGLE_KEY) return res.status(500).json({ error: 'GOOGLE_PLACES_KEY not set' });

  const location = `${lat},${lng}`;
  const results = { saved: 0, skipped: 0, errors: [] };
  const seen = new Set();

  for (const query of SEARCH_QUERIES) {
    try {
      const places = await searchPlaces(`${query} in ${town_name} South Africa`, location);

      for (const place of places.slice(0, 8)) {
        if (seen.has(place.place_id)) { results.skipped++; continue; }
        seen.add(place.place_id);

        const name = place.name;
        if (!name) continue;

        const slug = makeSlug(name);
        const category = getCategory(place.types || []);

        // Extract phone from vicinity if present
        const address = place.formatted_address || place.vicinity || null;

        const record = {
          name,
          slug,
          town_slug,
          category,
          type: 'business',
          phone: null,
          website: null,
          address,
          description: null,
          tags: (place.types || []).filter(t => !['point_of_interest','establishment','premise'].includes(t)).slice(0, 3),
          mentions: 0,
          sentiment: 'neutral',
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

        if (saveRes.ok) {
          results.saved++;
        } else {
          const err = await saveRes.json();
          if (err.code === '23505') results.skipped++;
          else results.errors.push({ name, error: err.message });
        }

        await new Promise(r => setTimeout(r, 100));
      }

      await new Promise(r => setTimeout(r, 300));

    } catch(e) {
      results.errors.push({ query, error: e.message });
    }
  }

  // Mark town as seeded
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
}
