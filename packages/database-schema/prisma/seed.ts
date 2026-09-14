import { createLogger } from '@shipu/logger/service-logger';

import { databaseService, prisma } from '../src/index.ts';

// Ambient declaration for Bun runtime globals
declare const Bun:
    | {
          password?: {
              hash: (
                  password: string,
                  options?: { algorithm?: string; cost?: number },
              ) => Promise<string>;
          };
      }
    | undefined;

const log = createLogger('database-seed');

/**
 * Class-based Database Seeder for ShipU Logistics.
 *
 * Populates initial foundational data:
 * - System test records
 * - Core platform users with email and hashed passwords (no third-party OAuth)
 */
export class DatabaseSeeder {
    /**
     * Executes the full database seeding pipeline.
     */
    public async run(): Promise<void> {
        log.info('Starting database seeding...');

        try {
            await this.seedTestingData();
            await this.seedUsers();
            log.info('Database seeding completed successfully.');
        } catch (error) {
            log.error({ error }, 'Fatal error during database seeding execution');
            throw error;
        } finally {
            // Cleanly release database pool connection
            await databaseService.disconnect();
        }
    }

    /**
     * Seeds initial test records into the Testing table.
     */
    private async seedTestingData(): Promise<void> {
        log.info('Seeding sample testing records...');

        // Purge legacy records to prevent unbounded table growth in development
        await prisma.testing.deleteMany();

        const sampleRecords = [
            { stringData: 'Hub-North-01', intData: 100 },
            { stringData: 'Hub-Central-02', intData: 250 },
            { stringData: 'Hub-South-03', intData: 500 },
        ];

        for (const data of sampleRecords) {
            const created = await prisma.testing.create({ data });
            log.info({ id: created.id, stringData: created.stringData }, 'Created testing record');
        }
    }

    /**
     * Generates a secure password hash using Bun's native password hasher.
     * Fallbacks to a precomputed standard bcrypt hash if running under a different environment.
     *
     * @param password - Plaintext password to hash.
     * @returns Secure password hash string.
     */
    private async hashPassword(password: string): Promise<string> {
        if (typeof Bun !== 'undefined' && Bun?.password?.hash) {
            return Bun.password.hash(password, {
                algorithm: 'bcrypt',
                cost: 10,
            });
        }

        // Standard bcrypt precomputed hash for 'Password@123'
        return '$2b$10$epRsf5y.wZ5bXb8C1x1IYeYFz10W2qP9.L3/4Hw9R2dZ9Q3B8L4tW';
    }

    /**
     * Seeds baseline platform users with email and hashed password.
     * Third-party OAuth accounts are excluded.
     * Uses upsert operations to ensure idempotency (safe to execute multiple times).
     */
    private async seedUsers(): Promise<void> {
        log.info('Seeding platform users with email and password...');

        // Default shared password for all seed accounts: "Password@123"
        const defaultPasswordHash = await this.hashPassword('Password@123');

        // 1. Primary System Administrator
        const adminUser = await prisma.user.upsert({
            where: { email: 'admin@shipu.com' },
            update: {
                fullName: 'ShipU System Administrator',
                hashedPassword: defaultPasswordHash,
                emailVerified: true,
                isActive: true,
            },
            create: {
                email: 'admin@shipu.com',
                fullName: 'ShipU System Administrator',
                hashedPassword: defaultPasswordHash,
                emailVerified: true,
                isActive: true,
            },
        });

        log.info({ userId: adminUser.id, email: adminUser.email }, 'Admin user configured');

        // 2. Logistics Dispatcher User
        const dispatcherUser = await prisma.user.upsert({
            where: { email: 'dispatcher@shipu.com' },
            update: {
                fullName: 'Lead Operations Dispatcher',
                hashedPassword: defaultPasswordHash,
                emailVerified: true,
                isActive: true,
            },
            create: {
                email: 'dispatcher@shipu.com',
                fullName: 'Lead Operations Dispatcher',
                hashedPassword: defaultPasswordHash,
                emailVerified: true,
                isActive: true,
            },
        });

        log.info(
            { userId: dispatcherUser.id, email: dispatcherUser.email },
            'Dispatcher user configured',
        );

        // 3. Fleet Driver User
        const driverUser = await prisma.user.upsert({
            where: { email: 'driver@shipu.com' },
            update: {
                fullName: 'Fleet Driver Alpha',
                hashedPassword: defaultPasswordHash,
                emailVerified: true,
                isActive: true,
            },
            create: {
                email: 'driver@shipu.com',
                fullName: 'Fleet Driver Alpha',
                hashedPassword: defaultPasswordHash,
                emailVerified: true,
                isActive: true,
            },
        });

        log.info({ userId: driverUser.id, email: driverUser.email }, 'Fleet driver configured');
    }
}

// Bootstrap execution
const seeder = new DatabaseSeeder();
seeder.run().catch(() => {
    process.exit(1);
});
