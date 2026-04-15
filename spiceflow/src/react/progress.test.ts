// Tests the shared ProgressBar store for manual and navigation-driven state.
import { describe, expect, test } from 'vitest'

import { createProgressStore } from './progress.js'

describe('ProgressBar', () => {
  test('manual start and end are reference counted', () => {
    const store = createProgressStore()
    const states = [store.getSnapshot()]

    store.start()
    states.push(store.getSnapshot())

    store.start()
    states.push(store.getSnapshot())

    store.end()
    states.push(store.getSnapshot())

    store.end()
    states.push(store.getSnapshot())

    store.reset()
    states.push(store.getSnapshot())

    store.destroy()

    expect(states).toMatchInlineSnapshot(`
      [
        {
          "state": "initial",
          "width": 0,
        },
        {
          "state": "in-progress",
          "width": 15,
        },
        {
          "state": "in-progress",
          "width": 15,
        },
        {
          "state": "in-progress",
          "width": 15,
        },
        {
          "state": "completing",
          "width": 100,
        },
        {
          "state": "initial",
          "width": 0,
        },
      ]
    `)
  })

  test('manual and navigation work do not end early', () => {
    const store = createProgressStore()
    const states = [store.getSnapshot()]

    store.start()
    states.push(store.getSnapshot())

    store.beginNavigation()
    states.push(store.getSnapshot())

    store.end()
    states.push(store.getSnapshot())

    store.endNavigation()
    states.push(store.getSnapshot())

    store.done()
    states.push(store.getSnapshot())

    store.destroy()

    expect(states).toMatchInlineSnapshot(`
      [
        {
          "state": "initial",
          "width": 0,
        },
        {
          "state": "in-progress",
          "width": 15,
        },
        {
          "state": "in-progress",
          "width": 15,
        },
        {
          "state": "in-progress",
          "width": 15,
        },
        {
          "state": "completing",
          "width": 100,
        },
        {
          "state": "completing",
          "width": 100,
        },
      ]
    `)
  })
})
