#! /usr/bin/env node
import os from 'os';
import fsx from 'fs-extra';

import fs from 'fs-extra';

import { cac } from 'cac';
import { build, buildOnce } from './build.js';
import { findRootDir } from './index.js';
import { exec, execSync, spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

export const cli = cac();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

cli
  .command('', 'Generate an SDK package for your functions')
  .alias('build')
  .option('--watch', 'Watch for changes')
  .option('--url <url>', 'URL of the package, including the base path', {
    default: 'http://localhost:3333',
  })
  .option(
    '--openapi',
    '[experimental] Creates an openapi.json schema based on your functions',
  )
  .action(async (options) => {
    const { url, watch, openapi } = options;
    const rootDir = await findRootDir(process.cwd());
    await build({ rootDir, url, openapi, watch });
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
    fsx.copySync(path.resolve(__dirname, '../sdk-template'), name, {
      filter(pathname) {
        return (
          !pathname.includes('node_modules') &&
          !pathname.includes('dist') &&
          !pathname.endsWith('.tsbuildinfo')
        );
      },
    });
    // replace the package.json name
    const packageJsonPath = path.resolve(name, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    packageJson.name = name;
    delete packageJson.private;
    // replace workspace:* with * from the package.json
    for (const key of Object.keys(packageJson.dependencies || {})) {
      const value = packageJson.dependencies[key];
      if (value && value.startsWith('workspace:')) {
        packageJson.dependencies[key] = '*';
      }
    }

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  });
cli
  .command('serve', 'Expose a server for your functions')
  .option('--basePath', 'base path for the server', { default: '/' })
  .option('--port <port>', 'Port to listen on', { default: '3333' })
  .option('--watch', 'Watch for changes')
  .option(
    '--skip-build',
    'Skip building the server and SDK, you must build it yourself first',
  )
  .action(async (options) => {
    let { basePath, skipBuild, watch, port } = options;
    const nodePath = process.execPath || 'node';
    const rootDir = await findRootDir(process.cwd());
    if (!skipBuild) {
      await build({ rootDir, watch, url: `http://127.0.0.1:${port}` });
    }

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
    if (major && major < 18) {
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
