// Client form components. Each form uses parseFormData client-side to validate
// before calling the imported server action as a function. Schemas and field
// enums come from ../actions.ts so names stay type-safe.

'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { parseFormData } from 'spiceflow'
import { ErrorBoundary } from 'spiceflow/react'
import {
  contactSchema,
  projectSchema,
  feedbackSchema,
} from '../schemas.ts'
import {
  createContact,
  createProject,
  submitFeedback,
  failingAction,
} from '../actions.ts'

const contactFields = contactSchema.keyof().enum
const projectFields = projectSchema.keyof().enum
const feedbackFields = feedbackSchema.keyof().enum

function SubmitButton({ children = 'Submit' }: { children?: React.ReactNode }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 cursor-pointer"
    >
      {pending ? 'Submitting...' : children}
    </button>
  )
}

function ErrorFallback() {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex flex-col gap-2">
      <ErrorBoundary.ErrorMessage className="text-sm text-red-600 font-medium" />
      <ErrorBoundary.ResetButton className="text-sm text-red-600 underline cursor-pointer self-start hover:text-red-800">
        Try again
      </ErrorBoundary.ResetButton>
    </div>
  )
}

function Input({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={props.id} className="text-sm font-medium">
        {label}
      </label>
      <input
        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        {...props}
      />
    </div>
  )
}

function Result({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-700">
      {children}
    </div>
  )
}

// ─── 1. Client validation fails before calling server action ─────────────────
// parseFormData runs in the browser. If Zod rejects the input, the
// ValidationError is thrown client-side and caught by ErrorBoundary.
// The server action never fires.

export function ClientValidationForm() {
  const [result, setResult] = useState('')
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <form
        className="flex flex-col gap-3"
        action={async (formData: FormData) => {
          const data = parseFormData(contactSchema, formData)
          const contact = await createContact(data)
          setResult(`Created contact ${contact.id}: ${contact.name} (${contact.email})`)
        }}
      >
        <p className="text-sm text-gray-500">
          <code className="text-xs bg-gray-100 px-1 rounded">parseFormData</code> runs
          client-side. Leave name empty or put an invalid email to see the
          ValidationError caught by ErrorBoundary before the server is called.
        </p>
        <Input
          id="cv-name"
          label="Name (min 2 chars)"
          name={contactFields.name}
          type="text"
          placeholder="Leave empty to trigger validation error"
        />
        <Input
          id="cv-email"
          label="Email"
          name={contactFields.email}
          type="text"
          defaultValue="alice@example.com"
        />
        <SubmitButton>Create Contact</SubmitButton>
        {result && <Result>{result}</Result>}
      </form>
    </ErrorBoundary>
  )
}

// ─── 2. Server action throws → ErrorBoundary catches ─────────────────────────
// Client validation passes, but the server action itself throws.
// The error propagates through React's form action mechanism to ErrorBoundary.

export function ServerErrorForm() {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <form
        className="flex flex-col gap-3"
        action={async () => {
          await failingAction()
        }}
      >
        <p className="text-sm text-gray-500">
          Client validation is skipped (no schema). The server action always
          throws. ErrorBoundary catches the server error.
        </p>
        <SubmitButton>Trigger Server Error</SubmitButton>
      </form>
    </ErrorBoundary>
  )
}

// ─── 3. Server action returns data → set state ──────────────────────────────
// After client-side validation, the action returns rich data.
// The client form action sets local state with the returned object.

export function ReturnDataForm() {
  const [result, setResult] = useState<{
    id: string
    message: string
    rating: number
    submittedAt: string
  } | null>(null)
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <form
        className="flex flex-col gap-3"
        action={async (formData: FormData) => {
          const data = parseFormData(feedbackSchema, formData)
          const res = await submitFeedback(data)
          setResult(res)
        }}
      >
        <p className="text-sm text-gray-500">
          Validates client-side, then calls the server action. The returned
          object is stored in useState and displayed below the form.
        </p>
        <Input
          id="rd-message"
          label="Message (min 5 chars)"
          name={feedbackFields.message}
          type="text"
          defaultValue="Great framework!"
        />
        <Input
          id="rd-rating"
          label="Rating (1-5)"
          name={feedbackFields.rating}
          type="text"
          defaultValue="5"
        />
        <SubmitButton>Submit Feedback</SubmitButton>
        {result && (
          <Result>
            <strong>Feedback #{result.id}</strong>
            <br />
            Message: {result.message}
            <br />
            Rating: {'⭐'.repeat(result.rating)}
            <br />
            Submitted: {result.submittedAt}
          </Result>
        )}
      </form>
    </ErrorBoundary>
  )
}

// ─── 4. Server action redirects ──────────────────────────────────────────────
// After client-side validation, the server action throws redirect().
// ErrorBoundary intercepts the redirect error and calls router.replace().

export function RedirectForm() {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <form
        className="flex flex-col gap-3"
        action={async (formData: FormData) => {
          const data = parseFormData(projectSchema, formData)
          await createProject(data)
        }}
      >
        <p className="text-sm text-gray-500">
          Validates client-side, then the server action creates the project
          and throws <code className="text-xs bg-gray-100 px-1 rounded">redirect()</code> to
          the success page.
        </p>
        <Input
          id="rp-name"
          label="Project name"
          name={projectFields.name}
          type="text"
          defaultValue="My Project"
        />
        <Input
          id="rp-desc"
          label="Description (min 10 chars)"
          name={projectFields.description}
          type="text"
          defaultValue="A cool new project built with Spiceflow"
        />
        <SubmitButton>Create Project & Redirect</SubmitButton>
      </form>
    </ErrorBoundary>
  )
}

// ─── 5. Inline ErrorBoundary (no layout shift) ──────────────────────────────
// Same client validation + server call, but with inline mode so the form
// stays visible (dimmed) alongside the error message.

export function InlineErrorForm() {
  return (
    <ErrorBoundary
      below
      fallback={
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex flex-col gap-2">
          <ErrorBoundary.ErrorMessage className="text-sm text-red-600 font-medium" />
          <ErrorBoundary.ResetButton className="text-sm text-red-600 underline cursor-pointer self-start hover:text-red-800">
            Try again
          </ErrorBoundary.ResetButton>
        </div>
      }
    >
      <form
        className="flex flex-col gap-3"
        action={async (formData: FormData) => {
          const data = parseFormData(contactSchema, formData)
          await createContact(data)
        }}
      >
        <p className="text-sm text-gray-500">
          Uses <code className="text-xs bg-gray-100 px-1 rounded">below</code> prop.
          When validation fails, the error shows below the form. The form
          stays fully interactive so you can fix inputs and resubmit. No layout shift.
        </p>
        <Input
          id="ie-name"
          label="Name (min 2 chars)"
          name={contactFields.name}
          type="text"
          placeholder="Leave empty to trigger error"
        />
        <Input
          id="ie-email"
          label="Email"
          name={contactFields.email}
          type="text"
          defaultValue="test@example.com"
        />
        <SubmitButton>Submit (Inline)</SubmitButton>
      </form>
    </ErrorBoundary>
  )
}


