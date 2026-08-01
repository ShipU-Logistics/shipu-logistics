import { env } from '@shipu/config/env';
import { ErrorRequestHandler } from 'express';
import { ReasonPhrases, StatusCodes } from 'http-status-codes';

import ShipUError from '../utils/error.utils.ts';

const errorMiddleware: ErrorRequestHandler = (err, req, res, _next) => {
    const error =
        err instanceof ShipUError
            ? err
            : new ShipUError(
                  ReasonPhrases.INTERNAL_SERVER_ERROR,
                  StatusCodes.INTERNAL_SERVER_ERROR,
              );

    res.status(error.statusCode).json({
        success: false,
        message: error.message,
        ...(env.NODE_ENV !== 'production' && {
            stack: error.stack,
        }),
    });
    return;
};

export default errorMiddleware;
