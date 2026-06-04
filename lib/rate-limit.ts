import { NextRequest } from 'next/server';
import { kv } from './db';

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp in seconds when the rate limit window resets
}

/**
 * Performs rate limiting based on the client's IP address using Vercel KV.
 * Falls back to "fail-open" (allows request) if Vercel KV encounters a transient error.
 *
 * @param request The NextRequest object to extract the client IP from.
 * @param limit Maximum number of requests allowed within the window (default: 10).
 * @param windowSeconds Duration of the rate limit window in seconds (default: 3600 = 1 hour).
 */
export async function rateLimit(
  request: NextRequest,
  limit: number = 10,
  windowSeconds: number = 3600
): Promise<RateLimitResult> {
  // Extract client IP address using standard proxy headers or Vercel edge properties
  const ip =
    (request as any).ip ||
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1';

  const key = `ratelimit:${ip}`;

  try {
    const current = await kv.incr(key);

    if (current === 1) {
      // Set expiration only on the first request of the window
      await kv.expire(key, windowSeconds);
    }

    const ttl = await kv.ttl(key);
    const resetTime = Math.floor(Date.now() / 1000) + (ttl > 0 ? ttl : windowSeconds);

    if (current > limit) {
      return {
        success: false,
        limit,
        remaining: 0,
        reset: resetTime
      };
    }

    return {
      success: true,
      limit,
      remaining: limit - current,
      reset: resetTime
    };
  } catch (error) {
    console.error('Rate Limiter error (failing open):', error);
    // Fail-open: Let the user proceed if Redis is unreachable
    return {
      success: true,
      limit,
      remaining: 1,
      reset: Math.floor(Date.now() / 1000) + windowSeconds
    };
  }
}
