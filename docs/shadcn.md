# shadcn/ui

How to use [shadcn/ui](https://ui.shadcn.com) with Spiceflow. See [`example-shadcn/`](../example-shadcn) for a working example.

## Package exports instead of tsconfig paths

The official shadcn Vite guide tells you to add `paths` to your `tsconfig.json` to map `@/*` to `./src/*`. This is a TypeScript-only hack — it doesn't work at runtime in Node.js, and other workspace packages can't resolve `@/` imports from your code.

Instead, use `package.json` `exports` to define a self-referencing alias. This is an official Node.js feature that Vite, Bun, and all modern bundlers resolve natively:

```json
{
  "name": "my-app",
  "exports": {
    "./src/*": "./src/*"
  }
}
```

Now you can import your own files using the package name:

```tsx
import { Button } from 'my-app/src/components/ui/button.tsx'
import { cn } from 'my-app/src/lib/utils.ts'
```

**Why this is better than `@/*`:**

- **Standard runtime feature** — works in Node.js, Bun, Vite, esbuild, webpack without any special config
- **Cross-workspace imports** — other packages in a pnpm monorepo can import your components using the same path
- **Self-referencing** — Node.js natively supports importing from your own package name via the `exports` field
- **No `resolve.alias` in Vite** — no path hacking in `vite.config.ts`

## tsconfig paths for extensionless imports

The shadcn CLI generates extensionless imports like `from "my-app/src/lib/utils"`. Vite resolves these fine at runtime (it adds extensions automatically), but TypeScript's bundler resolution can't self-resolve the package name without help. Add a single `paths` entry:

```json
{
  "compilerOptions": {
    "moduleResolution": "Bundler",
    "baseUrl": ".",
    "paths": {
      "my-app/src/*": ["./src/*"]
    }
  }
}
```

This gives you the best of both worlds:
- **Package exports** handle runtime resolution in Vite, Node.js, and other workspace packages
- **tsconfig paths** let TypeScript resolve extensionless imports (shadcn CLI output)
- You can write imports with `.ts`/`.tsx` extensions (recommended), and shadcn-generated extensionless imports also typecheck

## Setup

### 1. Install dependencies

```bash
pnpm add @radix-ui/react-slot class-variance-authority clsx tailwind-merge lucide-react
```

### 2. Add package exports

In your `package.json`, add the `exports` field:

```json
{
  "name": "my-app",
  "type": "module",
  "exports": {
    "./package.json": "./package.json",
    "./src/*": "./src/*"
  }
}
```

### 3. Create the cn utility

```ts
// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### 4. Add CSS variables

Your `src/globals.css` needs tailwind v4 theme variables for shadcn's semantic color tokens. See [`example-shadcn/src/globals.css`](../example-shadcn/src/globals.css) for the full file.

```css
@import 'tailwindcss';

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  /* ... other tokens */
}

:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  /* ... other values */
}
```

### 5. Configure components.json

Create a `components.json` at your project root. Aliases use the package name instead of `@/`:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "css": "src/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "my-app/src/components",
    "utils": "my-app/src/lib/utils",
    "ui": "my-app/src/components/ui",
    "lib": "my-app/src/lib",
    "hooks": "my-app/src/hooks"
  },
  "iconLibrary": "lucide"
}
```

Replace `my-app` with your actual `package.json` `name`.

Setting `rsc: true` makes the shadcn CLI automatically add `"use client"` to interactive components since Spiceflow uses React Server Components by default.

### 6. Add components

```bash
pnpm dlx shadcn@latest add button card
```

The CLI generates extensionless imports — these work thanks to the tsconfig `paths` entry. Your own code can use `.ts`/`.tsx` extensions; both styles resolve correctly.

### 7. Use in your Spiceflow app

```tsx
// src/main.tsx
import './globals.css'
import { Spiceflow } from 'spiceflow'
import { Head } from 'spiceflow/react'
import { Card, CardContent, CardHeader, CardTitle } from 'my-app/src/components/ui/card.tsx'
import { Button } from 'my-app/src/components/ui/button.tsx'

export const app = new Spiceflow()
  .layout('/*', async ({ children }) => {
    return (
      <html lang="en">
        <Head>
          <Head.Title>My App</Head.Title>
        </Head>
        <body className="min-h-screen bg-background font-sans antialiased">
          {children}
        </body>
      </html>
    )
  })
  .page('/', async () => {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Hello</CardTitle>
        </CardHeader>
        <CardContent>
          <Button>Click me</Button>
        </CardContent>
      </Card>
    )
  })
```

## Full tsconfig

```json
{
  "compilerOptions": {
    "target": "es2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "module": "esnext",
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": true,
    "jsx": "preserve",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "noImplicitAny": false,
    "baseUrl": ".",
    "paths": {
      "my-app/src/*": ["./src/*"]
    },
    "types": ["vite/client", "node"]
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["node_modules", "dist"]
}
```
