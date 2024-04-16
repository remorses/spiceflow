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
  nextConfig.experimental ??= {};
  nextConfig.experimental.turbo ??= {};
  nextConfig.experimental.turbo.rules ??= {};

  const rules = nextConfig.experimental.turbo.rules;

  const pagesDir = findPagesDir(process.cwd());

  const basePath = (nextConfig.basePath as string) || '/';

  const globs = [
    '{./src/pages,./pages/}/**/*.{ts,tsx,js,jsx}', //
    '{./src/app,./app/}/**/route.{ts,tsx,js,jsx}', //
  ];
  for (let glob of globs) {
    rules[glob] ??= {};
    const options: RpcPluginOptions = {
      isServer: false,
      pagesDir,
      isAppDir: glob.includes('/app'),
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
