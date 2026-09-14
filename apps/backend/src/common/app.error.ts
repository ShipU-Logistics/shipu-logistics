import { ReasonPhrases, StatusCodes } from 'http-status-codes';

/**
 * Base Application Error Class inheriting from JavaScript Error.
 * All custom domain and HTTP errors extend this class.
 */
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

/**
 * 400 Bad Request Exception.
 * Thrown when client input fails validation or business constraints.
 */
export class BadRequestError extends ShipUError {
    constructor(message: string = ReasonPhrases.BAD_REQUEST) {
        super(message, StatusCodes.BAD_REQUEST);
    }
}

/**
 * 401 Unauthorized Exception.
 * Thrown when client authentication is missing or invalid.
 */
export class UnauthorizedError extends ShipUError {
    constructor(message: string = ReasonPhrases.UNAUTHORIZED) {
        super(message, StatusCodes.UNAUTHORIZED);
    }
}

/**
 * 403 Forbidden Exception.
 * Thrown when authenticated client does not have required permissions.
 */
export class ForbiddenError extends ShipUError {
    constructor(message: string = ReasonPhrases.FORBIDDEN) {
        super(message, StatusCodes.FORBIDDEN);
    }
}

/**
 * 404 Not Found Exception.
 * Thrown when a requested resource does not exist.
 */
export class NotFoundError extends ShipUError {
    constructor(message: string = ReasonPhrases.NOT_FOUND) {
        super(message, StatusCodes.NOT_FOUND);
    }
}
