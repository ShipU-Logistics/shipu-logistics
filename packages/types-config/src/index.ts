export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
    identifier?: string;
}

export interface CreateLoggerOptions {
    name: string; // service name, eg: "shipu-logistics"
    level?: string;
}

export interface QueueMessage {
    [key: string]: unknown;
}
