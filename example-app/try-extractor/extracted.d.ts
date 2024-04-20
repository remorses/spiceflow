import { z } from 'zod';

export declare function createUser({ name }: {
    name?: string | undefined;
}): Promise<{
    functionName: string;
    url: string | undefined;
}>;

export declare function edgeServerAction({}: {}): Promise<{
    url: string | undefined;
    cookies: string;
    headers: string[];
    functionName: string;
}>;

/**
 * @public
 */
export declare function failingFunction({}: z.infer<typeof User>): Promise<void>;

export declare const runtime = "edge";

declare const User = z.object({
    username: z.string(),
});

export declare function wrapMethod(fn: any): (...args: any[]) => Promise<any>;

export { }
