import { randomUUID } from 'node:crypto';

import { RateLimitResult } from '@shipu/types-config/types';

import { getRedisClient, logger } from './index.ts';

type PipelineResult = [Error | null, unknown];

const log = logger.child({ module: 'redis-ratelimit' });

/**
 * Redis-backend sliding window rate limiter.
 *
 * Requests are stored in a Redis stored set (ZSET), where:
 * - Score: Request timestamp (milliseconds)
 * - Member: Timestamp combined with a UUID for uniqueness
 *
 * Before each request, expired entries are removed so only requests within the configured time window are considered.
 */

export const rateLimit = {
    /**
     * Checks whether a request is allowed under the configured sliding window rate limit.
     *
     * Workflow:
     * - Remove expired requests.
     * - Count active requests.
     * - Reject if the limit has been reached.
     * - otherwise record the current request.
     * @param identifier - Unique client identifier (user ID, API key, IP, etc.).
     * @param maxRequest - Maximum requests allowed within the window.
     * @param windowSeconds - Sliding window duration in seconds.
     * @param keyPrefix - keyPrefix Redis key namespace.
     * @returns Current rate limit status
     */
    async check(
        identifier: string,
        maxRequest: number,
        windowSeconds: number,
        keyPrefix = 'rateLimit',
    ): Promise<RateLimitResult> {
        const redis = getRedisClient();

        // Redis stored set key representing this client's request history.
        const key = `${keyPrefix}:${identifier}`;
        const now = Date.now();
        const windowStart = now - windowSeconds * 1000;

        /**
         * Remove expired request timestamps and count the remaining requests within the active window.
         * Executing both operations in a single pipeline reduces network overhead.
         */
        const pipeline = redis.multi();
        pipeline.zremrangebyscore(key, 0, windowStart);
        pipeline.zcard(key);

        const results = (await pipeline.exec()) as PipelineResult[] | null;

        if (!results || results.length < 2) {
            const message = `Rate limit pipeline returned unexpected results for key ${key}`;
            log.error(message);
            throw new Error(message);
        }

        const pruneResult = results[0];
        const cardResult = results[1];

        if (!pruneResult || !cardResult) {
            const message = `Rate limit pipeline returned malformed results for key ${key}`;
            log.error(message);
            throw new Error(message);
        }

        if (pruneResult[0]) throw pruneResult[0];
        if (cardResult[0]) throw cardResult[0];

        // Number of requests currently inside the sliding window.
        const currentCount = cardResult[1] as number;

        /**
         * Reject the request when the configured limit has been reached.
         *
         * The rejected request is intentionally not recorded, preventing clients from extending their cooldown period through repeated block requests.
         */
        if (currentCount >= maxRequest) {
            const oldest = await redis.zrange(key, 0, 0, 'WITHSCORES');

            // The oldest remaining request determines when another request becomes available.
            const oldestScore = oldest.length ? Number(oldest[1]) : now;
            const resetTime = oldestScore + windowSeconds * 1000;

            return {
                allowed: false,
                remaining: 0,
                resetTime,
                retryAfter: Math.max(0, Math.ceil((resetTime - now) / 1000)),
            };
        }

        /**
         * Record the current request.
         *
         * Appending a UUID prevents collisions when multiple requests occur within the same millisecond.
         */
        const member = `${now}:${randomUUID()}`;
        const writePipeline = redis.multi();
        writePipeline.zadd(key, now, member);

        // Automatically remove inactive rate-limit keys once the sliding window has completely elapsed.
        writePipeline.expire(key, windowSeconds);

        const writeResults = (await writePipeline.exec()) as PipelineResult[] | null;

        if (writeResults) {
            for (const result of writeResults) {
                if (result?.[0]) throw result[0];
            }
        }

        // Return the updated rate limit state after recording the successful request.
        return {
            allowed: true,
            remaining: maxRequest - (currentCount + 1),
            resetTime: now + windowSeconds * 1000,
        };
    },
};
