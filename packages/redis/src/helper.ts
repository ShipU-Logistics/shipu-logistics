import { getRedisClient } from './index.ts';
import { logger } from './index.ts';

const log = logger.child({ module: 'redis-helper' });

/**
 * High level Redis cache abstraction.
 *
 * - Provides a strongly typed interface over common Redis operations, including serialization, expiration, existence checks, atomic counters, and key management.
 * - All values are stored as JSON strings to support arbitrary objects while exposing typed results to consumers.
 */

export const cache = {
    /**
     * Retrieves and deserializes a value from Redis.
     * @param token - Cache key.
     * @returns The parsed value if the key exists, otherwise null.
     */
    async get<T = string>(token: string): Promise<T | null> {
        const redis = getRedisClient();
        const value = await redis.get(token);

        if (value == null || value === undefined) return null;
        try {
            return JSON.parse(value) as T;
        } catch (error) {
            log.error({ error }, `Redis get error of key ${token}`);
            return null;
        }
    },

    /**
     * Serializes and stores a value in Redis.
     * If a TTL is provided, the key automatically expires after the specified number of seconds.
     * @param key - Cache key
     * @param value - Value to cache.
     * @param ttl - Optional expiration time in seconds.
     * @returns True if the operation succeeds.
     */
    async set(key: string, value: unknown, ttl?: number): Promise<boolean> {
        try {
            const stringValue = JSON.stringify(value);
            const redis = getRedisClient();

            if (ttl && ttl > 0) {
                await redis.setex(key, ttl, stringValue);
            } else {
                await redis.set(key, stringValue);
            }
            return true;
        } catch (error) {
            log.error({ error }, `Redis set error ${key}`);
            return false;
        }
    },

    /**
     * Removes a single key from Redis.
     * @param key - Cache key.
     * @returns True if the delete operation succeeds.
     */
    async delete(key: string): Promise<boolean> {
        try {
            const redis = getRedisClient();
            await redis.del(key);
            return true;
        } catch (error) {
            log.error({ error }, `Redis delete error ${key}`);
            return false;
        }
    },

    /**
     * Removes multiple keys in a single Redis command.
     * @param keys - Collection of cache keys.
     * @returns Number of keys successfully removed.
     */
    async deleteMany(keys: string[]): Promise<number> {
        try {
            const redis = getRedisClient();
            if (keys.length === 0) return 0;
            return await redis.del(...keys);
        } catch (error) {
            log.error({ error }, `Redis delete many error ${keys}`);
            return 0;
        }
    },

    /**
     * Determines whether a cache key exists.
     * @param key - Cache key.
     * @returns True if the key exists.
     */
    async exists(key: string): Promise<boolean> {
        try {
            const redis = getRedisClient();
            const result = await redis.exists(key);
            return result === 1;
        } catch (error) {
            log.error({ error }, `Redis exists error ${key}`);
            return false;
        }
    },

    /**
     * Updates the expiration time of an existing cache key.
     * @param key - Cache key.
     * @param seconds - New expiration time in seconds.
     * @returns True if the expiration was updated.
     */
    async expire(key: string, seconds: number): Promise<boolean> {
        try {
            const redis = getRedisClient();
            const result = await redis.expire(key, seconds);
            return result === 1;
        } catch (error) {
            log.error({ error }, `Redis expire error: ${key}`);
            return false;
        }
    },

    /**
     * Retrieves the remaining lifetime of a cache key.
     *
     * Return values:
     * - Positive number: Remaining seconds.
     * - -1: Key exists without expiration.
     * - -2: Key does not exists.
     *
     * @param key  - Cache key
     * @returns Remaining TTL in seconds.
     */
    async ttl(key: string): Promise<number> {
        try {
            const redis = getRedisClient();
            return await redis.ttl(key);
        } catch (error) {
            log.error({ error }, `Redis ttl error: ${key}`);
            return 0;
        }
    },

    /**
     * Atomically retrieves a value and removes the key.
     * - Useful for ont-time tokens, temporary locks, and queue-like processing where data should only be consumed once.
     * @param key - Cache key.
     * @returns Parsed cached value or null.
     */
    async getAndDelete<T = string>(key: string): Promise<T | null> {
        try {
            const redis = getRedisClient();
            const value = await redis.getdel(key);

            if (value === null || value === undefined) return null;

            try {
                return JSON.parse(value) as T;
            } catch (error) {
                log.error({ error }, `Redis getAndDelete parse error: ${key}`);
                return null;
            }
        } catch (error) {
            log.error({ error }, `Redis get and delete error: ${key}`);
            return null;
        }
    },

    /**
     * Atomically increments a numeric value.
     * - If the key does not exists, Redis initializes it to zero before applying the increment.
     * @param key - Cache key.
     * @param by - Increment amount.
     * @returns Updated numeric value.
     */
    async incrementBy(key: string, by: number = 1): Promise<number> {
        try {
            const redis = getRedisClient();
            return await redis.incrby(key, by);
        } catch (error) {
            log.error({ error }, `Redis incrementBy error: ${key}`);
            throw error;
        }
    },

    /**
     * Atomically decrements a numeric value.
     * If the key does not exist, Redis initializes it to zero before applying the decrement.
     * @param key - Cache key.
     * @param by - Decrement amount.
     * @returns Updated numeric value.
     */
    async decrementBy(key: string, by: number = 1): Promise<number> {
        try {
            const redis = getRedisClient();
            return await redis.decrby(key, by);
        } catch (error) {
            log.error({ error }, `Redis decrementBy error: ${key}`);
            throw error;
        }
    },
};
