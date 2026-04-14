"use client"
import { useState } from "react"

export function LocalCounter({ label = "Local" }: { label?: string }) {
  const [count, setCount] = useState(0)
  return (
    <div data-testid="local-counter">
      <span>{label} counter: {count}</span>
      <button onClick={() => setCount((c) => c + 1)}>+</button>
      <button onClick={() => setCount((c) => c - 1)}>-</button>
    </div>
  )
}
