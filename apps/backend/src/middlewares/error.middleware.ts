import { env } from '@shipu/config/env';
import { NextFunction, Request, Response } from 'express';
import { ReasonPhrases, StatusCodes } from 'http-status-codes';

import { ShipUError } from '../common/app.error.ts';
import { logger } from '../lib/logger.ts';

const log = logger.child({ module: 'error-middleware' });

/**
 * Class-based Global Error Middleware.
 */
export class ErrorMiddleware {
    /**
     * Express error handler method.
     */
    public static handle(err: Error, _req: Request, res: Response, _next: NextFunction): Response {
        const error =
            err instanceof ShipUError
                ? err
                : new ShipUError(
                      err.message || ReasonPhrases.INTERNAL_SERVER_ERROR,
                      StatusCodes.INTERNAL_SERVER_ERROR,
                      false,
                  );

        log.error({ err: error }, `[${error.statusCode}] ${error.message}`);

        return res.status(error.statusCode).json({
            success: false,
            statusCode: error.statusCode,
            message: error.message,
            ...(env.NODE_ENV !== 'production' && {
                stack: error.stack,
            }),
        });
    }
}

export default ErrorMiddleware.handle;
