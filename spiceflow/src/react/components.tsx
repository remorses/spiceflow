'use client'

import React, { Suspense } from 'react'
import { ReactFormState } from 'react-dom/client'
import { router } from './router.js'
import { ServerPayload } from '../spiceflow.js'
import { isRedirectError, isNotFoundError, getErrorContext } from './errors.js'
import { useFlightData } from './context.js'

export function LayoutContent(props: { id?: string }) {
  const data = useFlightData()
  if (!data) return null
  const elem = (() => {
    if (!props.id) {
      return data?.layouts[0]?.element ?? data.page
    }
    const layoutIndex = data?.layouts.findIndex(
      (layout) => layout.id === props.id,
    )
    let nextLayout = data?.layouts[layoutIndex + 1]?.element
    if (nextLayout) {
      return nextLayout
    }

    return data.page
  })()
  return elem
}

export type FlightData = {
  //   action?: Pick<ActionResult, 'error' | 'data'>
  //   metadata?: React.ReactNode
  //   nodeMap: Record<string, React.ReactNode>
  //   layoutContentMap: Record<string, string>
  //   segments: MatchSegment[]
  page: any
  layouts: { id: string; element: React.ReactNode }[]
  url: string
}

export type ActionResult = {
  error?: ReactServerErrorContext
  data?: ReactFormState | null
}

interface ReactServerErrorContext {
  status: number
  location?: string
  headers?: Record<string, string>
}

export interface ErrorPageProps {
  error: Error
  serverError?: ReactServerErrorContext
  reset: () => void
}

interface Props {
  children?: React.ReactNode
  errorComponent: React.FC<ErrorPageProps>
}

interface State {
  error: Error | null
}

export function ErrorBoundary(props: Props) {
  return <ErrorBoundary_ {...props} />
}

class ErrorBoundary_ extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error) {
    const ctx = getErrorContext(error)
    if (ctx && isRedirectError(ctx) && ctx.headers?.['location']) {
      console.log('redirecting from browser to', ctx.headers?.['location'])
      router.replace(ctx.headers?.['location'])
      return {}
    }
    if (ctx && isNotFoundError(ctx)) {
      throw error
    }
    if (import.meta.env.DEV) {
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
        <>
          <this.props.errorComponent
            error={error}
            serverError={getErrorContext(error)}
            reset={this.reset}
          />
          <ErrorAutoReset reset={this.reset} />
        </>
      )
    }
    return this.props.children
  }
}

function ErrorAutoReset(props: Pick<ErrorPageProps, 'reset'>) {
  // TODO
  // const href = useRouter((s) => s.location.href);
  // const initialHref = React.useRef(href).current;
  // React.useEffect(() => {
  //   if (href !== initialHref) {
  //     props.reset();
  //   }
  // }, [href]);
  return null
}

// https://github.com/vercel/next.js/blob/677c9b372faef680d17e9ba224743f44e1107661/packages/next/src/build/webpack/loaders/next-app-loader.ts#L73
// https://github.com/vercel/next.js/blob/677c9b372faef680d17e9ba224743f44e1107661/packages/next/src/client/components/error-boundary.tsx#L145
export function DefaultGlobalErrorPage(props: ErrorPageProps) {
  const message = props.serverError
    ? `Unknown Server Error (see server logs for the details)`
    : `Unknown Client Error (see browser console for the details)`
  return (
    <html>
      <meta name="robots" content="noindex" />
      <title>{message}</title>
      <body
        style={{
          fontFamily:
            'system-ui,"Segoe UI",Roboto,Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji"',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          placeContent: 'center',
          placeItems: 'center',
          fontSize: '14px',
          fontWeight: 400,
          lineHeight: '28px',
        }}
      >
        <h2>{message}</h2>
      </body>
    </html>
  )
}

export function Link(props: React.ComponentPropsWithRef<'a'>) {
  return (
    <a
      {...props}
      onClick={(e) => {
        if (
          e.metaKey ||
          e.ctrlKey ||
          e.shiftKey ||
          e.altKey ||
          (props.target && props.target === '_blank')
        ) {
          props.onClick?.(e)
          return
        }
        e.preventDefault()
        props.onClick?.(e)
        router.push(e.currentTarget.href)
      }}
    />
  )
}

// https://github.com/vercel/next.js/blob/c74f3f54b23b3fc47dc7e214a8949844257a734a/packages/next/src/build/webpack/loaders/next-app-loader.ts#L72
// https://github.com/vercel/next.js/blob/8f5f0ef141a907d083eedb7c7aca52b04f9d258b/packages/next/src/client/components/not-found-error.tsx#L34-L39
export function DefaultNotFoundPage() {
  return (
    <html>
      <meta name="robots" content="noindex" />
      <title>not found</title>
      <body>
        <div
          style={{
            fontFamily:
              'system-ui,"Segoe UI",Roboto,Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji"',
            height: '100vh',
            display: 'flex',
            placeContent: 'center',
            placeItems: 'center',
          }}
        >
          <div style={{ display: 'flex', lineHeight: '50px' }}>
            <h1
              style={{
                margin: '0 20px 0 0',
                padding: '0 23px 0 0',
                fontSize: 24,
                fontWeight: 500,
                borderRight: '1px solid rgba(0, 0, 0, .3)',
              }}
            >
              404
            </h1>
            <h2
              style={{
                fontSize: 14,
                fontWeight: 400,
              }}
            >
              This page could not be found.
            </h2>
          </div>
        </div>
      </body>
    </html>
  )
}
export class NotFoundBoundary extends React.Component<{
  component: React.ComponentType
  children?: React.ReactNode
}> {
  override state: { error?: Error } = {}

  static getDerivedStateFromError(error: Error) {
    const ctx = getErrorContext(error)
    if (ctx && isNotFoundError(ctx)) {
      return { error }
    }
    throw error
  }

  override render() {
    if (this.state.error) {
      const Component = this.props.component
      return (
        <>
          <Component />
          <ErrorAutoReset
            reset={() => {
              React.startTransition(() => {
                this.setState({ error: null })
              })
            }}
          />
        </>
      )
    }
    return this.props.children
  }
}
