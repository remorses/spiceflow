#! /usr/bin/env node
import os from 'os';
import fsx from 'fs-extra';

import fs from 'fs-extra';

import { cac } from 'cac';
import { build, buildOnce } from './build.js';
import { findRootDir } from './index.js';
import { exec, execSync, spawn } from 'child_process';
import path from 'path';

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
  .command('init', 'Generate a new spiceflow project')
  .option('--name <name>', 'Name of this project')
  .action(async (options) => {
    // copy contents of the template dir here
    const { name } = options;
    if (!name) {
      throw new Error('--name is required');
    }
    await fsx.copy(path.resolve(__dirname, '../sdk-template'), name);
  });
cli
  .command('serve', 'Expose a server for your functions')
  .option('--basePath', 'base path for the server', { default: '/' })
  .option('--port <port>', 'Port to listen on', { default: '3333' })
  .option('--watch', 'Watch for changes')
  .action(async (options) => {
    let { basePath, watch, port } = options;
    const nodePath = process.execPath || 'node';
    const rootDir = await findRootDir(process.cwd());
    await build({ rootDir, watch, url: `http://127.0.0.1:${port}` });

    const tempFilePath = path.resolve('_main.mjs');

    const code = `import { methodsMap } from './server/index.js'; import { exposeNodeServer } from 'spiceflow/dist/expose.js'; exposeNodeServer({ methodsMap, basePath: '${basePath}', port: ${port} });`;
    fs.writeFileSync(tempFilePath, code);
    process.on('SIGINT', () => {
      try {
        fs.unlinkSync(tempFilePath);
      } catch {}
      process.exit(0);
    });
    // only enable watch if it's supported by node version
    const major = parseInt(process.version.replace('v', '').split('.')[0]);
    if (major && major < 16) {
      console.log(`node version ${process.version} does not support --watch`);
      watch = false;
    }
    try {
      await new Promise<void>((resolve, reject) => {
        const p = spawn(
          `${nodePath} --no-warnings ${watch ? '--watch' : ''} ${JSON.stringify(
            tempFilePath,
          )}`,
          {
            stdio: 'inherit',
            shell: true,
          },
        );
        p.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject();
          }
        });
      });
    } finally {
      fs.unlinkSync(tempFilePath);
    }
  });

cli.help();

cli.parse();
