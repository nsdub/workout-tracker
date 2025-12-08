/**
 * Protocol Workout Tracker - Sync Backend
 * Cloudflare Worker with KV Storage
 *
 * Deploy: npx wrangler deploy
 * KV Setup: npx wrangler kv:namespace create "PROTOCOL_DATA"
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

// Generate a short 6-character sync code
function generateSyncCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars: I, O, 0, 1
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    try {
      // GET /sync/:code - Load data by sync code
      if (request.method === 'GET' && path.startsWith('/sync/')) {
        const code = path.split('/')[2]?.toUpperCase();
        if (!code || code.length !== 6) {
          return new Response(JSON.stringify({ error: 'Invalid sync code' }), {
            status: 400,
            headers: CORS_HEADERS
          });
        }

        const data = await env.PROTOCOL_DATA.get(code, 'json');
        if (!data) {
          return new Response(JSON.stringify({ error: 'Sync code not found' }), {
            status: 404,
            headers: CORS_HEADERS
          });
        }

        return new Response(JSON.stringify(data), { headers: CORS_HEADERS });
      }

      // POST /sync - Create new sync code and save data
      if (request.method === 'POST' && path === '/sync') {
        const body = await request.json();

        // Generate unique code
        let code;
        let attempts = 0;
        do {
          code = generateSyncCode();
          const existing = await env.PROTOCOL_DATA.get(code);
          if (!existing) break;
          attempts++;
        } while (attempts < 10);

        if (attempts >= 10) {
          return new Response(JSON.stringify({ error: 'Could not generate unique code' }), {
            status: 500,
            headers: CORS_HEADERS
          });
        }

        const data = {
          ...body,
          syncCode: code,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Store with 1 year expiration
        await env.PROTOCOL_DATA.put(code, JSON.stringify(data), {
          expirationTtl: 365 * 24 * 60 * 60
        });

        return new Response(JSON.stringify({ syncCode: code, message: 'Created' }), {
          status: 201,
          headers: CORS_HEADERS
        });
      }

      // PUT /sync/:code - Update existing data
      if (request.method === 'PUT' && path.startsWith('/sync/')) {
        const code = path.split('/')[2]?.toUpperCase();
        if (!code || code.length !== 6) {
          return new Response(JSON.stringify({ error: 'Invalid sync code' }), {
            status: 400,
            headers: CORS_HEADERS
          });
        }

        const existing = await env.PROTOCOL_DATA.get(code, 'json');
        if (!existing) {
          return new Response(JSON.stringify({ error: 'Sync code not found' }), {
            status: 404,
            headers: CORS_HEADERS
          });
        }

        const body = await request.json();
        const data = {
          ...body,
          syncCode: code,
          createdAt: existing.createdAt,
          updatedAt: new Date().toISOString()
        };

        await env.PROTOCOL_DATA.put(code, JSON.stringify(data), {
          expirationTtl: 365 * 24 * 60 * 60
        });

        return new Response(JSON.stringify({ syncCode: code, message: 'Updated' }), {
          headers: CORS_HEADERS
        });
      }

      // Health check
      if (request.method === 'GET' && path === '/health') {
        return new Response(JSON.stringify({ status: 'ok' }), { headers: CORS_HEADERS });
      }

      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: CORS_HEADERS
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: CORS_HEADERS
      });
    }
  }
};
