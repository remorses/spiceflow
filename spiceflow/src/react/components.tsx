import React from 'react'
import {RouteMatch} from '../router.js'
import { ReactFormState } from 'react-dom/client'

export const FlightDataContext = React.createContext<Promise<FlightData>>(
  undefined!,
)

export function useFlightData() {
  return React.use(React.useContext(FlightDataContext))
}

export function LayoutContent(props: { name: string }) {
  const data = useFlightData()
  const routeId = data.layoutContentMap[props.name]
  //   tinyassert(routeId, `Unexpected layout content map`)
  return data.nodeMap[routeId]
}

export type FlightData = {
//   action?: Pick<ActionResult, 'error' | 'data'>
//   metadata?: React.ReactNode
//   nodeMap: Record<string, React.ReactNode>
//   layoutContentMap: Record<string, string>
  //   segments: MatchSegment[]
  page: any
  layouts: RouteMatch[]
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
