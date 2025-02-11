'use client'

import React, { Suspense } from 'react'
import { ReactFormState } from 'react-dom/client'
import { router } from './router.js'
import { ServerPayload } from '../spiceflow.js'

export const FlightDataContext = React.createContext<Promise<ServerPayload>>(
  undefined!,
)
// Get $$id property that was set by registerClientReference

export function useFlightData() {
  const c = React.useContext(FlightDataContext)
  if (c instanceof Promise) {
    return React.use(c)?.root
  }
  return c?.['root']
  // return React.useContext(FlightDataContext)
}

export function LayoutContent(props: { id?: string }) {
  const data = useFlightData()
  const elem = (() => {
    if (!props.id) {
      return data.layouts[0]?.element ?? data.page
    }
    const layoutIndex = data.layouts.findIndex(
      (layout) => layout.id === props.id,
    )
    let nextLayout = data.layouts[layoutIndex + 1]?.element
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

// TODO not implemented
interface ReactServerErrorContext {
  status: number
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

function isRedirectError(ctx: ReactServerErrorContext) {
  return ctx.status >= 300 && ctx.status < 400
}

function isNotFoundError(ctx: ReactServerErrorContext) {
  return ctx.status === 404
}

function getErrorContext(error: Error): ReactServerErrorContext | undefined {
  return (error as any).serverError
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
    if (ctx && (isNotFoundError(ctx) || isRedirectError(ctx))) {
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
