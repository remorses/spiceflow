import * as fs from 'fs';
import * as path from 'path';
import { PluginOptions } from './babelTransformRpc.js';

import { WrapMethod, WrapMethodMeta } from './server.js';

export interface WithRpcConfig {}

export { WrapMethod };

import pluginSyntaxJsx from '@babel/plugin-syntax-jsx';
import pluginTransformTypescript from '@babel/plugin-transform-typescript';
import babelTransformRpc from './babelTransformRpc.js';
import babelDebugOutputs from './babelDebugOutputs.js';

export function plugins(options: PluginOptions) {
  return [
    pluginSyntaxJsx,
    [pluginTransformTypescript, { isTSX: true }],
    [babelTransformRpc, options],
    process.env.DEBUG_ACTIONS && [babelDebugOutputs, options],
  ].filter(Boolean);
}

export function findRootDir(dir: string): string {
  {
    let curDir = path.resolve(dir, 'src');
    if (fs.existsSync(curDir)) return path.resolve(curDir);
  }

  throw new Error(
    "Couldn't find a src directory. Please create one under the project root",
  );
}
