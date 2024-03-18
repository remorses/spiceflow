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

  basePath,
}) {
  const apiDir = path.resolve(pagesDir, './api');
  const rpcPluginOptions: RpcPluginOptions = {
    isServer,
    pagesDir,

    apiDir,
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

  const apiDir = path.resolve(pagesDir, './api');
  const basePath = (nextConfig.basePath as string) || '/';

  const options: WithRpcConfig = {
    isServer: false,
    pagesDir,
    apiDir,
    basePath,
  };
  const glob = '{./src/pages,./pages/}/**/*.{ts,tsx,js,jsx}';
  rules[glob] ??= {};
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
