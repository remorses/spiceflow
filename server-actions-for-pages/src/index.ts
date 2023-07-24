import { findPagesDir } from 'next/dist/lib/find-pages-dir';
import * as path from 'path';
import * as webpack from 'webpack';
import { NextConfig } from 'next';
import { PluginOptions as RpcPluginOptions } from './babelTransformRpc';
import { PluginOptions as ContextPluginOptions } from './babelTransformContext';
import { WrapMethod } from './server';

export interface NextRpcConfig {
  rpc: true;
  wrapMethod?: WrapMethod;
}

export interface WithRpcConfig {
  experimentalContext?: boolean;
}

export { WrapMethod };

export default function init(withRpcConfig: WithRpcConfig = {}) {
  return (nextConfig: NextConfig = {}): NextConfig => {
    return {
      ...nextConfig,

      webpack(config: webpack.Configuration, options) {
        const { experimentalContext = false } = withRpcConfig;
        const { isServer, dev, dir } = options;
        const pagesDir = findPagesDir(dir);
        const apiDir = path.resolve(pagesDir, './api');

        const rpcPluginOptions: RpcPluginOptions = {
          isServer,
          pagesDir,
          dev,
          apiDir,
          basePath: nextConfig.basePath || '/',
        };

        const contextPluginOptions: ContextPluginOptions = { apiDir, isServer };

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
                plugins: [
                  [
                    require.resolve('../dist/babelTransformRpc'),
                    rpcPluginOptions,
                  ],
                  ...(experimentalContext
                    ? [
                        [
                          require.resolve('../dist/babelTransformContext'),
                          contextPluginOptions,
                        ],
                      ]
                    : []),
                  require.resolve('@babel/plugin-syntax-jsx'),
                  [
                    require.resolve('@babel/plugin-syntax-typescript'),
                    { isTSX: true },
                  ],
                ],
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
