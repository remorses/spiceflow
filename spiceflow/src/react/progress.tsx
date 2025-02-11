'use client'
import { useEffect, useRef, useState } from 'react'

import { ReactNode } from 'react'
import { router } from './router.js'

export interface ProgressBarProps {
  /**
   * Color of the progress bar
   * @default "#0ea5e9"
   */
  color?: string
  /**
   * Duration of the transition animation in milliseconds
   * @default 300
   */
  duration?: number
}

export function ProgressBar({
  color = '#0ea5e9',
  duration = 300,
}: ProgressBarProps) {
  const progress = useProgress()
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    if (progress.state === 'complete') {
      setIsExiting(true)
    } else {
      setIsExiting(false)
    }
  }, [progress.state])

  return (
    <div
      style={{
        position: 'fixed',
        zIndex: 50,
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        backgroundColor: color,
        boxShadow: `0 4px 6px -1px ${color}33`,
        transition: `all ${duration}ms`,
        width: `${progress.width}%`,
        opacity: isExiting ? 0 : 1,
      }}
      onTransitionEnd={(e) => {
        if (e.propertyName === 'opacity' && isExiting) {
          progress.reset()
          setIsExiting(false)
        }
      }}
    />
  )
}

function useProgress() {
  const [state, setState] = useState<
    'initial' | 'in-progress' | 'completing' | 'complete'
  >('initial')
  const [width, setWidth] = useState(0)

  useInterval(
    () => {
      if (state === 'in-progress') {
        setWidth((prev) => {
          let diff
          if (prev === 0) {
            diff = 15
          } else if (prev < 50) {
            diff = rand(1, 10)
          } else {
            diff = rand(1, 5)
          }
          return Math.min(prev + diff, 99)
        })
      }
    },
    state === 'in-progress' ? 750 : null,
  )

  useEffect(() => {
    const unlisten = router.listen(() => {
      start()
    })

    return () => {
      unlisten()
    }
  }, [])

  useEffect(() => {
    if (state === 'initial') {
      setWidth(0)
    } else if (state === 'completing') {
      setWidth(100)
    }
  }, [state])

  useEffect(() => {
    if (width === 100) {
      setState('complete')
    }
  }, [width])

  function reset() {
    setState('initial')
  }

  function start() {
    setState('in-progress')
  }

  function done() {
    setState((prev) =>
      prev === 'initial' || prev === 'in-progress' ? 'completing' : prev,
    )
  }

  return { state, width, start, done, reset }
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback)

  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    function tick() {
      savedCallback.current()
    }

    if (delay !== null) {
      tick()
      const id = setInterval(tick, delay)
      return () => clearInterval(id)
    }
  }, [delay])
}
