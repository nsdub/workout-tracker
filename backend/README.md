# Protocol Sync Backend

Cloudflare Worker backend for syncing workout data across devices.

## Setup

1. Install Wrangler CLI:
   ```bash
   npm install -g wrangler
   ```

2. Login to Cloudflare:
   ```bash
   wrangler login
   ```

3. Create KV namespace:
   ```bash
   cd backend
   npx wrangler kv:namespace create "PROTOCOL_DATA"
   ```

4. Update `wrangler.toml` with the KV namespace ID from step 3

5. Deploy:
   ```bash
   npx wrangler deploy
   ```

6. Update the `SYNC_API` URL in `index.html` with your worker URL:
   ```
   https://protocol-sync.<your-subdomain>.workers.dev
   ```

## API Endpoints

- `POST /sync` - Create new sync code and save data
- `GET /sync/:code` - Load data by 6-character sync code
- `PUT /sync/:code` - Update existing data
- `GET /health` - Health check

## How It Works

1. First time: App generates a 6-character sync code (e.g., `ABC123`)
2. Data is saved to Cloudflare KV with that code as the key
3. On another device: Enter the sync code to load your data
4. Every workout save auto-syncs to the cloud
