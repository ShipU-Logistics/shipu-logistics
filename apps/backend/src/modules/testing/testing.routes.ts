import { testValidationSchema } from '@shipu/zod-validation/zod-validation';
import { Router } from 'express';

import { RateLimitMiddleware } from '../../middlewares/rateLimit.middleware.ts';
import ValidationMiddleware from '../../middlewares/validation.middleware.ts';
import { TestingController } from './testing.controller.ts';

/**
 * TestingRoutes configures endpoints, rate limiting, and Zod validation for testing/sandbox operations.
 */
export class TestingRoutes {
    public readonly router: Router;
    private controller: TestingController;

    constructor() {
        this.router = Router();
        this.controller = new TestingController();
        this.initializeRoutes();
    }

    /**
     * Initializes routes with rate limiting, Zod schema validation, and controller handlers.
     */
    private initializeRoutes(): void {
        this.router.post(
            '/',
            RateLimitMiddleware.limit({
                maxRequests: 5,
                windowSeconds: 60,
                keyPrefix: 'testing-port',
            }),
            ValidationMiddleware.validateBody(testValidationSchema),
            this.controller.create.bind(this.controller),
        );

        this.router.get('/', this.controller.list);
    }
}
