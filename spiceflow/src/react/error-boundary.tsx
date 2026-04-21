// Public ErrorBoundary for handling server action errors and render errors.
// Uses context so sub-components (ErrorMessage, ResetButton) can access
// the error and reset function from anywhere in the fallback tree.

'use client'

import React from 'react'
import { router } from './router.js'
import {
  isRedirectError,
  isNotFoundError,
  getErrorContext,
  contextHeaders,
} from './errors.js'

interface ErrorBoundaryContextValue {
  error: (Error & { digest?: string }) | null
  reset: () => void
}

const ErrorBoundaryContext = React.createContext<ErrorBoundaryContextValue>({
  error: null,
  reset: () => {},
})

function useErrorBoundary() {
  return React.useContext(ErrorBoundaryContext)
}

// Sub-component: renders the error message from the nearest ErrorBoundary.
// Renders a <div> by default. Passes through all HTML div props.
function ErrorMessage(props: React.ComponentProps<'div'>) {
  const { error } = useErrorBoundary()
  if (!error) return null
  const message = error.digest || error.message
  if (!message) return null
  return <div {...props}>{message}</div>
}

// Sub-component: renders a reset button for the nearest ErrorBoundary.
// Renders a <button> by default. Passes through all HTML button props.
function ResetButton({
  children = 'Try again',
  ...props
}: React.ComponentProps<'button'>) {
  const { reset } = useErrorBoundary()
  return (
    <button onClick={reset} {...props}>
      {children}
    </button>
  )
}

interface ErrorBoundaryProps {
  children?: React.ReactNode
  fallback: React.ReactNode
}

interface ErrorBoundaryState {
  error: (Error & { digest?: string }) | null
}

class ErrorBoundaryInner extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error) {
    const ctx = getErrorContext(error)
    const hdrs = ctx ? contextHeaders(ctx) : undefined
    if (ctx && isRedirectError(ctx) && hdrs?.['location']) {
      router.replace(hdrs['location'])
      return {}
    }
    if (ctx && isNotFoundError(ctx)) {
      throw error
    }
    return { error }
  }

  reset = () => {
    React.startTransition(() => {
      this.setState({ error: null })
    })
  }

  override render() {
    const error = this.state.error
    if (error) {
      return (
        <ErrorBoundaryContext.Provider
          value={{ error, reset: this.reset }}
        >
          {this.props.fallback}
          <ErrorAutoReset reset={this.reset} />
        </ErrorBoundaryContext.Provider>
      )
    }
    return this.props.children
  }
}

function ErrorAutoReset({ reset }: { reset: () => void }) {
  const initialHref = React.useRef(window.location.href).current
  React.useEffect(() => {
    return router.subscribe(() => {
      if (window.location.href !== initialHref) {
        reset()
      }
    })
  }, [reset, initialHref])
  return null
}

// Public ErrorBoundary component with sub-components for error display and reset.
//
// Usage:
//   <ErrorBoundary fallback={
//     <div>
//       <ErrorBoundary.ErrorMessage className="text-red-500" />
//       <ErrorBoundary.ResetButton className="btn">Retry</ErrorBoundary.ResetButton>
//     </div>
//   }>
//     <form action={myAction}>...</form>
//   </ErrorBoundary>
function ErrorBoundary(props: ErrorBoundaryProps) {
  return <ErrorBoundaryInner {...props} />
}

ErrorBoundary.ErrorMessage = ErrorMessage
ErrorBoundary.ResetButton = ResetButton

export { ErrorBoundary }
