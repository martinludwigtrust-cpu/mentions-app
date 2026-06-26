const SUPABASE_URL = 'https://irvmktpyvcxndyenqjwb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ohu7nt7hNBhYC9XEPMOKwg_HZ2ISu8h';
const GOOGLE_KEY = process.env.GOOGLE_PLACES_KEY;

const CATEGORY_MAP = {
  'restaurant': 'Restaurants', 'cafe': 'Restaurants', 'bakery': 'Restaurants',
  'bar': 'Restaurants', 'food': 'Restaurants', 'meal_takeaway': 'Restaurants',
  'grocery_or_supermarket': 'Groceries & Farm', 'supermarket': 'Groceries & Farm',
  'farm': 'Groceries & Farm', 'natural_food_store': 'Groceries & Farm',
  'electrician': 'Services', 'plumber': 'Services', 'painter': 'Services',
  'car_repair': 'Services', 'laundry': 'Services', 'locksmith': 'Services',
  'general_contractor': 'Services', 'roofing_contractor': 'Services',
  'art_gallery': 'Arts & Shops', 'clothing_store': 'Arts & Shops',
  'home_goods_store': 'Arts & Shops', 'furniture_store': 'Arts & Shops',
  'book_store': 'Arts & Shops', 'gift_shop': 'Arts & Shops',
  'veterinary_care': 'Pets & Care', 'pet_store': 'Pets & Care',
  'hospital': 'Health & Medical', 'pharmacy': 'Health & Medical',
  'doctor': 'Health & Medical', 'dentist': 'Health & Medical',
  'physiotherapist': 'Health & Medical', 'beauty_salon': 'Health & Medical',
  'spa': 'Health & Medical',
  'school': 'Community', 'church': 'Community', 'place_of_worship': 'Community',
  'library': 'Community', 'community_center': 'Community',
  'electronics_store': 'Tech', 'internet_cafe': 'Tech'
};

const PLACE_TYPES = [
  'restaurant', 'cafe', 'bakery', 'grocery_or_supermarket', 'supermarket',
  'electrician', 'plumber', 'car_repair', 'laundry', 'general_contractor',
  'art_gallery', 'clothing_store', 'home_goods_store', 'gift_shop',
  'veterinary_care', 'pet_store', 'hospital', 'pharmacy', 'doctor',
  'dentist', 'beauty_salon', 'spa', 'school', 'electronics_store'
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

async function searchPlaces(query, location, radius = 10000) {
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&location=${location}&radius=${radius}&key=${GOOGLE_KEY}`;
  const res = await fetch(url);
  const text = await res.text();
  try {
    const data = JSON.parse(text);
    if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Google API error: ${data.status} — ${data.error_message || ''}`);
    }
    return data.results || [];
  } catch(e) {
    throw new Error(`Google response invalid: ${text.slice(0, 100)}`);
  }
}

async function getPlaceDetails(placeId) {
  const fields = 'name,formatted_phone_number,website,formatted_address,types,opening_hours';
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${GOOGLE_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.result || {};
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { town_slug, town_name, lat, lng } = req.body;
  if (!town_slug || !lat || !lng) return res.status(400).json({ error: 'town_slug, lat, lng required' });
  if (!GOOGLE_KEY) return res.status(500).json({ error: 'GOOGLE_PLACES_KEY not set' });

  const location = `${lat},${lng}`;
  const results = { saved: 0, skipped: 0, errors: [] };
  const seen = new Set();

  for (const type of PLACE_TYPES) {
    try {
      const places = await searchPlaces(`${type} in ${town_name}`, location);
      for (const place of places.slice(0, 5)) {
        if (seen.has(place.place_id)) continue;
        seen.add(place.place_id);

        let details = {};
        try { details = await getPlaceDetails(place.place_id); } catch(e) {}

        const name = place.name || details.name;
        if (!name) continue;

        const slug = makeSlug(name);
        const category = getCategory(place.types || details.types || []);

        const record = {
          name,
          slug,
          town_slug,
          category,
          type: 'business',
          phone: details.formatted_phone_number || null,
          website: details.website || null,
          address: details.formatted_address || place.formatted_address || null,
          description: null,
          tags: (place.types || []).slice(0, 3),
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

        if (saveRes.ok) results.saved++;
        else {
          const err = await saveRes.json();
          if (err.code === '23505') results.skipped++;
          else results.errors.push({ name, error: err.message });
        }

        // Small delay to avoid Google rate limits
        await new Promise(r => setTimeout(r, 200));
      }
    } catch(e) {
      results.errors.push({ type, error: e.message });
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
