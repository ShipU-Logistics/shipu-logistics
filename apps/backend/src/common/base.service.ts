import { logger } from '../lib/logger.ts';

// Abstract BaseService class providing logging and shared business services utilities.

export abstract class BaseService {
    protected readonly log;

    constructor(moduleName: string) {
        this.log = logger.child({ module: moduleName });
    }

    // Helper method to log service actions with structured metadata.
    protected logAction(action: string, metadata: Record<string, unknown> = {}): void {
        this.log.info({ ...metadata }, `[Service Action] ${action}`);
    }
}
