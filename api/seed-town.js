const SUPABASE_URL = 'https://aplhpcwomndslvwqxyye.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwbGhwY3dvbW5kc2x2d3F4eXllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzNzYwNTYsImV4cCI6MjA5Nzk1MjA1Nn0.FMAZzxtAEHymjHjbuNvrSA0tAHu75c_G6xA_noFKJV4';

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
  'restaurants': 'Restaurants',
  'cafes': 'Restaurants',
  'coffee': 'Restaurants',
  'takeaways': 'Restaurants',
  'bakeries': 'Restaurants',
  'groceries': 'Groceries & Farm',
  'supermarkets': 'Groceries & Farm',
  'farm stalls': 'Groceries & Farm',
  'butchers': 'Groceries & Farm',
  'hardware': 'Services',
  'plumbers': 'Services',
  'electricians': 'Services',
  'builders': 'Services',
  'painters': 'Services',
  'plumbing': 'Services',
  'electrical': 'Services',
  'construction': 'Services',
  'cleaning': 'Services',
  'galleries': 'Arts & Shops',
  'art': 'Arts & Shops',
  'clothing': 'Arts & Shops',
  'gifts': 'Arts & Shops',
  'furniture': 'Arts & Shops',
  'vets': 'Pets & Care',
  'pet': 'Pets & Care',
  'doctors': 'Health & Medical',
  'pharmacies': 'Health & Medical',
  'dentists': 'Health & Medical',
  'beauty': 'Health & Medical',
  'salons': 'Health & Medical',
  'spa': 'Health & Medical',
  'schools': 'Community',
  'churches': 'Community',
  'accommodation': 'Other',
  'guesthouses': 'Other',
  'estate agents': 'Other',
  'attorneys': 'Other',
  'accountants': 'Other'
};

function getCategory(keyword) {
  const k = keyword.toLowerCase();
  for (const [key, cat] of Object.entries(CATEGORY_MAP)) {
    if (k.includes(key)) return cat;
  }
  return 'Other';
}

// Parse yep.co.za HTML to extract business listings
function parseYepHTML(html, category) {
  const businesses = [];
  
  // Extract business cards using regex patterns
  // Each business card contains name, address, phone
  const namePattern = /<h[23][^>]*class="[^"]*(?:business|listing|company)[^"]*"[^>]*>([^<]+)<\/h[23]>/gi;
  const altNamePattern = /class="[^"]*(?:biz-name|business-name|listing-name)[^"]*"[^>]*>([^<]+)</gi;
  
  // Look for structured data or meta patterns
  const jsonLdPattern = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let jsonMatch;
  
  while ((jsonMatch = jsonLdPattern.exec(html)) !== null) {
    try {
      const data = JSON.parse(jsonMatch[1]);
      const items = Array.isArray(data) ? data : [data];
      
      for (const item of items) {
        if (item['@type'] === 'LocalBusiness' || item['@type'] === 'Restaurant' || 
            item['@type'] === 'Store' || item.name) {
          const name = item.name;
          if (!name) continue;
          
          businesses.push({
            name: name.trim(),
            phone: item.telephone || null,
            email: item.email || null,
            address: item.address ? 
              (typeof item.address === 'string' ? item.address : 
               [item.address.streetAddress, item.address.addressLocality, item.address.postalCode]
               .filter(Boolean).join(', ')) : null,
            website: item.url || null,
            description: item.description || null,
            category
          });
        }
      }
    } catch(e) {}
  }

  // Fallback: parse HTML cards directly
  if (businesses.length === 0) {
    // Match business listing blocks
    const cardPattern = /class="[^"]*(?:card|listing|result|business)[^"]*"[\s\S]*?(?=class="[^"]*(?:card|listing|result|business)[^"]*"|$)/gi;
    
    // Simple name extraction from common patterns
    const h3Pattern = /<(?:h2|h3|h4)[^>]*>([\s\S]*?)<\/(?:h2|h3|h4)>/gi;
    const phonePattern = /(?:\+27|0)[\s-]?(?:\d[\s-]?){8,9}/g;
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const addrPattern = /\d+\s+[A-Z][a-zA-Z\s]+(?:Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Lane|Ln|Way|Place|Pl)[^<]*/g;

    let h3Match;
    while ((h3Match = h3Pattern.exec(html)) !== null) {
      const rawName = h3Match[1].replace(/<[^>]+>/g, '').trim();
      if (rawName.length > 2 && rawName.length < 80 && !rawName.match(/^\d+$/)) {
        businesses.push({
          name: rawName,
          phone: null,
          email: null,
          address: null,
          website: null,
          description: null,
          category
        });
      }
    }

    // Try to match phones to businesses
    const phones = html.match(phonePattern) || [];
    const emails = html.match(emailPattern) || [];
    
    businesses.forEach((b, i) => {
      if (phones[i]) b.phone = phones[i].replace(/\s+/g, '');
      if (emails[i]) b.email = emails[i];
    });
  }

  return businesses;
}

