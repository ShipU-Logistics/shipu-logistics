import { Request } from "express";

// Configuration options for the rate limiting middleware
interface RateLimitOptions {
    // Maximum number of requests allowed within the configured windows.
    maxRequests: number;
    windowsSeconds: number;
    keyprefix?: string;
    identifier?: (req: Request) => string;
}