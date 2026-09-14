import { prisma } from '@shipu/database-schema/prisma';
import { rabbitMQService } from '@shipu/rabbitmq/rabbitmq';
import { getRedisClient } from '@shipu/redis/redis';

import { BaseService } from '../../common/base.service.ts';

/**
 * Structure representing the health check response payload.
 */
export interface HealthCheckResult {
    /** True if PostgreSQL database query succeeds. */
    database: boolean;
    /** True if Redis client responds to PING. */
    redis: boolean;
    /** True if RabbitMQ connection channel is open. */
    rabbitmq: boolean;
    /** Process uptime in seconds. */
    uptime: number;
    /** Timestamp when check was performed. */
    timestamp: string;
}

/**
 * HealthService handles connectivity diagnostics for all external systems.
 * Inherits contextual structured logging from BaseService.
 */
export class HealthService extends BaseService {
    constructor() {
        super('health-service');
    }

    /**
     * Executes ping checks against PostgreSQL, Redis, and RabbitMQ concurrently.
     *
     * @returns {Promise<HealthCheckResult>} Comprehensive health report of all subsystems.
     */
    public async check(): Promise<HealthCheckResult> {
        let isDbConnected = false;
        let isRedisConnected = false;
        let isRabbitConnected = false;

        // 1. Check PostgresSQL Database connection via Prisma
        try {
            await prisma.$queryRaw`SELECT 1`;
            isDbConnected = true;
        } catch (error) {
            this.log.error({ error }, 'Database health check failed');
        }

        // 2. Check Redis connection
        try {
            const redis = getRedisClient();
            const pong = await redis.ping();
            isRedisConnected = pong === 'PONG';
        } catch (error) {
            this.log.error({ error }, 'Redis health check failed');
        }

        // 3. Check RabbitMQ connection
        try {
            const channel = rabbitMQService.getChannel();
            isRabbitConnected = channel !== null && channel !== undefined;
        } catch (error) {
            this.log.error({ error }, 'RabbitMQ health check failed');
        }

        const result: HealthCheckResult = {
            database: isDbConnected,
            redis: isRedisConnected,
            rabbitmq: isRabbitConnected,
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
        };

        this.logAction('health-status-checked', result as unknown as Record<string, unknown>);
        return result;
    }
}
