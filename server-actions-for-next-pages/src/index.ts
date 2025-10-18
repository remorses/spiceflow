import * as path from 'path';
import * as fs from 'fs';
import type * as webpack from 'webpack';
import { NextConfig } from 'next';
import { PluginOptions as RpcPluginOptions } from './babelTransformRpc';
import { PluginOptions as ContextPluginOptions } from './babelTransformContext';
import { WrapMethod } from './server';

export interface WithRpcConfig {}

export { WrapMethod };

export function withServerActions(withRpcConfig: WithRpcConfig = {}) {
  return (nextConfig: NextConfig = {}): NextConfig => {
    applyTurbopackOptions(nextConfig);
    return {
      ...nextConfig,

      webpack(config: webpack.Configuration, options) {
        const { isServer, dev, dir } = options;
        const pagesDir = findPagesDir(dir);

        const appDir = path.resolve(pagesDir, '../app');
        config.module = config.module || {};
        config.module.rules = config.module.rules || [];
        config.module.rules.push({
          test: /\.(tsx|ts|js|mjs|jsx)$/,
          include: [pagesDir],
          use: [
            options.defaultLoaders.babel,
            {
              loader: 'babel-loader',
              options: {
                sourceMaps: dev,
                plugins: plugins({
                  isServer,
                  pagesDir,
                  isAppDir: false,
                  basePath: (nextConfig.basePath as string) || '/',
                }),
              },
            },
          ],
        });
        config.module.rules.push({
          test: /route\.(tsx|ts|js|mjs|jsx)$/,
          include: [appDir],
          use: [
            options.defaultLoaders.babel,
            {
              loader: 'babel-loader',
              options: {
                sourceMaps: dev,
                plugins: plugins({
                  isServer,
                  pagesDir,
                  isAppDir: true,
                  basePath: (nextConfig.basePath as string) || '/',
                }),
              },
            },
          ],
        });

        if (typeof nextConfig.webpack === 'function') {
          return nextConfig.webpack(config, options);
        } else {
          return config;
        }
      },
    };
  };
}

export function plugins({
  isServer,
  pagesDir,
  isAppDir,
  basePath,
}: RpcPluginOptions) {
  const apiDir = path.resolve(pagesDir, './api');
  const rpcPluginOptions: RpcPluginOptions = {
    isServer,
    pagesDir,

    isAppDir,
    basePath: basePath || '/',
  };

  const contextPluginOptions: ContextPluginOptions = { apiDir, isServer };
  return [
    require.resolve('@babel/plugin-syntax-jsx'),
    [require.resolve('@babel/plugin-transform-typescript'), { isTSX: true }],
    [require.resolve('../dist/babelTransformRpc'), rpcPluginOptions],
    [require.resolve('../dist/babelTransformContext'), contextPluginOptions],
    process.env.DEBUG_ACTIONS && [
      require.resolve('../dist/babelDebugOutputs'),
      contextPluginOptions,
    ],
  ].filter(Boolean) as any[];
}

function applyTurbopackOptions(nextConfig: NextConfig): void {
  // ⚠️ IMPORTANT: Turbopack custom loaders are NOT working in Next.js 16.0.0-beta.0
  // Users MUST run builds with --webpack flag: `next build --webpack`
  // Only Next.js 15 with experimental.turbo is currently supported
  //
  // Official Turbopack documentation:
  // https://nextjs.org/docs/app/api-reference/next-config-js/turbopack
  // https://github.com/vercel/next.js/blob/canary/docs/01-app/03-api-reference/05-config/01-next-config-js/turbopack.mdx
  // 
  // Advanced condition syntax (added in Next.js 16.0.0):
  // https://nextjs.org/docs/app/api-reference/next-config-js/turbopack#advanced-webpack-loader-conditions
  //
  // Boolean operators:
  // - { all: [...] } - all conditions must be true (AND)
  // - { any: [...] } - at least one condition must be true (OR)
  // - { not: ... } - negation (NOT)
  //
  // Customizable operators:
  // - { path: string | RegExp } - matches file path (glob or regex)
  // - { content: RegExp } - matches file content
  // - If path and content are in same object, acts as implicit AND
  //
  // Built-in conditions (strings):
  // - 'browser' - matches client-side code
  // - 'foreign' - matches node_modules and Next.js internals
  // - 'development' - matches next dev
  // - 'production' - matches next build  
  // - 'node' - matches Node.js runtime
  // - 'edge-light' - matches Edge runtime
  //
  // Rules can be object or array of objects for different conditions
  //
  // Real-world examples from GitHub:
  // - https://github.com/EC-WIN-24-NET/Khala/blob/main/next.config.ts
  // - https://github.com/ShizNick84/Scalping_Alchemist_Bolt/blob/main/next.config.js
  //
  // Example syntax for Next.js 16 (when loaders are fixed):
  // turbopack: {
  //   rules: {
  //     '**/*.{ts,tsx,js,jsx}': [
  //       {
  //         condition: {
  //           all: [
  //             'browser',
  //             { not: 'foreign' },
  //             { content: /"poor man's use server"|'poor man's use server'/ }
  //           ]
  //         },
  //         loaders: [{ loader: loaderPath, options: { isServer: false, ... } }],
  //         as: '*.js' // optional: output file extension
  //       },
  //       {
  //         condition: {
  //           all: [
  //             { not: 'browser' },
  //             { not: 'foreign' },
  //             { content: /"poor man's use server"|'poor man's use server'/ }
  //           ]
  //         },
  //         loaders: [{ loader: loaderPath, options: { isServer: true, ... } }],
  //         as: '*.js'
  //       }
  //     ]
  //   }
  // }
  
  const pagesDir = findPagesDir(process.cwd());
  const basePath = (nextConfig.basePath as string) || '/';
  const loaderPath = require.resolve('../dist/turbopackLoader');
  
  // Next.js 15 experimental.turbo.rules configuration
  const loaderConfig = {
    loaders: [
      {
        loader: loaderPath,
        options: {
          isServer: true,
          pagesDir,
          isAppDir: false,
          basePath,
        },
      },
    ],
  };
  
  // Only configure experimental.turbo for Next.js 15
  // Next.js 16 turbopack does not properly support custom loaders yet
  nextConfig.experimental ??= {};
  (nextConfig.experimental as any).turbo ??= {};
  (nextConfig.experimental as any).turbo.rules ??= {};
  (nextConfig.experimental as any).turbo.rules['**/*.{ts,tsx,js,jsx}'] = loaderConfig;
  
  // Do NOT configure turbopack.rules for Next.js 16 - it doesn't work in beta.0
  // Users must use --webpack flag with Next.js 16
}

// taken from https://github.com/vercel/next.js/blob/v12.1.5/packages/next/lib/find-pages-dir.ts
function findPagesDir(dir: string): string {
  // prioritize ./pages over ./src/pages
  let curDir = path.join(dir, 'pages');
  if (fs.existsSync(curDir)) return curDir;

  curDir = path.join(dir, 'src/pages');
  if (fs.existsSync(curDir)) return curDir;

  // Check one level up the tree to see if the pages directory might be there
  if (fs.existsSync(path.join(dir, '..', 'pages'))) {
    throw new Error(
      'No `pages` directory found. Did you mean to run `next` in the parent (`../`) directory?',
    );
  }

  throw new Error(
    "Couldn't find a `pages` directory. Please create one under the project root",
  );
}
