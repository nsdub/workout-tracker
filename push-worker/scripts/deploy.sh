#!/usr/bin/env bash
# One-shot deploy. Run from push-worker/:  ./scripts/deploy.sh
# Prereq: `npx wrangler login` (opens a browser, one time).
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f vapid.json ]; then
  echo "→ generating VAPID keys"
  node scripts/gen-vapid.mjs
fi

PUB=$(node -e "console.log(require('./vapid.json').publicKey)")
PRIV=$(node -e "console.log(JSON.stringify(require('./vapid.json').privateJwk))")

echo "→ running the RFC 8291 crypto tests"
node test.mjs

echo "→ publishing the private key as a Worker secret"
printf '%s' "$PRIV" | npx --yes wrangler@latest secret put VAPID_PRIVATE_JWK

echo "→ deploying"
npx --yes wrangler@latest deploy --var VAPID_PUBLIC_KEY:"$PUB"

cat <<EOF

Deployed. Two things left:

1. Copy the worker URL wrangler printed above (https://protocol-rest-push.<subdomain>.workers.dev)
2. In the app: Mission tab → Systems console → "Rest alerts" → paste the URL.
   The app stores it, subscribes this phone, and every rest from then on is
   armed on the worker. The VAPID public key it needs is already baked in:

   $PUB

EOF
