import { BadRequestError } from '../../common/app.error.ts';
import { BaseService } from '../../common/base.service.ts';
import { CreateTestingInput, TestingRepository } from './testing.repository.ts';

/**
 * TestingService encapsulates business logic and data workflows for testing entities.
 * Inherits structured logging and audit helpers from BaseService.
 */
export class TestingService extends BaseService {
    private testingRepo: TestingRepository;

    constructor() {
        super('testing-service');
        this.testingRepo = new TestingRepository();
    }

    /**
     * Validates input requirements, persists a new test record via the repository, and emits structured action logs.
     *
     * @param input - The payload containing string and numeric test data.
     * @throws {BadRequestError} If stringData is missing or empty.
     */
    public async createEntry(input: CreateTestingInput) {
        if (!input.stringData) {
            throw new BadRequestError();
        }

        const record = await this.testingRepo.insert(input);
        this.logAction('testing-entry-created', { recordId: (record as { id: string }).id });
        return record;
    }

    /**
     * Retrieves all test records stored in the database.
     */
    public async getAllEntries() {
        return this.testingRepo.findAll();
    }
}
