// Zod schemas shared between server actions and client components.
// Separate from actions.ts because "use server" files can only export async functions.

import { z } from 'zod'

export const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
})

export const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
})

export const feedbackSchema = z.object({
  message: z.string().min(5, 'Message must be at least 5 characters'),
  rating: z.number().min(1).max(5),
})
