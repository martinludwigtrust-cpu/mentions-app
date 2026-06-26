export default async function handler(req, res) {
  const key = process.env.GOOGLE_PLACES_KEY;
  
  if (!key) {
    return res.status(200).json({ error: 'GOOGLE_PLACES_KEY not set' });
  }

  // Test the simplest possible Places API call
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=restaurant+in+Plettenberg+Bay&key=${key}`;
  
  try {
    const response = await fetch(url);
    const text = await response.text();
    
    return res.status(200).json({
      key_preview: key.slice(0, 12) + '...',
      http_status: response.status,
      raw_response: text.slice(0, 500)
    });
  } catch(e) {
    return res.status(200).json({ fetch_error: e.message });
  }
}
