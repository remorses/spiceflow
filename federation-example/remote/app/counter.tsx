'use client'

import { useState } from 'react'
import './counter.css'

export function Counter({ label = 'Remote' }: { label?: string }) {
  const [count, setCount] = useState(0)
  return (
    <div data-testid="remote-counter">
      <span>
        {label} counter: {count}
      </span>
      <button onClick={() => setCount((c) => c + 1)}>+</button>
      <button onClick={() => setCount((c) => c - 1)}>-</button>
    </div>
  )
}
