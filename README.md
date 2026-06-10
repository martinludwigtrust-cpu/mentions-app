# mentions.co.za — Vercel deployment (fixed)

## What changed

The original build called the Anthropic API directly from the browser — that fails on Vercel because there's no API key. This version adds a serverless function (`/api/parse.js`) that makes the API call securely from the server side.

```
mentions-vercel/
├── api/
│   └── parse.js          ← serverless function (holds API key securely)
├── public/
│   ├── index.html        ← upload & parse app (now calls /api/parse)
│   └── landing-preview.html
└── vercel.json           ← routing config
```

---

## Deploy steps

### 1. Get your Anthropic API key
- Go to console.anthropic.com
- Click "API Keys" → "Create Key"
- Copy the key (starts with `sk-ant-...`)

### 2. Deploy to Vercel
- Go to vercel.com → "Add New Project"
- Upload or drag this entire `mentions-vercel` folder
- Vercel will detect the `vercel.json` config automatically

### 3. Add the API key as an environment variable
This is the critical step — without it you'll still get errors.

In your Vercel project:
1. Go to **Settings** → **Environment Variables**
2. Add a new variable:
   - Name: `ANTHROPIC_API_KEY`
   - Value: `sk-ant-...` (your key from step 1)
   - Environment: Production, Preview, Development (tick all three)
3. Click **Save**
4. Go to **Deployments** → click the three dots on your latest deployment → **Redeploy**

### 4. Add your domain
- Settings → Domains → Add `mentions.co.za`
- At your domain registrar (afrihost / ZACR), add a CNAME record:
  - Name: `@` or `www`
  - Value: `cname.vercel-dns.com`

---

## Testing the fix
After redeploying with the env variable set:
1. Open your Vercel URL
2. Drop a WhatsApp .txt export
3. Click "Parse chat & extract contacts"
4. Should work — no "failed to fetch" error

---

## Cost
- Vercel free tier: plenty for this usage
- Anthropic API: ~$0.003 per parse (a few cents per chat file)
