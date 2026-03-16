'use client'

// Client component wrapper for MDX readme content.
// Code Hike and @mdx-js/react use createContext which requires client environment.
import { MDXProvider } from '@mdx-js/react'
import type { MDXComponents } from 'mdx/types'
import Readme from './readme.mdx'

const mdxComponents: MDXComponents = {
  MyCode({ codeblock }) {
    return <pre>{codeblock.value}xxx</pre>
  },
}

export function ReadmeContent() {
  return (
    <MDXProvider components={mdxComponents}>
      <Readme />
    </MDXProvider>
  )
}
