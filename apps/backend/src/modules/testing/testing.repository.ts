import { prisma } from '@shipu/database-schema/prisma';

import { BaseRepository } from '../../common/base.repository.ts';

/**
 * Input contract for creating a test record.
 */
export interface CreateTestingInput {
    stringData: string;
    intData: number;
}

/**
 * TestingRepository provides encapsulated database operations for the Testing model.
 * Extends BaseRepository to inherit generic CRUD methods backed by Prisma.
 */
export class TestingRepository extends BaseRepository<
    typeof prisma.testing & Record<string, unknown>
> {
    constructor() {
        super(prisma.testing as typeof prisma.testing & Record<string, unknown>);
    }

    /**
     * Inserts a new test record into the database.
     *
     * @param data - The test entity fields to persist.
     */
    public async insert(data: CreateTestingInput) {
        return this.create(data as unknown as Record<string, unknown>);
    }
}
