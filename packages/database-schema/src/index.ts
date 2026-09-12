import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PrismaPg } from '@prisma/adapter-pg';
import { createLogger } from '@shipu/logger/service-logger';
import { config } from 'dotenv';

import { PrismaClient } from '../prisma/generated/prisma/client.js';

export const logger = createLogger('database');
const log = logger.child({ module: 'database-connection' });

/**
 * Resolve the current file and directory path.
 * Since ES Modules don't provide __dirname__ and __filename__ like CommonJS,
 * we recreate them using fileURLToPath().
 */
const __filename__ = fileURLToPath(import.meta.url);
const __dirname__ = path.dirname(__filename__);

// Loading the .env variable from the project's .env file in root directory
const envResult = config({ path: path.join(__dirname__, '../.env') });

if (envResult.error) {
    log.warn('Warning: could not load .env file');
}

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    const message = 'DATABASE_URL is required';
    log.error(message);
    throw new Error(message);
}

/**
 * Global cache object used during development to prevent duplicate database connection pools.
 */
const globalForPrisma = globalThis as unknown as {
    prisma?: PrismaClient;
};

/**
 * DatabaseService class managing the Prisma client connection lifecycle and graceful shutdown.
 */
export class DatabaseService {
    private static instance: DatabaseService;
    public readonly client: PrismaClient;
    private isDisconnecting = false;

    private constructor() {
        this.client =
            globalForPrisma.prisma ??
            new PrismaClient({
                adapter: new PrismaPg({
                    connectionString: DATABASE_URL,
                }),
            });

        if (process.env.NODE_ENV !== 'production') {
            globalForPrisma.prisma = this.client;
        }

        this.registerShutdownHandlers();
    }

    /**
     * Gets the Singleton instance of DatabaseService.
     */
    public static getInstance(): DatabaseService {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
        }
        return DatabaseService.instance;
    }

    /**
     * Returns the active Prisma Client instance.
     */
    public getClient(): PrismaClient {
        return this.client;
    }

    /**
     * Gracefully disconnects the Prisma client database connection pool.
     */
    public async disconnect(): Promise<void> {
        if (this.isDisconnecting) return;
        this.isDisconnecting = true;
        try {
            await this.client.$disconnect();
            log.info('Prisma disconnected successfully');
        } catch (err) {
            log.error({ err }, 'Error disconnecting Prisma');
        }
    }

    /**
     * Registers process termination handlers to cleanly disconnect the database pool.
     */
    private registerShutdownHandlers(): void {
        if (typeof process !== 'undefined') {
            process.on('SIGINT', async () => {
                await this.disconnect();
                process.exit(0);
            });

            process.on('SIGTERM', async () => {
                await this.disconnect();
                process.exit(0);
            });

            process.on('beforeExit', async () => {
                await this.disconnect();
            });
        }
    }
}

/**
 * Export singleton instance and convenience exports for backwards compatibility.
 */
export const databaseService = DatabaseService.getInstance();
export const prisma = databaseService.getClient();
