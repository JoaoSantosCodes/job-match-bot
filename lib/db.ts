import { createClient as createKVClient } from '@vercel/kv';
import { createClient as createRedisClient } from 'redis';

// Global cache for TCP Redis client to prevent multiple connections in hot-reloading/serverless
let globalRedis: any = null;
let globalKVRest: any = null;

function getRESTClient() {
  if (globalKVRest) return globalKVRest;
  
  const restUrl =
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.STORAGE_REST_API_URL ||
    process.env.STORAGE_REST_URL;

  const restToken =
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.STORAGE_REST_API_TOKEN ||
    process.env.STORAGE_REST_TOKEN;
    
  globalKVRest = createKVClient({
    url: restUrl || 'https://missing-redis-url-check-vercel-env-vars.upstash.io',
    token: restToken || 'missing-token'
  });
  return globalKVRest;
}

async function getTCPClient() {
  const redisUrl =
    process.env.REDIS_URL ||
    process.env.STORAGE_URL ||
    process.env.KV_URL;

  let url = redisUrl;
  if (url) {
    url = url.trim();
    if (url.startsWith('"') && url.endsWith('"')) url = url.slice(1, -1);
    if (url.startsWith("'") && url.endsWith("'")) url = url.slice(1, -1);
  }

  if (!url || (!url.startsWith('redis://') && !url.startsWith('rediss://'))) {
    return null;
  }
  
  if (globalRedis) {
    if (!globalRedis.isOpen) {
      await globalRedis.connect();
    }
    return globalRedis;
  }
  
  const maskedUrl = url.replace(/:[^@:]+@/, ':***@');
  console.log(`[Database] Initializing TCP Redis client with URL: ${maskedUrl}`);
  
  const client = createRedisClient({ url });
  client.on('error', (err) => console.error('Redis Client TCP Error:', err));
  await client.connect();
  globalRedis = client;
  return globalRedis;
}

export const kv = {
  async get<T = any>(key: string): Promise<T | null> {
    const tcp = await getTCPClient();
    if (tcp) {
      const val = await tcp.get(key);
      if (val === null) return null;
      try {
        return JSON.parse(val) as T;
      } catch {
        return val as any as T;
      }
    }
    return getRESTClient().get<T>(key);
  },

  async set(key: string, value: any, options?: { ex?: number }): Promise<'OK' | null> {
    const tcp = await getTCPClient();
    if (tcp) {
      const stringVal = typeof value === 'object' ? JSON.stringify(value) : String(value);
      const redisOptions: any = {};
      if (options?.ex !== undefined) {
        redisOptions.EX = options.ex;
      }
      const res = await tcp.set(key, stringVal, redisOptions);
      return res === 'OK' ? 'OK' : null;
    }
    return getRESTClient().set(key, value, options);
  },

  async incr(key: string): Promise<number> {
    const tcp = await getTCPClient();
    if (tcp) {
      return tcp.incr(key);
    }
    return getRESTClient().incr(key);
  },

  async expire(key: string, seconds: number): Promise<number | boolean> {
    const tcp = await getTCPClient();
    if (tcp) {
      const res = await tcp.expire(key, seconds);
      return res ? 1 : 0;
    }
    return getRESTClient().expire(key, seconds);
  },

  async ttl(key: string): Promise<number> {
    const tcp = await getTCPClient();
    if (tcp) {
      return tcp.ttl(key);
    }
    return getRESTClient().ttl(key);
  },

  async keys(pattern: string): Promise<string[]> {
    const tcp = await getTCPClient();
    if (tcp) {
      return tcp.keys(pattern);
    }
    return getRESTClient().keys(pattern);
  }
};
