import { createClient } from '@vercel/kv';

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

if (!url || !token) {
  console.warn(
    'WARNING: Upstash Redis / Vercel KV connection variables are missing in this environment. ' +
    'Please link your Redis database to the project on the Vercel dashboard.'
  );
}

// Using placeholder URL to prevent Node.js fetch from throwing "Failed to parse URL from /pipeline"
// during initialization or pre-rendering.
export const kv = createClient({
  url: url || 'https://missing-redis-url-check-vercel-env-vars.upstash.io',
  token: token || 'missing-token'
});
