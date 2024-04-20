import { z } from 'zod';

export const User = z.object({
  username: z.string(),
});
