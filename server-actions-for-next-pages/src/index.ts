import * as path from 'path';
import * as fs from 'fs';
import type * as webpack from 'webpack';
import { NextConfig } from 'next';
import { PluginOptions as RpcPluginOptions } from './babelTransformRpc';
import { PluginOptions as ContextPluginOptions } from './babelTransformContext';
import { WrapMethod } from './server';
import { directive } from '@babel/types';

export interface WithRpcConfig {}

export { WrapMethod };

export function withServerActions(withRpcConfig: WithRpcConfig = {}) {
  return (nextConfig: NextConfig = {}): NextConfig => {
    applyTurbopackOptions(nextConfig);
    return {
      ...nextConfig,

      webpack(config: webpack.Configuration, options) {
        const { isServer, dev, dir } = options;
        const nextDir = findNextDir(dir);
        const pagesApiDir = path.resolve(nextDir, './pages/api');

        config.module = config.module || {};
        config.module.rules = config.module.rules || [];
        config.module.rules.push({
          test: /\.(tsx|ts|js|mjs|jsx)$/,
          include: [pagesApiDir],
          use: [
            options.defaultLoaders.babel,
            {
              loader: 'babel-loader',
              options: {
                sourceMaps: dev,
                plugins: plugins({
                  isServer,
                  nextDir,
                  isAppDir: false,
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

export function fastCheckIfServerAction({ source, filename }) {
  // the context plugin is required for pages, to add the async context in getServerSideProps or api routes
  if (filename.includes('/pages/')) {
    return false;
  }
  const quotes = ['"', "'"];
  for (const quote of quotes) {
    const str = quote + directive + quote;
    if (source.includes(str)) {
      return false;
    }
  }
  return true;
}

export function plugins(opts: RpcPluginOptions) {
  const apiDir = path.resolve(opts.nextDir, './pages/api');

  return [
    [require.resolve('@babel/plugin-syntax-typescript'), { isTSX: true }],
    [require.resolve('../dist/babelTransformRpc'), opts],
    [require.resolve('../dist/babelTransformContext'), opts],
    process.env.DEBUG_ACTIONS && [
      require.resolve('../dist/babelDebugOutputs'),
      opts,
    ],
  ].filter(Boolean) as any[];
}

function applyTurbopackOptions(nextConfig: NextConfig): void {
  nextConfig.experimental ??= {};
  nextConfig.experimental.turbo ??= {};
  nextConfig.experimental.turbo.rules ??= {};

  const rules = nextConfig.experimental.turbo.rules;

  const nextDir = findNextDir(process.cwd());

  const basePath = (nextConfig.basePath as string) || '/';

  const globs = [
    '{./src/pages/api,./pages/api}/**/*.{ts,tsx,js,jsx}', //
    // '{./src/app,./app/}/**/route.{ts,tsx,js,jsx}', //
  ];
  for (let glob of globs) {
    rules[glob] ??= {};
    const options: RpcPluginOptions = {
      isServer: false,
      nextDir,
      basePath,
    };
    const globbed: any = rules[glob];
    globbed.browser ??= {};
    globbed.browser.as = '*.tsx';
    globbed.browser.loaders ??= [];
    globbed.browser.loaders.push({
      loader: require.resolve('../dist/turbopackLoader'),
      options: { ...options, isServer: false },
    });
    globbed.default ??= {};
    globbed.default.as = '*.tsx';
    globbed.default.loaders ??= [];
    globbed.default.loaders.push({
      loader: require.resolve('../dist/turbopackLoader'),
      options: { ...options, isServer: true },
    });
  }
}

// taken from https://github.com/vercel/next.js/blob/v12.1.5/packages/next/lib/find-pages-dir.ts
export function findPagesDir(dir: string): string {
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
export function findNextDir(dir: string): string {
  {
    let curDir = path.resolve(dir, 'pages');
    if (fs.existsSync(curDir)) return path.dirname(curDir);

    curDir = path.resolve(dir, 'src/pages');
    if (fs.existsSync(curDir)) return path.dirname(curDir);
  }
  {
    let curDir = path.resolve(dir, 'app');
    if (fs.existsSync(curDir)) return path.dirname(curDir);

    curDir = path.resolve(dir, 'src/app');
    if (fs.existsSync(curDir)) return path.dirname(curDir);
  }

  throw new Error(
    "Couldn't find a Next.js directory. Please create one under the project root",
  );
}
