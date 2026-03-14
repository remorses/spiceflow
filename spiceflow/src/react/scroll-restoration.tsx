// ScrollRestoration for spiceflow RSC.
// Client component that saves/restores window scroll position across navigations.
// Works with the RSC flight stream: restores scroll after the new payload commits.
'use client'

import React from 'react'
import { router, NavigationEvent } from './router.js'
import { FlightDataContext } from './context.js'

const STORAGE_KEY = 'spiceflow-scroll-positions'
const MAX_SCROLL_ENTRIES = 200

export interface ScrollRestorationProps {
  getKey?: (location: { pathname: string; search: string; hash: string }) => string | null
  storageKey?: string
  nonce?: string
}

// Saved positions live in memory during the session, flushed to sessionStorage on pagehide.
let savedPositions: Record<string, number> = {}

function getKey(
  location: { pathname: string; search: string; hash: string; key?: string },
  getKeyFn?: ScrollRestorationProps['getKey'],
): string {
  if (getKeyFn) {
    const custom = getKeyFn(location)
    if (custom != null) return custom
  }
  // Fall back to history state key (unique per history entry)
  return (location as any).key || location.pathname + location.search
}

function loadPositions(storageKey: string) {
  try {
    const raw = sessionStorage.getItem(storageKey)
    if (raw) savedPositions = JSON.parse(raw)
  } catch {
    // private mode or quota exceeded
  }
}

function persistPositions(storageKey: string) {
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(savedPositions))
  } catch {
    // private mode or quota exceeded
  }
}

export function ScrollRestoration({
  getKey: getKeyFn,
  storageKey = STORAGE_KEY,
  nonce,
}: ScrollRestorationProps) {
  const lastEventRef = React.useRef<NavigationEvent | null>(null)
  const flightData = React.useContext(FlightDataContext)

  // On mount: disable browser scroll restoration, load saved positions
  React.useEffect(() => {
    window.history.scrollRestoration = 'manual'
    loadPositions(storageKey)
    return () => {
      window.history.scrollRestoration = 'auto'
    }
  }, [storageKey])

  // Continuously save scroll position for the current key on every scroll event.
  // This ensures we always have the latest user scroll position saved, even if
  // auto-scroll (e.g. browser scrolling to a clicked link) resets scrollY before
  // the navigation handler fires.
  React.useEffect(() => {
    function onScroll() {
      const key = getKey(router.location, getKeyFn)
      savedPositions[key] = window.scrollY
      // Evict oldest entries to prevent unbounded growth in long sessions
      const keys = Object.keys(savedPositions)
      if (keys.length > MAX_SCROLL_ENTRIES) {
        delete savedPositions[keys[0]]
      }
    }
    // Save initial position
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [getKeyFn])

  // Subscribe to router: track navigation events for restore logic.
  React.useEffect(() => {
    return router.subscribe((event) => {
      lastEventRef.current = event
    })
  }, [getKeyFn])

  // Restore scroll after RSC payload arrives and React renders.
  // Nulls out lastEventRef so non-navigation payload updates (server actions) are ignored.
  React.useLayoutEffect(() => {
    const event = lastEventRef.current
    if (!event) return
    lastEventRef.current = null
    // Don't touch scroll on refresh/HMR
    if (event.source === 'refresh') return

    // POP (back/forward): restore saved position
    if (event.action === 'POP') {
      const key = getKey(event.location, getKeyFn)
      const savedY = savedPositions[key]
      if (typeof savedY === 'number') {
        window.scrollTo(0, savedY)
        return
      }
    }

    // Hash link: scroll to element
    if (event.location.hash) {
      try {
        const id = decodeURIComponent(event.location.hash.slice(1))
        const el = document.getElementById(id)
        if (el) {
          el.scrollIntoView()
          return
        }
      } catch {
        // bad hash encoding, fall through to scroll to top
      }
    }

    // PUSH/REPLACE (new navigation): scroll to top
    window.scrollTo(0, 0)
  }, [flightData, getKeyFn])

  // Persist positions to sessionStorage on pagehide.
  // Re-enable manual mode on pageshow (BFCache restore skips mount effects).
  React.useEffect(() => {
    function onPageHide() {
      const key = getKey(router.location, getKeyFn)
      savedPositions[key] = window.scrollY
      persistPositions(storageKey)
      window.history.scrollRestoration = 'auto'
    }
    function onPageShow(e: PageTransitionEvent) {
      if (e.persisted) {
        window.history.scrollRestoration = 'manual'
      }
    }
    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('pageshow', onPageShow)
    return () => {
      window.removeEventListener('pagehide', onPageHide)
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [getKeyFn, storageKey])

  // Inline script for SSR: restores scroll before React hydrates to prevent flash.
  // This runs synchronously during HTML parsing.
  const scriptContent = `(function(){
  try{
    var s=window.history.state||{};
    if(!s.key){
      var k=Math.random().toString(32).slice(2);
      window.history.replaceState(Object.assign({},s,{key:k}),"");
    }
    var p=JSON.parse(sessionStorage.getItem(${JSON.stringify(storageKey)})||"{}");
    var y=p[window.history.state.key];
    if(typeof y==="number")window.scrollTo(0,y);
  }catch(e){}
  window.history.scrollRestoration="manual";
})()`

  return (
    <script
      nonce={nonce}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: scriptContent }}
    />
  )
}
