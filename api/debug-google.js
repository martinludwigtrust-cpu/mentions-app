export default async function handler(req, res) {
  const key = process.env.GOOGLE_PLACES_KEY;
  const results = { key_set: !!key, key_preview: key ? key.slice(0,12)+'...' : 'NOT SET', tests: [] };

  // Test 1: basic connectivity
  try {
    const r = await fetch('https://httpbin.org/get');
    results.tests.push({ test: 'basic_connectivity', status: r.status, ok: r.ok });
  } catch(e) {
    results.tests.push({ test: 'basic_connectivity', error: e.message });
  }

  // Test 2: Google DNS
  try {
    const r = await fetch('https://www.google.com', { method: 'HEAD' });
    results.tests.push({ test: 'google_reachable', status: r.status, ok: r.ok });
  } catch(e) {
    results.tests.push({ test: 'google_reachable', error: e.message });
  }

  // Test 3: Places API
  try {
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=restaurant+Plettenberg+Bay&key=${key}`;
    const r = await fetch(url);
    const text = await r.text();
    results.tests.push({ test: 'places_api', status: r.status, preview: text.slice(0,120) });
  } catch(e) {
    results.tests.push({ test: 'places_api', error: e.message });
  }

  return res.status(200).json(results);
}
