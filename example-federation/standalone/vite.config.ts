import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { resolve } from 'path'

// Same patch as @vitejs/plugin-rsc core/plugin.ts: rename __webpack_require__
// so react-server-dom-webpack doesn't crash outside a real webpack build.
function patchWebpackRequire(): Plugin {
  return {
    name: 'standalone:patch-webpack-require',
    transform(code, id) {
      if (!id.includes('react-server-dom-webpack')) return
      let patched = code
      if (patched.includes('__webpack_require__.u')) {
        patched = patched.replaceAll('__webpack_require__.u', '({}).u')
      }
      if (patched.includes('__webpack_require__')) {
        patched = patched.replaceAll('__webpack_require__', '__federation_require__')
      }
      if (patched !== code) return { code: patched, map: null }
    },
  }
}

// After build, expose bundled React modules via globalThis so that remote
// federation chunks (loaded via dynamic import with bare specifiers) can
// resolve "react", "react-dom", etc. through an import map.
//
// The approach: the main bundle registers React on window.__FEDERATION_MODULES__
// at startup. Post-build we generate small ES module wrappers that read from
// that global, and inject an import map pointing bare specifiers to them.
function federationImportMap(): Plugin {
  return {
    name: 'standalone:federation-import-map',
    enforce: 'post',
    closeBundle() {
      const distDir = resolve(__dirname, 'dist')
      const assetsDir = resolve(distDir, 'assets')
      const htmlPath = resolve(distDir, 'index.html')

      let html: string
      try { html = readFileSync(htmlPath, 'utf-8') } catch { return }

      const imports: Record<string, string> = {}

      // Generate wrapper modules that pull from the global registry.
      // The main bundle sets window.__FEDERATION_MODULES__ at startup.
      const modules = {
        'react': ['default', 'useState', 'useEffect', 'useRef', 'useMemo', 'useCallback', 'useContext', 'Children', 'cloneElement', 'createContext', 'createElement', 'forwardRef', 'lazy', 'memo', 'Suspense', 'Component', 'Fragment', 'startTransition', 'useDebugValue', 'useDeferredValue', 'useId', 'useImperativeHandle', 'useInsertionEffect', 'useLayoutEffect', 'useReducer', 'useSyncExternalStore', 'useTransition', 'createRef', 'cache', 'useOptimistic', 'StrictMode', 'useActionState', 'use', 'isValidElement'],
        'react/jsx-runtime': ['jsx', 'jsxs', 'Fragment', 'default'],
        'react/jsx-dev-runtime': ['jsx', 'jsxs', 'Fragment', 'default'],
        'react-dom': ['default', 'flushSync', 'createPortal', 'version', 'preconnect', 'prefetchDNS', 'preload', 'preinit', 'preinitModule', 'preloadModule', 'requestFormReset', '__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE'],
        'react-dom/client': ['default', 'createRoot', 'hydrateRoot'],
      }

      for (const [specifier, exports] of Object.entries(modules)) {
        const filename = `_fed_${specifier.replace(/\//g, '-')}.js`
        const g = `globalThis.__FEDERATION_MODULES__[${JSON.stringify(specifier)}]`
        const lines = exports
          .filter((e) => e !== 'default')
          .map((e) => `export const ${e} = ${g}.${e};`)
        lines.push(`export default ${g}.default || ${g};`)
        writeFileSync(resolve(assetsDir, filename), lines.join('\n') + '\n')
        imports[specifier] = `/assets/${filename}`
      }

      // spiceflow/react stub
      writeFileSync(
        resolve(assetsDir, '_fed_spiceflow-react.js'),
        `export function useRouterState(){return{pathname:"/standalone",searchParams:new URLSearchParams()}}\n` +
        `export function getRouter(){return null}\nexport const router=null\n`,
      )
      imports['spiceflow/react'] = '/assets/_fed_spiceflow-react.js'

      html = html.replace(
        '<head>',
        `<head>\n    <script type="importmap">${JSON.stringify({ imports })}</script>`,
      )
      writeFileSync(htmlPath, html)
    },
  }
}

export default defineConfig({
  clearScreen: false,
  plugins: [patchWebpackRequire(), react(), federationImportMap()],
  build: {
    rolldownOptions: {
      external: ['@vitejs/plugin-rsc/browser'],
    },
  },
})
