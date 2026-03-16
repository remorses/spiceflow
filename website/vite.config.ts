import { remarkCodeHike } from '@code-hike/mdx'
import withSlugs from 'rehype-slug'
import withToc from '@stefanprobst/rehype-extract-toc'
import withTocExport from '@stefanprobst/rehype-extract-toc/mdx'

import mdx from '@mdx-js/rollup'
import remarkMdxFrontmatter from 'remark-mdx-frontmatter'
import remarkFrontmatter from 'remark-frontmatter'
import rehypeMdxImportMedia from 'rehype-mdx-import-media'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { cloudflare } from '@cloudflare/vite-plugin'
import react from '@vitejs/plugin-react'
import { spiceflowPlugin } from 'spiceflow/vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    {
      enforce: 'pre',
      ...mdx({
        remarkPlugins: [
          remarkFrontmatter,
          remarkMdxFrontmatter,
          [
            remarkCodeHike,
            {
              theme: 'github-light',
              showCopyButton: true,
            },
          ],
        ],
        rehypePlugins: [
          withSlugs,
          withToc,
          withTocExport,
          rehypeMdxImportMedia,
        ],
        mdxExtensions: ['.md', '.mdx'],
        mdExtensions: [],
      }),
    },
    spiceflowPlugin({
      entry: './app/main.tsx',
    }),
    tailwindcss(),
    tsconfigPaths(),
    cloudflare({
      viteEnvironment: {
        name: 'rsc',
        childEnvironments: ['ssr'],
      },
    }),
  ],
})
