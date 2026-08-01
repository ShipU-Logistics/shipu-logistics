import { ReasonPhrases, StatusCodes } from 'http-status-codes';

class ShipUError extends Error {
    public readonly statusCode: number;

    constructor(
        message: string = ReasonPhrases.INTERNAL_SERVER_ERROR,
        statusCode: number = StatusCodes.INTERNAL_SERVER_ERROR,
    ) {
        super(message);

        this.statusCode = statusCode;

        Error.captureStackTrace(this, this.constructor);
    }
}

export default ShipUError;
