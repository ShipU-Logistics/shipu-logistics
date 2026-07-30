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
 * Since ES Modules don't provide __dirname__ and  __filename__ like commonJS,
 * we recreate them using the fileURLToPath().
 */

const __filename__ = fileURLToPath(import.meta.url);
const __dirname__ = path.dirname(__filename__);

// Loading the .env variable from the project's .env file in root directory
const envResult = config({ path: path.join(__dirname__, '../.env') });

// warn if .env file could not be loaded
if (envResult.error) {
    log.warn('Warning: could not load .env from');
}

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    const message = 'DATABASE_URL is required';
    log.error(message);
    throw new Error(message);
}

/**
 * Create a global object to cache the Prisma client.
 *
 * - In development, hot reload can execute this file multiple times.
 * - Storing the client on globalThis prevents creating multiple database connection pools.
 */
const globalForPrisma = globalThis as unknown as {
    prisma?: PrismaClient;
};

/**
 * Create the Prisma client.
 *
 * - Reuse the existing client if one already exists.
 * - Otherwise, create a new Prisma client using the PostgreSQL adapter.
 */
export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        adapter: new PrismaPg({
            connectionString: DATABASE_URL,
        }),
    });

// Cache the Prisma client globally in developemnt.
if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

/**
 * Graceful Shutdown
 *
 * - Before the application exists, disconnect Prisma so that all database connections are closed cleanly.
 * - The flag ensures disconnect() is called only once even if multiple shutdown events are triggered.
 */
let isDisconnecting = false;

const disconnectPrisma = async () => {
    // prevent duplicate disconnect attempts.
    if (isDisconnecting) return;
    isDisconnecting = true;
    try {
        await prisma.$disconnect();
    } catch (err) {
        log.error({ err }, 'Error disconnecting Prisma');
    }
};

/**
 * Register process shutdown handlers.
 *
 * - SIGINT -> Triggered when the user presses Ctrl + c.
 * - SIGTERM -> Triggered when the operating system or Docker stops the app.
 * - beforeExit -> Fired when Node.js is about to exit naturally.
 *
 * Each handler disconnects Prisma before the process exists.
 */
if (typeof process !== 'undefined') {
    process.on('SIGINT', async () => {
        await disconnectPrisma();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        await disconnectPrisma();
        process.exit(0);
    });

    process.on('beforeExit', async () => {
        await disconnectPrisma();
    });
}
