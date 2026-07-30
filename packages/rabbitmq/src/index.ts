import { env } from '@shipu/config/env';
import { createLogger } from '@shipu/logger/service-logger';
import amqp, { Channel, ChannelModel } from 'amqplib';

export const logger = createLogger('rabbitmq');
const log = logger.child({ module: 'rabbitmq-connection' });

// Taking connection string from the shared config file
const RABBITMQ_URL = env.RABBITMQ_URL;
logger.info(RABBITMQ_URL);

if (!RABBITMQ_URL) {
    const message = 'RABBITMQ_URL is required in environment variable';
    log.error(message);
    throw new Error(message);
}

/**
 * Global cache used during the development.
 *
 * - Caching the connection prevents unnecessary TCP connection and channel creation on every reload.
 */
const globalForRabbitMq = globalThis as unknown as {
    connection?: ChannelModel;
    channel?: Channel;
};

// Singleton connection shared across the application.
let connection: ChannelModel | null = null;

// Singleton channel used for publishing and consuming message.
let channel: Channel | null = null;

// Prevents graceful shutdown from executing multiple times.
let isShuttingDown = false;

// Ensure process signal handlers are registered only once.
let shutdownHandlersRegistered = false;

/**
 * Registers lifecycle listeners for the RabbitMQ channel.
 *
 * - These listeners keep the application's internal state synchronized with the actual broker state by clearing scale references whenever the channel becomes unusable.
 */
const setupChannelListeners = (ch: Channel) => {
    ch.on('error', (error) => {
        log.error({ error }, 'RabbitMQ channel error: ');
    });

    ch.on('close', () => {
        logger.info('RabbitMQ channel closed');
        channel = null;
    });
};

/**
 * Registers lifecycle listeners for the underlying RabbitMQ connection.
 *
 * - If the TCP connection closes unexpectedly, both the connection and channel references become invalid and must be recreated before any further messaging operations.
 */
const setupConnectionListeners = (conn: ChannelModel) => {
    conn.on('error', (error) => {
        log.error({ error }, 'RabbitMQ connection error');
    });
    conn.on('close', () => {
        log.info('RabbitMQ connection closed');
        connection = null;
        channel = null;
    });
};

/**
 * Registers operating system shutdown handlers.
 * - Before the process exit, the RabbitMQ channel and connections are closed gracefully to flush pending operations and release network resources.
 */
const registerShutdownHandler = () => {
    if (shutdownHandlersRegistered || typeof process === 'undefined') return;
    shutdownHandlersRegistered = true;

    const shutdown = async () => {
        if (isShuttingDown) return;
        isShuttingDown = true;
        try {
            if (channel) await channel.close();
            if (connection) await connection.close();
        } catch (error) {
            log.error({ error }, 'Error during RabbitMQ shutdown');
        } finally {
            process.exit(0);
        }
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
};

/**
 * Establishes the application's RabbitMQ connection.
 *
 * - Connection strategy.
 * 1. Return immediately if an active connection already exists.
 * 2. Reuse the cached global connection during development.
 * 3. Otherwise create a new broker connection and communication channel.
 *
 * This function is safe to call multiple times and always maintains a single active RabbitMQ connection.
 */
export const connectionToRabbitMQ = async (): Promise<void> => {
    try {
        // Already connected.
        if (connection && channel) {
            return;
        }

        // Reuse cached instances during development.
        if (globalForRabbitMq.connection && globalForRabbitMq.channel) {
            connection = globalForRabbitMq.connection;
            channel = globalForRabbitMq.channel;
            return;
        }

        // Establish a TCP connection to the RabbitMQ broker.
        connection = await amqp.connect(RABBITMQ_URL);

        // Create an AMQP channel for messaging operations.
        channel = await connection.createChannel();

        logger.info('RabbitMQ connected and ready');

        // Cache the connection during development to avoid duplicate
        // Connections caused by module hot reloading
        setupConnectionListeners(connection);
        setupChannelListeners(channel);

        if (process.env.NODE_ENV !== 'production') {
            globalForRabbitMq.connection = connection;
            globalForRabbitMq.channel = channel;
        }

        registerShutdownHandler();
    } catch (error) {
        log.error({ error }, 'Failed to connect to RabbitMQ');
        connection = null;
        channel = null;
        throw error;
    }
};

/**
 * Returns the active RabbitMQ channel
 *
 * @throws {Error}
 * - Thrown when the RabbitMQ connection has not been initialized.
 */
export const getChannel = (): Channel => {
    if (!channel) {
        const message = 'RabbitMQ channel not initialized. Call connectionToRabbitMQ() first.';
        log.error(message);
        throw new Error(message);
    }
    return channel;
};

export { type Channel, type ChannelModel };
