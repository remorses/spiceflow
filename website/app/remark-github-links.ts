// Remark plugin that rewrites relative URLs in markdown to GitHub blob/tree URLs.
// The root README.md uses relative links like (nodejs-example/vite.config.ts) which
// work on GitHub but 404 on the website. This plugin fixes them during MDX compilation.
import { visit } from 'unist-util-visit'

const GITHUB_REPO = 'https://github.com/remorses/spiceflow-rsc'
const GITHUB_BLOB = `${GITHUB_REPO}/blob/main/`

function isRelativeUrl(url: string): boolean {
  if (!url) return false
  if (url.startsWith('http://') || url.startsWith('https://')) return false
  if (url.startsWith('#') || url.startsWith('/') || url.startsWith('mailto:'))
    return false
  return true
}

function hasFileExtension(url: string): boolean {
  const clean = url.split('?')[0].split('#')[0]
  const lastSegment = clean.split('/').pop() || ''
  return lastSegment.includes('.')
}

export function remarkGithubLinks() {
  return (tree: any) => {
    visit(tree, 'link', (node: any) => {
      if (!isRelativeUrl(node.url)) return
      if (!hasFileExtension(node.url)) return
      node.url = GITHUB_BLOB + node.url
    })
  }
}
