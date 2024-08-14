// deno-lint-ignore no-explicit-any
export const deepFreeze = (value: any) => {
	for (const key of Reflect.ownKeys(value)) {
		if (value[key] && typeof value[key] === 'object') {
			deepFreeze(value[key])
		}
	}
	return Object.freeze(value)
}

export const req = (path: string, options?: RequestInit) =>
	new Request(`http://localhost${path}`, options)

export function isAsyncIterable(obj: any): obj is AsyncGenerator<any> {
	return (
		typeof obj === 'object' &&
		typeof obj.next === 'function' &&
		typeof obj.return === 'function' &&
		typeof obj.throw === 'function' &&
		typeof obj.return === 'function'
	)
}

export function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}
