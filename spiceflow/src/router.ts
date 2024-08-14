// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import OriginalRouter from '@medley/router'
// Should be exported from `hono/router`

export class MedleyRouter<T extends Function> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	router: any
	name: string = 'MedleyRouter'

	constructor() {
		this.router = new OriginalRouter()
	}

	add(method: string, path: string, handler: T) {
		const store = this.router.register(path)
		store[method] = handler
	}

	match(method: string, path: string) {
		const route = this.router.find(path)

		let handle = route['store'][method]
		if (handle) {
			return {
				handle,
				params: route['params']
			}
		}

		return null
	}
}
