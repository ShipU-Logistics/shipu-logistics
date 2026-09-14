import { NextFunction, Request, Response } from 'express';

import { NotFoundError } from '../common/app.error.ts';

/**
 * Class-based NotFound Middleware.
 * Catches all unhandled routes and forwards a 404 exception down to the global error handler.
 */
export class NotFoundMiddleware {
    /**
     * Express middleware handler for unmatched route paths.
     */
    public static handle(req: Request, _res: Response, next: NextFunction): void {
        next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
    }
}

export default NotFoundMiddleware.handle;