const SEARCH_KEYWORDS = [
  'restaurants', 'cafes', 'groceries', 'supermarkets',
  'hardware', 'plumbers', 'electricians', 'builders',
  'doctors', 'pharmacies', 'dentists', 'beauty salons',
  'art galleries', 'clothing', 'accommodation', 'schools',
  'vets', 'attorneys', 'estate agents', 'accountants'
];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { town_slug, town_name, keyword_index = 0 } = req.body;
  if (!town_slug || !town_name) return res.status(400).json({ error: 'Missing fields' });

  const keyword = SEARCH_KEYWORDS[keyword_index];
  if (!keyword) return res.status(200).json({ done: true });

  const category = getCategory(keyword);
  const results = { saved: 0, skipped: 0, errors: [], keyword, category };

  try {
    // Try multiple URL formats yep.co.za uses
    const urls = [
      `https://mall.yep.co.za/serviceSearch?keyword=${encodeURIComponent(keyword)}&location=${encodeURIComponent(town_name)}`,
      `https://www.yep.co.za/search?q=${encodeURIComponent(keyword)}&where=${encodeURIComponent(town_name)}`,
      `https://yep.co.za/search/${encodeURIComponent(keyword)}/${encodeURIComponent(town_name)}`
    ];

    let response = null;
    let workingUrl = null;
    for (const u of urls) {
      try {
        const r = await fetch(u, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-ZA,en;q=0.9',
            'Referer': 'https://mall.yep.co.za/',
            'Cache-Control': 'no-cache'
          }
        });
        if (r.ok) { response = r; workingUrl = u; break; }
        results.errors.push({ url: u, status: r.status });
      } catch(e) {
        results.errors.push({ url: u, error: e.message });
      }
    }
    if (!response) return res.status(200).json({ ...results, error: 'All URLs returned errors' });

    if (!response.ok) {
      return res.status(200).json({ ...results, error: `HTTP ${response.status}` });
    }

    const html = await response.text();
    results.html_length = html.length;

    const businesses = parseYepHTML(html, category);
    results.found = businesses.length;

    for (const biz of businesses) {
      if (!biz.name || biz.name.length < 2) continue;

      const slug = makeSlug(biz.name);
      const record = {
        name: biz.name,
        slug,
        town_slug,
        category: biz.category,
        type: 'business',
        phone: biz.phone || null,
        email: biz.email || null,
        website: biz.website || null,
        address: biz.address || null,
        description: biz.description || null,
        tags: [keyword],
        mentions: 0,
        tier: 'grey',
        source: 'yep_co_za',
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
        else results.errors.push({ name: biz.name, error: err.message });
      }
    }

    // Mark town seeded on last keyword
    if (keyword_index >= SEARCH_KEYWORDS.length - 1) {
      await fetch(`${SUPABASE_URL}/rest/v1/towns?slug=eq.${town_slug}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        },
        body: JSON.stringify({ seeded: true })
      });
      results.done = true;
    }

    return res.status(200).json({ town: town_slug, ...results });

  } catch(e) {
    return res.status(200).json({ ...results, error: e.message });
  }
}
