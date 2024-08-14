/**
 * Types for `jsr:@ssr/velocirouter`.
 *
 * @module
 */

/** Platform specific context default type */
export type Platform = Record<PropertyKey, unknown>

/** `Response` (asynchronous or resolved) */
export type AsyncResponse = Response | Promise<Response>

/** Valid return types from a route handle */
export type HandleResponse =
	| void
	| undefined
	| null
	| Response
	| any
	| Promise<undefined | null | Response>

/** Properties passed to route handles */
export interface HandleProps<P = Platform> {
	request: Request
	response?: Response

	/** Send response immediately and stop further propagation */
	stopPropagation: () => void
}

/** Route handle function */
export interface Handle<P = Platform> {
	(props: HandleProps<P>): HandleResponse
}

/** Resolve handle return type */
export interface HandleResolve {
	request: Request
	response?: null | Response
}

/** Internal route object */
export type Route<P = Platform> = {
	order: number
	handle: Handle<P>
	pattern: URLPattern
}

/** Internal route object array */
export type RoutesArray<P = Platform> = Array<Route<P>>

/** Router class method for attaching HTTP method handles */
export interface RouterMethod<P = Platform> {
	(pattern: string, ...handle: Array<Handle<P>>): void
}
