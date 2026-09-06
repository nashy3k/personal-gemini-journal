import { NextRequest } from 'next/server';

interface RateLimitRecord {
  timestamps: number[];
}

class SlidingWindowRateLimiter {
  private records = new Map<string, RateLimitRecord>();
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number, maxRequests: number) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;

    // Periodic cleanup of stale entries every 5 minutes to prevent memory leak
    if (typeof setInterval !== 'undefined') {
      const timer = setInterval(() => {
        const now = Date.now();
        this.records.forEach((record, key) => {
          record.timestamps = record.timestamps.filter((t: number) => now - t < this.windowMs);
          if (record.timestamps.length === 0) {
            this.records.delete(key);
          }
        });
      }, 5 * 60 * 1000);
      if (timer.unref) {
        timer.unref();
      }
    }
  }

  public check(key: string, customLimit?: number, customWindowMs?: number): {
    success: boolean;
    limit: number;
    remaining: number;
    resetInSeconds: number;
  } {
    const now = Date.now();
    const effectiveLimit = customLimit ?? this.maxRequests;
    const effectiveWindow = customWindowMs ?? this.windowMs;

    let record = this.records.get(key);
    if (!record) {
      record = { timestamps: [] };
      this.records.set(key, record);
    }

    // Filter out timestamps outside the active sliding window
    record.timestamps = record.timestamps.filter((t: number) => now - t < effectiveWindow);

    if (record.timestamps.length >= effectiveLimit) {
      const oldest = record.timestamps[0];
      const resetInSeconds = Math.max(1, Math.ceil((oldest + effectiveWindow - now) / 1000));
      return {
        success: false,
        limit: effectiveLimit,
        remaining: 0,
        resetInSeconds,
      };
    }

    record.timestamps.push(now);
    const remaining = effectiveLimit - record.timestamps.length;
    const resetInSeconds = Math.ceil(effectiveWindow / 1000);

    return {
      success: true,
      limit: effectiveLimit,
      remaining,
      resetInSeconds,
    };
  }
}

/**
 * Extracts client IP from Next.js request headers safely on Cloud Run / proxies.
 */
export function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const clientIp = forwardedFor.split(',')[0].trim();
    if (clientIp) return clientIp;
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  return '127.0.0.1';
}

// Pre-configured rate limiters
// 1. Chat Limiter:
// - Authenticated: 30 requests / 60 seconds
// - Guest demo: 5 requests / 600 seconds (10 minutes)
export const authChatLimiter = new SlidingWindowRateLimiter(60 * 1000, 30);
export const guestChatLimiter = new SlidingWindowRateLimiter(10 * 60 * 1000, 5);

// 2. Insights Limiter: 10 requests / 5 minutes
export const insightsLimiter = new SlidingWindowRateLimiter(5 * 60 * 1000, 10);

// 3. Webhook Limiter: 10 requests / 5 minutes
export const webhookLimiter = new SlidingWindowRateLimiter(5 * 60 * 1000, 10);
