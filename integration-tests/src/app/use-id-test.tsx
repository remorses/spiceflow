// Client component that renders useId() output for hydration mismatch testing.
'use client'
import { useId } from 'react'

export function UseIdTest() {
  const id = useId()
  return (
    <div data-testid="use-id-test" data-id={id}>
      ID: {id}
    </div>
  )
}
