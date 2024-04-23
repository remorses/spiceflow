#! /usr/bin/env node

import fs from 'fs-extra';

import { cac } from 'cac';
import { build, buildOnce } from './build.js';
import { findRootDir } from './index.js';
import { execSync } from 'child_process';

export const cli = cac();

cli
  .command('', 'Generate an SDK package for your functions')
  .option('--watch', 'Watch for changes')
  .option('--url <url>', 'URL of the package, including the base path')
  .action(async (options) => {
    const { url, watch } = options;
    const rootDir = await findRootDir(process.cwd());
    await build({ rootDir, url, watch });
  });
cli
  .command('server', 'Expose a server for your functions')
  .option('--basePath', 'base path for the server', { default: '/' })
  .option('--port <port>', 'Port to listen on', { default: '3333' })
  .action(async (options) => {
    const { basePath, port } = options;
    const nodePath = process.execPath || 'node';
    const rootDir = await findRootDir(process.cwd());
    await buildOnce({ rootDir, url: `http://127.0.0.1:${port}` });
    const code = `import { methodsMap } from './server/index.js'; import { exposeNodeServer } from 'jsonrpc-sdk/dist/expose.js'; exposeNodeServer({ methodsMap, basePath: '${basePath}', port: ${port} });`;
    execSync(`${nodePath} --input-type=module -e ${JSON.stringify(code)}`, {
      stdio: 'inherit',
    });
  });

cli.help();

cli.parse();
