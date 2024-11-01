# server-actions-for-next-pages

## 1.2.1

### Patch Changes

- Restore to wroking version

## 1.0.0

### Major Changes

- be685e1: - Add support for server actions in the `/app` directory
  - Export headers() and cookies() functions more similar to Next.js instead of `getContext`
  - Deprecate the `getContext` functions
  - Serialize with superjson instead of JSON
  - Drop support for `getInitialProps`
  - Add support for `export const runtime`
  - Allow exports like revalidate and preferredRegion

## 0.2.1

### Patch Changes

- Support for multiple plugins with loaders at the same time

## 0.2.0

### Minor Changes

- Add support for --turbo using loader

## 0.1.0

### Minor Changes

- added functions headers and cookies to context
