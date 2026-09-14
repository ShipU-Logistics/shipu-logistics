import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { BaseController } from '../../common/base.controller.ts';
import { HealthService } from './health.service.ts';

/**
 * HealthController handles incoming health probe requests.
 * Inherits standardized response formatters and async error handling from BaseController.
 */
export class HealthController extends BaseController {
    private healthService: HealthService;

    constructor() {
        super();
        this.healthService = new HealthService();
    }

    /**
     * Diagnostic endpoint verifying connectivity across all external dependencies (DB, Redis, RabbitMQ).
     * Returns HTTP 200 if all services are healthy, or HTTP 503 if any subsystem is degraded.
     */
    public getHealth = this.catchAsync(async (_req: Request, res: Response): Promise<void> => {
        const health = await this.healthService.check();
        const allHealthy = health.database && health.redis && health.rabbitmq;

        const statusCode = allHealthy ? StatusCodes.OK : StatusCodes.SERVICE_UNAVAILABLE;

        const message = allHealthy
            ? 'All system dependencies are healthy'
            : 'One or more dependencies are degraded';

        this.sendSuccess(res, message, health, statusCode);
    });
}
