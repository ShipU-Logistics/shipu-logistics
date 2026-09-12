import { rateLimit, rateLimitService } from '@shipu/redis/rateLimit';
import { NextFunction, Request, Response } from 'express';

// Configuration options for the rate limiting middleware
interface RateLimitOptions {
    // Maximum number of requests allowed within the configured windows.
    maxRequests: number;

    // Duration of the sliding window in seconds.
    windowSeconds: number;

    /**
     * Redis key prefix used to isolate different rate limit policies.
     * Defaults to "rateLimit"
     */
    keyPrefix?: string;

    /**
     * Override how the client is identified.
     * Defaults to the request IP address when not provided.
     */
    identifier?: (req: Request) => string;
}

// Class-based Rate Limiter Middleware encapsulating Redis sliding window rate limiting.
export class RateLimitMiddleware {
    // Creates an Express middleware handler for rate limiting.
    public static limit(options: RateLimitOptions) {
        const { maxRequests, windowSeconds, keyPrfix = 'rateLimit', identifier } = options;

        return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
            try {
                const clientIdentifier = identifier?.(req) ?? req.ip ?? req.socket.remoteAddress ?? 'unknown';

                const result = await rateLimitService.check(
                    clientIdentifier,
                    maxRequests,
                    windowSeconds,
                    keyPrfix
                );

                res.setHeader('X-RateLimit-Limit', maxRequests);
                res.setHeader('X-RateLimit-Remaining', result.remaining);
                res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000));

                if (result.allowed) {
                    
                }
            } catch (error) {
                
            }
        }
    }
}
