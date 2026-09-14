import { Router } from 'express';

import { HealthRoutes } from '../modules/health/health.routes.ts';
import { TestingRoutes } from '../modules/testing/testing.routes.ts';

/**
 * AppRouter aggregates domain module routers into a unified API routing hierarchy.
 * Acts as the primary router gateway mounted under the versioned prefix (e.g. /api/v1).
 */
export class AppRouter {
    public readonly router: Router;

    constructor() {
        this.router = Router();
        this.mountRoutes();
    }

    /**
     * Mounts individual self-contained domain module routers.
     */
    private mountRoutes(): void {
        // Mount modules
        this.router.use('/health', new HealthRoutes().router);
        this.router.use('/testing', new TestingRoutes().router);
    }
}

export default new AppRouter().router;
