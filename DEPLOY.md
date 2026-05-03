# Protocol v4.0 — Deployment Guide

You'll be deploying to Cloudflare Pages with a D1 (SQLite) database. Free tier, no credit card.

**Total time: ~10 minutes.**

## Prerequisites

- Cloudflare account (you said you have one)
- Node.js 20+ installed locally
- Git access to the repo

## Step 1 — Clone & install

```bash
git clone <repo-url>
cd workout-tracker/app
npm install
```

## Step 2 — Authenticate with Cloudflare

```bash
npx wrangler login
```
Opens browser. Approve.

## Step 3 — Create the D1 database

```bash
npx wrangler d1 create protocol-workout-db
```

Output looks like:
```
✅ Successfully created DB 'protocol-workout-db'
[[d1_databases]]
binding = "DB"
database_name = "protocol-workout-db"
database_id = "abc123-...-xyz789"   ← COPY THIS
```

## Step 4 — Update wrangler.toml

Open `app/wrangler.toml` and replace `PLACEHOLDER_REPLACE_WITH_ACTUAL_ID` with the `database_id` from step 3.

## Step 5 — Run migrations

```bash
# Apply schema
npx wrangler d1 execute protocol-workout-db --remote --file=./migrations/0001_initial_schema.sql

# Seed program (Push, Pull, Legs A, Upper, Legs B)
npx wrangler d1 execute protocol-workout-db --remote --file=./migrations/0002_seed_program.sql
```

Verify:
```bash
npx wrangler d1 execute protocol-workout-db --remote --command="SELECT name FROM workout_templates"
```
Should show 5 workouts.

## Step 6 — Deploy to Cloudflare Pages

### Option A: Deploy directly via wrangler

```bash
npm run build
npx wrangler pages deploy .svelte-kit/cloudflare --project-name=protocol-workout
```

Output gives you the URL: `https://protocol-workout.pages.dev`

### Option B: Connect GitHub for auto-deploy

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → Workers & Pages
2. Create application → Pages → Connect to Git
3. Select the `nsdub/workout-tracker` repo
4. Build settings:
   - Build command: `cd app && npm install && npm run build`
   - Build output directory: `app/.svelte-kit/cloudflare`
5. Add D1 binding:
   - Settings → Functions → D1 database bindings
   - Variable name: `DB`
   - D1 database: `protocol-workout-db`

## Step 7 — Set your auth PIN

Choose a 4-8 digit PIN you'll remember. Then:

```bash
npx wrangler pages secret put AUTH_PIN --project-name=protocol-workout
```

Paste your PIN when prompted. This is encrypted and only readable by your worker.

## Step 8 — Open the app

Visit `https://protocol-workout.pages.dev`

Enter your PIN. Start training.

## Add to home screen (PWA)

**iOS:** Safari → Share → Add to Home Screen
**Android:** Chrome → menu → Add to Home Screen

The app works offline once installed (sets queue locally and sync when online).

---

## Troubleshooting

**"DB not available" error:**
- Verify D1 binding is set in Pages settings (Settings → Functions → D1)
- Variable name MUST be exactly `DB` (case-sensitive)

**"Auth not configured" error:**
- Set the `AUTH_PIN` secret (Step 7)
- Redeploy: `npx wrangler pages deploy .svelte-kit/cloudflare --project-name=protocol-workout`

**Migration fails:**
- Use `--remote` flag for production database
- Use `--local` flag if testing with `wrangler pages dev`

**Want to change the program later:**
- Edit `app/migrations/0002_seed_program.sql`
- Drop and recreate (DESTRUCTIVE — backup first!):
  ```bash
  npx wrangler d1 execute protocol-workout-db --remote --command="DROP TABLE template_exercises; DROP TABLE workout_templates; DROP TABLE programs;"
  npx wrangler d1 execute protocol-workout-db --remote --file=./migrations/0001_initial_schema.sql
  npx wrangler d1 execute protocol-workout-db --remote --file=./migrations/0002_seed_program.sql
  ```

---

## What's deployed

- **Frontend:** SvelteKit, mobile-first PWA, served from Cloudflare's edge
- **Database:** Cloudflare D1 (SQLite), persistent, replicated globally
- **Auth:** PIN-based, sessions stored in D1, 30-day expiry
- **Cost:** $0 (Cloudflare free tier covers everything for single-user scale)

## Free tier limits (you'll never hit these)

- 5 GB D1 storage (you'll use ~10 MB even after years)
- 100,000 Workers requests/day (you'll use ~50/day)
- 500 builds/month
- Unlimited bandwidth on Pages

---

**That's it. Train.**
