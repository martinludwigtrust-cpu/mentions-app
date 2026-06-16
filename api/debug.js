export default function handler(req, res) {
  const key = process.env.ANTHROPIC_API_KEY;
  res.status(200).json({
    key_set: !!key,
    key_length: key ? key.length : 0,
    key_start: key ? key.slice(0, 15) : 'NOT SET',
    key_end: key ? key.slice(-4) : 'NOT SET'
  });
}
