import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { logger } from '../lib/logger.ts';
import { SuccessResponse } from '../lib/types.ts';

const log = logger.child({ module: 'base-controller ' });

/**
 * Abstraction BaseController class providing standardized JSON response methods and automatic async error handling wrappers for all concrete controllers.
 */

export abstract class BaseController {
    /**
     * Send a standardized HTTP success response.
     *
     * @param res - Express Response object
     * @param message - Descriptive success message
     * @param data - Optional payload data returned to the client
     * @param statusCode - HTTP Status code (default to 200 OK)
     * @returns HTTP success response
     */
    protected sendSuccess<T>(
        res: Response,
        message: string,
        data?: T,
        statusCode: number = StatusCodes.OK,
    ): Response {
        const responsePayload: SuccessResponse<T> = {
            success: true,
            statusCode,
            message,
            responseData: data,
        };

        return res.status(statusCode).json(responsePayload);
    }

    /**
     * Sends a standardized HTTP error response.
     *
     * @param res - Express Response object
     * @param message - Descriptive error message
     * @param statusCode - HTTP status code (default 400 Bad Request)
     * @param errorDetails - Optional detailed error object
     * @returns HTTP error response
     */
    protected sendError(
        res: Response,
        message: string,
        statusCode: number = StatusCodes.BAD_REQUEST,
        errorDetails?: unknown,
    ): Response {
        if (errorDetails) {
            log.error({ errorDetails }, message);
        }

        return res.status(statusCode).json({
            success: false,
            statusCode,
            message,
            error: errorDetails ?? null,
        });
    }

    /**
     * Higher-order wrapper function to automatically catch errors in async controller methods and forward them to Express global error handling middleware.
     *
     * @param fn - Controller async action handler
     */
    protected catchAsync(
        fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
    ) {
        return (req: Request, res: Response, next: NextFunction): void => {
            fn(req, res, next).catch((error) => next(error));
        };
    }
}
