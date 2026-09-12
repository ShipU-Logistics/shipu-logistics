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

const globalForRabbitMq = globalThis as unknown as {
    connection?: ChannelModel;
    channel?: Channel;
};

// Class-based RabbitMQ Service managing connection lifecycle, channels, and graceful shutdown.
export class RabbitMQServices {
    private static instance: RabbitMQServices;
    private connection: ChannelModel | null = null;
    private channel: Channel | null = null;
    private isShuttingDown = false;
    private shutdownHandlersRegistered = false;

    private constructor() {}

    // Gets the Singleton instance of RabbitMQServices.
    public static getInstance(): RabbitMQServices {
        if (!RabbitMQServices.instance) {
            RabbitMQServices.instance = new RabbitMQServices();
        }

        return RabbitMQServices.instance;
    }

    // Establishes connection to the RabbitMQ broker and creates an AMQP channel.
    public async connect(): Promise<void> {
        try {
            if (this.connection && this.channel) {
                return;
            }

            if (globalForRabbitMq.connection && globalForRabbitMq.channel) {
                this.connection = globalForRabbitMq.connection;
                this.channel = globalForRabbitMq.channel;
                return;
            }

            this.connection = await amqp.connect(RABBITMQ_URL!);
            this.channel = await this.connection.createChannel();

            log.info('RabbitMQ connection and ready');

            this.setupConnectionListeners(this.connection);
            this.setupChannelListeners(this.channel);

            if (process.env.NODE_ENV !== 'production') {
                globalForRabbitMq.connection = this.connection;
                globalForRabbitMq.channel = this.channel;
            }

            this.registerShutdownHandler();
        } catch (error) {
            log.error({ error }, 'Failed to connect to RabbitMQ');
            this.channel = null;
            this.connection = null;
            throw error;
        }
    }

    /**
     * Returns the active RabbitMQ channel.
     * @throws Error if channel is not initialized.
     */
    public getChannel(): Channel {
        if (!this.channel) {
            const message = 'RabbitMQ channel not initialized. Call connect() first.';
            log.error(message);
            throw new Error(message);
        }
        return this.channel;
    }

    // Returns the active RabbitMQ connection.
    public getConnection(): ChannelModel | null {
        return this.connection;
    }

    // Gracefully close channel and connection.
    public async disconnect(): Promise<void> {
        if (this.isShuttingDown) return;
        this.isShuttingDown = true;

        try {
            if (this.channel) {
                await this.channel.close();
                this.channel = null;
            }

            if (this.connection) {
                await this.connection.close();
                this.connection = null;
            }
        } catch (error) {
            log.error({ error }, 'Error closing RabbitMQ connection');
        }
    }

    // Register channel listeners.
    private setupChannelListeners(ch: Channel): void {
        ch.on('error', (error) => {
            log.error({ error }, 'RabbitMQ channel error');
        });

        ch.on('close', () => {
            log.info('RabbitMQ channel closed');
            this.channel = null;
        });
    }

    // Register connection listeners.
    private setupConnectionListeners(conn: ChannelModel): void {
        conn.on('error', (error) => {
            log.error({ error }, 'RabbitMQ connection error');
        });

        conn.on('close', () => {
            log.info('RabbitMQ connection closed');
            this.connection = null;
            this.channel = null;
        });
    }

    // Registers process shutdown handlers.
    private registerShutdownHandler(): void {
        if (this.shutdownHandlersRegistered || typeof process === 'undefined') return;
        this.shutdownHandlersRegistered = true;

        const shutdown = async () => {
            await this.disconnect();
            process.exit(0);
        };

        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
    }
}

// Singleton instance export and backwards compatibility functions.
export const rabbitMQService = RabbitMQServices.getInstance();

export const connectionToRabbitMQ = async (): Promise<void> => {
    return rabbitMQService.connect();
};
export const getChannel = (): Channel => {
    return rabbitMQService.getChannel();
};
export { type Channel, type ChannelModel };
