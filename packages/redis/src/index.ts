import { env } from '@shipu/config/env';
import { createLogger } from '@shipu/logger/service-logger';
import { Redis } from 'ioredis';

export const logger = createLogger('redis');
const log = logger.child({ module: 'redis-connection' });

// Redis connection URL loaded from shared config package
const REDIS_URL = env.REDIS_URL;

// Singleton Redis client shared across the application
let redisClient: Redis | null = null;

/**
 * Global cache used during development.
 *
 * - Development environments may reload modules without restarting the process. Caching the Redis client prevents duplicate connections from being created during hot reloads.
 */
const globalForRedis = globalThis as unknown as {
    redis?: Redis;
};

/**
 * Establishes a connection to the Redis server.
 *
 * - Connection strategy:
 * 1. Return the existing client if already connected.
 * 2. Reuse the cached client during development.
 * 3. Otherwise create a new Redis client.
 *
 * This function is safe to call multiple times and guarantees a single Redis client instance throughout the application.
 */
export const connectToRedis = async (): Promise<Redis> => {
    try {
        // Reuse the active client.
        if (redisClient) {
            return redisClient;
        }

        // Reuse the cached client during development.
        if (globalForRedis.redis) {
            redisClient = globalForRedis.redis;
            return redisClient;
        }

        // Validate the Redis connection string.
        if (!REDIS_URL) {
            const message = 'REDIS_URL is required';
            log.error(message);
            throw new Error(message);
        }

        // Create a Redis client with the production-friendly reconnect and retry configuration.
        const client = new Redis(REDIS_URL, {
            // Required when Redis is used with blocking commands, queues or pub/sub.
            maxRetriesPerRequest: null,

            // Wait until Redis is fully redis before accepting requests
            enableReadyCheck: true,

            /**
             * Configure exponential reconnection attempts.
             *
             * - Returning a number instructs ioredis to reconnect after the specified delay
             */
            retryStrategy(times) {
                const delay = Math.max(times * 5, 2000);
                return delay;
            },

            /**
             * Automatically reconnect when the server becomes temporarily read-only (for example, during failover).
             */
            reconnectOnError(error) {
                const targetError = 'READONLY';
                if (error.message.includes(targetError)) {
                    return true;
                }
                return false;
            },
        });

        /**
         * Register Redis lifecycle events for logging and monitoring
         */
        client.on('connect', () => {
            log.info('Redis connecting');
        });

        client.on('ready', () => {
            log.info('Redis is connected and ready');
        });

        client.on('error', (error) => {
            log.error({ error }, 'Redis error');
        });

        client.on('reconnecting', () => {
            log.info('Redis reconnecting');
        });

        /**
         * Register graceful shutdown handlers.
         *
         * - Closing the Redis client ensures pending commands are flushed before the application terminates.
         */

        if (typeof process !== 'undefined') {
            process.on('SIGINT', async () => {
                await client.quit();
                process.exit(0);
            });

            process.on('SIGTERM', async () => {
                await client.quit();
                process.exit(0);
            });
        }

        // Cache the client for future requests.
        redisClient = client;

        // Preserve the client across hot reloads during development.
        if (env.NODE_ENV !== 'production') {
            globalForRedis.redis = client;
        }

        return client;
    } catch (error) {
        log.error({ error }, 'Failed to connect redis client');
        throw error;
    }
};

/**
 * Returns the active Redis client.
 *
 * @throws {Error}
 * - Throws when the Redis client has not been initialized.
 */
export const getRedisClient = (): Redis => {
    if (!redisClient) {
        const message = 'Redis client not initialized. Call connectToRedis() first.';
        log.error(message);
        throw new Error(message);
    }
    return redisClient;
};

/**
 * Re-export the Redis type so consuming packages can import everything from a single module.
 */
export { Redis };
