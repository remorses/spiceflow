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
  // IMPORTANT: Turbopack custom loaders are NOT working in Next.js 16 beta
  // Users should run builds with --webpack flag: `next build --webpack`
  // Only Next.js 15 with experimental.turbo is supported
  //
  // Turbopack rules documentation:
  // https://nextjs.org/docs/app/api-reference/next-config-js/turbopack
  // 
  // Condition syntax supports:
  // - { all: [...] } - all conditions must be true
  // - { any: [...] } - at least one condition must be true  
  // - { not: ... } - negation
  // - { path: RegExp | string } - matches file path
  // - { content: RegExp } - matches file content
  // - Built-in conditions: 'browser', 'foreign', 'development', 'production', 'node'
  //
  // Example working syntax for Next.js 16 (when loaders are fixed):
  // rules: {
  //   '**/*.{ts,tsx,js,jsx}': [
  //     {
  //       condition: {
  //         all: [
  //           'browser',
  //           { not: 'foreign' },
  //           { content: /"poor man's use server"|'poor man's use server'/ }
  //         ]
  //       },
  //       loaders: [{ loader: loaderPath, options: { isServer: false, ... } }]
  //     },
  //     {
  //       condition: {
  //         all: [
  //           { not: 'browser' },
  //           { not: 'foreign' },
  //           { content: /"poor man's use server"|'poor man's use server'/ }
  //         ]
  //       },
  //       loaders: [{ loader: loaderPath, options: { isServer: true, ... } }]
  //     }
  //   ]
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
  
  // Do NOT configure turbopack.rules for Next.js 16 - it doesn't work
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
