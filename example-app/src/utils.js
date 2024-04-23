import { z } from 'zod';
export const User = z.object({
    username: z.string(),
});
export function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
