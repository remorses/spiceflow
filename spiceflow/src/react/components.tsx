'use client'

import React from 'react'
import { ReactFormState } from 'react-dom/client'

export const FlightDataContext = React.createContext<FlightData>(undefined!)
// Get $$id property that was set by registerClientReference

export function useFlightData() {
  // return React.use(React.useContext(FlightDataContext))
  return React.useContext(FlightDataContext)
}

export function LayoutContent(props: { id: string }) {
  const data = useFlightData()
  const layoutIndex = data.layouts.findIndex((layout) => layout.id === props.id)
  let nextLayout = data.layouts[layoutIndex + 1]?.element
  if (nextLayout) {
    return nextLayout
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
