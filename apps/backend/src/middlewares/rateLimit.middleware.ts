import { rateLimitService } from '@shipu/redis/rateLimit';
import { NextFunction, Request, Response } from 'express';
import { ReasonPhrases, StatusCodes } from 'http-status-codes';

import { logger } from '../lib/logger.ts';

const log = logger.child({ module: 'redis-rateLimit-middleware' });

/**
 * Configuration options for the sliding-window rate limiting middleware.
 */
interface RateLimitOptions {
    /** Maximum number of requests allowed within the configured window. */
    maxRequests: number;

    /** Duration of the sliding window in seconds. */
    windowSeconds: number;

    /**
     * Redis key prefix used to isolate different rate limit policies.
     * @default "rateLimit"
     */
    keyPrefix?: string;

    /**
     * Override how the client is identified.
     * Defaults to the request IP address when not provided.
     */
    identifier?: (req: Request) => string;
}

/**
 * Class-based Rate Limiter Middleware encapsulating Redis sliding window rate limiting.
 * Sets standard HTTP rate limit headers (X-RateLimit-*) and rejects excess traffic with HTTP 429.
 */
export class RateLimitMiddleware {
    /**
     * Creates an Express middleware handler for rate limiting.
     *
     * @param options - Configuration options for thresholds and key prefixes.
     */
    public static limit(options: RateLimitOptions) {
        const { maxRequests, windowSeconds, keyPrefix = 'rateLimit', identifier } = options;

        return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
            try {
                const clientIdentifier =
                    identifier?.(req) ?? req.ip ?? req.socket.remoteAddress ?? 'unknown';

                const result = await rateLimitService.check(
                    clientIdentifier,
                    maxRequests,
                    windowSeconds,
                    keyPrefix,
                );

                res.setHeader('X-RateLimit-Limit', maxRequests);
                res.setHeader('X-RateLimit-Remaining', result.remaining);
                res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000));

                if (!result.allowed) {
                    if (result.retryAfter !== undefined) {
                        res.setHeader('Retry-After', result.retryAfter);
                    }

                    res.status(StatusCodes.TOO_MANY_REQUESTS).json({
                        success: false,
                        statusCode: StatusCodes.TOO_MANY_REQUESTS,
                        message: ReasonPhrases.TOO_MANY_REQUESTS,
                        retryAfterSeconds: result.retryAfter,
                    });
                    return;
                }

                next();
            } catch (error) {
                // Fail-open strategy: if Redis is unavailable, allow traffic and log downstream
                log.error({ error }, 'Internal server error');
                next();
            }
        };
    }
}
