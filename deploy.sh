#!/usr/bin/env bash
# Protocol v4.0 - One-shot deployment script
# Run from the workout-tracker/app directory.
#
# Prerequisites:
#   - Node.js 20+
#   - You're logged in to Cloudflare via `npx wrangler login`
#     (or have CLOUDFLARE_API_TOKEN set in env)
#
# Usage:
#   cd app/
#   bash ../deploy.sh

set -euo pipefail

cd "$(dirname "$0")/app"

echo "═══════════════════════════════════════════════════"
echo "  Protocol v4.0 — One-shot Cloudflare Deployment"
echo "═══════════════════════════════════════════════════"

# Step 1: Install deps if missing
if [ ! -d "node_modules" ]; then
  echo "▸ Installing dependencies..."
  npm install
fi

# Step 2: Verify Cloudflare auth
echo "▸ Verifying Cloudflare auth..."
if ! npx wrangler whoami 2>&1 | grep -q "associated"; then
  echo "✗ Not logged in. Run: npx wrangler login"
  echo "  Or set: export CLOUDFLARE_API_TOKEN=your_token"
  exit 1
fi

# Step 3: Create D1 database (idempotent — skips if exists)
echo "▸ Creating D1 database (or reusing existing)..."
DB_OUTPUT=$(npx wrangler d1 create protocol-workout-db 2>&1 || true)
if echo "$DB_OUTPUT" | grep -q "already exists"; then
  echo "  D1 database already exists — looking up ID..."
  DB_ID=$(npx wrangler d1 list --json 2>/dev/null | grep -o '"uuid":[^,]*' | head -1 | cut -d'"' -f4)
elif echo "$DB_OUTPUT" | grep -q "database_id"; then
  DB_ID=$(echo "$DB_OUTPUT" | grep -oE '"[a-f0-9-]{36}"' | head -1 | tr -d '"')
else
  echo "✗ Could not create or find D1 database. Output:"
  echo "$DB_OUTPUT"
  exit 1
fi
echo "  D1 database_id: $DB_ID"

# Step 4: Update wrangler.toml with the database_id
echo "▸ Updating wrangler.toml..."
sed -i.bak "s/PLACEHOLDER_REPLACE_WITH_ACTUAL_ID/$DB_ID/g" wrangler.toml || \
  sed -i "" "s/PLACEHOLDER_REPLACE_WITH_ACTUAL_ID/$DB_ID/g" wrangler.toml
rm -f wrangler.toml.bak

# Step 5: Apply migrations
echo "▸ Applying schema migration..."
npx wrangler d1 execute protocol-workout-db --remote --file=./migrations/0001_initial_schema.sql

echo "▸ Seeding program data..."
npx wrangler d1 execute protocol-workout-db --remote --file=./migrations/0002_seed_program.sql

# Step 6: Build
echo "▸ Building SvelteKit app..."
npm run build

# Step 7: Deploy to Pages
echo "▸ Deploying to Cloudflare Pages..."
npx wrangler pages deploy .svelte-kit/cloudflare --project-name=protocol-workout --commit-dirty=true

# Step 8: Set AUTH_PIN secret
echo ""
echo "═══════════════════════════════════════════════════"
echo "  Almost done! Set your login PIN now."
echo "═══════════════════════════════════════════════════"
echo "Choose a 4-8 digit PIN you'll remember."
echo "Run THIS command and paste your PIN when prompted:"
echo ""
echo "    npx wrangler pages secret put AUTH_PIN --project-name=protocol-workout"
echo ""
echo "After setting the PIN, your app is live at:"
echo "    https://protocol-workout.pages.dev"
echo ""
echo "Add it to your phone's home screen for PWA experience."
