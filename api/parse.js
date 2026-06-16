export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not  allowed' });
  }

  const { chatText, groupName, detail } = req.body;

  if (!chatText) {
    return res.status(400).json({ error: 'No chat text provided' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const excerpt = chatText.slice(0, 28000);

  const systemPrompt = `You are a contact extractor for mentions.co.za, a local business directory powered by WhatsApp chat exports from the Plettenberg Bay area (South Africa).

Extract every vendor, service provider, and business mentioned in the chat. Return ONLY valid JSON — no markdown, no preamble, no explanation.

Return this structure:
{
  "group": "<group name>",
  "extracted_at": "<ISO date>",
  "contacts": [
    {
      "name": "<business name>",
      "category": "<one of: Restaurants, Groceries & Farm, Services, Arts & Shops, Pets & Care, Community, Tech, Health & Medical, Other>",
      "type": "<one of: vendor, service, business>",
      "phone": "<phone number or null>",
      "email": "<email or null>",
      "website": "<website or null>",
      "address": "<address or null>",
      "description": "<1-2 sentence description from context or null>",
      "tags": ["<tag1>", "<tag2>"],
      "mentions": <integer count of how many times this entity is mentioned>,
      "sentiment": "<positive, neutral, or mixed>"
    }
  ]
}

Rules:
- Only extract real businesses, vendors, services — not personal names unless they are operating as a service (e.g. "Benson Handyman")
- If a phone number appears near a business name, assign it
- Count how many distinct messages mention each business
- Categories must be exactly as listed above
- Return only JSON, nothing else`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: 'user', content: `Group name: ${groupName || 'Mentions'}\nDetail level: ${detail || 'full'}\n\nChat export:\n${excerpt}` }]
      })
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(response.status).json({ error: err.error?.message || 'Anthropic API error' });
    }

    const data = await response.json();
    const raw = data.content.map(b => b.text || '').join('');
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
