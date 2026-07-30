import type { Redis } from 'ioredis';

import { getRedisClient, logger } from './index.ts';

const log = logger.child({ module: 'redis-pubsub' });

/**
 * Redis Publish/Subscribe helper.
 *
 * Provides a simple abstraction over Redis Pub/Sub while handling connection management, structured logging, and error propagation.
 */
export const pubsub = {
    /**
     * Publishes a message to a Redis channel.
     *
     * Redis immediately forwards the message to every client currently subscribed to the specified channel.
     *
     * @param channel - Target pub/sub channel.
     * @param message - Message payload.
     * @returns - Number of subscribers that received the message.
     */
    async publish(channel: string, message: string): Promise<number> {
        try {
            const redis = getRedisClient();
            return await redis.publish(channel, message);
        } catch (error) {
            log.error({ error, channel }, 'Redis publish error');
            throw error;
        }
    },

    /**
     * Creates a dedicated Redis subscriber connection.
     *
     * A duplicated Redis connection is required because enters subscriber mode, it can no longer execute n commands such as GET, SET or DEL.
     *
     * @param channels - One or more channels to subscribe to.
     * @param callback - Invoked whenever a message is received.
     * @returns - The active Redis subscriber connection.
     */
    async subscribe(
        channels: string | string[],
        callback: (channel: string, message: string) => void,
    ): Promise<Redis> {
        const redis = getRedisClient();

        // Create a dedicated connection for pub/sub operations.
        const subscriber = redis.duplicate();

        // Normalize the input into an array so both single-channel and multi-channel subscriptions follow the same code path.
        const channelArray = Array.isArray(channels) ? channels : [channels];

        return new Promise((resolve, reject) => {
            // Subscribe to the requested channels.
            subscriber.subscribe(...channelArray, (error, count) => {
                if (error) {
                    log.error({ error, channels: channelArray }, 'Redis subscribe failed');

                    // Close the duplicated connection if subscription fails to avoid leaking resources.
                    subscriber.quit().catch((quitError) => {
                        log.error(
                            { error: quitError },
                            'Failed to quit subscriber after subscribe error',
                        );
                    });
                    reject(error);
                    return;
                }
                log.info({ channels: channelArray, count }, 'Redis subscriber connected');
                resolve(subscriber);
            });

            /**
             * Listen for message published to the subscribed channels.
             *
             * Ebery received message is forwarded to the caller's callback for application-specified processing.
             */
            subscriber.on('message', (channel, message) => {
                log.debug({ channel }, 'Redis message received');
                callback(channel, message);
            });

            /**
             * Monitor subscriber connection errors.
             *
             * Connection recovery is handled internally by ioredis, but logging these events helps diagnose connectivity issues in production environments.
             */
            subscriber.on('error', (error) => {
                log.error({ error, channels: channelArray }, 'Redis subscriber connection error');
            });
        });
    },
};
