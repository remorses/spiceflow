import * as babel from '@babel/core';
import generate from '@babel/generator';
import * as types from '@babel/types';
import fs from 'fs';
import { PluginOptions } from './babelTransformRpc.js';
import { default as nodePath, default as path } from 'path';

import { getFileName, logger } from './utils.js';

type Babel = { types: typeof types };

let deletedDir = false;

export default function debugOutputsPlugin(
  { types: t }: Babel,
  { isServer }: PluginOptions,
): babel.PluginObj | undefined {
  const cwd = process.cwd();

  if (!deletedDir) {
    deletedDir = true;

    fs.mkdirSync('./actions-outputs', { recursive: true });
  }
  return {
    visitor: {
      Program: {
        exit(program, state) {
          const filePath =
            getFileName(state) ?? nodePath.join('pages', 'Default.js');

          if (!process.env.DEBUG_ACTIONS) {
            return;
          }

          // stringify the AST and print it
          const output = generate(
            program.node,
            {
              /* options */
            },
            this.file.code,
          );
          let p = path.resolve(
            './actions-outputs',
            isServer ? 'server/' : 'client/',
            path.relative(cwd, path.resolve(filePath)),
          );
          logger.log(`${isServer ? 'server' : 'client'} plugin output:`, p);
          fs.mkdirSync(path.dirname(p), { recursive: true });
          fs.writeFileSync(p, output.code);
        },
      },
    },
  };
}
