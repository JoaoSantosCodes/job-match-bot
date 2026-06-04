import { createClient } from '@vercel/kv';

// Central KV client with automatic fallback support for Upstash Redis variables
export const kv = createClient({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || ''
});
