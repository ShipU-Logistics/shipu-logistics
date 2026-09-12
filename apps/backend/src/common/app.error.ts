import { ReasonPhrases, StatusCodes } from 'http-status-codes';

// Base Application Error Class inheriting from JavaScript Error.
export class ShipUError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;

    constructor(
        message: string = ReasonPhrases.INTERNAL_SERVER_ERROR,
        statusCode: number = StatusCodes.INTERNAL_SERVER_ERROR,
        isOperational = true,
    ) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;

        Object.setPrototypeOf(this, new.target.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}

// 400 Bad Request Exception
export class BadRequestError extends ShipUError {
    constructor(message = ReasonPhrases.BAD_REQUEST) {
        super(message, StatusCodes.BAD_REQUEST);
    }
}

// 401 Unauthorized Exception.
export class UnauthorizedError extends ShipUError {
    constructor(message = ReasonPhrases.UNAUTHORIZED) {
        super(message, StatusCodes.UNAUTHORIZED);
    }
}

// 403 Forbidden Exception.
export class ForbiddenError extends ShipUError {
    constructor(message = ReasonPhrases.FORBIDDEN) {
        super(message, StatusCodes.FORBIDDEN);
    }
}

// 404 Not Found Exception.
export class NotFoundError extends ShipUError {
    constructor(message = ReasonPhrases.NOT_FOUND) {
        super(message, StatusCodes.NOT_FOUND);
    }
}
