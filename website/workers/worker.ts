import { createPagesFunctionHandler } from '@react-router/cloudflare'
import { createRequestHandler } from 'react-router'

declare global {
  interface Env {}
  interface CloudflareEnvironment extends Env {}
}

declare module 'react-router' {
  export interface AppLoadContext {
    cloudflare: {
      env: CloudflareEnvironment
      ctx: ExecutionContext
    }
  }
}

const requestHandler = createRequestHandler(
  // @ts-expect-error
  () => import('virtual:react-router/server-build'),
  import.meta.env.MODE,
)

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    const userAgent = request.headers.get('user-agent') || ''
    
    // Log for debugging (remove in production)
    console.log('User-Agent:', userAgent)
    console.log('Path:', url.pathname)
    
    // Check if request is from AI coding agents (Claude Code, OpenCode, etc.)
    // These agents need raw markdown content instead of the React app
    const isAIAgent = userAgent.toLowerCase().includes('claude') ||
                     userAgent.toLowerCase().includes('opencode') ||
                     userAgent.toLowerCase().includes('claude-web') ||
                     userAgent.toLowerCase().includes('anthropic') ||
                     userAgent.toLowerCase().includes('codingassistant') ||
                     userAgent.toLowerCase().includes('ai-agent') ||
                     // Common patterns for AI agents
                     (userAgent.includes('compatible') && userAgent.includes('/1.0')) ||
                     // Check for specific headers that AI agents might send
                     request.headers.get('x-ai-agent') !== null ||
                     // Check for curl with specific agents
                     (userAgent.includes('curl') && url.searchParams.get('agent') === 'ai')
    
    // Redirect AI agents to the raw markdown file for better parsing
    if (isAIAgent && (url.pathname === '/' || url.pathname === '')) {
      console.log('Redirecting AI agent to /readme.md')
      return Response.redirect(new URL('/readme.md', url.origin).href, 302)
    }
    
    return requestHandler(request, {
      cloudflare: { env, ctx },
    })
  },
} satisfies ExportedHandler<CloudflareEnvironment>
