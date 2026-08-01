import { prisma } from '@shipu/database-schema/prisma';
import { testValidationSchema } from '@shipu/zod-validation/zod-validation';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express, NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import morgan from 'morgan';

import { logger } from './lib/logger.ts';
import { SuccessResponse } from './lib/types.ts';
import errorMiddleware from './middlewares/error.middleware.ts';
import ShipUError from './utils/error.utils.ts';

const app: Express = express();

app.use(express.json());
app.use(morgan('dev'));
app.use(cors({
    origin: '*',
    credentials: true
}))
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

const log = logger.child({ module: 'bck-index' });

app.get('/health-check', async (req: Request, res: Response) => {
    const response: SuccessResponse = {
        success: true,
        message: 'Backend is healthy and working',
        statusCode: StatusCodes.OK,
    };

    return res.status(response.statusCode).json({ response });
});

app.post('/post-db-check', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const validation = testValidationSchema.safeParse(req.body);

        if (!validation.success) {
            log.error(validation.error.message);
            throw new ShipUError('Validation failed', StatusCodes.BAD_REQUEST);
        }

        const { stringData, intData } = validation.data;

        if (!stringData) {
            throw new ShipUError('String data is required', StatusCodes.BAD_REQUEST);
        }

        const data = await prisma.testing.create({
            data: {
                stringData,
                intData,
            },
        });

        const response: SuccessResponse<typeof data> = {
            success: true,
            statusCode: StatusCodes.CREATED,
            message: 'Post endpoint and database working',
            responseData: data,
        };

        return res.status(response.statusCode).json(response);
    } catch (error) {
        log.error(error);
        next(error);
    }
});

app.use(errorMiddleware);

export default app;
