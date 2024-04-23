import { z } from 'zod';
export declare const User: z.ZodObject<{
    username: z.ZodString;
}, "strip", z.ZodTypeAny, {
    username: string;
}, {
    username: string;
}>;
export declare function sleep(ms: number): Promise<unknown>;
export type UserType = z.infer<typeof User>;
