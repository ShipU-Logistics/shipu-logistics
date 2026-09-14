import http from 'node:http';

import { env } from '@shipu/config/env';
import { databaseService } from '@shipu/database-schema/prisma';
import { connectionToRabbitMQ, rabbitMQService } from '@shipu/rabbitmq/rabbitmq';
import { connectToRedis, redisService } from '@shipu/redis/redis';

import app from './index.ts';
import { logger } from './lib/logger.ts';

/**
 * Server class managing infrastructure initialization, HTTP server binding, and graceful teardown.
 */
export class Server {
    private readonly log = logger.child({ module: 'server-bootstrap' });
    private httpServer: http.Server | null = null;
    private isShuttingDown = false;

    /**
     * Connects all external services concurrently (RabbitMQ, Redis) and binds the HTTP port.
     */
    public async start(): Promise<void> {
        try {
            this.log.info('Connecting to infrastructure dependencies...');

            // Connect RabbitMQ broker and Redis cache concurrently
            await Promise.all([connectionToRabbitMQ(), connectToRedis()]);

            const PORT = env.PORT || 5001;

            this.httpServer = app.listen(PORT, () => {
                this.log.info(`[ShipU Logistics] Server is successfully running on port ${PORT}`);
            });

            this.registerGracefulShutdown();
        } catch (error) {
            this.log.error({ error }, 'Fatal error starting backend server');
            process.exit(1);
        }
    }

    /**
     * Gracefully terminates HTTP server and disconnects DB, Redis, and RabbitMQ pools.
     * Prevents dropped connections during process termination.
     */
    public async shutdown(): Promise<void> {
        if (this.isShuttingDown) return;
        this.isShuttingDown = true;

        this.log.info('Graceful shutdown initiated. Releasing resources...');

        // 1. Stop receiving new HTTP requests
        if (this.httpServer) {
            await new Promise<void>((resolve) => {
                this.httpServer?.close(() => {
                    this.log.info('HTTP listener stopped');
                    resolve();
                });
            });
        }

        // 2. Disconnect database pool, Redis client, and RabbitMQ channel/connection
        await Promise.all([
            databaseService.disconnect(),
            redisService.disconnect(),
            rabbitMQService.disconnect(),
        ]);

        this.log.info('All infrastructure connections closed. Process terminating cleanly.');
        process.exit(0);
    }

    /**
     * Registers process signal handlers for graceful shutdown on SIGINT and SIGTERM.
     */
    private registerGracefulShutdown(): void {
        process.on('SIGINT', () => this.shutdown());
        process.on('SIGTERM', () => this.shutdown());
    }
}

// Bootstrap and run the server
const server = new Server();
server.start();
