declare module '*.mdx' {
  import type { ComponentType } from 'react'
  const component: ComponentType
  export default component
  export const tableOfContents: any[]
}

declare module '*.mdx?raw' {
  const content: string
  export default content
}
