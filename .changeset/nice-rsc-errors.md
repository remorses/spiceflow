---
'spiceflow': patch
---

Rewrite cryptic "X is not a function" errors into actionable messages when client-only React APIs like `useState`, `useEffect`, `createContext`, or class components are accidentally used in Server Components. For example, `TypeError: useState is not a function` now becomes `useState only works in Client Components. Add the "use client" directive at the top of the file to use it.`
