import { remarkCodeHike } from '@code-hike/mdx'
import withSlugs from 'rehype-slug'
import withToc from '@stefanprobst/rehype-extract-toc'
import withTocExport from '@stefanprobst/rehype-extract-toc/mdx'
import { reactRouter } from '@react-router/dev/vite'

import mdx from '@mdx-js/rollup'
import remarkMdxFrontmatter from 'remark-mdx-frontmatter'
import remarkFrontmatter from 'remark-frontmatter'
import rehypeMdxImportMedia from 'rehype-mdx-import-media'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

const chConfig = {
  components: { code: 'MyCode' },
}

import { cloudflare } from '@cloudflare/vite-plugin'

export default defineConfig({
  
  plugins: [
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    mdx({
      remarkPlugins: [
        remarkFrontmatter,
        remarkMdxFrontmatter,
        [
          remarkCodeHike,
          {
            theme: 'github-light',
            // components: { code: 'MyCode' },

            // lineNumbers: true, //
            showCopyButton: true,
          },
        ],
      ],

      rehypePlugins: [
        withSlugs,
        withToc,
        withTocExport,
        rehypeMdxImportMedia,
        //
      ],
      mdxExtensions: ['.md', '.mdx'],
      mdExtensions: [],
      // providerImportSource: '@mdx-js/react',
    }),
    reactRouter(),
    tsconfigPaths(),
  ],
})
