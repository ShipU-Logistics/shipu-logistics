import { z } from 'zod';

export const testValidationSchema = z.object({
    stringData: z.string().max(20, 'Cannot exceed the maximum limit').optional(),
    intData: z
        .number()
        .positive()
        .max(50 * 1024 * 1024),
});

export type TestValidation = z.infer<typeof testValidationSchema>;
