import { env } from '@shipu/config/env';
import { createLogger } from '@shipu/logger/service-logger';
import { Redis } from 'ioredis';

export const logger = createLogger('redis');
const log = logger.child({ module: 'redis-connection' });

// Redis connection URL loaded from shared config package
const REDIS_URL = env.REDIS_URL;

/**
 * Global cache used during development to prevent duplicate connections.
 */
const globalForRedis = globalThis as unknown as {
    redis?: Redis;
};

/**
 * Class-based Redis Service managing connection lifecycle, event listeners, and client access.
 */
export class RedisService {
    private static instance: RedisService;
    private client: Redis | null = null;

    private constructor() {}

    /**
     * Gets the Singleton instance of RedisService.
     */
    public static getInstance(): RedisService {
        if (!RedisService.instance) {
            RedisService.instance = new RedisService();
        }
        return RedisService.instance;
    }

    /**
     * Establishes a connection to the Redis server.
     */
    public async connect(): Promise<Redis> {
        try {
            if (this.client) {
                return this.client;
            }

            if (globalForRedis.redis) {
                this.client = globalForRedis.redis;
                return this.client;
            }

            if (!REDIS_URL) {
                const message = 'REDIS_URL is required';
                log.error(message);
                throw new Error(message);
            }

            const client = new Redis(REDIS_URL, {
                maxRetriesPerRequest: null,
                enableReadyCheck: true,
                retryStrategy(times) {
                    return Math.max(times * 5, 2000);
                },
                reconnectOnError(error) {
                    return error.message.includes('READONLY');
                },
            });

            this.setupEventListeners(client);
            this.registerShutdownHandlers(client);

            this.client = client;

            if (env.NODE_ENV !== 'production') {
                globalForRedis.redis = client;
            }

            return client;
        } catch (error) {
            log.error({ error }, 'Failed to connect redis client');
            throw error;
        }
    }

    /**
     * Returns the active Redis client instance.
     * @throws Error if client is not connected.
     */
    public getClient(): Redis {
        if (!this.client) {
            const message = 'Redis client not initialized. Call connect() first.';
            log.error(message);
            throw new Error(message);
        }
        return this.client;
    }

    /**
     * Gracefully disconnects the Redis client.
     */
    public async disconnect(): Promise<void> {
        if (this.client) {
            await this.client.quit();
            this.client = null;
            log.info('Redis connection closed gracefully');
        }
    }

    /**
     * Registers event listeners on the Redis client.
     */
    private setupEventListeners(client: Redis): void {
        client.on('connect', () => log.info('Redis connecting'));
        client.on('ready', () => log.info('Redis is connected and ready'));
        client.on('error', (error) => log.error({ error }, 'Redis error'));
        client.on('reconnecting', () => log.info('Redis reconnecting'));
    }

    /**
     * Registers process termination handlers.
     */
    private registerShutdownHandlers(client: Redis): void {
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
    }
}

/**
 * Singleton instance export and backwards compatibility functions.
 */
export const redisService = RedisService.getInstance();

export const connectToRedis = async (): Promise<Redis> => {
    return redisService.connect();
};

export const getRedisClient = (): Redis => {
    return redisService.getClient();
};

export { Redis };
