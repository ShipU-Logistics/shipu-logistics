import { Router } from 'express';

import { RateLimitMiddleware } from '../../middlewares/rateLimit.middleware.ts';
import { HealthController } from './health.controller.ts';

/**
 * HealthRoutes defines HTTP endpoints for infrastructure and dependency health diagnostics.
 */
export class HealthRoutes {
    public readonly router: Router;
    private controller: HealthController;

    constructor() {
        this.router = Router();
        this.controller = new HealthController();
        this.initializeRoutes();
    }

    /**
     * Initializes health check routes with rate limiting and controller bindings.
     */
    private initializeRoutes(): void {
        this.router.get(
            '/',
            RateLimitMiddleware.limit({
                maxRequests: 5,
                windowSeconds: 60,
                keyPrefix: 'health-port',
            }),
            this.controller.getHealth,
        );
    }
}
