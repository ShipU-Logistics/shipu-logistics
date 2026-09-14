// packages/zod-validation/src/index.ts
import { z, type ZodType } from 'zod'; // ✅ Remove 'zod/v3'

export const testValidationSchema = z.object({
    stringData: z.string().max(20, 'Cannot exceed the maximum limit').optional(),
    intData: z
        .number()
        .positive()
        .max(50 * 1024 * 1024),
});

export type TestValidation = z.infer<typeof testValidationSchema>;

/**
 * Class-based validation service using Zod schemas.
 */
export class ValidationService {
    /**
     * Validates data against a Zod schema.
     */
    public static validate<T>(
        schema: ZodType<T>,
        data: unknown,
    ): { success: boolean; data?: T; error?: string } {
        const result = schema.safeParse(data);
        if (!result.success) {
            const message = result.error.issues
                .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
                .join(', ');
            return { success: false, error: message };
        }
        return {
            success: true,
            data: result.data,
        };
    }
}
