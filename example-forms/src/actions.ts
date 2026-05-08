// Server actions. File-level "use server" makes every export callable from
// client code. Only async functions are allowed here.

'use server'

import { redirect } from 'spiceflow'
import { router } from 'spiceflow/react'
import type { z } from 'zod'
import type { contactSchema, projectSchema, feedbackSchema } from './schemas.ts'

export async function createContact(data: z.infer<typeof contactSchema>) {
  console.log('Creating contact:', data)
  return { id: crypto.randomUUID().slice(0, 8), ...data }
}

export async function createProject(data: z.infer<typeof projectSchema>) {
  console.log('Creating project:', data)
  const id = crypto.randomUUID().slice(0, 8)
  throw redirect(router.href('/success', { name: data.name, id }))
}

export async function submitFeedback(data: z.infer<typeof feedbackSchema>) {
  console.log('Submitting feedback:', data)
  return {
    id: crypto.randomUUID().slice(0, 8),
    message: data.message,
    rating: data.rating,
    submittedAt: new Date().toISOString(),
  }
}

export async function failingAction() {
  throw new Error('Server error: database connection timeout after 5000ms')
}

