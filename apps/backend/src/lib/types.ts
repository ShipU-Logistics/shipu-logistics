import { StatusCodes } from 'http-status-codes';

export type SuccessResponse<T = undefined> = {
    success: true;
    statusCode: StatusCodes;
    message: string;
    responseData?: T;
};
