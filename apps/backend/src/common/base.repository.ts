import { prisma } from '@shipu/database-schema/prisma';

type RepositoryDelegate = {
    findUnique: (args: object) => Promise<unknown | null>;
    findMany: (args: object) => Promise<unknown[]>;
    create: (args: object) => Promise<unknown>;
    update: (args: object) => Promise<unknown>;
    delete: (args: object) => Promise<unknown>;
    count: (args: object) => Promise<number>;
};

/**
 * Abstract BaseRepository class encapsulating generic database CRUD operations using the prisma DatabaseService client.
 *
 * @template T - Prisma delegeate model type (e.g. prisma.user, prisma.testing)
 */
export abstract class BaseRepository<T extends Record<string, unknown>> {
    protected readonly modelDelegate: T & RepositoryDelegate;

    constructor(modelDelegate: T) {
        this.modelDelegate = modelDelegate as T & RepositoryDelegate;
    }

    // Finds a single record by unique ID.
    public async findById(id: string | number): Promise<unknown | null> {
        return this.modelDelegate.findUnique({
            where: { id },
        });
    }

    // Find all records matching filter criteria.
    public async findAll(
        params: {
            skip?: number;
            take?: number;
            where?: Record<string, unknown>;
            orderBy?: Record<string, unknown>;
        } = {},
    ): Promise<unknown[]> {
        const { skip, take, where, orderBy } = params;
        return this.modelDelegate.findMany({
            skip,
            take,
            where,
            orderBy,
        });
    }

    // creates a new record in the database.
    public async create(data: Record<string, unknown>): Promise<unknown> {
        return this.modelDelegate.create({
            data,
        });
    }

    // Updates a record by unique ID.
    public async update(id: string | number, data: Record<string, unknown>): Promise<unknown> {
        return this.modelDelegate.update({
            where: { id },
            data,
        });
    }

    // Deletes a record by unique ID.
    public async delete(id: string | number): Promise<unknown> {
        return this.modelDelegate.delete({
            where: { id },
        });
    }

    // Counts total records matching filter criteria.
    public async count(where: Record<string, unknown> = {}): Promise<number> {
        return this.modelDelegate.count({
            where,
        });
    }
}
