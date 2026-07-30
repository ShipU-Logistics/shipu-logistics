import { env } from '@shipu/config/env';
import pino, { type Logger, type LoggerOptions } from 'pino';

/**
 * Environment flags used to configure logging behaviour.
 *
 * - Production: Optimized for structured machine-redable logs.
 * - Test: Logging is disabled to keep test output clean.
 * - Development: Pretty-printed logs for easier debugging.
 */
const isProduction = env.NODE_ENV === 'production';
const isTest = env.NODE_ENV === 'test';

/**
 * Default log level.
 *
 * Priority:
 * 1. LOG_LEVEL environment variable.
 * 2. "info" in production.
 * 3. "debug" during development.
 */
const LOG_LEVEL = env.LOG_LEVEL ?? (isProduction ? 'info' : 'debug');

/**
 * Sensitive fields that should never appear in application logs.
 *
 * Pino automatically replaces the values of these proper "[REDACTED]" before writing the log entry.
 */
const redactPaths = [
    'req.headers.authorization',
    'req.headers.cookie',
    '*.password',
    '*.token',
    '*.accessToken',
    '.refreshToken',
    '.secret',
    '.apiKey',
];

/**
 * Shared logger configuration.
 *
 * These options are inherited by every logger created from the root logger, ensuring consistent formatting and behaviour across the entire application.
 */
const baseOptions: LoggerOptions = {
    // Disable logging during tests to reduce console noise.
    level: isTest ? 'silent' : LOG_LEVEL,

    // static metadata automatically included in every log entry.
    base: {
        pid: process.pid,
        hostname: env.HOSTNAME ?? undefined,
    },

    // Use ISO-8601 timestamps for easier parsing and interoperability.
    timestamp: pino.stdTimeFunctions.isoTime,

    // Automatically redact sensitive values before logs are written.
    redact: {
        paths: redactPaths,
        censor: '[REDACTED]',
    },

    // Customize the shape of generated log entries.
    formatters: {
        level(label) {
            return { level: label };
        },
        bindings(bindings) {
            return bindings;
        },
    },

    /**
     * Serialize common objects into a structured format.
     *
     * These serializers improve readability while preser debugging information.
     */
    serializers: {
        err: pino.stdSerializers.err,
        error: pino.stdSerializers.err,
        req: pino.stdSerializers.req,
        res: pino.stdSerializers.res,
    },
};

/**
 * Pretty-print logs during development.
 *
 * Production environments emit compact JSON logs because they are easier for log aggregation platforms (ELK, Loki, Datadog, etc.) to index and search.
 */
const transport =
    !isProduction && !isTest
        ? {
              target: 'pino-pretty',
              options: {
                  // Enable ANSI colors for improved readability.
                  colorize: true,
                  // Display timestamps using the system's local time.
                  translateTime: 'SYS:standard',
                  // Hide less useful metadata during development.
                  ignore: 'pid,hostname',
                  // Format each log entry across multiple lines.
                  singleLine: false,
              },
          }
        : undefined;

/**
 * Root application logger.
 *
 * Every child logger inherits this configuration while allowing additional contextual fields such as services, module, request ID, or user ID.
 */
export const rootLogger: Logger = pino({
    ...baseOptions,
    transport,
});

/**
 * Creates a child logger scoped to a specific service or module.
 *
 * Child loggers automatically include the provided bindings in every log entry, eliminating the need to repeat contextual information throughout the codebase.
 *
 * @param service - Service or package name.
 * @param bindings - Additional metadata to attach to every log.
 * @returns A configured Pino logger instance.
 */
export function createLogger(service: string, bindings: Record<string, unknown> = {}): Logger {
    return rootLogger.child({ service, ...bindings });
}

/**
 * Re-export the Logger type so consuming packages can import both the logger factory and its type from a single module.
 */
export type { Logger } from 'pino';
