---
'server-actions-for-next-pages': major
---

- Add support for server actions in the `/app` directory
- Export headers() and cookies() functions more similar to Next.js instead of `getContext`
- Deprecate the `getContext` functions
- Serialize with superjson instead of JSON
- Drop support for `getInitialProps`
- Add support for `export const runtime`
- Allow exports like revalidate and preferredRegion
