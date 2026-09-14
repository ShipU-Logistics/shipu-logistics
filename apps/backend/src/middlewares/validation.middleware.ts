import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import type { ZodType } from 'zod';

import { ShipUError } from '../common/app.error.ts';

/**
 * Class-based Request validation middleware using Zod schemas.
 */
export class ValidationMiddleware {
    /**
     * Validates incoming request body against a provided Zod schema.
     */
    public static validateBody<T>(schema: ZodType<T>) {
        return (req: Request, _res: Response, next: NextFunction): void => {
            const result = schema.safeParse(req.body);

            if (!result.success) {
                const message = result.error.issues
                    .map((err) => `${err.path.join('.')}: ${err.message}`)
                    .join(', ');

                next(new ShipUError(`Validation failed: ${message}`, StatusCodes.BAD_REQUEST));
                return;
            }

            req.body = result.data;
            next();
        };
    }
}

export default ValidationMiddleware;
