import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { BaseController } from '../../common/base.controller.ts';
import { TestingService } from './testing.service.ts';

/**
 * TestingController handles incoming HTTP requests for testing operations.
 * Extends BaseController to provide standardized JSON response structures and async error handling.
 */
export class TestingController extends BaseController {
    private testingService: TestingService;

    constructor() {
        super();
        this.testingService = new TestingService();
    }

    /**
     * Handles POST / testing endpoint to create a new record in the database.
     */
    public create = this.catchAsync(async (req: Request, res: Response): Promise<void> => {
        const record = await this.testingService.createEntry(req.body);
        this.sendSuccess(res, 'Test record successfully created', record, StatusCodes.CREATED);
    });

    /**
     * Handles GET / testing endpoint to fetch all stored test records.
     */
    public list = this.catchAsync(async (_req: Request, res: Response): Promise<void> => {
        const records = await this.testingService.getAllEntries();
        this.sendSuccess(res, 'Test records fetched successfully', records, StatusCodes.OK);
    });
}
