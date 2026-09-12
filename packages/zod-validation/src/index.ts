import { z } from 'zod';
import { ZodSchema } from 'zod/v3';

export const testValidationSchema = z.object({
    stringData: z.string().max(20, 'Cannot exceed the maximum limit').optional(),
    intData: z
        .number()
        .positive()
        .max(50 * 1024 * 1024),
});

export type TestValidation = z.infer<typeof testValidationSchema>;

/**
 * class based validation service using zod schemas.
 */

export class ValidationService {
    // Validates data against a zod schema.

    public static validate<T>(
        schema: ZodSchema<T>,
        data: unknown,
    ): { success: boolean; data?: T; error?: string } {
        const result = schema.safeParse(data);
        if (!result.success) {
            return { success: false, error: result.error.message };
        }
        return {
            success: true,
            data: result.data,
        };
    }
}
