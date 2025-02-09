import React from 'react'
import { RouteMatch } from '../router.js'
import { ReactFormState } from 'react-dom/client'
import { InternalRoute } from '../types.js'

export const FlightDataContext = React.createContext<Promise<FlightData>>(
  undefined!,
)

export function useFlightData() {
  return React.use(React.useContext(FlightDataContext))
}

export function LayoutContent(props: { id: string }) {
  const data = useFlightData()
  const layoutIndex = data.layouts.findIndex((layout) => layout.id === props.id)
  if (layoutIndex >= 0) {
    return data.layouts[layoutIndex + 1].element
  }
  if (data.page?.id !== props.id) {
    throw new Error(`Layout id mismatch: expected ${props.id}`)
  }
  return data.page
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
