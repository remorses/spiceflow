// Vite adapter for the browser environment.
// Wraps @vitejs/plugin-rsc/browser and Vite-specific HMR/error overlay APIs.
export {
  createFromReadableStream,
  createFromFetch,
  createTemporaryReferenceSet,
  encodeReply,
  setServerCallback,
} from '@vitejs/plugin-rsc/browser'

export function onHmrUpdate(callback: () => void) {
  if (import.meta.hot) {
    import.meta.hot.on('rsc:update', (e: { file: string }) => {
      console.log('[rsc:update]', e.file)
      callback()
    })
  }
}

export function onHmrError() {
  if (import.meta.env.DEV) {
    window.onerror = (_event, _source, _lineno, _colno, err) => {
      const ErrorOverlay = customElements.get('vite-error-overlay')
      if (!ErrorOverlay) return
      const overlay = new (ErrorOverlay as any)(err)
      document.body.appendChild(overlay)
    }
  }
}
