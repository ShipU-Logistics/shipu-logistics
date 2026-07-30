// Supported logs levels ordered from lowest to highest severity.
type Level = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Numeric priority assigned to each log level.
 *
 * Higher numbers represent higher severity and are used whether a log entry should be emitted.
 */
const LEVEL_ORDER: Record<Level, number> = {
    trace: 10,
    debug: 20,
    info: 30,
    warn: 40,
    error: 50,
    fatal: 60,
};

// Access vite environment variables while preserving compatibility with TypeScript outside of the browser runtime.
const _meta = import.meta as unknown as { env?: { VITE_LOG_LEVEL?: Level } };

/**
 * Active logging level.
 *
 * Resolution order:
 * 1. VITE_LOG_LEVEL environment variable.
 * 2. "info" in production.
 * 3. "debug" during development.
 */
const currentLevel: Level =
    _meta.env?.VITE_LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

/**
 * Determines whether a log entry should be emitted based currently configured log level.
 *
 * @param level - Severity of the log being written.
 * @returns True if the log should be output.
 */
function shouldLog(level: Level) {
    return LEVEL_ORDER[level] >= LEVEL_ORDER[currentLevel];
}

/**
 * Writes a structured log entry to the browser console.
 *
 * Message below the configured log level are ignored. Depending on severity, the appropriate console method is selected to improve visibility during development.
 *
 * @param level - Log severity.
 * @param obj - Structured log metadata.
 * @param msg - Optional log message.
 * @returns
 */
function log(level: Level, obj: unknown, msg?: string) {
    if (!shouldLog(level)) return;

    // Normalize the payload so both string messages and objects produce a consistent log format.
    const payload = typeof obj === 'string' ? { msg: obj } : { ...toObj(obj), msg };

    // Route log entries to the appropriate browser console method.
    const fn =
        level === 'error' || level === 'fatal'
            ? console.error
            : level === 'warn'
              ? console.warn
              : // eslint-disable-next-line no-console
                console.log;

    fn(`[${level.toUpperCase()}]`, payload);
}

/**
 * Safely converts an unknowm value into a plain object.
 *
 * Non-object values return an empty object, allowing metadata to be merged without runtime errors.
 *
 * @param obj - Value to normalize.
 * @returns A plain object representation.
 */
function toObj(obj: unknown): Record<string, unknown> {
    return typeof obj === 'object' && obj !== null ? (obj as Record<string, unknown>) : {};
}

/**
 * Creates a lightweight logger scoped to a specific frontend service or module.
 *
 * Every log entry automatically includes the provided service name, making it easier to identify the source of logs during debugging.
 *
 * @param service - Name of the frontend module or feature.
 * @returns A logger exposing standard logging methods.
 */
export function createLogger(service: string) {
    return {
        trace: (obj: unknown, msg?: string) => log('trace', { service, ...toObj(obj) }, msg),
        debug: (obj: unknown, msg?: string) => log('debug', { service, ...toObj(obj) }, msg),
        info: (obj: unknown, msg?: string) => log('info', { service, ...toObj(obj) }, msg),
        warn: (obj: unknown, msg?: string) => log('warn', { service, ...toObj(obj) }, msg),
        error: (obj: unknown, msg?: string) => log('error', { service, ...toObj(obj) }, msg),
        fatal: (obj: unknown, msg?: string) => log('fatal', { service, ...toObj(obj) }, msg),
    };
}
