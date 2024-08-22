import { bench, describe } from 'vitest'
import { Spiceflow } from './spiceflow.js'

describe('benchmark listen', () => {
	bench('handle request', () => {
		const app = new Spiceflow()
	})
})
