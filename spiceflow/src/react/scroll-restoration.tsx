// ScrollRestoration for spiceflow RSC.
// Client component that saves/restores window scroll position across navigations.
// Works with the RSC flight stream: restores scroll after the new payload commits.
'use client'

import React from 'react'
import {
  getLastNavigationEvent,
  getScrollPositions,
  loadScrollPositions,
  recordScrollPosition,
  router,
} from './router.js'
import { FlightDataContext } from './context.js'

const STORAGE_KEY = 'spiceflow-scroll-positions'
const MAX_SCROLL_ENTRIES = 200

export interface ScrollRestorationProps {
  getKey?: (location: {
    pathname: string
    search: string
    hash: string
  }) => string | null
  storageKey?: string
  nonce?: string
}

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
    if (!raw) {
      return {}
    }
    return JSON.parse(raw) as Record<string, number>
  } catch {
    return {}
  }
}

function persistPositions(
  storageKey: string,
  positions: Record<string, number>,
) {
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(positions))
  } catch {
    // private mode or quota exceeded
  }
}

export function ScrollRestoration({
  getKey: getKeyFn,
  storageKey = STORAGE_KEY,
  nonce,
}: ScrollRestorationProps) {
  const lastHandledNavigationIdRef = React.useRef(0)
  const flightData = React.useContext(FlightDataContext)

  React.useEffect(() => {
    window.history.scrollRestoration = 'manual'
    const positions = loadPositions(storageKey)
    loadScrollPositions({ positions })
    return () => {
      window.history.scrollRestoration = 'auto'
    }
  }, [storageKey])

  React.useEffect(() => {
    function onScroll() {
      recordScrollPosition({
        locationKey: getKey(router.location, getKeyFn),
        scrollY: window.scrollY,
      })
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [getKeyFn])

  React.useLayoutEffect(() => {
    const event = getLastNavigationEvent()
    if (!event) {
      return
    }
    if (event.id === lastHandledNavigationIdRef.current) {
      return
    }
    lastHandledNavigationIdRef.current = event.id

    if (event.source === 'refresh') {
      return
    }

    const savedPositions = getScrollPositions({
      maxEntries: MAX_SCROLL_ENTRIES,
    })

    if (event.action === 'POP') {
      const key = getKey(event.location, getKeyFn)
      const savedY = savedPositions[key]
      if (typeof savedY === 'number') {
        window.scrollTo(0, savedY)
        return
      }
    }

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

    window.scrollTo(0, 0)
  }, [flightData, getKeyFn])

  React.useEffect(() => {
    function onPageHide() {
      recordScrollPosition({
        locationKey: getKey(router.location, getKeyFn),
        scrollY: window.scrollY,
      })
      persistPositions(
        storageKey,
        getScrollPositions({ maxEntries: MAX_SCROLL_ENTRIES }),
      )
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
