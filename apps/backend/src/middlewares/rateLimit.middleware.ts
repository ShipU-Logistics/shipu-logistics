import { rateLimit } from '@shipu/redis/rateLimit';
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

/**
* Creates an Express middleware that enforces Redis-backend sliding window rate limiting.
*
* The middleware:
* 1. Identifies the client.
* 2. Checks the configured rate limit.
* 3. Exposes standard rate limit headers.
* 4. Rejects requests that exceed the configured limit.

* @param options - Rate limiter configuration.
* @returns Express middleware.
*/

export const rateLimitMiddleware = ({
    maxRequests,
    windowSeconds,
    keyPrefix = 'rateLimit',
    identifier,
}: RateLimitOptions) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            /**
             * Determine the unique identifier used for rate limiting.
             *
             * Resolution order:
             * 1. Custom identifier callback.
             * 2. Express request IP.
             * 3. underlying socket address.
             * 4. Fallback identifer.
             */
            const clientIdentifier =
                identifier?.(req) ?? req.ip ?? req.socket.remoteAddress ?? 'unknown';

            // Evaluating the request against the configured sliding window rate limiter.
            const result = await rateLimit.check(
                clientIdentifier,
                maxRequests,
                windowSeconds,
                keyPrefix,
            );

            // Expose standard rate limit headers so client can monitor their current quota.
            res.setHeader('X-RateLimit-Limit', maxRequests);

            res.setHeader('X-RateLimit-Remaining', result.remaining);

            // Reset time is returned as a Unix timestamp in seconds, matching the format expected by most HTTP clients.
            res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000));

            /**
             * Reject requests that exceed the configured limit.
             *
             * The Reject-After header is included when available to indicate when the client may safely retry.
             */

            if (!result.allowed) {
                if (result.retryAfter !== undefined) {
                    res.setHeader('Retry-After', result.retryAfter);
                }

                // continue processing the request.
                next();
            }
        } catch (error) {
            // Forward unexpected errors to the global error handler.
            next(error);
        }
    };
};
