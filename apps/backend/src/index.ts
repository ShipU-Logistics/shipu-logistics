import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Application } from 'express';
import morgan from 'morgan';

import errorMiddleware from './middlewares/error.middleware.ts';
import { NotFoundMiddleware } from './middlewares/noFound.middleware.ts';
import { RateLimitMiddleware } from './middlewares/rateLimit.middleware.ts';
import { HealthRoutes } from './modules/health/health.routes.ts';
import { TestingRoutes } from './modules/testing/testing.routes.ts';
import { AppRouter } from './routes/app.routes.ts';

/**
 * App class orchestrating Express middlewares, versioned route pipelines, and error interceptors.
 * Provides a cleanly configured and testable Express Application instance.
 */
export class App {
    public readonly app: Application;

    constructor() {
        this.app = express();
        this.configureMiddlewares();
        this.configureRoutes();
        this.configureErrorHandling();
    }

    /**
     * Registers standard Express parsers, security headers, request logging, and global rate limiting.
     */
    private configureMiddlewares(): void {
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        this.app.use(morgan('dev'));
        this.app.use(
            cors({
                origin: '*',
                credentials: true,
            }),
        );
        this.app.use(cookieParser());

        // Global rate limit: 100 requests per 60 seconds per client
        this.app.use(
            RateLimitMiddleware.limit({
                maxRequests: 100,
                windowSeconds: 60,
                keyPrefix: 'global',
            }),
        );
    }

    /**
     * Mounts domain routes. Zero inline database or business handler logic exists here.
     * Delegates all routing downstream to self-contained module routers.
     */
    private configureRoutes(): void {
        const appRouter = new AppRouter();

        // 1. Primary Versioned API Gateway (/api/v1/health, /api/v1/testing)
        this.app.use('/api/v1', appRouter.router);

        // 2. Backward-compatible aliases delegating directly to respective module routers
        this.app.use('/health-check', new HealthRoutes().router);
        this.app.use('/post-db-check', new TestingRoutes().router);
    }

    /**
     * Registers catch-all 404 handler and global exception processing middleware.
     */
    private configureErrorHandling(): void {
        // Catch-all for undefined routes
        this.app.use(NotFoundMiddleware.handle);

        // Centralized application error handler
        this.app.use(errorMiddleware);
    }
}

// Export default Express application instance and App class
export const appInstance = new App();
export default appInstance.app;
