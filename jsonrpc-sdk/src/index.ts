import * as path from 'path';
import * as fs from 'fs';
import type * as webpack from 'webpack';
import { NextConfig } from 'next';
import { PluginOptions } from './babelTransformRpc';

import { WrapMethod } from './server';
import { directive } from '@babel/types';

export interface WithRpcConfig {}

export { WrapMethod };

export function plugins({
  isServer,
  rootDir: nextDir,

  basePath,
  url,
}: PluginOptions) {
  const rpcPluginOptions: PluginOptions = {
    isServer,
    rootDir: nextDir,
    url,
    basePath: basePath || '/',
  };

  return [
    require.resolve('@babel/plugin-syntax-jsx'),
    [require.resolve('@babel/plugin-transform-typescript'), { isTSX: true }],
    [require.resolve('../dist/babelTransformRpc'), rpcPluginOptions],
    process.env.DEBUG_ACTIONS && [
      require.resolve('../dist/babelDebugOutputs'),
      rpcPluginOptions,
    ],
  ].filter(Boolean) as any[];
}

export function findRootDir(dir: string): string {
  {
    let curDir = path.resolve(dir, 'src');
    if (fs.existsSync(curDir)) return path.dirname(curDir);
  }

  throw new Error(
    "Couldn't find a src directory. Please create one under the project root",
  );
}
